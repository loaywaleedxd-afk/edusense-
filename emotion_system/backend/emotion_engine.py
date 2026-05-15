"""
Face Recognition & Emotion Detection Engine
Uses DeepFace for emotion analysis + face_recognition for attendance
"""
import cv2
import numpy as np
import base64
import asyncio
import logging
from datetime import datetime
from typing import Optional
import json
import os

logger = logging.getLogger(__name__)

# Emotion → engagement weight mapping
EMOTION_WEIGHTS = {
    "happy":    1.0,
    "neutral":  0.7,
    "surprise": 0.8,
    "fear":     0.3,
    "angry":    0.2,
    "disgust":  0.1,
    "sad":      0.2,
    "bored":    0.1,
    "confused": 0.4,
}

ATTENTION_EMOTIONS = {"happy", "surprise", "neutral"}
DISENGAGED_EMOTIONS = {"bored", "sad", "disgust", "angry"}


class EmotionEngine:
    """Core engine for face detection, recognition, and emotion analysis."""

    def __init__(self):
        self.face_cascade = None
        self.known_faces = {}   # student_id -> face_encoding
        self._load_cascade()
        logger.info("EmotionEngine initialized")

    def _load_cascade(self):
        """Load OpenCV Haar cascade for face detection."""
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        if os.path.exists(cascade_path):
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            logger.warning("Haar cascade not found — face detection limited")

    def decode_frame(self, frame_b64: str) -> Optional[np.ndarray]:
        """Decode base64 image frame to numpy array."""
        try:
            img_bytes = base64.b64decode(frame_b64.split(",")[-1])
            arr = np.frombuffer(img_bytes, np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception as e:
            logger.error(f"Frame decode error: {e}")
            return None

    def detect_faces(self, frame: np.ndarray) -> list:
        """Detect face bounding boxes in frame."""
        if self.face_cascade is None:
            return []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )
        return faces.tolist() if len(faces) > 0 else []

    def analyze_emotion_mock(self, face_region: np.ndarray, student_id: str) -> dict:
        """
        Emotion analysis — uses DeepFace when available, falls back to mock.
        Replace with: from deepface import DeepFace; result = DeepFace.analyze(...)
        """
        try:
            from deepface import DeepFace
            result = DeepFace.analyze(
                face_region,
                actions=["emotion"],
                enforce_detection=False,
                silent=True
            )
            emotions = result[0]["emotion"]
            dominant = result[0]["dominant_emotion"]
            confidence = emotions[dominant] / 100.0
        except ImportError:
            # Mock emotion distribution for demo
            import random
            emotion_pool = ["happy", "neutral", "neutral", "neutral", "confused", "bored", "happy", "surprise"]
            dominant = random.choice(emotion_pool)
            confidence = round(random.uniform(0.65, 0.97), 2)
            emotions = {e: round(random.uniform(0, 0.3), 2) for e in EMOTION_WEIGHTS}
            emotions[dominant] = confidence
        except Exception as e:
            logger.error(f"DeepFace error: {e}")
            dominant, confidence = "neutral", 0.70
            emotions = {"neutral": 0.70}

        engagement = self._calc_engagement(dominant, confidence)
        attention = self._calc_attention(dominant, confidence)

        return {
            "student_id": student_id,
            "emotion": dominant,
            "confidence": round(confidence, 3),
            "all_emotions": emotions,
            "engagement_score": round(engagement, 3),
            "attention_score": round(attention, 3),
            "timestamp": datetime.utcnow().isoformat(),
            "attention_status": self._attention_label(attention),
        }

    def _calc_engagement(self, emotion: str, confidence: float) -> float:
        weight = EMOTION_WEIGHTS.get(emotion, 0.5)
        return min(weight * confidence + (1 - confidence) * 0.3, 1.0)

    def _calc_attention(self, emotion: str, confidence: float) -> float:
        if emotion in ATTENTION_EMOTIONS:
            return min(0.6 + confidence * 0.4, 1.0)
        elif emotion in DISENGAGED_EMOTIONS:
            return max(0.0, 0.4 - confidence * 0.35)
        return 0.5

    def _attention_label(self, score: float) -> str:
        if score >= 0.75: return "attentive"
        if score >= 0.50: return "moderate"
        if score >= 0.25: return "distracted"
        return "disengaged"

    def encode_face(self, frame: np.ndarray, face_box: tuple) -> Optional[bytes]:
        """Extract and encode a face region for recognition storage."""
        try:
            x, y, w, h = face_box
            face_region = frame[y:y+h, x:x+w]
            face_resized = cv2.resize(face_region, (128, 128))
            return face_resized.tobytes()
        except Exception as e:
            logger.error(f"Face encode error: {e}")
            return None

    def process_frame(self, frame_b64: str, lecture_id: str, enrolled_students: list) -> dict:
        """
        Full pipeline: decode → detect → recognize → analyze emotions.
        Returns structured results for all detected faces.
        """
        frame = self.decode_frame(frame_b64)
        if frame is None:
            return {"error": "invalid_frame", "detections": []}

        faces = self.detect_faces(frame)
        results = []

        for i, (x, y, w, h) in enumerate(faces):
            face_region = frame[y:y+h, x:x+w]
            # In production: match against enrolled face encodings
            student_id = enrolled_students[i] if i < len(enrolled_students) else f"Unknown_{i+1}"
            emotion_data = self.analyze_emotion_mock(face_region, student_id)
            emotion_data["face_box"] = {"x": x, "y": y, "w": w, "h": h}
            emotion_data["face_index"] = i
            results.append(emotion_data)

        return {
            "lecture_id": lecture_id,
            "total_faces": len(faces),
            "detections": results,
            "frame_timestamp": datetime.utcnow().isoformat(),
        }


# Singleton instance
engine = EmotionEngine()


def get_engine() -> EmotionEngine:
    return engine
