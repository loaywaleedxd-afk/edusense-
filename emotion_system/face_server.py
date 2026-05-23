"""
face_server.py — EduSense Face Recognition Server
==================================================
Engine  : MTCNN + DeepFace Facenet512
Runtime : FastAPI + uvicorn  (replaces fragile http.server)

Endpoints:
  GET  /health    — status + registered student count
  POST /analyze   — detect faces, identify by name, analyse emotion
  POST /register  — register a student face encoding

DB writes on every recognition:
  • emotion_records  — emotion/confidence/engagement per frame
  • attendance       — one row per student per course per day  (method='face')
"""

import json, sys, os, base64, sqlite3, threading
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import cv2
import numpy as np

from gui.face_engine import (
    detect_faces, identify_face,
    register_face, analyze_emotion, load_encodings,
)

# ── Config ─────────────────────────────────────────────────────────────────────
PORT         = 8765
BASE_DIR     = os.path.dirname(__file__)
DB_PATH      = os.path.join(BASE_DIR, "backend", "emotion_system.db")
EMOTIONS_DIR = os.path.join(BASE_DIR, "student_emotions")
os.makedirs(EMOTIONS_DIR, exist_ok=True)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="EduSense Face Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Locks ──────────────────────────────────────────────────────────────────────
_db_lock        = threading.Lock()
_inference_lock = threading.Lock()   # DeepFace / TensorFlow is NOT thread-safe

# ── Student name cache  {student_id → full_name} ──────────────────────────────
_name_cache: dict = {}

def _load_name_cache():
    global _name_cache
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT s.student_id, u.full_name "
            "FROM students s JOIN users u ON u.id = s.user_id"
        ).fetchall()
        conn.close()
        _name_cache = {r["student_id"]: r["full_name"] for r in rows}
        print(f"  Name cache: {len(_name_cache)} students")
    except Exception as e:
        print(f"  [WARN] Name cache error: {e}")

def student_name(sid: str):
    return _name_cache.get(sid, sid) if sid else None


# ── DB helpers ─────────────────────────────────────────────────────────────────
def _f(v) -> float:
    """Force any numeric value (including numpy scalars) to a plain Python float."""
    try:
        return float(v)
    except Exception:
        return 0.0


def db_save_emotion(student_id, course_id, emotion, confidence,
                    attention, engagement, timestamp):
    try:
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                """INSERT INTO emotion_records
                   (student_id, lecture_id, timestamp, emotion, confidence,
                    attention_score, engagement_score)
                   VALUES (?,?,?,?,?,?,?)""",
                (str(student_id), course_id or None, str(timestamp),
                 str(emotion),
                 round(_f(confidence), 3),    # explicit float — prevents BLOB storage
                 round(_f(attention),  3),
                 round(_f(engagement), 3)),
            )
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"  [DB emotion] {e}")


_attendance_today: set = set()

def db_mark_attendance(student_id, course_id, confidence):
    today = str(date.today())
    key   = (student_id, course_id or "", today)
    if key in _attendance_today:
        return
    try:
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            # Check DB too — protects against server restarts losing in-memory set
            existing = conn.execute(
                """SELECT id FROM attendance
                   WHERE student_id=? AND lecture_id IS ? AND method='face'
                   AND date(check_in_time)=?""",
                (student_id, course_id or None, today),
            ).fetchone()
            if existing:
                _attendance_today.add(key)   # sync in-memory cache
                conn.close()
                return
            conn.execute(
                """INSERT INTO attendance
                   (student_id, lecture_id, check_in_time, method, status, confidence)
                   VALUES (?,?,?,'face','present',?)""",
                (str(student_id), course_id or None,
                 datetime.utcnow().isoformat(), round(_f(confidence), 3)),
            )
            conn.commit()
            conn.close()
        _attendance_today.add(key)
        print(f"  [Attendance] {student_id} -> {course_id or 'no-course'}  conf={_f(confidence):.2f}")
    except Exception as e:
        print(f"  [DB attendance] {e}")


def json_save_emotion(student_id, course_id, emotion, confidence,
                      engagement, attention, timestamp):
    path = os.path.join(EMOTIONS_DIR, f"{student_id}.json")
    records = []
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                records = json.load(f)
        except Exception:
            pass
    records.append({
        "emotion": emotion, "confidence": round(confidence, 3),
        "engagement_score": round(engagement, 3),
        "attention_score": round(attention, 3),
        "course_id": course_id or "",
        "timestamp": timestamp,
    })
    records = records[-500:]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


# ── Frame decoder ──────────────────────────────────────────────────────────────
def decode_frame(b64: str):
    try:
        raw = base64.b64decode(b64.split(",")[-1])
        arr = np.frombuffer(raw, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


# ── Request models ─────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    frame: str
    course_id: str = ""

class RegisterRequest(BaseModel):
    student_id: str
    frame: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "MTCNN detection + DeepFace Facenet512 recognition",
        "registered_students": len(load_encodings()),
        "named_students": len(_name_cache),
    }


def _to_py(v):
    """Convert numpy scalars to native Python types for JSON safety."""
    if hasattr(v, "item"):       return v.item()   # numpy scalar
    if isinstance(v, float):     return float(v)
    if isinstance(v, int):       return int(v)
    if isinstance(v, str):       return str(v)
    if isinstance(v, dict):      return {str(k): _to_py(vv) for k, vv in v.items()}
    return v


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    frame = decode_frame(req.frame)
    if frame is None:
        return {"error": "invalid frame", "total_faces": 0, "detections": []}

    h_f, w_f = frame.shape[:2]

    try:
        with _inference_lock:
            faces = detect_faces(frame)
            face_results = []
            for box in faces:
                x, y, w, h    = [int(v) for v in box]
                face_crop      = frame[y: y+h, x: x+w]
                emo_data       = analyze_emotion(face_crop)
                sid, rec_conf  = identify_face(frame, tuple(box))
                face_results.append((list(box), emo_data, sid, float(rec_conf)))
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"error": str(e), "total_faces": 0, "detections": []}

    detections = []
    for box, emo_data, sid, rec_conf in face_results:
        x, y, w, h = [int(v) for v in box]
        name       = student_name(sid)
        mirror_x   = w_f - x - w

        det = {
            "box": {
                "x": round(float(mirror_x) / w_f * 100, 2),
                "y": round(float(y)        / h_f * 100, 2),
                "w": round(float(w)        / w_f * 100, 2),
                "h": round(float(h)        / h_f * 100, 2),
            },
            "student_id":             str(sid) if sid else None,
            "student_name":           str(name) if name else None,
            "recognition_confidence": round(float(rec_conf), 3),
            "emotion":                str(emo_data["emotion"]),
            "confidence":             round(float(emo_data["confidence"]), 3),
            "all_emotions":           _to_py(emo_data.get("all_emotions", {})),
            "engagement_score":       round(float(emo_data["engagement_score"]), 3),
            "attention_score":        round(float(emo_data["attention_score"]), 3),
            "attention_label":        str(emo_data["attention_label"]),
            "timestamp":              str(emo_data["timestamp"]),
        }
        detections.append(det)

        if sid:
            ts = emo_data["timestamp"]
            try:
                db_save_emotion(
                    sid, req.course_id,
                    emo_data["emotion"], emo_data["confidence"],
                    emo_data["attention_score"], emo_data["engagement_score"], ts,
                )
                db_mark_attendance(sid, req.course_id, rec_conf)
                json_save_emotion(
                    sid, req.course_id,
                    emo_data["emotion"], emo_data["confidence"],
                    emo_data["engagement_score"], emo_data["attention_score"], ts,
                )
            except Exception as ex:
                print(f"  [save error] {ex}")

    return {"total_faces": len(faces), "detections": detections}


@app.post("/register")
def register(req: RegisterRequest):
    if not req.student_id or not req.frame:
        return {"error": "missing student_id or frame"}

    frame = decode_frame(req.frame)
    if frame is None:
        return {"error": "invalid frame"}

    with _inference_lock:
        faces = detect_faces(frame)

    if not faces:
        return {"error": "no face detected — try again with better lighting"}

    box     = max(faces, key=lambda f: f[2] * f[3])
    success = register_face(req.student_id, frame, tuple(box))

    if success:
        _load_name_cache()
        total = len(load_encodings())
        name  = student_name(req.student_id)
        print(f"  Registered {req.student_id} ({name}) — total {total}")
        return {"ok": True, "student_id": req.student_id,
                "student_name": name, "registered_total": total}
    return {"error": "encoding failed"}


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 62)
    print("  EduSense Face Recognition Server  (FastAPI + uvicorn)")
    print(f"  http://localhost:{PORT}")
    print(f"  DB     : {DB_PATH}")
    print(f"  Faces  : gui/face_encodings.json")
    print("=" * 62)
    _load_name_cache()
    print(f"  Registered faces : {len(load_encodings())}")
    print(f"  Named students   : {len(_name_cache)}")
    print("  Ctrl+C to stop\n")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
