"""
Download All Student Photos from CSV
=====================================
Downloads all photos from Google Drive links in StudentPicsDataset.csv
and saves them to a local 'student_photos' folder.

Usage:
    python download_photos.py StudentPicsDataset.csv
"""

import sys
import os
import pandas as pd
import requests
from io import BytesIO
from PIL import Image


def download_google_drive_image(url: str, save_path: str) -> bool:
    """Download image from Google Drive link and save locally."""
    try:
        # Extract file ID from Google Drive URL
        if 'id=' in url:
            file_id = url.split('id=')[1].split('&')[0]
        elif '/d/' in url:
            file_id = url.split('/d/')[1].split('/')[0]
        else:
            print(f"  ⚠️  Invalid Google Drive URL format")
            return False
        
        # Direct download URL
        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        # Download image
        response = requests.get(download_url, timeout=30)
        
        if response.status_code != 200:
            print(f"  ⚠️  Download failed (HTTP {response.status_code})")
            return False
        
        # Save image
        image = Image.open(BytesIO(response.content))
        image.save(save_path)
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def download_all_photos(csv_path: str):
    """Download all student photos from CSV."""
    
    if not os.path.exists(csv_path):
        print(f"❌ Error: File not found: {csv_path}")
        return
    
    # Create photos folder
    photos_dir = "student_photos"
    os.makedirs(photos_dir, exist_ok=True)
    
    print(f"📖 Reading CSV file: {csv_path}\n")
    
    try:
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return
    
    print(f"Found {len(df)} students")
    print(f"📁 Saving photos to: {photos_dir}/\n")
    print(f"{'='*70}")
    
    success_count = 0
    fail_count = 0
    
    for idx, row in df.iterrows():
        student_id = str(row['Student ID']).strip()
        name = str(row['Student Name']).strip()
        photo_url = str(row['Photo Link']).strip()
        
        # Create filename from student ID
        filename = f"{student_id}.jpg"
        filepath = os.path.join(photos_dir, filename)
        
        print(f"[{idx+1}/{len(df)}] {name} ({student_id})")
        print(f"  📥 Downloading...")
        
        if download_google_drive_image(photo_url, filepath):
            print(f"  ✅ Saved to: {filename}")
            success_count += 1
        else:
            print(f"  ❌ Failed")
            fail_count += 1
        
        print()
    
    print(f"{'='*70}")
    print(f"✅ Download Complete!")
    print(f"   Successfully downloaded: {success_count}")
    print(f"   Failed: {fail_count}")
    print(f"   Photos saved in: {photos_dir}/")
    print(f"{'='*70}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python download_photos.py <csv_file.csv>")
        print("\nExample:")
        print("  python download_photos.py StudentPicsDataset.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    # Check if requests is installed
    try:
        import requests
    except ImportError:
        print("❌ Error: 'requests' package not installed")
        print("\nInstall it with:")
        print("  pip install requests")
        sys.exit(1)
    
    download_all_photos(csv_file)
