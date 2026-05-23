"""
face_server.py — EduSense Face Recognition Server
==================================================
Engine : MTCNN + DeepFace Facenet512

Endpoints:
  GET  /health    — status + registered student count
  POST /analyze   — detect faces, identify students by name, analyse emotions
  POST /register  — register a student's face encoding

What gets saved to the database on every recognition:
  • emotion_records  — emotion, confidence, engagement, attention per student per frame
  • attendance       — one row per student per lecture per day (method = "face")
"""

import json, sys, os, base64, sqlite3, threading
from datetime import datetime, date
from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import http.server

class ThreadingHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

sys.path.insert(0, os.path.dirname(__file__))

from gui.face_engine import (
    detect_faces, encode_face, identify_face,
    register_face, analyze_emotion, load_encodings,
)
import cv2
import numpy as np

# ── Config ─────────────────────────────────────────────────────────────────────
PORT         = 8765
BASE_DIR     = os.path.dirname(__file__)
DB_PATH      = os.path.join(BASE_DIR, "backend", "emotion_system.db")
EMOTIONS_DIR = os.path.join(BASE_DIR, "student_emotions")
os.makedirs(EMOTIONS_DIR, exist_ok=True)

# ── Thread-safe DB lock ────────────────────────────────────────────────────────
_db_lock = threading.Lock()

# ── Student name cache  {student_id → full_name} ──────────────────────────────
_name_cache: dict = {}

def _load_name_cache():
    """Load student_id → full_name mapping from DB into memory."""
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
        print(f"  Name cache loaded: {len(_name_cache)} students")
    except Exception as e:
        print(f"  [WARN] Could not load name cache: {e}")

def student_name(student_id: str) -> str:
    """Return full name for a student_id, or the ID itself if unknown."""
    return _name_cache.get(student_id, student_id) if student_id else None


# ── DB: save emotion record ────────────────────────────────────────────────────
def db_save_emotion(student_id: str, course_id: str, emotion: str,
                    confidence: float, attention: float, engagement: float,
                    timestamp: str):
    """Insert one row into emotion_records table."""
    try:
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                """INSERT INTO emotion_records
                   (student_id, lecture_id, timestamp, emotion, confidence,
                    attention_score, engagement_score)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (student_id, course_id or None, timestamp,
                 emotion, round(confidence, 3),
                 round(attention, 3), round(engagement, 3)),
            )
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"  [DB emotion] {e}")


# ── DB: mark attendance ────────────────────────────────────────────────────────
_attendance_today: set = set()   # (student_id, course_id) already marked today

def db_mark_attendance(student_id: str, course_id: str, confidence: float):
    """
    Insert one attendance row per student per course per day.
    Uses INSERT OR IGNORE so duplicate detections in the same session
    don't create multiple rows.
    """
    key = (student_id, course_id or "", str(date.today()))
    if key in _attendance_today:
        return                              # already marked this session
    try:
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                """INSERT OR IGNORE INTO attendance
                   (student_id, lecture_id, check_in_time, method, status, confidence)
                   VALUES (?, ?, ?, 'face', 'present', ?)""",
                (student_id, course_id or None,
                 datetime.utcnow().isoformat(), round(confidence, 3)),
            )
            conn.commit()
            conn.close()
        _attendance_today.add(key)
        print(f"  [Attendance] {student_id} → {course_id or 'no-course'}  conf={confidence:.2f}")
    except Exception as e:
        print(f"  [DB attendance] {e}")


# ── JSON emotion log (kept as secondary record) ────────────────────────────────
def json_save_emotion(student_id: str, course_id: str, emotion: str,
                      confidence: float, engagement: float, attention: float,
                      timestamp: str):
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
    # Keep last 500 records per student
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


# ══════════════════════════════════════════════════════════════════════════════
#  HTTP handler
# ══════════════════════════════════════════════════════════════════════════════

class FaceHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass   # silence per-request noise

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _read_json(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n))

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "keep-alive")
        self._cors()
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()

    # ── GET /health ───────────────────────────────────────────────────────────
    def do_GET(self):
        if self.path == "/health":
            self._send_json({
                "status": "ok",
                "engine": "MTCNN detection + DeepFace Facenet512 recognition",
                "registered_students": len(load_encodings()),
                "named_students": len(_name_cache),
            })
        else:
            self._send_json({"error": "not found"}, 404)

    # ── POST ─────────────────────────────────────────────────────────────────
    def do_POST(self):
        try:
            body = self._read_json()
        except Exception as e:
            self._send_json({"error": str(e)}, 400)
            return
        if self.path == "/analyze":
            self._analyze(body)
        elif self.path == "/register":
            self._register(body)
        else:
            self._send_json({"error": "not found"}, 404)

    # ── POST /analyze ─────────────────────────────────────────────────────────
    def _analyze(self, body):
        frame_b64 = body.get("frame", "")
        course_id = body.get("course_id", "")

        frame = decode_frame(frame_b64)
        if frame is None:
            self._send_json({"error": "invalid frame"}, 400)
            return

        h_f, w_f = frame.shape[:2]
        faces      = detect_faces(frame)
        detections = []

        for box in faces:
            x, y, w, h   = [int(v) for v in box]
            face_crop     = frame[y: y+h, x: x+w]
            emo_data      = analyze_emotion(face_crop)
            sid, rec_conf = identify_face(frame, tuple(box))

            # ── Name lookup ──────────────────────────────────────────────────
            name = student_name(sid)   # full name or None

            # Mirror X for CSS-mirrored video feed
            mirror_x = w_f - x - w
            det = {
                "box": {
                    "x": round(mirror_x / w_f * 100, 2),
                    "y": round(y        / h_f * 100, 2),
                    "w": round(w        / w_f * 100, 2),
                    "h": round(h        / h_f * 100, 2),
                },
                "student_id":             sid,
                "student_name":           name,          # ← full name added
                "recognition_confidence": round(rec_conf, 3),
                "emotion":                emo_data["emotion"],
                "confidence":             emo_data["confidence"],
                "all_emotions":           emo_data.get("all_emotions", {}),
                "engagement_score":       emo_data["engagement_score"],
                "attention_score":        emo_data["attention_score"],
                "attention_label":        emo_data["attention_label"],
                "timestamp":              emo_data["timestamp"],
            }
            detections.append(det)

            # ── Persist to DB + JSON (only for identified students) ──────────
            if sid:
                ts = emo_data["timestamp"]
                try:
                    db_save_emotion(
                        sid, course_id,
                        emo_data["emotion"], emo_data["confidence"],
                        emo_data["attention_score"], emo_data["engagement_score"],
                        ts,
                    )
                    db_mark_attendance(sid, course_id, rec_conf)
                    json_save_emotion(
                        sid, course_id,
                        emo_data["emotion"], emo_data["confidence"],
                        emo_data["engagement_score"], emo_data["attention_score"],
                        ts,
                    )
                except Exception as ex:
                    print(f"  [save error] {ex}")

        self._send_json({"total_faces": len(faces), "detections": detections})

    # ── POST /register ────────────────────────────────────────────────────────
    def _register(self, body):
        student_id = body.get("student_id", "")
        frame_b64  = body.get("frame", "")

        if not student_id or not frame_b64:
            self._send_json({"error": "missing student_id or frame"}, 400)
            return

        frame = decode_frame(frame_b64)
        if frame is None:
            self._send_json({"error": "invalid frame"}, 400)
            return

        faces = detect_faces(frame)
        if not faces:
            self._send_json({"error": "no face detected — try again with better lighting"}, 400)
            return

        box     = max(faces, key=lambda f: f[2] * f[3])
        success = register_face(student_id, frame, tuple(box))

        if success:
            # Refresh name cache in case a new student was just added
            _load_name_cache()
            total = len(load_encodings())
            name  = student_name(student_id)
            print(f"  Registered face for {student_id} ({name or 'unknown name'}) — total {total}")
            self._send_json({
                "ok": True,
                "student_id": student_id,
                "student_name": name,
                "registered_total": total,
            })
        else:
            self._send_json({"error": "encoding failed"}, 500)


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 62)
    print("  EduSense Face Recognition Server")
    print(f"  Listening on  http://localhost:{PORT}")
    print(f"  Database at   {DB_PATH}")
    print(f"  Encodings at  gui/face_encodings.json")
    print("=" * 62)

    _load_name_cache()
    registered = len(load_encodings())
    print(f"  Registered faces : {registered}")
    print(f"  Named students   : {len(_name_cache)}")
    print("  Ctrl+C to stop\n")

    server = ThreadingHTTPServer(("0.0.0.0", PORT), FaceHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
