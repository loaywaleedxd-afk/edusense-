"""
Pytest Configuration & Fixtures
Global fixtures and configuration for all tests
"""
import pytest
import os
import sys
import json
import tempfile
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def test_data_dir():
    """Create a temporary directory for test data."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_store_file(tmp_path):
    """Create a mock store.json file for testing."""
    store_data = {
        "students": [
            {"id": "S001", "name": "Test Student", "dept": "CS", "year": 1},
            {"id": "S002", "name": "Test Student 2", "dept": "EE", "year": 2}
        ],
        "doctors": [
            {"id": "D001", "name": "Dr. Test", "dept": "CS", "title": "Professor"}
        ],
        "lectures": [],
        "attendance": {},
        "emotions": []
    }
    store_file = tmp_path / "store.json"
    with open(store_file, "w") as f:
        json.dump(store_data, f)
    return store_file


@pytest.fixture
def mock_database_path(tmp_path):
    """Create a path for mock database."""
    return str(tmp_path / "test_emotion_system.db")


@pytest.fixture
def sample_emotion_data():
    """Sample emotion detection data for testing."""
    return {
        "student_id": "S001",
        "emotion": "happy",
        "confidence": 0.95,
        "attention_score": 0.88,
        "engagement_score": 0.92,
        "timestamp": "2026-05-16T10:30:00"
    }


@pytest.fixture
def sample_student_data():
    """Sample student data for testing."""
    return {
        "student_id": "S001",
        "name": "Sara Johnson",
        "email": "sara.j@university.edu",
        "department": "Computer Science",
        "year": 3
    }


@pytest.fixture
def sample_lecture_data():
    """Sample lecture data for testing."""
    return {
        "lecture_id": "LEC001",
        "course_name": "Artificial Intelligence",
        "course_code": "CS401",
        "room": "Hall A",
        "doctor_id": "D001",
        "duration_min": 90
    }


@pytest.fixture
def sample_user_credentials():
    """Sample user credentials for testing."""
    return {
        "username": "testuser",
        "password": "testpass123",
        "role": "student",
        "full_name": "Test User",
        "email": "testuser@university.edu"
    }


# Test markers for categorizing tests
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "api: mark test as an API test"
    )
    config.addinivalue_line(
        "markers", "database: mark test as a database test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
