"""
download_all_photos.py
======================
Downloads ALL student photos from Google Drive to your laptop.
Saves them in student_photos/ folder named by store ID (S019.jpg etc.)

Run from project root:
    cd D:/download/portal/emotion_system
    python download_all_photos.py

Requirements:
    pip install requests pillow
"""

import os, sys, json, csv, time
import requests
from io import BytesIO
from PIL import Image

# ── Paths ──────────────────────────────────────────────────
STORE_PATH   = "gui/store.json"
CSV_PATH     = "StudentPicsDataset.csv"
PHOTOS_DIR   = "student_photos"
LINKS_PATH   = "student_photo_links.json"


def gdrive_urls(link: str):
    """Return list of URLs to try for a Google Drive file."""
    fid = ""
    if "id=" in link:
        fid = link.split("id=")[1].split("&")[0]
    elif "/d/" in link:
        fid = link.split("/d/")[1].split("/")[0]
    if not fid:
        return []
    return [
        f"https://lh3.googleusercontent.com/d/{fid}",          # fastest
        f"https://drive.google.com/uc?export=download&id={fid}", # fallback
    ]


def download_image(link: str, save_path: str) -> bool:
    """Download image from Google Drive and save as JPEG."""
    urls = gdrive_urls(link)
    if not urls:
        return False

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    for url in urls:
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 1000:
                img = Image.open(BytesIO(resp.content)).convert("RGB")
                # Crop to square and resize
                w, h = img.size
                m = min(w, h)
                img = img.crop(((w-m)//2, (h-m)//2, (w+m)//2, (h+m)//2))
                img = img.resize((300, 300), Image.LANCZOS)
                img.save(save_path, "JPEG", quality=90)
                return True
        except Exception as e:
            continue  # try next URL

    return False


def main():
    # ── Load store ────────────────────────────────────────
    if not os.path.exists(STORE_PATH):
        print(f"❌ store.json not found at: {STORE_PATH}")
        print("   Make sure you run from: D:/download/portal/emotion_system")
        sys.exit(1)

    with open(STORE_PATH, encoding="utf-8") as f:
        store = json.load(f)
    students = store["students"]

    # ── Build email → store_id map ────────────────────────
    email_to_sid = {}
    for s in students:
        num = s.get("email", "").split("@")[0].replace(".0", "").strip()
        if num.isdigit():
            email_to_sid[num] = s["id"]

    # ── Read CSV ──────────────────────────────────────────
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV not found: {CSV_PATH}")
        sys.exit(1)

    csv_data = []
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            uid  = str(row.get("Student ID", "")).strip()
            name = str(row.get("Student Name", "")).strip()
            link = str(row.get("Photo Link", "")).strip()
            if uid.isdigit() and link:
                sid = email_to_sid.get(uid)
                if sid:
                    csv_data.append({"sid": sid, "uid": uid, "name": name, "link": link})

    print(f"\n📋 Found {len(csv_data)} students with photo links")

    # ── Create folder ─────────────────────────────────────
    os.makedirs(PHOTOS_DIR, exist_ok=True)

    # ── Download ──────────────────────────────────────────
    success  = 0
    failed   = 0
    skipped  = 0
    sid_to_path = {}

    print(f"{'='*60}")
    print(f"📥 Downloading photos to: {os.path.abspath(PHOTOS_DIR)}/")
    print(f"{'='*60}\n")

    for i, row in enumerate(csv_data):
        sid  = row["sid"]
        name = row["name"]
        link = row["link"]

        # File path
        save_path = os.path.join(PHOTOS_DIR, f"{sid}.jpg")
        sid_to_path[sid] = save_path

        # Skip if already downloaded
        if os.path.exists(save_path) and os.path.getsize(save_path) > 1000:
            print(f"  ⏭️  [{i+1:3d}/{len(csv_data)}] {name} ({sid}) — already exists")
            skipped += 1
            continue

        print(f"  📥 [{i+1:3d}/{len(csv_data)}] {name} ({sid})... ", end="", flush=True)

        ok = download_image(link, save_path)
        if ok:
            size_kb = os.path.getsize(save_path) // 1024
            print(f"✅ {size_kb}KB")
            success += 1
        else:
            print("❌ Failed")
            failed += 1

        # Small delay to avoid rate limiting
        time.sleep(0.3)

    # ── Save local photo links JSON ───────────────────────
    local_links = {}
    for row in csv_data:
        sid = row["sid"]
        path = os.path.join(PHOTOS_DIR, f"{sid}.jpg")
        if os.path.exists(path):
            local_links[sid] = path  # LOCAL path, not URL!

    with open(LINKS_PATH, "w", encoding="utf-8") as f:
        json.dump(local_links, f, indent=2, ensure_ascii=False)

    # ── Summary ───────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✅ Download Complete!")
    print(f"   Downloaded:  {success}")
    print(f"   Skipped:     {skipped} (already existed)")
    print(f"   Failed:      {failed}")
    print(f"   Total local: {success + skipped}")
    print(f"\n📁 Photos saved in: {os.path.abspath(PHOTOS_DIR)}/")
    print(f"📄 Links JSON:      {os.path.abspath(LINKS_PATH)}")
    print(f"{'='*60}")

    if failed > 0:
        print(f"\n⚠️  {failed} photos failed. Run script again to retry.")

    print("\n✅ Your app will now use LOCAL photos (fast, no internet needed!)")


if __name__ == "__main__":
    main()
