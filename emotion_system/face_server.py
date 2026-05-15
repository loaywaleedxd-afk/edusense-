"""
face_server.py — Real face detection & emotion analysis server
Uses your existing gui/face_engine.py (OpenCV Haar cascade + histogram encoding)

Run:  .venv\Scripts\python.exe face_server.py
      — or —
      python face_server.py  (if venv is activated)

Endpoints:
  GET  /health    — connection check
  POST /analyze   — detect faces + emotions in a base64 frame
  POST /register  — register a student's face encoding
"""

import json
import sys
import os
import base64
from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import http.server

class ThreadingHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

# Ensure gui/ is importable
sys.path.insert(0, os.path.dirname(__file__))

from gui.face_engine import (
    detect_faces,
    encode_face,
    identify_face,
    register_face,
    analyze_emotion,
    load_encodings,
)
import cv2
import numpy as np

EMOTIONS_DIR = os.path.join(os.path.dirname(__file__), "student_emotions")
os.makedirs(EMOTIONS_DIR, exist_ok=True)

PORT = 8765


# ── Helpers ────────────────────────────────────────────────────────────────────

def decode_frame(b64: str):
    """base64 data-URL or raw base64 → BGR numpy array, or None."""
    try:
        raw = base64.b64decode(b64.split(",")[-1])
        arr = np.frombuffer(raw, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def save_emotion_record(student_id: str, course_id: str, emotion: str,
                        confidence: float, engagement: float, attention: float,
                        timestamp: str):
    path = os.path.join(EMOTIONS_DIR, f"{student_id}.json")
    records = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                records = json.load(f)
        except Exception:
            pass
    records.append({
        "emotion":          emotion,
        "confidence":       round(confidence, 3),
        "engagement_score": round(engagement, 3),
        "attention_score":  round(attention, 3),
        "course_id":        course_id or "",
        "timestamp":        timestamp,
    })
    with open(path, "w") as f:
        json.dump(records, f, indent=2)


# ── Request handler ─────────────────────────────────────────────────────────────

class FaceHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass  # silence default per-request logs

    # CORS pre-flight
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

    # ── GET ──────────────────────────────────────────────────────────────────

    def do_GET(self):
        if self.path == "/health":
            registered = len(load_encodings())
            self._send_json({
                "status": "ok",
                "engine": "OpenCV Haar + histogram encoding",
                "registered_students": registered,
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

    # ── /analyze ──────────────────────────────────────────────────────────────

    def _analyze(self, body):
        frame_b64 = body.get("frame", "")
        course_id = body.get("course_id", "")

        frame = decode_frame(frame_b64)
        if frame is None:
            self._send_json({"error": "invalid frame"}, 400)
            return

        h_f, w_f = frame.shape[:2]
        faces = detect_faces(frame)          # [(x,y,w,h), ...]
        detections = []

        for box in faces:
            x, y, w, h = [int(v) for v in box]
            face_crop = frame[y: y+h, x: x+w]

            emo_data = analyze_emotion(face_crop)

            # Face recognition against registered students
            student_id, rec_conf = identify_face(frame, tuple(box))

            # Mirror x for CSS-mirrored video overlay
            mirror_x = w_f - x - w
            det = {
                "box": {
                    "x": round(mirror_x / w_f * 100, 2),
                    "y": round(y      / h_f * 100, 2),
                    "w": round(w      / w_f * 100, 2),
                    "h": round(h      / h_f * 100, 2),
                },
                "student_id":            student_id,
                "recognition_confidence": round(rec_conf, 3),
                "emotion":               emo_data["emotion"],
                "confidence":            emo_data["confidence"],
                "all_emotions":          emo_data.get("all_emotions", {}),
                "engagement_score":      emo_data["engagement_score"],
                "attention_score":       emo_data["attention_score"],
                "attention_label":       emo_data["attention_label"],
                "timestamp":             emo_data["timestamp"],
            }
            detections.append(det)

            # Auto-save emotion record
            if student_id:
                try:
                    save_emotion_record(
                        student_id, course_id,
                        emo_data["emotion"], emo_data["confidence"],
                        emo_data["engagement_score"], emo_data["attention_score"],
                        emo_data["timestamp"],
                    )
                except Exception:
                    pass

        self._send_json({"total_faces": len(faces), "detections": detections})

    # ── /register ─────────────────────────────────────────────────────────────

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

        box     = max(faces, key=lambda f: f[2] * f[3])   # largest face
        success = register_face(student_id, frame, tuple(box))

        if success:
            total = len(load_encodings())
            print(f"  ✅ Registered face for {student_id} ({total} total)")
            self._send_json({"ok": True, "student_id": student_id, "registered_total": total})
        else:
            self._send_json({"error": "encoding failed"}, 500)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  EduSense Face Recognition Server")
    print(f"  Listening on  http://localhost:{PORT}")
    print(f"  Encodings at  gui/face_encodings.json")
    print(f"  Emotions at   student_emotions/<id>.json")
    print("=" * 60)
    registered = len(load_encodings())
    print(f"  Registered students: {registered}")
    print("  Ctrl+C to stop\n")

    server = ThreadingHTTPServer(("0.0.0.0", PORT), FaceHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
