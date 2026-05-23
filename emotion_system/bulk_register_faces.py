"""
bulk_register_faces.py
======================
Auto-registers ALL student photos into face_encodings.json using
DeepFace Facenet512 embeddings + MTCNN detection.

Photo sources
─────────────
1. student_photos/S069.jpg, S070.jpg …   → student_id = "S069" etc.  (direct match)
2. student_photos/231014184.0.jpg …       → student_id looked up via DB email
3. student_photo_links.json               → fallback path mapping

Run:  .venv\Scripts\python.exe bulk_register_faces.py
"""

import os, sys, json, sqlite3, time
import cv2
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(__file__)
PHOTOS_DIR  = os.path.join(BASE_DIR, "student_photos")
ENC_FILE    = os.path.join(BASE_DIR, "gui", "face_encodings.json")
LINKS_FILE  = os.path.join(BASE_DIR, "student_photo_links.json")
CSV_FILE    = os.path.join(BASE_DIR, "StudentPicsDataset.csv")
DB_PATH     = os.path.join(BASE_DIR, "backend", "emotion_system.db")

sys.path.insert(0, BASE_DIR)


# ── DB: build numeric-email → student_id map ────────────────────────────────
def build_email_map() -> dict:
    """Returns {numeric_part: student_id} e.g. {'231014184.0': 'S019'}"""
    conn  = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows  = conn.execute(
        "SELECT s.student_id, u.email FROM students s JOIN users u ON u.id=s.user_id"
    ).fetchall()
    conn.close()

    mapping = {}
    for r in rows:
        email = r["email"] or ""
        num   = email.split("@")[0]          # "231014184.0" or "sara.j"
        if num[0].isdigit():
            mapping[num] = r["student_id"]
    return mapping


# ── Facenet512 encoding (same logic as face_engine.py) ──────────────────────
def encode_facenet(face_bgr: np.ndarray) -> list | None:
    """Return L2-normalised 512-d Facenet512 embedding, or None on failure."""
    try:
        from deepface import DeepFace
        result = DeepFace.represent(
            face_bgr,
            model_name="Facenet512",
            enforce_detection=False,
            detector_backend="skip",
        )
        arr  = np.array(result[0]["embedding"], dtype=float)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()
    except Exception as e:
        print(f"    [DeepFace error] {e}")
        return None


# ── MTCNN / Haar face crop ────────────────────────────────────────────────────
_mtcnn = None

def _get_mtcnn():
    global _mtcnn
    if _mtcnn is None:
        try:
            from mtcnn import MTCNN
            _mtcnn = MTCNN()
        except Exception:
            _mtcnn = False
    return _mtcnn if _mtcnn is not False else None


def crop_face(img_bgr: np.ndarray) -> np.ndarray | None:
    """
    Detect the largest face and return the cropped BGR region.
    Tries MTCNN first, falls back to Haar cascade.
    Returns None if no face found.
    """
    h, w = img_bgr.shape[:2]

    # ── MTCNN ──────────────────────────────────────────────────────────────
    detector = _get_mtcnn()
    if detector:
        try:
            rgb     = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            results = detector.detect_faces(rgb)
            if results:
                best = max(results, key=lambda r: r["box"][2] * r["box"][3])
                if best["confidence"] >= 0.80:
                    x, y, bw, bh = best["box"]
                    x = max(0, x); y = max(0, y)
                    bw = min(bw, w - x); bh = min(bh, h - y)
                    if bw > 20 and bh > 20:
                        return img_bgr[y: y+bh, x: x+bw]
        except Exception:
            pass

    # ── Haar fallback ───────────────────────────────────────────────────────
    gray    = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) > 0:
        x, y, bw, bh = max(faces, key=lambda f: f[2] * f[3])
        return img_bgr[y: y+bh, x: x+bw]

    # ── Last resort: use full image (passport-style photos) ─────────────────
    # If face detection fails, crop the centre 60% of the image
    cy, cx = h // 2, w // 2
    margin_y, margin_x = int(h * 0.20), int(w * 0.20)
    return img_bgr[margin_y: h-margin_y, margin_x: w-margin_x]


# ── Update students table face_encoding column ───────────────────────────────
def update_db_encoding(student_id: str, photo_path: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "UPDATE students SET photo_path=? WHERE student_id=?",
            (photo_path, student_id),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 65)
    print("  EduSense — Bulk Face Registration")
    print("  Engine: MTCNN + DeepFace Facenet512")
    print("=" * 65)

    # 1. Build mappings
    print("\n[1/4] Building student ID ↔ photo mappings …")
    email_map = build_email_map()          # {"231014184.0": "S019", …}
    print(f"      DB email map: {len(email_map)} numeric students")

    photo_link_map = {}
    if os.path.exists(LINKS_FILE):
        try:
            photo_link_map = json.load(open(LINKS_FILE, encoding="utf-8"))
        except Exception:
            pass
    print(f"      photo_links.json: {len(photo_link_map)} entries")

    # 2. Collect all photo files → (student_id, abs_path) pairs
    print("\n[2/4] Scanning student_photos/ …")
    tasks: list[tuple[str, str]] = []      # [(student_id, path), …]

    for fname in sorted(os.listdir(PHOTOS_DIR)):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        fpath  = os.path.join(PHOTOS_DIR, fname)
        stem   = os.path.splitext(fname)[0]      # "S069" or "231014184.0"

        if stem.upper().startswith("S"):
            # Direct match: S069 → "S069"
            sid = stem.upper()
            tasks.append((sid, fpath))
        elif stem[0].isdigit():
            # Numeric: look up via email map
            sid = email_map.get(stem)
            if sid:
                tasks.append((sid, fpath))
            else:
                # Try stripping the ".0" suffix
                stem2 = stem.rstrip("0").rstrip(".")
                sid   = email_map.get(stem2)
                if sid:
                    tasks.append((sid, fpath))
                else:
                    print(f"  ⚠  No DB match for photo: {fname}")

    print(f"      {len(tasks)} photos to encode")

    # 3. Load existing encodings (don't wipe previously registered faces)
    existing = {}
    if os.path.exists(ENC_FILE):
        try:
            existing = json.load(open(ENC_FILE, encoding="utf-8"))
        except Exception:
            pass
    print(f"      {len(existing)} already in encodings file")

    # 4. Encode each photo
    print("\n[3/4] Encoding faces with Facenet512 …")
    print("      (first call loads TensorFlow — takes ~10 s)")
    encodings  = dict(existing)
    ok = skipped = failed = 0
    t0 = time.time()

    for idx, (sid, path) in enumerate(tasks, 1):
        img = cv2.imread(path)
        if img is None:
            print(f"  [{idx:3}/{len(tasks)}] ✗ UNREADABLE  {sid}")
            failed += 1
            continue

        face_crop = crop_face(img)
        if face_crop is None or face_crop.size == 0:
            print(f"  [{idx:3}/{len(tasks)}] ✗ NO FACE     {sid}")
            failed += 1
            continue

        enc = encode_facenet(face_crop)
        if enc is None:
            print(f"  [{idx:3}/{len(tasks)}] ✗ ENC FAILED  {sid}")
            failed += 1
            continue

        encodings[sid] = enc
        update_db_encoding(sid, path)

        elapsed = time.time() - t0
        per_img = elapsed / idx
        eta     = int(per_img * (len(tasks) - idx))
        print(f"  [{idx:3}/{len(tasks)}] ✓ {sid:6}  — ETA {eta}s")
        ok += 1

        # Save every 10 students (crash recovery)
        if idx % 10 == 0:
            with open(ENC_FILE, "w", encoding="utf-8") as f:
                json.dump(encodings, f)

    # Final save
    print("\n[4/4] Saving face_encodings.json …")
    with open(ENC_FILE, "w", encoding="utf-8") as f:
        json.dump(encodings, f)

    total_time = int(time.time() - t0)
    print()
    print("=" * 65)
    print(f"  Done in {total_time}s")
    print(f"  ✓ Registered : {ok}")
    print(f"  ✗ Failed     : {failed}")
    print(f"  Total in DB  : {len(encodings)}")
    print("=" * 65)
    print()
    print("  Restart face_server.py to load the new encodings.")
    print("  Command: .venv\\Scripts\\python.exe face_server.py")


if __name__ == "__main__":
    main()
