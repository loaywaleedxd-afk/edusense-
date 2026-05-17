"""
Database setup — SQLite via aiosqlite + SQLAlchemy async
"""
import aiosqlite
import asyncio
import os

DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            role        TEXT NOT NULL CHECK(role IN ('student','doctor','admin')),
            full_name   TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS students (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT UNIQUE NOT NULL,
            user_id         INTEGER REFERENCES users(id),
            department      TEXT,
            year            INTEGER,
            face_encoding   BLOB,
            photo_path      TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS doctors (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id   TEXT UNIQUE NOT NULL,
            user_id     INTEGER REFERENCES users(id),
            department  TEXT,
            title       TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS lectures (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id      TEXT UNIQUE NOT NULL,
            doctor_id       TEXT REFERENCES doctors(doctor_id),
            course_name     TEXT NOT NULL,
            course_code     TEXT NOT NULL,
            room            TEXT,
            scheduled_at    TEXT,
            duration_min    INTEGER DEFAULT 90,
            status          TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','ended')),
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT REFERENCES students(student_id),
            lecture_id      TEXT REFERENCES lectures(lecture_id),
            check_in_time   TEXT DEFAULT (datetime('now')),
            check_out_time  TEXT,
            method          TEXT DEFAULT 'face_recognition',
            status          TEXT DEFAULT 'present' CHECK(status IN ('present','absent','late')),
            confidence      REAL
        );

        CREATE TABLE IF NOT EXISTS emotion_records (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT REFERENCES students(student_id),
            lecture_id      TEXT REFERENCES lectures(lecture_id),
            timestamp       TEXT DEFAULT (datetime('now')),
            emotion         TEXT NOT NULL,
            confidence      REAL NOT NULL,
            attention_score REAL,
            engagement_score REAL
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id  TEXT REFERENCES lectures(lecture_id),
            student_id  TEXT,
            alert_type  TEXT,
            message     TEXT,
            severity    TEXT DEFAULT 'warning',
            is_read     INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES
            ('admin','$2b$12$hashed_admin','admin','System Administrator','admin@university.edu'),
            ('dr.smith','$2b$12$hashed_doc','doctor','Dr. Ahmed Smith','ahmed.smith@university.edu'),
            ('s001','$2b$12$hashed_stu','student','Sara Johnson','sara.j@university.edu');

        INSERT OR IGNORE INTO students (student_id,user_id,department,year) VALUES
            ('S001',3,'Computer Science',3);

        INSERT OR IGNORE INTO doctors (doctor_id,user_id,department,title) VALUES
            ('D001',2,'Computer Science','Associate Professor');

        INSERT OR IGNORE INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at) VALUES
            ('L001','D001','Artificial Intelligence','CS401','Hall A','2025-01-15 09:00:00'),
            ('L002','D001','Machine Learning','CS402','Hall B','2025-01-15 11:00:00'),
            ('L003','D001','Data Science','CS403','Lab 1','2025-01-16 09:00:00');
        """)
        await db.commit()
    print("[OK] Database initialized")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
