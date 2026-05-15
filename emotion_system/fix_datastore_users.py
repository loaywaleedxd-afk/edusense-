"""
Import Students from CSV with Google Drive Photos - FIXED
"""
import sys, os, pandas as pd, cv2, numpy as np, requests
from io import BytesIO
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gui.data_store import DataStore
from gui import face_engine as fe


def download_image(url):
    try:
        if 'id=' in url:
            file_id = url.split('id=')[1].split('&')[0]
        elif '/d/' in url:
            file_id = url.split('/d/')[1].split('/')[0]
        else:
            return None

        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        response = requests.get(download_url, timeout=30)

        if response.status_code != 200 or len(response.content) < 1000:
            return None

        # Open with PIL
        img = Image.open(BytesIO(response.content))

        # Always convert to RGB first
        img = img.convert('RGB')

        # Convert to numpy array
        arr = np.array(img)

        # Convert RGB to BGR for OpenCV
        bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

        return bgr

    except Exception as e:
        return None


def import_students_from_csv(csv_path):
    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path}")
        return

    print(f"📖 Reading: {csv_path}\n")

    try:
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return

    print(f"Found {len(df)} students\n{'='*60}")

    store = DataStore()
    success = 0
    no_face = 0

    for idx, row in df.iterrows():
        student_id = str(row['Student ID']).strip()
        name = str(row['Student Name']).strip()
        photo_url = str(row['Photo Link']).strip()

        print(f"\n[{idx+1}/{len(df)}] {name} ({student_id})")

        # Download photo
        print(f"  📥 Downloading...")
        frame = download_image(photo_url)

        if frame is None:
            print(f"  ⚠️  Download failed - adding without face")
            student = store.add_student({
                'name': name, 'dept': 'Computer Science',
                'year': 2, 'email': f"{student_id}@university.edu",
                'phone': '', 'has_face': False
            })
            print(f"  ✅ Added {student['id']}")
            no_face += 1
            continue

        # Detect face
        print(f"  🔍 Detecting face...")
        try:
            box = fe.largest_face(frame)
        except Exception as e:
            print(f"  ⚠️  Face detection failed: {e}")
            box = None

        if box is None:
            print(f"  ⚠️  No face detected")
            student = store.add_student({
                'name': name, 'dept': 'Computer Science',
                'year': 2, 'email': f"{student_id}@university.edu",
                'phone': '', 'has_face': False
            })
            print(f"  ✅ Added {student['id']} (no face)")
            no_face += 1
            continue

        # Add student and register face
        student = store.add_student({
            'name': name, 'dept': 'Computer Science',
            'year': 2, 'email': f"{student_id}@university.edu",
            'phone': '', 'has_face': True
        })

        print(f"  🧠 Registering face...")
        try:
            ok = fe.register_face(student['id'], frame, box)
            if ok:
                print(f"  ✅ Added {student['id']} WITH face recognition!")
                success += 1
            else:
                print(f"  ⚠️  Added {student['id']} (face encoding failed)")
                no_face += 1
        except Exception as e:
            print(f"  ⚠️  Face registration error: {e}")
            no_face += 1

    print(f"\n{'='*60}")
    print(f"✅ Import Complete!")
    print(f"   With face: {success}")
    print(f"   Without face: {no_face}")
    print(f"   Total: {len(store.students)}")
    print(f"{'='*60}")
    print(f"📁 Saved to: gui/store.json")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_from_csv.py StudentPicsDataset.csv")
        sys.exit(1)
    import_students_from_csv(sys.argv[1])
