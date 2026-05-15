"""
Import Students from Excel with Face Photos
============================================
Reads an Excel file with student data and face photos,
registers them in the system with face recognition enabled.

Excel format required:
- ID, Name, Department, Year, Email, Photo_Path

Usage:
    python import_students.py students_import.xlsx
"""

import sys
import os
import pandas as pd
import cv2

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gui.data_store import DataStore
from gui import face_engine as fe


def import_students_from_excel(excel_path: str):
    """Import students from Excel file with face photos."""
    
    if not os.path.exists(excel_path):
        print(f"❌ Error: File not found: {excel_path}")
        return
    
    print(f"📖 Reading Excel file: {excel_path}")
    
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        print("\n💡 Make sure you have openpyxl installed:")
        print("   pip install openpyxl pandas")
        return
    
    # Validate columns
    required_cols = ['Name', 'Department', 'Year', 'Email', 'Photo_Path']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"❌ Missing columns in Excel: {missing}")
        print(f"   Required: {required_cols}")
        return
    
    # Initialize DataStore
    store = DataStore()
    print(f"\n📊 Found {len(df)} students in Excel file\n")
    
    success_count = 0
    fail_count = 0
    
    for idx, row in df.iterrows():
        name = str(row['Name']).strip()
        dept = str(row['Department']).strip()
        year = int(row['Year'])
        email = str(row['Email']).strip()
        photo_path = str(row['Photo_Path']).strip()
        
        print(f"Processing {idx+1}/{len(df)}: {name}")
        
        # Check if photo exists
        if not os.path.exists(photo_path):
            print(f"  ⚠️  Photo not found: {photo_path}")
            # Still add student without face
            student = store.add_student({
                'name': name,
                'dept': dept,
                'year': year,
                'email': email,
                'phone': '',
                'has_face': False
            })
            print(f"  ✅ Added {student['id']} (no face)")
            success_count += 1
            continue
        
        # Read photo
        frame = cv2.imread(photo_path)
        if frame is None:
            print(f"  ❌ Could not read image: {photo_path}")
            fail_count += 1
            continue
        
        # Detect face
        box = fe.largest_face(frame)
        if box is None:
            print(f"  ⚠️  No face detected in photo")
            # Add without face
            student = store.add_student({
                'name': name,
                'dept': dept,
                'year': year,
                'email': email,
                'phone': '',
                'has_face': False
            })
            print(f"  ✅ Added {student['id']} (no face)")
            success_count += 1
            continue
        
        # Add student first
        student = store.add_student({
            'name': name,
            'dept': dept,
            'year': year,
            'email': email,
            'phone': '',
            'has_face': True
        })
        
        # Register face
        success = fe.register_face(student['id'], frame, box)
        
        if success:
            print(f"  ✅ Added {student['id']} with face encoding")
            success_count += 1
        else:
            print(f"  ⚠️  Added {student['id']} but face encoding failed")
            success_count += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Import Complete!")
    print(f"   Successfully imported: {success_count}")
    print(f"   Failed: {fail_count}")
    print(f"   Total students in system: {len(store.students)}")
    print(f"{'='*50}\n")
    print(f"📁 Data saved to: gui/store.json")
    print(f"📁 Face encodings saved to: gui/face_encodings.json")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_students.py <excel_file.xlsx>")
        print("\nExample:")
        print("  python import_students.py students_import.xlsx")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    import_students_from_excel(excel_file)
