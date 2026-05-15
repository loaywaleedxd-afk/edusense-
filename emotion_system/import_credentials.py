"""
Import User Credentials from CSV
=================================
Reads user login credentials from CSV and adds them to the system.

CSV Format:
-----------
Username,Password,Role,Name,Email
admin,admin123,admin,System Administrator,admin@university.edu
dr.smith,password123,doctor,Dr. John Smith,john.smith@university.edu
s001,student123,student,Ahmed Ali,ahmed.ali@university.edu
parent1,parent123,parent,Parent of Ahmed,parent@university.edu

Usage:
    python import_credentials.py credentials.csv
"""

import sys
import os
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
    
    # Validate columns
    required_cols = ['Username', 'Password', 'Role', 'Name']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"❌ Missing columns: {missing}")
        print(f"   Required: {required_cols}")
        return
    
    print(f"Found {len(df)} users in CSV\n")
    print(f"{'='*70}")
    
    # Initialize DataStore
    store = DataStore()
    
    success_count = 0
    fail_count = 0
    
    for idx, row in df.iterrows():
        username = str(row['Username']).strip()
        password = str(row['Password']).strip()
        role = str(row['Role']).strip().lower()
        name = str(row['Name']).strip()
        email = str(row.get('Email', '')).strip()
        
        print(f"[{idx+1}/{len(df)}] {name} ({username})")
        
        # Check if user already exists
        existing = store.authenticate(username, password)
        if existing and existing['username'] == username:
            print(f"  ⚠️  User already exists, updating...")
        
        # Add user based on role
        user_data = {
            'username': username,
            'password': password,
            'role': role,
            'name': name,
            'email': email
        }
        
        if role == 'student':
            # Add as student
            student = {
                'name': name,
                'dept': row.get('Department', 'Computer Science'),
                'year': int(row.get('Year', 1)),
                'email': email,
                'phone': row.get('Phone', ''),
                'has_face': False
            }
            s = store.add_student(student)
            
            # Update credentials
            for user in store.users:
                if user['username'] == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    break
            else:
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
            # Add as doctor
            doctor = {
                'name': name,
                'title': row.get('Title', 'Lecturer'),
                'dept': row.get('Department', 'Computer Science'),
                'email': email,
                'phone': row.get('Phone', ''),
            }
            d = store.add_doctor(doctor)
            
            # Update credentials
            for user in store.users:
                if user['username'] == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    break
            else:
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
            # Add/update user credentials
            found = False
            for user in store.users:
                if user['username'] == username:
                    user['password'] = password
                    user['name'] = name
                    user['email'] = email
                    user['role'] = role
                    found = True
                    break
            
            if not found:
                store.users.append(user_data)
            
            print(f"  ✅ Added {role}: {username}")
            success_count += 1
        else:
            print(f"  ❌ Invalid role: {role}")
            fail_count += 1
            continue
    
    # Save all changes
    store._save()
    
    print(f"\n{'='*70}")
    print(f"✅ Import Complete!")
    print(f"   Successfully imported: {success_count}")
    print(f"   Failed: {fail_count}")
    print(f"   Total users: {len(store.users)}")
    print(f"{'='*70}\n")
    print(f"📁 Data saved to: gui/store.json")
    print(f"\n🔐 Login Credentials Imported:")
    print(f"   You can now login with the usernames/passwords from the CSV")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_credentials.py <credentials.csv>")
        print("\nExample CSV format:")
        print("Username,Password,Role,Name,Email,Department,Year")
        print("admin,admin123,admin,System Admin,admin@uni.edu,,")
        print("dr.smith,pass123,doctor,Dr. Smith,smith@uni.edu,CS,")
        print("s001,student123,student,Ahmed Ali,ahmed@uni.edu,CS,2")
        print("parent1,parent123,parent,Ahmed's Parent,parent@uni.edu,,")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    import_credentials(csv_file)
