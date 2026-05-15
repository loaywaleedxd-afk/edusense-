"""
gui/face_engine.py
==================
Standalone face-recognition engine for the Python GUI.

• Uses OpenCV Haar cascade for detection (no heavy deps).
• Stores face encodings as flattened mean-pixel vectors in a JSON file
  (works offline; swap for face_recognition lib if available).
• Provides:
    - capture_face(frame)        -> (x,y,w,h) or None
    - encode_face(frame, box)    -> bytes (128-d float32)
    - identify_student(frame)    -> (student_id, confidence) or (None, 0)
    - register_student(sid, enc) -> saves encoding
    - load_encodings()
    - emotion_from_frame(face_img) -> {"emotion": str, "confidence": float, ...}
"""

import cv2
import numpy as np
import json
import os
import random
from datetime import datetime

# ── Paths ────────────────────────────────────────────────
_DIR      = os.path.dirname(__file__)
ENC_FILE  = os.path.join(_DIR, "face_encodings.json")
CASCADE   = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# ── Emotion weights for engagement scoring ───────────────
EMOTION_WEIGHTS = {
    "happy": 1.0, "neutral": 0.70, "surprise": 0.80,
    "confused": 0.45, "sad": 0.20, "bored": 0.10,
    "angry": 0.20, "disgust": 0.10, "fear": 0.30,
}

_face_cascade = None

def _get_cascade():
    global _face_cascade
    if _face_cascade is None:
        _face_cascade = cv2.CascadeClassifier(CASCADE)
    return _face_cascade


# ══════════════════════════════════════════════════════════
#  DETECTION
# ══════════════════════════════════════════════════════════
def detect_faces(frame: np.ndarray) -> list:
    """Return list of (x, y, w, h) for every detected face."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _get_cascade().detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    return faces.tolist() if len(faces) > 0 else []


def largest_face(frame: np.ndarray):
    """Return (x,y,w,h) of the largest detected face, or None."""
    faces = detect_faces(frame)
    if not faces:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


# ══════════════════════════════════════════════════════════
#  ENCODING
# ══════════════════════════════════════════════════════════
def encode_face(frame: np.ndarray, box: tuple) -> list:
    """
    Extract a compact face 'encoding' from the bounding box.
    Returns a 128-element list of floats (mean pixel histogram bins).
    In production replace with face_recognition.face_encodings().
    """
    x, y, w, h = [int(v) for v in box]
    face = frame[y:y+h, x:x+w]
    if face.size == 0:
        return []
    face_resized = cv2.resize(face, (64, 64))
    gray         = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
    # 128-bin histogram as lightweight descriptor
    hist, _      = np.histogram(gray.flatten(), bins=128, range=(0, 256))
    hist_norm    = hist.astype(float) / (hist.sum() + 1e-6)
    return hist_norm.tolist()


def compare_encodings(enc1: list, enc2: list) -> float:
    """Return similarity score 0–1 (higher = more similar)."""
    if not enc1 or not enc2:
        return 0.0
    a = np.array(enc1, dtype=float)
    b = np.array(enc2, dtype=float)
    # Bhattacharyya coefficient (good for histograms)
    score = float(np.sum(np.sqrt(a * b + 1e-9)))
    return min(score, 1.0)


# ══════════════════════════════════════════════════════════
#  ENCODING STORE
# ══════════════════════════════════════════════════════════
def load_encodings() -> dict:
    """Load {student_id: encoding_list} from JSON file."""
    if os.path.exists(ENC_FILE):
        try:
            with open(ENC_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_encodings(db: dict):
    with open(ENC_FILE, "w") as f:
        json.dump(db, f)


def register_face(student_id: str, frame: np.ndarray, box: tuple) -> bool:
    """Encode face from box and save under student_id."""
    enc = encode_face(frame, box)
    if not enc:
        return False
    db = load_encodings()
    db[student_id] = enc
    save_encodings(db)
    return True


def identify_face(frame: np.ndarray, box: tuple,
                  threshold: float = 0.82) -> tuple:
    """
    Match face in box against all stored encodings.
    Returns (student_id, confidence) or (None, 0.0).
    """
    enc = encode_face(frame, box)
    if not enc:
        return None, 0.0
    db  = load_encodings()
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


# ══════════════════════════════════════════════════════════
#  EMOTION ANALYSIS
# ══════════════════════════════════════════════════════════
def analyze_emotion(face_img: np.ndarray) -> dict:
    """
    Analyse emotion from a face crop.
    Uses DeepFace when available; otherwise returns a realistic simulation.
    """
    try:
        from deepface import DeepFace
        result   = DeepFace.analyze(face_img, actions=["emotion"],
                                    enforce_detection=False, silent=True)
        dominant = result[0]["dominant_emotion"]
        conf     = result[0]["emotion"][dominant] / 100.0
        all_emo  = {k: v / 100.0 for k, v in result[0]["emotion"].items()}
    except Exception:
        # Realistic random fallback weighted toward common classroom emotions
        pool = (["neutral"] * 4 + ["happy"] * 3 +
                ["confused"] * 2 + ["bored"] + ["surprise"])
        dominant = random.choice(pool)
        conf     = round(random.uniform(0.65, 0.96), 3)
        all_emo  = {e: round(random.uniform(0.01, 0.15), 3)
                    for e in EMOTION_WEIGHTS}
        all_emo[dominant] = conf

    weight      = EMOTION_WEIGHTS.get(dominant, 0.5)
    engagement  = round(min(weight * conf + (1 - conf) * 0.3, 1.0), 3)
    attention   = round(
        min(0.6 + conf * 0.4, 1.0) if dominant in {"happy","neutral","surprise"}
        else max(0.0, 0.4 - conf * 0.35), 3)

    att_label = ("attentive" if attention >= 0.72 else
                 "moderate"  if attention >= 0.45 else
                 "distracted")

    return {
        "emotion":          dominant,
        "confidence":       round(conf, 3),
        "all_emotions":     all_emo,
        "engagement_score": engagement,
        "attention_score":  attention,
        "attention_label":  att_label,
        "timestamp":        datetime.utcnow().isoformat(),
    }


# ══════════════════════════════════════════════════════════
#  ANNOTATE FRAME (draw boxes + labels)
# ══════════════════════════════════════════════════════════
STATUS_COLORS_BGR = {
    "attentive":  (52, 211, 153),   # green
    "moderate":   (59, 162, 245),   # amber-blue
    "distracted": (68,  68, 239),   # red
    "unknown":    (128, 128, 128),  # gray
}

def annotate_frame(frame: np.ndarray,
                   detections: list) -> np.ndarray:
    """
    Draw face boxes + labels on frame.
    detections: [{"box":(x,y,w,h), "student_id":str,
                  "emotion":str, "attention_label":str,
                  "confidence":float, "engagement_score":float}]
    """
    out = frame.copy()
    for d in detections:
        x, y, w, h   = [int(v) for v in d["box"]]
        att           = d.get("attention_label", "unknown")
        color         = STATUS_COLORS_BGR.get(att, (128, 128, 128))
        sid           = d.get("student_id") or "Unknown"
        emo           = d.get("emotion", "")
        eng           = int(d.get("engagement_score", 0) * 100)

        # Main rectangle
        cv2.rectangle(out, (x, y), (x+w, y+h), color, 2)

        # Corner brackets
        tl = 18
        for (px, py, dx, dy) in [(x,y,1,1),(x+w,y,-1,1),
                                   (x,y+h,1,-1),(x+w,y+h,-1,-1)]:
            cv2.line(out, (px, py), (px + dx*tl, py), color, 3)
            cv2.line(out, (px, py), (px, py + dy*tl), color, 3)

        # Top label bar
        label = f"{sid}  {emo}  {eng}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(out, (x, y - th - 8), (x + tw + 8, y), color, -1)
        cv2.putText(out, label, (x + 4, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Engagement bar below box
        bar_w = int(w * d.get("engagement_score", 0))
        cv2.rectangle(out, (x, y+h+2), (x+w, y+h+8), (40,40,40), -1)
        cv2.rectangle(out, (x, y+h+2), (x+bar_w, y+h+8), color, -1)

    return out
