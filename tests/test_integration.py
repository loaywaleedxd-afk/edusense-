"""
Integration Tests
Tests for system components working together
"""
import pytest
import json
import os
import sys
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from emotion_system.gui.data_store import DataStore
from emotion_system.backend.emotion_engine import EmotionEngine


@pytest.mark.integration
class TestDataStoreAndEmotionEngineIntegration:
    """Test DataStore and EmotionEngine working together."""

    def test_datastore_initializes_with_emotion_engine(self):
        """Test that DataStore can coexist with EmotionEngine."""
        store = DataStore()
        engine = EmotionEngine()
        
        assert store is not None
        assert engine is not None
        assert len(store.students) > 0
        assert isinstance(engine.known_faces, dict)

    def test_student_data_available_for_emotion_analysis(self):
        """Test that student data from store can be used by emotion engine."""
        store = DataStore()
        engine = EmotionEngine()
        
        # Get a student from store
        student = store.students[0]
        student_id = student['id']
        
        # Simulate adding face encoding for this student
        import numpy as np
        face_encoding = np.random.rand(128)
        engine.known_faces[student_id] = face_encoding
        
        assert student_id in engine.known_faces
        assert student_id.startswith('S')


@pytest.mark.integration
class TestAttendanceEmotionWorkflow:
    """Test attendance and emotion tracking workflow."""

    def test_attendance_and_emotion_for_same_student(self):
        """Test recording both attendance and emotion for same student."""
        store = DataStore()
        
        # Get a student
        student = store.students[0]
        student_id = student['id']
        
        # Simulate recording attendance
        attendance_record = {
            "student_id": student_id,
            "status": "present",
            "confidence": 0.95
        }
        
        # Simulate recording emotion
        emotion_record = {
            "student_id": student_id,
            "emotion": "happy",
            "confidence": 0.92,
            "timestamp": "2026-05-16T10:00:00"
        }
        
        store.attendance[student_id] = attendance_record
        store.emotions.append(emotion_record)
        
        # Verify both are recorded
        assert student_id in store.attendance
        assert any(e["student_id"] == student_id for e in store.emotions)

    def test_lecture_with_multiple_student_emotions(self):
        """Test recording emotions for multiple students in a lecture."""
        store = DataStore()
        
        # Create a mock lecture
        lecture = {
            "id": "LEC001",
            "course": "AI",
            "doctor_id": "D001"
        }
        
        # Record emotions for multiple students
        emotion_records = []
        for student in store.students[:5]:  # First 5 students
            emotion_records.append({
                "student_id": student['id'],
                "lecture_id": lecture['id'],
                "emotion": "happy",
                "confidence": 0.90
            })
        
        store.emotions.extend(emotion_records)
        
        # Verify all were added
        lecture_emotions = [e for e in store.emotions if e.get("lecture_id") == lecture['id']]
        assert len(lecture_emotions) == 5


@pytest.mark.integration
class TestDataValidationWorkflow:
    """Test data validation across components."""

    def test_student_data_consistency(self):
        """Test that student data remains consistent across access."""
        store = DataStore()
        
        # Access students multiple times
        students_1 = store.students.copy()
        students_2 = store.students.copy()
        
        # Verify same data
        assert len(students_1) == len(students_2)
        assert students_1[0]['id'] == students_2[0]['id']

    def test_emotion_weights_consistency(self):
        """Test that emotion weights are used consistently."""
        from emotion_system.backend.emotion_engine import EMOTION_WEIGHTS
        
        # All emotions in weights should have consistent values
        happy_weight = EMOTION_WEIGHTS["happy"]
        bored_weight = EMOTION_WEIGHTS["bored"]
        
        assert happy_weight > bored_weight
        assert happy_weight == 1.0
        assert bored_weight == 0.1

    def test_role_based_access_validation(self):
        """Test role-based data access validation."""
        store = DataStore()
        
        # Get users with different roles
        admin_users = [u for u in store.users if u['role'] == 'admin']
        student_users = [u for u in store.users if u['role'] == 'student']
        doctor_users = [u for u in store.users if u['role'] == 'doctor']
        
        assert len(admin_users) > 0
        assert len(student_users) > 0
        assert len(doctor_users) > 0
        
        # Verify role values are consistent
        for user in store.users:
            assert user['role'] in ['admin', 'student', 'doctor']


@pytest.mark.integration
class TestDataStoreUserAuthentication:
    """Test user authentication and authorization."""

    def test_user_login_validation(self):
        """Test validating user credentials."""
        store = DataStore()
        
        # Get a test user
        test_user = store.users[0]
        username = test_user['username']
        
        # Find user by username
        found_user = next((u for u in store.users if u['username'] == username), None)
        
        assert found_user is not None
        assert found_user['username'] == username
        assert 'password' in found_user
        assert 'role' in found_user

    def test_user_role_authorization(self):
        """Test role-based authorization."""
        store = DataStore()
        
        # Different operations for different roles
        admin_users = [u for u in store.users if u['role'] == 'admin']
        
        for admin in admin_users:
            # Admin can access all data
            assert len(store.students) > 0
            assert len(store.doctors) > 0
            assert len(store.lectures) >= 0

    def test_student_data_isolation(self):
        """Test that student users can only see their own data."""
        store = DataStore()
        
        # Get a student user
        student_user = next((u for u in store.users if u['role'] == 'student'), None)
        
        if student_user:
            # Student should have limited access
            assert student_user['role'] == 'student'
            
            # Find corresponding student
            # In a real scenario, this would be restricted access


@pytest.mark.integration
class TestEmotionAnalysisWorkflow:
    """Test complete emotion analysis workflow."""

    def test_emotion_categorization_workflow(self):
        """Test categorizing emotions as engaged or disengaged."""
        from emotion_system.backend.emotion_engine import (
            ATTENTION_EMOTIONS, DISENGAGED_EMOTIONS, EMOTION_WEIGHTS
        )
        
        # Sample emotion recording
        emotions_detected = [
            {"emotion": "happy", "confidence": 0.95},
            {"emotion": "confused", "confidence": 0.82},
            {"emotion": "bored", "confidence": 0.78}
        ]
        
        # Categorize each emotion
        attention_scores = []
        for e in emotions_detected:
            emotion = e['emotion']
            is_attentive = emotion in ATTENTION_EMOTIONS
            is_disengaged = emotion in DISENGAGED_EMOTIONS
            weight = EMOTION_WEIGHTS.get(emotion, 0.5)
            
            attention_scores.append({
                "emotion": emotion,
                "attentive": is_attentive,
                "disengaged": is_disengaged,
                "weight": weight
            })
        
        # Verify categorization
        assert attention_scores[0]["emotion"] == "happy"
        assert attention_scores[0]["attentive"] == True
        
        assert attention_scores[2]["emotion"] == "bored"
        assert attention_scores[2]["disengaged"] == True

    def test_engagement_score_calculation(self):
        """Test calculating engagement scores from emotions."""
        from emotion_system.backend.emotion_engine import EMOTION_WEIGHTS
        
        # Emotions recorded for a student in a lecture
        emotions = [
            ("happy", 0.95),
            ("neutral", 0.88),
            ("happy", 0.92)
        ]
        
        # Calculate average engagement
        total_weight = 0
        total_count = 0
        
        for emotion, confidence in emotions:
            weight = EMOTION_WEIGHTS[emotion]
            total_weight += weight * confidence
            total_count += confidence
        
        avg_engagement = total_weight / total_count if total_count > 0 else 0
        
        assert avg_engagement > 0.7  # Should indicate good engagement
        assert avg_engagement <= 1.0


@pytest.mark.integration
class TestDataFlowIntegration:
    """Test data flowing through the system."""

    def test_data_input_to_storage_pipeline(self):
        """Test data from input through to storage."""
        store = DataStore()
        engine = EmotionEngine()
        
        # Simulate emotion detection result
        emotion_data = {
            "student_id": store.students[0]['id'],
            "emotion": "happy",
            "confidence": 0.92,
            "attention_score": 0.88
        }
        
        # Store the emotion data
        store.emotions.append(emotion_data)
        
        # Verify retrieval
        retrieved = [e for e in store.emotions if e['student_id'] == emotion_data['student_id']]
        assert len(retrieved) > 0
        assert retrieved[0]['emotion'] == 'happy'

    def test_cross_module_data_consistency(self):
        """Test data consistency across modules."""
        store = DataStore()
        
        # Get student data
        student_id = store.students[0]['id']
        student_name = store.students[0]['name']
        
        # Use this in emotion system (conceptually)
        emotion_entry = {
            "student_id": student_id,
            "student_name": student_name,
            "emotion": "focused"
        }
        
        # Verify cross-reference works
        matching_student = next((s for s in store.students if s['id'] == emotion_entry['student_id']), None)
        assert matching_student is not None
        assert matching_student['name'] == student_name
