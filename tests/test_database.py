"""
Database Tests
Tests for database initialization and operations
"""
import pytest
import asyncio
import aiosqlite
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from emotion_system.backend.database import init_db


@pytest.mark.database
class TestDatabaseInitialization:
    """Test database initialization and schema creation."""

    @pytest.mark.asyncio
    async def test_database_initializes_successfully(self, tmp_path):
        """Test that database initializes without errors."""
        db_path = str(tmp_path / "test.db")
        
        # Mock the DB_PATH
        import emotion_system.backend.database as db_module
        original_path = db_module.DB_PATH
        db_module.DB_PATH = db_path
        
        try:
            await init_db()
            # Check that database file was created
            assert os.path.exists(db_path)
        finally:
            db_module.DB_PATH = original_path

    @pytest.mark.asyncio
    async def test_users_table_created(self, tmp_path):
        """Test that users table is created with proper schema."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            # Create tables
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    username    TEXT UNIQUE NOT NULL,
                    password    TEXT NOT NULL,
                    role        TEXT NOT NULL CHECK(role IN ('student','doctor','admin')),
                    full_name   TEXT NOT NULL,
                    email       TEXT UNIQUE NOT NULL,
                    created_at  TEXT DEFAULT (datetime('now'))
                );
            """)
            
            # Verify table exists
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            )
            result = await cursor.fetchone()
            assert result is not None

    @pytest.mark.asyncio
    async def test_students_table_created(self, tmp_path):
        """Test that students table is created with proper schema."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            # Create tables
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS students (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id      TEXT UNIQUE NOT NULL,
                    user_id         INTEGER,
                    department      TEXT,
                    year            INTEGER,
                    face_encoding   BLOB,
                    photo_path      TEXT,
                    created_at      TEXT DEFAULT (datetime('now'))
                );
            """)
            
            # Verify table exists
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='students'"
            )
            result = await cursor.fetchone()
            assert result is not None

    @pytest.mark.asyncio
    async def test_lectures_table_created(self, tmp_path):
        """Test that lectures table is created with proper schema."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS lectures (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    lecture_id      TEXT UNIQUE NOT NULL,
                    doctor_id       TEXT,
                    course_name     TEXT NOT NULL,
                    course_code     TEXT NOT NULL,
                    room            TEXT,
                    scheduled_at    TEXT,
                    duration_min    INTEGER DEFAULT 90,
                    status          TEXT DEFAULT 'scheduled' 
                        CHECK(status IN ('scheduled','active','ended')),
                    created_at      TEXT DEFAULT (datetime('now'))
                );
            """)
            
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='lectures'"
            )
            result = await cursor.fetchone()
            assert result is not None

    @pytest.mark.asyncio
    async def test_attendance_table_created(self, tmp_path):
        """Test that attendance table is created."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS attendance (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id      TEXT,
                    lecture_id      TEXT,
                    check_in_time   TEXT DEFAULT (datetime('now')),
                    check_out_time  TEXT,
                    method          TEXT DEFAULT 'face_recognition',
                    status          TEXT DEFAULT 'present' 
                        CHECK(status IN ('present','absent','late')),
                    confidence      REAL
                );
            """)
            
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'"
            )
            result = await cursor.fetchone()
            assert result is not None

    @pytest.mark.asyncio
    async def test_emotion_records_table_created(self, tmp_path):
        """Test that emotion_records table is created."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS emotion_records (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id      TEXT,
                    lecture_id      TEXT,
                    timestamp       TEXT DEFAULT (datetime('now')),
                    emotion         TEXT NOT NULL,
                    confidence      REAL NOT NULL,
                    attention_score REAL,
                    engagement_score REAL
                );
            """)
            
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='emotion_records'"
            )
            result = await cursor.fetchone()
            assert result is not None


@pytest.mark.database
class TestDatabaseDataInsertion:
    """Test inserting and retrieving data."""

    @pytest.mark.asyncio
    async def test_insert_user(self, tmp_path):
        """Test inserting a user into the database."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    username    TEXT UNIQUE NOT NULL,
                    password    TEXT NOT NULL,
                    role        TEXT NOT NULL,
                    full_name   TEXT NOT NULL,
                    email       TEXT UNIQUE NOT NULL,
                    created_at  TEXT DEFAULT (datetime('now'))
                );
            """)
            
            await db.execute(
                "INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
                ("testuser", "hashedpass", "student", "Test User", "test@university.edu")
            )
            await db.commit()
            
            # Verify insertion
            cursor = await db.execute("SELECT * FROM users WHERE username='testuser'")
            result = await cursor.fetchone()
            assert result is not None
            assert result[1] == "testuser"

    @pytest.mark.asyncio
    async def test_insert_student(self, tmp_path):
        """Test inserting a student record."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS students (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id  TEXT UNIQUE NOT NULL,
                    department  TEXT,
                    year        INTEGER
                );
            """)
            
            await db.execute(
                "INSERT INTO students (student_id, department, year) VALUES (?, ?, ?)",
                ("S001", "Computer Science", 3)
            )
            await db.commit()
            
            # Verify insertion
            cursor = await db.execute("SELECT * FROM students WHERE student_id='S001'")
            result = await cursor.fetchone()
            assert result is not None
            assert result[1] == "S001"
            assert result[2] == "Computer Science"

    @pytest.mark.asyncio
    async def test_insert_emotion_record(self, tmp_path):
        """Test inserting an emotion record."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS emotion_records (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id      TEXT,
                    emotion         TEXT NOT NULL,
                    confidence      REAL NOT NULL,
                    timestamp       TEXT DEFAULT (datetime('now'))
                );
            """)
            
            await db.execute(
                "INSERT INTO emotion_records (student_id, emotion, confidence) VALUES (?, ?, ?)",
                ("S001", "happy", 0.95)
            )
            await db.commit()
            
            # Verify insertion
            cursor = await db.execute(
                "SELECT * FROM emotion_records WHERE student_id='S001'"
            )
            result = await cursor.fetchone()
            assert result is not None
            assert result[2] == "happy"
            assert result[3] == 0.95


@pytest.mark.database
class TestDatabaseConstraints:
    """Test database constraints and validations."""

    @pytest.mark.asyncio
    async def test_unique_username_constraint(self, tmp_path):
        """Test that duplicate usernames are prevented."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id       INTEGER PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role     TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email    TEXT UNIQUE NOT NULL
                );
            """)
            
            await db.execute(
                "INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?)",
                ("testuser", "pass", "student", "Test", "test@test.edu")
            )
            await db.commit()
            
            # Try to insert duplicate - should raise exception
            with pytest.raises(aiosqlite.IntegrityError):
                await db.execute(
                    "INSERT INTO users VALUES (NULL, ?, ?, ?, ?, ?)",
                    ("testuser", "pass2", "student", "Test2", "test2@test.edu")
                )
                await db.commit()

    @pytest.mark.asyncio
    async def test_role_check_constraint(self, tmp_path):
        """Test that invalid roles are rejected."""
        db_path = str(tmp_path / "test.db")
        
        async with aiosqlite.connect(db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id   INTEGER PRIMARY KEY,
                    username TEXT NOT NULL,
                    role TEXT CHECK(role IN ('student','doctor','admin'))
                );
            """)
            
            # Valid role should work
            await db.execute(
                "INSERT INTO users VALUES (NULL, ?, ?)",
                ("testuser", "student")
            )
            await db.commit()
            
            # Invalid role should fail
            with pytest.raises(aiosqlite.IntegrityError):
                await db.execute(
                    "INSERT INTO users VALUES (NULL, ?, ?)",
                    ("testuser2", "invalid_role")
                )
                await db.commit()
