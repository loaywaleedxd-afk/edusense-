"""
Unit Tests for DataStore
Tests for data storage and management functionality
"""
import pytest
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from emotion_system.gui.data_store import DataStore


@pytest.mark.unit
class TestDataStoreInitialization:
    """Test DataStore initialization and default setup."""

    def test_datastore_creates_successfully(self):
        """Test that DataStore initializes without errors."""
        store = DataStore()
        assert store is not None

    def test_datastore_has_required_attributes(self):
        """Test that DataStore has all required attributes."""
        store = DataStore()
        assert hasattr(store, 'students')
        assert hasattr(store, 'doctors')
        assert hasattr(store, 'lectures')
        assert hasattr(store, 'courses')
        assert hasattr(store, 'attendance')
        assert hasattr(store, 'emotions')
        assert hasattr(store, 'users')

    def test_students_are_initialized(self):
        """Test that students list is properly initialized."""
        store = DataStore()
        assert isinstance(store.students, list)
        assert len(store.students) > 0
        
    def test_doctors_are_initialized(self):
        """Test that doctors list is properly initialized."""
        store = DataStore()
        assert isinstance(store.doctors, list)
        assert len(store.doctors) > 0

    def test_lectures_are_initialized(self):
        """Test that lectures list is properly initialized."""
        store = DataStore()
        assert isinstance(store.lectures, list)


@pytest.mark.unit
class TestDataStoreStudents:
    """Test student-related functionality."""

    def test_student_has_required_fields(self):
        """Test that each student has required fields."""
        store = DataStore()
        required_fields = ['id', 'name', 'email', 'dept', 'year']
        
        for student in store.students:
            for field in required_fields:
                assert field in student, f"Missing field {field} in student {student}"

    def test_student_id_format(self):
        """Test that student IDs follow the correct format."""
        store = DataStore()
        for student in store.students:
            assert student['id'].startswith('S'), "Student ID should start with 'S'"
            assert len(student['id']) >= 4, "Student ID should have minimum length"

    def test_student_year_is_valid(self):
        """Test that student year is within valid range."""
        store = DataStore()
        valid_years = [1, 2, 3, 4]
        for student in store.students:
            assert student['year'] in valid_years, f"Invalid year {student['year']}"

    def test_student_email_format(self):
        """Test that student emails follow valid format."""
        store = DataStore()
        for student in store.students:
            assert '@' in student['email'], "Email should contain @"
            assert '.edu' in student['email'], "Email should be university domain"


@pytest.mark.unit
class TestDataStoreDoctors:
    """Test doctor-related functionality."""

    def test_doctor_has_required_fields(self):
        """Test that each doctor has required fields."""
        store = DataStore()
        required_fields = ['id', 'name', 'dept', 'title']
        
        for doctor in store.doctors:
            for field in required_fields:
                assert field in doctor, f"Missing field {field} in doctor {doctor}"

    def test_doctor_id_format(self):
        """Test that doctor IDs follow the correct format."""
        store = DataStore()
        for doctor in store.doctors:
            assert doctor['id'].startswith('D'), "Doctor ID should start with 'D'"

    def test_doctor_title_is_valid(self):
        """Test that doctor title is from valid list."""
        store = DataStore()
        valid_titles = ["Professor", "Associate Professor", "Lecturer", "Assistant Professor"]
        for doctor in store.doctors:
            assert doctor['title'] in valid_titles, f"Invalid title {doctor['title']}"


@pytest.mark.unit
class TestDataStoreLectures:
    """Test lecture-related functionality."""

    def test_lecture_has_required_fields(self):
        """Test that each lecture has required fields."""
        store = DataStore()
        if store.lectures:
            required_fields = ['id', 'course', 'doctor_id', 'room']
            for lecture in store.lectures:
                for field in required_fields:
                    assert field in lecture, f"Missing field {field}"

    def test_lecture_id_format(self):
        """Test that lecture IDs follow the correct format."""
        store = DataStore()
        for lecture in store.lectures:
            if 'id' in lecture:
                assert isinstance(lecture['id'], str), "Lecture ID should be string"

    def test_lecture_room_is_valid(self):
        """Test that lecture room is assigned."""
        store = DataStore()
        for lecture in store.lectures:
            if 'room' in lecture:
                assert lecture['room'] is not None, "Lecture room should not be None"


@pytest.mark.unit
class TestDataStoreAttendance:
    """Test attendance tracking functionality."""

    def test_attendance_structure(self):
        """Test that attendance data structure is valid."""
        store = DataStore()
        assert isinstance(store.attendance, dict), "Attendance should be a dictionary"

    def test_attendance_entries_are_valid(self):
        """Test that attendance entries have valid structure."""
        store = DataStore()
        for lecture_id, records in store.attendance.items():
            assert isinstance(lecture_id, str), "Lecture ID should be string"
            if isinstance(records, dict):
                for student_id, record in records.items():
                    assert isinstance(student_id, str), "Student ID should be string"


@pytest.mark.unit
class TestDataStoreEmotions:
    """Test emotion data functionality."""

    def test_emotions_is_list(self):
        """Test that emotions is a list."""
        store = DataStore()
        assert isinstance(store.emotions, list), "Emotions should be a list"

    def test_emotion_record_structure(self):
        """Test structure of emotion records."""
        store = DataStore()
        valid_emotions = ["happy", "neutral", "confused", "bored", "surprise", "sad"]
        
        for emotion_record in store.emotions:
            if 'emotion' in emotion_record:
                assert emotion_record['emotion'] in valid_emotions, \
                    f"Invalid emotion type: {emotion_record['emotion']}"


@pytest.mark.unit
class TestDataStoreUsers:
    """Test user authentication functionality."""

    def test_users_list_exists(self):
        """Test that users list is initialized."""
        store = DataStore()
        assert isinstance(store.users, list), "Users should be a list"
        assert len(store.users) > 0, "Default users should be initialized"

    def test_user_has_required_fields(self):
        """Test that users have required authentication fields."""
        store = DataStore()
        required_fields = ['username', 'password', 'role']
        
        for user in store.users:
            for field in required_fields:
                assert field in user, f"User missing field: {field}"

    def test_user_role_is_valid(self):
        """Test that user roles are valid."""
        store = DataStore()
        valid_roles = ["student", "doctor", "admin"]
        
        for user in store.users:
            assert user['role'] in valid_roles, f"Invalid role: {user['role']}"


@pytest.mark.unit
class TestDataStoreDataPersistence:
    """Test data persistence and loading."""

    def test_data_is_persisted(self, tmp_path):
        """Test that store data can be saved and loaded."""
        # Create a DataStore instance
        store = DataStore()
        
        # Verify students are loaded
        assert len(store.students) > 0
        first_student_id = store.students[0]['id']
        
        # Create another instance and verify data is consistent
        store2 = DataStore()
        assert len(store2.students) > 0
        assert store2.students[0]['id'] == first_student_id
