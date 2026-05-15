"""
═════════════════════════════════════════════════════════════════
Admin Panel - Add Doctor with Login Credentials
═════════════════════════════════════════════════════════════════
Python module to manage adding doctors with username/password
from admin interface
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple


class AdminDoctorManager:
    """Manage doctor creation with login credentials"""
    
    def __init__(self, store_path: str = "gui/store.json"):
        """
        Initialize doctor manager
        
        Args:
            store_path: Path to store.json
        """
        self.store_path = store_path
        self.store = self._load_store()
    
    def _load_store(self) -> Dict:
        """Load store.json"""
        try:
            with open(self.store_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading store: {e}")
            return {
                'students': [],
                'doctors': [],
                'users': [],
                'attendance': [],
                'courses': []
            }
    
    def _save_store(self) -> bool:
        """Save store.json"""
        try:
            with open(self.store_path, 'w', encoding='utf-8') as f:
                json.dump(self.store, f, indent=2, ensure_ascii=False)
            print(f"✅ Store saved: {self.store_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving store: {e}")
            return False
    
    def validate_doctor_data(self, name: str, username: str, 
                            password: str, email: str = "",
                            dept: str = "", title: str = "") -> Tuple[bool, str]:
        """
        Validate doctor data before adding
        
        Returns:
            (is_valid, error_message)
        """
        # Validate name
        if not name or not name.strip():
            return False, "Name is required"
        
        # Validate username
        if not username or not username.strip():
            return False, "Username is required"
        
        username = username.strip()
        if len(username) < 3:
            return False, "Username must be at least 3 characters"
        
        # Check if username already exists
        for user in self.store.get('users', []):
            if user.get('username', '').lower() == username.lower():
                return False, f"Username '{username}' already exists!"
        
        # Validate password
        if not password or not password.strip():
            return False, "Password is required"
        
        if len(password) < 6:
            return False, "Password must be at least 6 characters"
        
        # Validate email format
        if email and '@' not in email:
            return False, "Invalid email format"
        
        return True, "Valid"
    
    def add_doctor(self, name: str, username: str, password: str,
                   email: str = "", dept: str = "", title: str = "",
                   phone: str = "") -> Tuple[bool, str, Optional[Dict]]:
        """
        Add a new doctor with login credentials
        
        Args:
            name: Doctor's full name
            username: Login username
            password: Login password
            email: Doctor's email
            dept: Department
            title: Job title (Professor, Lecturer, etc.)
            phone: Phone number
            
        Returns:
            (success, message, doctor_data)
        """
        # Validate
        is_valid, error_msg = self.validate_doctor_data(
            name, username, password, email, dept, title
        )
        
        if not is_valid:
            return False, error_msg, None
        
        try:
            # Generate doctor ID
            doctors = self.store.get('doctors', [])
            doctor_id = f"doc_{len(doctors) + 1:03d}"
            
            # Create doctor record
            doctor = {
                'id': doctor_id,
                'name': name.strip(),
                'title': title.strip() if title else 'Lecturer',
                'dept': dept.strip() if dept else 'Computer Science',
                'email': email.strip() if email else '',
                'phone': phone.strip() if phone else '',
                'added_at': datetime.now().isoformat()
            }
            
            # Add doctor to store
            self.store['doctors'].append(doctor)
            
            # Create user credentials
            user = {
                'username': username.strip(),
                'password': password,  # In production, hash this!
                'role': 'doctor',
                'name': name.strip(),
                'email': email.strip() if email else '',
                'doctor_id': doctor_id,
                'created_at': datetime.now().isoformat()
            }
            
            # Add user to store
            self.store['users'].append(user)
            
            # Save
            if self._save_store():
                return True, f"✅ Doctor '{name}' added successfully!", doctor
            else:
                return False, "❌ Failed to save doctor data", None
                
        except Exception as e:
            return False, f"❌ Error: {str(e)}", None
    
    def get_all_doctors(self) -> List[Dict]:
        """Get all doctors"""
        return self.store.get('doctors', [])
    
    def get_doctor_by_id(self, doctor_id: str) -> Optional[Dict]:
        """Get doctor by ID"""
        for doctor in self.store.get('doctors', []):
            if doctor.get('id') == doctor_id:
                return doctor
        return None
    
    def get_doctor_by_username(self, username: str) -> Optional[Dict]:
        """Get doctor by username"""
        for user in self.store.get('users', []):
            if user.get('role') == 'doctor' and user.get('username') == username:
                doctor_id = user.get('doctor_id')
                return self.get_doctor_by_id(doctor_id)
        return None
    
    def update_doctor(self, doctor_id: str, **kwargs) -> Tuple[bool, str]:
        """
        Update doctor information
        
        Allowed fields: name, title, dept, email, phone
        """
        doctor = self.get_doctor_by_id(doctor_id)
        
        if not doctor:
            return False, f"Doctor {doctor_id} not found"
        
        # Update allowed fields
        allowed_fields = ['name', 'title', 'dept', 'email', 'phone']
        for field in allowed_fields:
            if field in kwargs and kwargs[field]:
                doctor[field] = kwargs[field]
        
        if self._save_store():
            return True, f"✅ Doctor {doctor_id} updated"
        else:
            return False, "❌ Failed to save changes"
    
    def change_password(self, username: str, old_password: str,
                       new_password: str) -> Tuple[bool, str]:
        """Change doctor password"""
        
        # Find user
        user = None
        for u in self.store.get('users', []):
            if u.get('username') == username:
                user = u
                break
        
        if not user:
            return False, "❌ User not found"
        
        # Verify old password
        if user.get('password') != old_password:
            return False, "❌ Current password is incorrect"
        
        # Validate new password
        if len(new_password) < 6:
            return False, "❌ New password must be at least 6 characters"
        
        # Update password
        user['password'] = new_password
        
        if self._save_store():
            return True, "✅ Password changed successfully"
        else:
            return False, "❌ Failed to save password"
    
    def delete_doctor(self, doctor_id: str) -> Tuple[bool, str]:
        """
        Delete a doctor and their user account
        """
        doctor = self.get_doctor_by_id(doctor_id)
        
        if not doctor:
            return False, f"Doctor {doctor_id} not found"
        
        try:
            # Remove doctor
            self.store['doctors'] = [
                d for d in self.store['doctors'] 
                if d.get('id') != doctor_id
            ]
            
            # Remove user account
            self.store['users'] = [
                u for u in self.store['users']
                if u.get('doctor_id') != doctor_id
            ]
            
            if self._save_store():
                return True, f"✅ Doctor {doctor_id} deleted"
            else:
                return False, "❌ Failed to save changes"
                
        except Exception as e:
            return False, f"❌ Error: {str(e)}"
    
    def list_doctors_with_credentials(self) -> List[Dict]:
        """
        Get list of all doctors with their login info
        (For admin reference only)
        """
        result = []
        for doctor in self.store.get('doctors', []):
            doctor_id = doctor.get('id')
            
            # Find corresponding user
            user = None
            for u in self.store.get('users', []):
                if u.get('doctor_id') == doctor_id:
                    user = u
                    break
            
            if user:
                result.append({
                    'doctor_id': doctor_id,
                    'name': doctor.get('name'),
                    'title': doctor.get('title'),
                    'dept': doctor.get('dept'),
                    'email': doctor.get('email'),
                    'username': user.get('username'),
                    'password': user.get('password'),  # ⚠️ Never expose in real app!
                    'added_at': doctor.get('added_at')
                })
        
        return result


# ═════════════════════════════════════════════════════════════════
# Example Usage in your app
# ═════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    
    # Initialize manager
    admin = AdminDoctorManager("gui/store.json")
    
    # Example 1: Add a doctor
    print("\n" + "="*60)
    print("ADDING NEW DOCTOR")
    print("="*60)
    success, msg, doctor = admin.add_doctor(
        name="Dr. Ahmed Hassan",
        username="dr.hassan",
        password="secure_password_123",
        email="ahmed.hassan@university.edu",
        dept="Computer Science",
        title="Associate Professor",
        phone="+20123456789"
    )
    print(msg)
    if doctor:
        print(f"Doctor ID: {doctor['id']}")
    
    # Example 2: List all doctors with credentials
    print("\n" + "="*60)
    print("ALL DOCTORS IN SYSTEM")
    print("="*60)
    doctors = admin.list_doctors_with_credentials()
    for doc in doctors:
        print(f"\n👨‍🏫 {doc['name']} ({doc['doctor_id']})")
        print(f"   Title: {doc['title']}")
        print(f"   Dept: {doc['dept']}")
        print(f"   Email: {doc['email']}")
        print(f"   Username: {doc['username']}")
        print(f"   Password: {doc['password']}")
    
    # Example 3: Get doctor by username
    print("\n" + "="*60)
    print("FIND DOCTOR BY USERNAME")
    print("="*60)
    doctor = admin.get_doctor_by_username("dr.hassan")
    if doctor:
        print(f"✅ Found: {doctor['name']} ({doctor['id']})")
    
    # Example 4: Change password
    print("\n" + "="*60)
    print("CHANGE PASSWORD")
    print("="*60)
    success, msg = admin.change_password(
        username="dr.hassan",
        old_password="secure_password_123",
        new_password="new_secure_password_456"
    )
    print(msg)
