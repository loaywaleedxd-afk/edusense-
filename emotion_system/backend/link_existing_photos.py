"""
link_existing_photos.py
=======================
Scans student_photos/ on disk and updates the photo_path column
in BOTH public.students and aast.students for every student whose
photo file already exists.

Run once after migration:
    python link_existing_photos.py
"""
import asyncio
import os
import asyncpg

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://edusense:edusense123@localhost:5432/edusense",
)

PHOTOS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'student_photos')
)
SCHEMAS = ["public", "aast"]


async def main():
    print("Scanning:", PHOTOS_DIR)

    # Collect photos in root of student_photos/ (old format: {sid}.jpg)
    photo_map = {}  # student_id -> url_path
    for fname in os.listdir(PHOTOS_DIR):
        if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            sid = os.path.splitext(fname)[0]
            photo_map[sid] = f'/photos/{fname}'

    print(f"Found {len(photo_map)} photo files on disk")

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        total = 0
        for schema in SCHEMAS:
            # Get all students with null photo_path in this schema
            rows = await conn.fetch(
                f'SELECT student_id FROM "{schema}".students WHERE photo_path IS NULL'
            )
            updated = 0
            for row in rows:
                sid = row['student_id']
                if sid in photo_map:
                    await conn.execute(
                        f'UPDATE "{schema}".students SET photo_path=$1 WHERE student_id=$2',
                        photo_map[sid], sid,
                    )
                    updated += 1
            print(f"  {schema}: updated {updated} / {len(rows)} students")
            total += updated

        print(f"\nDone. {total} students now have photo_path set.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
