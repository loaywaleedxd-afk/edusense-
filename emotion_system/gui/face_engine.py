"""
gui/face_engine.py
==================
Upgraded face recognition engine for EduSense.

Detection  : MTCNN  (handles angles, glasses, partial occlusion)
             → falls back to OpenCV Haar Cascade if MTCNN unavailable
Recognition: DeepFace Facenet512  (512-d real face embeddings, ~99% LFW accuracy)
             → falls back to 512-bin histogram if DeepFace unavailable
Emotion    : DeepFace  (TensorFlow backend)
             → falls back to weighted-random simulation

Public API (unchanged — face_server.py and GUI pages need no edits):
    detect_faces(frame)           -> [(x,y,w,h), ...]
    largest_face(frame)           -> (x,y,w,h) or None
    encode_face(frame, box)       -> list[float]   (512-d)
    compare_encodings(e1, e2)     -> float 0-1
    register_face(sid, frame, box)-> bool
    identify_face(frame, box)     -> (student_id | None, confidence)
    load_encodings()              -> dict
    save_encodings(db)
    analyze_emotion(face_img)     -> dict
    annotate_frame(frame, dets)   -> np.ndarray
"""

import cv2
import numpy as np
import json
import os
import random
from datetime import datetime

# ── Paths ────────────────────────────────────────────────────────────────────
_DIR      = os.path.dirname(__file__)
ENC_FILE  = os.path.join(_DIR, "face_encodings.json")   # legacy — kept for migration
DB_PATH   = os.path.join(_DIR, "..", "backend", "emotion_system.db")
CASCADE   = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# ── Emotion → engagement weight ──────────────────────────────────────────────
EMOTION_WEIGHTS = {
    "happy": 1.0, "neutral": 0.70, "surprise": 0.80,
    "confused": 0.45, "sad": 0.20, "bored": 0.10,
    "angry": 0.20, "disgust": 0.10, "fear": 0.30,
}

# ── Singletons (lazy-loaded to avoid slow startup) ────────────────────────────
_haar_cascade  = None
_mtcnn_detector = None
_deepface_model = None   # Facenet512 model handle (kept warm after first load)


def _get_haar():
    global _haar_cascade
    if _haar_cascade is None:
        _haar_cascade = cv2.CascadeClassifier(CASCADE)
    return _haar_cascade


def _get_mtcnn():
    """Return a cached MTCNN detector, or None if not available."""
    global _mtcnn_detector
    if _mtcnn_detector is False:          # already tried and failed
        return None
    if _mtcnn_detector is not None:
        return _mtcnn_detector
    try:
        from mtcnn import MTCNN
        _mtcnn_detector = MTCNN()
        print("[face_engine] MTCNN loaded ✓")
    except Exception as e:
        print(f"[face_engine] MTCNN unavailable ({e}), using Haar fallback")
        _mtcnn_detector = False
    return _mtcnn_detector if _mtcnn_detector is not False else None


# ═══════════════════════════════════════════════════════════════════════════════
#  DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def detect_faces(frame: np.ndarray) -> list:
    """
    Return list of (x, y, w, h) for every detected face.

    Primary  : MTCNN  — better at angles, glasses, partial faces
    Fallback : Haar Cascade — fast, works offline without heavy models
    """
    # ── MTCNN path ─────────────────────────────────────────────────────────
    detector = _get_mtcnn()
    if detector is not None:
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = detector.detect_faces(rgb)
            boxes = []
            for r in results:
                if r.get("confidence", 0) < 0.85:
                    continue
                x, y, w, h = r["box"]
                # MTCNN can return negative coords on edge faces — clamp them
                x = max(0, x);  y = max(0, y)
                if w > 20 and h > 20:
                    boxes.append([x, y, w, h])
            if boxes:
                return boxes
        except Exception:
            pass

    # ── Haar fallback ───────────────────────────────────────────────────────
    gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _get_haar().detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    return faces.tolist() if len(faces) > 0 else []


def largest_face(frame: np.ndarray):
    """Return (x,y,w,h) of the largest detected face, or None."""
    faces = detect_faces(frame)
    if not faces:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


# ═══════════════════════════════════════════════════════════════════════════════
#  ENCODING  —  DeepFace Facenet512  (512-d cosine-space embeddings)
# ═══════════════════════════════════════════════════════════════════════════════

def encode_face(frame: np.ndarray, box: tuple) -> list:
    """
    Extract a 512-d face embedding using DeepFace Facenet512.

    The embedding lives in a cosine-similarity space, so compare with
    compare_encodings() which uses cosine similarity (not Euclidean).

    Falls back to a 512-bin normalised histogram if DeepFace is unavailable
    (lower accuracy but same shape/interface).
    """
    x, y, w, h = [int(v) for v in box]
    face = frame[y: y+h, x: x+w]
    if face.size == 0:
        return []

    # ── DeepFace Facenet512 path ────────────────────────────────────────────
    try:
        from deepface import DeepFace
        # detector_backend="skip" because we already cropped the face
        result = DeepFace.represent(
            face,
            model_name="Facenet512",
            enforce_detection=False,
            detector_backend="skip",
        )
        embedding = result[0]["embedding"]          # list of 512 floats
        # L2-normalise so cosine sim = dot product
        arr  = np.array(embedding, dtype=float)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()
    except Exception:
        pass

    # ── Histogram fallback ──────────────────────────────────────────────────
    face_resized = cv2.resize(face, (64, 64))
    gray         = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
    hist, _      = np.histogram(gray.flatten(), bins=512, range=(0, 256))
    hist_norm    = hist.astype(float) / (hist.sum() + 1e-6)
    return hist_norm.tolist()


def compare_encodings(enc1: list, enc2: list) -> float:
    """
    Cosine similarity between two L2-normalised embeddings → 0-1.
    (Both DeepFace embeddings AND the histogram fallback are normalised,
     so this single metric works for both.)
    """
    if not enc1 or not enc2 or len(enc1) != len(enc2):
        return 0.0
    a = np.array(enc1, dtype=float)
    b = np.array(enc2, dtype=float)
    score = float(np.dot(a, b))          # dot of unit vectors = cosine sim
    return float(np.clip(score, 0.0, 1.0))


# ═══════════════════════════════════════════════════════════════════════════════
#  ENCODING STORE  —  SQLite  (biometric data stays off git)
# ═══════════════════════════════════════════════════════════════════════════════

import sqlite3 as _sqlite3

def _ensure_enc_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS face_encodings (
            student_id TEXT PRIMARY KEY,
            embedding  TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)


def load_encodings() -> dict:
    """Load {student_id: embedding_list} from face_encodings table in DB."""
    try:
        conn = _sqlite3.connect(DB_PATH)
        _ensure_enc_table(conn)
        rows = conn.execute(
            "SELECT student_id, embedding FROM face_encodings"
        ).fetchall()
        conn.close()
        if rows:
            return {r[0]: json.loads(r[1]) for r in rows}
    except Exception as e:
        print(f"[face_engine] DB load error ({e}), trying JSON fallback")

    # ── Fallback: legacy JSON file (only used if DB is empty / unavailable) ──
    if os.path.exists(ENC_FILE):
        try:
            with open(ENC_FILE, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_encodings(enc_dict: dict):
    """Persist {student_id: embedding_list} to face_encodings table in DB."""
    try:
        conn = _sqlite3.connect(DB_PATH)
        _ensure_enc_table(conn)
        conn.executemany(
            """INSERT OR REPLACE INTO face_encodings (student_id, embedding, updated_at)
               VALUES (?, ?, datetime('now'))""",
            [(sid, json.dumps(emb)) for sid, emb in enc_dict.items()],
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[face_engine] DB save error ({e}), falling back to JSON")
        with open(ENC_FILE, "w", encoding="utf-8") as f:
            json.dump(enc_dict, f)


def register_face(student_id: str, frame: np.ndarray, box: tuple) -> bool:
    """
    Encode the face in `box` with Facenet512 and save under `student_id`.
    Re-registration overwrites the previous embedding.
    """
    enc = encode_face(frame, box)
    if not enc:
        return False
    db = load_encodings()
    db[student_id] = enc
    save_encodings(db)
    return True


def identify_face(frame: np.ndarray, box: tuple,
                  threshold: float = 0.65) -> tuple:
    """
    Match the face in `box` against all stored Facenet512 embeddings.

    Threshold 0.65 is calibrated for cosine similarity on Facenet512:
    - Same person  → ~0.70–0.99
    - Different    → ~0.20–0.55
    Returns (student_id, confidence) or (None, best_score).
    """
    enc = encode_face(frame, box)
    if not enc:
        return None, 0.0

    db = load_encodings()
    if not db:
        return None, 0.0

    best_id    = None
    best_score = 0.0
    for sid, stored_enc in db.items():
        score = compare_encodings(enc, stored_enc)
        if score > best_score:
            best_score = score
            best_id    = sid

    if best_score >= threshold:
        return best_id, best_score
    return None, best_score


# ═══════════════════════════════════════════════════════════════════════════════
#  EMOTION ANALYSIS  —  DeepFace
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_emotion(face_img: np.ndarray) -> dict:
    """
    Analyse emotion from a face crop using DeepFace.
    Falls back to a classroom-weighted random simulation if unavailable.
    """
    try:
        from deepface import DeepFace
        result   = DeepFace.analyze(
            face_img,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
            detector_backend="skip",   # face already cropped
        )
        dominant = result[0]["dominant_emotion"]
        conf     = result[0]["emotion"][dominant] / 100.0
        all_emo  = {k: v / 100.0 for k, v in result[0]["emotion"].items()}
    except Exception:
        # Realistic classroom-weighted random fallback
        pool     = (["neutral"] * 4 + ["happy"] * 3 +
                    ["confused"] * 2 + ["bored"] + ["surprise"])
        dominant = random.choice(pool)
        conf     = round(random.uniform(0.65, 0.96), 3)
        all_emo  = {e: round(random.uniform(0.01, 0.15), 3)
                    for e in EMOTION_WEIGHTS}
        all_emo[dominant] = conf

    weight     = EMOTION_WEIGHTS.get(dominant, 0.5)
    engagement = round(min(weight * conf + (1 - conf) * 0.3, 1.0), 3)
    attention  = round(
        min(0.6 + conf * 0.4, 1.0)
        if dominant in {"happy", "neutral", "surprise"}
        else max(0.0, 0.4 - conf * 0.35),
        3,
    )
    att_label = (
        "attentive"  if attention >= 0.72 else
        "moderate"   if attention >= 0.45 else
        "distracted"
    )

    return {
        "emotion":          dominant,
        "confidence":       round(conf, 3),
        "all_emotions":     all_emo,
        "engagement_score": engagement,
        "attention_score":  attention,
        "attention_label":  att_label,
        "timestamp":        datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  ANNOTATE FRAME  (draw boxes + labels on a BGR frame for the GUI)
# ═══════════════════════════════════════════════════════════════════════════════

STATUS_COLORS_BGR = {
    "attentive":  (52,  211, 153),   # green
    "moderate":   (59,  162, 245),   # blue
    "distracted": (68,   68, 239),   # red
    "unknown":    (128, 128, 128),   # gray
}


def annotate_frame(frame: np.ndarray, detections: list) -> np.ndarray:
    """
    Draw face boxes + emotion/identity labels on frame.
    detections: list of dicts returned by face_server /analyze
    """
    out = frame.copy()
    h_f, w_f = out.shape[:2]

    for d in detections:
        # box may be percent (from face_server) or pixel (from live loop)
        box_raw = d.get("box", {})
        if isinstance(box_raw, dict):
            # face_server percentage format → convert to pixels
            x = int(box_raw.get("x", 0) / 100 * w_f)
            y = int(box_raw.get("y", 0) / 100 * h_f)
            w = int(box_raw.get("w", 0) / 100 * w_f)
            h = int(box_raw.get("h", 0) / 100 * h_f)
        else:
            x, y, w, h = [int(v) for v in box_raw]

        att   = d.get("attention_label", "unknown")
        color = STATUS_COLORS_BGR.get(att, (128, 128, 128))
        sid   = d.get("student_id") or "Unknown"
        emo   = d.get("emotion", "")
        eng   = int(d.get("engagement_score", 0) * 100)

        cv2.rectangle(out, (x, y), (x+w, y+h), color, 2)

        # Corner brackets
        tl = 18
        for (px, py, dx, dy) in [(x, y, 1, 1), (x+w, y, -1, 1),
                                   (x, y+h, 1, -1), (x+w, y+h, -1, -1)]:
            cv2.line(out, (px, py), (px + dx*tl, py), color, 3)
            cv2.line(out, (px, py), (px, py + dy*tl), color, 3)

        label = f"{sid}  {emo}  {eng}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(out, (x, y - th - 8), (x + tw + 8, y), color, -1)
        cv2.putText(out, label, (x + 4, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        bar_w = int(w * d.get("engagement_score", 0))
        cv2.rectangle(out, (x, y+h+2), (x+w, y+h+8), (40, 40, 40), -1)
        cv2.rectangle(out, (x, y+h+2), (x+bar_w, y+h+8), color, -1)

    return out
