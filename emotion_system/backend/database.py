"""
Database setup — SQLite via aiosqlite
All tables for EduSense: auth, students, doctors, lectures, attendance,
emotions, grades, messages, excuses, announcements, exam schedule,
course resources, assignments, submissions, complaints, alerts,
fees, waitlists, QR sessions, enrollments.
"""
import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
        PRAGMA journal_mode=WAL;

        -- ── Core auth ────────────────────────────────────────────────────────
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

        -- ── Courses / Lectures ───────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS lectures (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id      TEXT UNIQUE NOT NULL,
            doctor_id       TEXT REFERENCES doctors(doctor_id),
            course_name     TEXT NOT NULL,
            course_code     TEXT NOT NULL,
            room            TEXT,
            color           TEXT DEFAULT '#3b82f6',
            scheduled_at    TEXT,
            duration_min    INTEGER DEFAULT 90,
            days            TEXT DEFAULT '[]',
            days_label      TEXT DEFAULT '',
            semester        TEXT DEFAULT 'Fall 2024',
            capacity        INTEGER DEFAULT 300,
            status          TEXT DEFAULT 'scheduled',
            created_at      TEXT DEFAULT (datetime('now'))
        );

        -- ── Course enrollments ───────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS course_enrollments (
            course_id   TEXT NOT NULL,
            student_id  TEXT NOT NULL,
            enrolled_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (course_id, student_id)
        );

        -- ── Attendance ───────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS attendance (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT REFERENCES students(student_id),
            lecture_id      TEXT REFERENCES lectures(lecture_id),
            week            INTEGER DEFAULT 1,
            check_in_time   TEXT DEFAULT (datetime('now')),
            check_out_time  TEXT,
            method          TEXT DEFAULT 'face_recognition',
            status          TEXT DEFAULT 'present',
            confidence      REAL,
            date            TEXT DEFAULT (date('now'))
        );

        -- ── Emotion records ──────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS emotion_records (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id       TEXT REFERENCES students(student_id),
            lecture_id       TEXT REFERENCES lectures(lecture_id),
            timestamp        TEXT DEFAULT (datetime('now')),
            emotion          TEXT NOT NULL,
            confidence       REAL NOT NULL,
            attention_score  REAL,
            engagement_score REAL
        );

        -- ── Grades ──────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS grades (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT NOT NULL,
            course_code TEXT NOT NULL,
            course_name TEXT,
            grade       REAL NOT NULL,
            doctor_id   TEXT,
            added_by    TEXT DEFAULT 'doctor',
            created_at  TEXT DEFAULT (datetime('now')),
            UNIQUE(student_id, course_code)
        );

        -- ── Messages ────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            sender_id   TEXT NOT NULL,
            sender_name TEXT,
            sender_role TEXT,
            text        TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── Excuses ─────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS excuses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT NOT NULL,
            course_code TEXT,
            week        INTEGER DEFAULT 1,
            reason      TEXT,
            status      TEXT DEFAULT 'pending',
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── System alerts / notifications ────────────────────────────────────
        CREATE TABLE IF NOT EXISTS system_alerts (
            id          TEXT PRIMARY KEY,
            type        TEXT DEFAULT 'info',
            title       TEXT,
            message     TEXT,
            student_id  TEXT,
            doctor_id   TEXT,
            course_id   TEXT,
            alert_kind  TEXT,
            is_read     INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── Legacy alerts (face-detection engine) ────────────────────────────
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

        -- ── Announcements ────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS announcements (
            id          TEXT PRIMARY KEY,
            course_id   TEXT NOT NULL,
            course_name TEXT,
            doctor_id   TEXT,
            doctor_name TEXT,
            title       TEXT NOT NULL,
            body        TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── Exam schedule ────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS exam_schedule (
            id          TEXT PRIMARY KEY,
            course_id   TEXT NOT NULL,
            course_name TEXT,
            type        TEXT DEFAULT 'midterm',
            date        TEXT,
            time        TEXT,
            room        TEXT,
            duration    INTEGER DEFAULT 120,
            notes       TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── Course resources ─────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS course_resources (
            id          TEXT PRIMARY KEY,
            course_id   TEXT NOT NULL,
            week        INTEGER DEFAULT 1,
            title       TEXT NOT NULL,
            url         TEXT,
            type        TEXT DEFAULT 'link',
            description TEXT,
            doctor_id   TEXT,
            file_name   TEXT,
            file_size   INTEGER DEFAULT 0,
            file_data   TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- ── Assignments ──────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS assignments (
            id               TEXT PRIMARY KEY,
            course_id        TEXT NOT NULL,
            course_name      TEXT,
            doctor_id        TEXT,
            title            TEXT NOT NULL,
            description      TEXT,
            deadline         TEXT,
            max_score        INTEGER DEFAULT 100,
            attachment_name  TEXT,
            attachment_size  INTEGER DEFAULT 0,
            attachment_data  TEXT,
            created_at       TEXT DEFAULT (datetime('now'))
        );

        -- ── Submissions ──────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS submissions (
            id              TEXT PRIMARY KEY,
            assignment_id   TEXT REFERENCES assignments(id),
            student_id      TEXT NOT NULL,
            course_id       TEXT,
            content         TEXT,
            file_name       TEXT,
            file_size       INTEGER DEFAULT 0,
            file_data       TEXT,
            submitted_at    TEXT DEFAULT (datetime('now')),
            grade           REAL,
            feedback        TEXT,
            graded_at       TEXT,
            graded_by       TEXT
        );

        -- ── Complaints / Appeals ─────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS complaints (
            id              TEXT PRIMARY KEY,
            student_id      TEXT NOT NULL,
            student_name    TEXT,
            type            TEXT DEFAULT 'general',
            course_id       TEXT,
            course_name     TEXT,
            description     TEXT,
            status          TEXT DEFAULT 'pending',
            doctor_id       TEXT,
            doctor_response TEXT,
            admin_response  TEXT,
            created_at      TEXT DEFAULT (date('now')),
            updated_at      TEXT DEFAULT (date('now'))
        );

        -- ── Student fees ─────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS student_fees (
            student_id  TEXT PRIMARY KEY,
            paid        INTEGER DEFAULT 1,
            amount      REAL DEFAULT 1500,
            due_date    TEXT DEFAULT '2024-12-01'
        );

        -- ── Course waitlist ──────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS course_waitlist (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   TEXT NOT NULL,
            student_id  TEXT NOT NULL,
            joined_at   TEXT DEFAULT (datetime('now')),
            UNIQUE(course_id, student_id)
        );

        -- ── QR attendance sessions ───────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS qr_sessions (
            token       TEXT PRIMARY KEY,
            course_id   TEXT NOT NULL,
            week        INTEGER NOT NULL,
            created_at  TEXT DEFAULT (datetime('now')),
            used_by     TEXT DEFAULT '[]'
        );

        -- ── Registration status ──────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS registration_status (
            id       INTEGER PRIMARY KEY DEFAULT 1,
            is_open  INTEGER DEFAULT 1,
            semester TEXT DEFAULT 'Fall 2024',
            deadline TEXT DEFAULT '2024-12-15'
        );

        INSERT OR IGNORE INTO registration_status (id, is_open, semester, deadline)
            VALUES (1, 1, 'Fall 2024', '2024-12-15');

        -- ── Exam Proctoring ──────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS proctoring_sessions (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id          TEXT NOT NULL,
            exam_id             TEXT NOT NULL,
            started_at          TEXT DEFAULT (datetime('now')),
            ended_at            TEXT,
            identity_verified   INTEGER DEFAULT 0,
            status              TEXT DEFAULT 'active',
            suspicious_count    INTEGER DEFAULT 0,
            total_checks        INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS proctoring_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  INTEGER REFERENCES proctoring_sessions(id),
            student_id  TEXT NOT NULL,
            exam_id     TEXT NOT NULL,
            event_type  TEXT NOT NULL,
            severity    TEXT DEFAULT 'warning',
            details     TEXT,
            timestamp   TEXT DEFAULT (datetime('now'))
        );

        -- ── Academic Advising ────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS advisor_appointments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT NOT NULL,
            advisor_id      TEXT NOT NULL,
            scheduled_date  TEXT NOT NULL,
            scheduled_time  TEXT NOT NULL,
            duration_min    INTEGER DEFAULT 30,
            status          TEXT DEFAULT 'pending',
            topic           TEXT,
            student_notes   TEXT,
            advisor_notes   TEXT,
            meeting_link    TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS advisor_student_notes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT NOT NULL,
            advisor_id  TEXT NOT NULL,
            note        TEXT NOT NULL,
            is_private  INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS degree_requirements (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            program         TEXT NOT NULL,
            department      TEXT,
            course_code     TEXT NOT NULL,
            course_name     TEXT NOT NULL,
            credits         INTEGER DEFAULT 3,
            category        TEXT DEFAULT 'core',
            is_required     INTEGER DEFAULT 1,
            semester_order  INTEGER DEFAULT 1
        );

        -- ── At-Risk Early Warning ────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS at_risk_assessments (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id          TEXT UNIQUE NOT NULL,
            risk_score          REAL NOT NULL DEFAULT 0,
            risk_level          TEXT NOT NULL DEFAULT 'low',
            attendance_factor   REAL DEFAULT 0,
            grade_factor        REAL DEFAULT 0,
            emotion_factor      REAL DEFAULT 0,
            assignment_factor   REAL DEFAULT 0,
            details             TEXT DEFAULT '{}',
            advisor_notified    INTEGER DEFAULT 0,
            parent_notified     INTEGER DEFAULT 0,
            assessed_at         TEXT DEFAULT (datetime('now'))
        );
        """)
        await db.commit()
    print("[OK] Database initialized")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
