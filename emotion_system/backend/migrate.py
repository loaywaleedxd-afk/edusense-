"""Add grades and messages tables."""
import sqlite3, os
DB = os.path.join(os.path.dirname(__file__), "emotion_system.db")
conn = sqlite3.connect(DB)
c = conn.cursor()
c.executescript("""
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT,
    grade REAL NOT NULL,
    doctor_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(student_id, course_code)
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS excuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_code TEXT,
    week INTEGER,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);
""")
conn.commit()
conn.close()
print("Migration done.")
