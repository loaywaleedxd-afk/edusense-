"""
Import User Credentials from CSV - FINAL FIX
===========================================
No _save() dependency - writes directly to store.json
"""

import sys
import os
import json
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gui.data_store import DataStore


def import_credentials(csv_path: str):
    """Import user credentials from CSV file."""
    
    if not os.path.exists(csv_path):
        print(f"❌ Error: File not found: {csv_path}")
        return
    
    print(f"📖 Reading credentials from: {csv_path}\n")
    
    try:
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return
    
    required_cols = ['Username', 'Password', 'Role', 'Name']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"❌ Missing columns: {missing}")
        return
    
    print(f"Found {len(df)} users in CSV\n")
    print(f"{'='*70}")
    
    store = DataStore()
    
    success_count = 0
    
    for idx, row in df.iterrows():
        username = str(row['Username']).strip()
        password = str(row['Password']).strip()
        role = str(row['Role']).strip().lower()
        name = str(row['Name']).strip()
        email = str(row.get('Email', '')).strip()
        
        print(f"[{idx+1}/{len(df)}] {name} ({username})")
        
        if role == 'student':
            student = {
                'name': name,
                'dept': str(row.get('Department', 'Computer Science')),
                'year': int(row.get('Year', 1)),
                'email': email,
                'phone': str(row.get('Phone', '')),
                'has_face': False
            }
            s = store.add_student(student)
            
            user_exists = False
            for user in store.users:
                if user.get('username') == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    user_exists = True
                    break
            
            if not user_exists:
                store.users.append({
                    'username': username,
                    'password': password,
                    'role': 'student',
                    'name': name,
                    'email': email,
                    'student_id': s['id']
                })
            
            print(f"  ✅ Added student: {s['id']}")
            success_count += 1
            
        elif role == 'doctor':
            doctor = {
                'name': name,
                'title': str(row.get('Title', 'Lecturer')),
                'dept': str(row.get('Department', 'Computer Science')),
                'email': email,
                'phone': str(row.get('Phone', '')),
            }
            d = store.add_doctor(doctor)
            
            user_exists = False
            for user in store.users:
                if user.get('username') == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    user_exists = True
                    break
            
            if not user_exists:
                store.users.append({
                    'username': username,
                    'password': password,
                    'role': 'doctor',
                    'name': name,
                    'email': email,
                    'doctor_id': d['id']
                })
            
            print(f"  ✅ Added doctor: {d['id']}")
            success_count += 1
            
        elif role in ['admin', 'parent']:
            user_exists = False
            for user in store.users:
                if user.get('username') == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    user['role'] = role
                    user_exists = True
                    break
            
            if not user_exists:
                store.users.append({
                    'username': username,
                    'password': password,
                    'role': role,
                    'name': name,
                    'email': email
                })
            
            print(f"  ✅ Added {role}: {username}")
            success_count += 1
    
    # Manually save to store.json
    try:
        store_path = 'gui/store.json'
        with open(store_path, 'w', encoding='utf-8') as f:
            json.dump({
                'students': store.students,
                'doctors': store.doctors,
                'users': store.users,
                'attendance': store.attendance,
            }, f, indent=2, ensure_ascii=False)
        print(f"\n{'='*70}")
        print(f"✅ Import Complete!")
        print(f"   Successfully imported: {success_count}")
        print(f"   Total users: {len(store.users)}")
        print(f"{'='*70}\n")
        print(f"📁 Data saved to: {store_path}")
        print(f"\n🔐 You can now login with the imported credentials!")
    except Exception as e:
        print(f"❌ Error saving: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_credentials.py <credentials.csv>")
        sys.exit(1)
    
    import_credentials(sys.argv[1])
