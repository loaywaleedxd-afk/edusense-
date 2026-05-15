#!/usr/bin/env python3
"""
═════════════════════════════════════════════════════════════════
COMPLETE EXAMPLE - Admin & Doctor Pages with Photos
═════════════════════════════════════════════════════════════════
Standalone demo showing all features working together
"""

import json
import os
import sys
from datetime import datetime

# Import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from admin_doctor_manager import AdminDoctorManager
from student_photo_display import StudentPhotoDisplay


def print_header(title):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def demo_add_doctors():
    """Demo: Add multiple doctors with credentials"""
    print_header("DEMO 1: ADDING DOCTORS WITH LOGIN CREDENTIALS")
    
    admin = AdminDoctorManager("gui/store.json")
    
    # Doctors to add
    doctors_data = [
        {
            'name': 'Dr. Ahmed Hassan',
            'username': 'dr.hassan',
            'password': 'secure_pass_123',
            'email': 'ahmed.hassan@university.edu',
            'dept': 'Computer Science',
            'title': 'Professor',
            'phone': '+20123456789'
        },
        {
            'name': 'Dr. Fatima Ahmed',
            'username': 'dr.fatima',
            'password': 'secure_pass_456',
            'email': 'fatima.ahmed@university.edu',
            'dept': 'Information Technology',
            'title': 'Associate Professor',
            'phone': '+20987654321'
        },
        {
            'name': 'Dr. Mohammad Karim',
            'username': 'dr.karim',
            'password': 'secure_pass_789',
            'email': 'mohammad.karim@university.edu',
            'dept': 'Software Engineering',
            'title': 'Lecturer',
            'phone': '+20111222333'
        }
    ]
    
    added_count = 0
    for doc_data in doctors_data:
        print(f"\n➕ Adding: {doc_data['name']}")
        
        success, msg, doctor = admin.add_doctor(
            name=doc_data['name'],
            username=doc_data['username'],
            password=doc_data['password'],
            email=doc_data['email'],
            dept=doc_data['dept'],
            title=doc_data['title'],
            phone=doc_data['phone']
        )
        
        print(f"   {msg}")
        if success:
            print(f"   ✅ Doctor ID: {doctor['id']}")
            print(f"   📧 Email: {doctor['email']}")
            print(f"   🏢 Dept: {doctor['dept']}")
            added_count += 1
        else:
            print(f"   ❌ Failed: {msg}")
    
    print(f"\n✅ Successfully added: {added_count}/{len(doctors_data)} doctors")


def demo_list_doctors():
    """Demo: List all doctors with their login credentials"""
    print_header("DEMO 2: VIEW ALL DOCTORS WITH LOGIN INFO")
    
    admin = AdminDoctorManager("gui/store.json")
    doctors = admin.list_doctors_with_credentials()
    
    if not doctors:
        print("ℹ️  No doctors in system")
        return
    
    print(f"\nFound {len(doctors)} doctors:\n")
    
    for i, doctor in enumerate(doctors, 1):
        print(f"{i}. {doctor['name']}")
        print(f"   ID: {doctor['doctor_id']}")
        print(f"   Title: {doctor['title']}")
        print(f"   Department: {doctor['dept']}")
        print(f"   Email: {doctor['email']}")
        print(f"   📝 Login Credentials:")
        print(f"      Username: {doctor['username']}")
        print(f"      Password: {doctor['password']}")
        print()


def demo_display_student_photos():
    """Demo: Display student photos for attendance"""
    print_header("DEMO 3: STUDENT PHOTO DISPLAY FOR ATTENDANCE")
    
    display = StudentPhotoDisplay(
        store_path="gui/store.json",
        photos_dir="student_photos"
    )
    
    students = list(display.students.values())
    
    if not students:
        print("ℹ️  No students in system")
        return
    
    print(f"\nFound {len(students)} students in system\n")
    
    # Show first 5 students
    for student in students[:5]:
        print(f"👤 {student['name']}")
        print(f"   ID: {student['id']}")
        print(f"   Department: {student['dept']}")
        print(f"   Year: {student['year']}")
        print(f"   Email: {student['email']}")
        
        # Check if photo exists
        photo_path = display.get_photo_path(student['id'])
        if photo_path:
            print(f"   📷 Photo: ✅ AVAILABLE ({photo_path})")
        else:
            print(f"   📷 Photo: ❌ NOT FOUND (expected at student_photos/{student['id']}.jpg)")
        print()


def demo_attendance_scenario():
    """Demo: Complete attendance marking scenario"""
    print_header("DEMO 4: COMPLETE ATTENDANCE MARKING SCENARIO")
    
    admin = AdminDoctorManager("gui/store.json")
    display = StudentPhotoDisplay(
        store_path="gui/store.json",
        photos_dir="student_photos"
    )
    
    # Get a doctor
    doctors = admin.get_all_doctors()
    if not doctors:
        print("⚠️  No doctors in system. Add a doctor first.")
        return
    
    doctor = doctors[0]
    print(f"\n👨‍🏫 Doctor: {doctor['name']} ({doctor['id']})")
    print(f"   Department: {doctor['dept']}")
    print(f"   Title: {doctor['title']}")
    
    # Get students
    students = list(display.students.values())
    if not students:
        print("\n⚠️  No students in system")
        return
    
    print(f"\n📋 Marking attendance for class...")
    print(f"   Students present: {len(students[:3])}")
    print()
    
    # Simulate attendance marking
    attendance_record = {
        'date': datetime.now().isoformat(),
        'doctor_id': doctor['id'],
        'doctor_name': doctor['name'],
        'course': 'Advanced Python Programming',
        'students': []
    }
    
    for student in students[:3]:
        print(f"   ✅ {student['name']} ({student['id']}) - PRESENT")
        
        # Check if photo available
        photo = display.load_photo_cv2(student['id'])
        if photo is not None:
            print(f"      📷 Photo loaded for face recognition")
        
        attendance_record['students'].append({
            'student_id': student['id'],
            'name': student['name'],
            'status': 'present',
            'timestamp': datetime.now().isoformat()
        })
    
    print(f"\n✅ Attendance marked for {len(attendance_record['students'])} students")
    print(f"📁 Record saved to attendance history")


def demo_password_change():
    """Demo: Doctor password change"""
    print_header("DEMO 5: DOCTOR PASSWORD CHANGE")
    
    admin = AdminDoctorManager("gui/store.json")
    
    # Get first doctor's username
    doctors = admin.list_doctors_with_credentials()
    if not doctors:
        print("⚠️  No doctors in system")
        return
    
    doctor = doctors[0]
    username = doctor['username']
    old_password = doctor['password']
    new_password = "new_secure_password_2024"
    
    print(f"\n👨‍🏫 Doctor: {doctor['name']}")
    print(f"   Username: {username}")
    print(f"   Old Password: {'*' * len(old_password)}")
    print(f"   New Password: {'*' * len(new_password)}")
    
    # Change password
    success, msg = admin.change_password(
        username=username,
        old_password=old_password,
        new_password=new_password
    )
    
    print(f"\n{msg}")


def demo_create_student_cards():
    """Demo: Create student cards for display"""
    print_header("DEMO 6: CREATE STUDENT CARD IMAGES")
    
    display = StudentPhotoDisplay(
        store_path="gui/store.json",
        photos_dir="student_photos"
    )
    
    students = list(display.students.values())
    
    if not students:
        print("⚠️  No students in system")
        return
    
    print(f"\nCreating student cards...\n")
    
    # Create cards for first 3 students
    created = 0
    for student in students[:3]:
        card = display.get_student_card_image(student['id'], 300, 400)
        
        if card:
            # Save card
            output_path = f"/tmp/card_{student['id']}.png"
            try:
                card.save(output_path)
                print(f"✅ {student['name']} ({student['id']})")
                print(f"   📁 Saved to: {output_path}")
                created += 1
            except Exception as e:
                print(f"❌ {student['name']} - Error: {e}")
        else:
            print(f"⚠️  {student['name']} ({student['id']}) - No photo available")
    
    print(f"\n✅ Created {created} student cards")


def demo_attendance_grid():
    """Demo: Create attendance grid with multiple students"""
    print_header("DEMO 7: CREATE ATTENDANCE GRID")
    
    display = StudentPhotoDisplay(
        store_path="gui/store.json",
        photos_dir="student_photos"
    )
    
    students = list(display.students.values())
    
    if not students:
        print("⚠️  No students in system")
        return
    
    # Create grid with first 6 students
    student_ids = [s['id'] for s in students[:6]]
    
    print(f"\nCreating attendance grid with {len(student_ids)} students...\n")
    
    grid = display.create_attendance_display(student_ids, cols=2)
    
    if grid:
        output_path = "/tmp/attendance_grid.png"
        try:
            grid.save(output_path)
            print(f"✅ Grid created successfully!")
            print(f"   📁 Saved to: {output_path}")
            print(f"   📐 Size: {grid.size}")
        except Exception as e:
            print(f"❌ Error: {e}")
    else:
        print("❌ Failed to create grid")


def main_menu():
    """Interactive main menu"""
    while True:
        print("\n" + "="*70)
        print("  EDUSENSE - DOCTOR & ATTENDANCE DEMO")
        print("="*70)
        print("\n1. ➕ Add new doctors with login credentials")
        print("2. 👥 View all doctors and their login info")
        print("3. 📷 Display student photos")
        print("4. 📋 Complete attendance marking scenario")
        print("5. 🔐 Change doctor password")
        print("6. 🎫 Create student card images")
        print("7. 📊 Create attendance grid")
        print("8. ❌ Exit")
        
        choice = input("\nSelect option (1-8): ").strip()
        
        if choice == "1":
            demo_add_doctors()
        elif choice == "2":
            demo_list_doctors()
        elif choice == "3":
            demo_display_student_photos()
        elif choice == "4":
            demo_attendance_scenario()
        elif choice == "5":
            demo_password_change()
        elif choice == "6":
            demo_create_student_cards()
        elif choice == "7":
            demo_attendance_grid()
        elif choice == "8":
            print("\n👋 Goodbye!\n")
            break
        else:
            print("❌ Invalid option")
        
        input("\nPress Enter to continue...")


if __name__ == "__main__":
    
    import sys
    
    # Check if running with argument for automated demo
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        print("\n🚀 Running automated demo...\n")
        demo_add_doctors()
        demo_list_doctors()
        demo_display_student_photos()
        demo_attendance_scenario()
    else:
        # Interactive menu
        try:
            main_menu()
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!\n")
            sys.exit(0)
