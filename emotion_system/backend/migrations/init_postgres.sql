-- ============================================================
-- EduSense — PostgreSQL initialisation script
-- Run once on a fresh Hostinger VPS PostgreSQL instance.
-- Usage: psql -U postgres -f init_postgres.sql
-- ============================================================

-- 1. Create the database and application user
-- (Run as postgres superuser)
CREATE DATABASE edusense;
CREATE USER edusense WITH ENCRYPTED PASSWORD 'change-me-in-production';
GRANT ALL PRIVILEGES ON DATABASE edusense TO edusense;

-- Connect to the new database before running the rest
\c edusense

-- 2. Grant schema privileges
GRANT CREATE ON SCHEMA public TO edusense;

-- ============================================================
-- 3. Tenants registry (always lives in public schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id          SERIAL PRIMARY KEY,
    schema_name TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    domain      TEXT UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Default tenant schema (public = dev / single-school mode)
-- Repeat this block for each school, replacing "public" with
-- the school's subdomain (e.g. "schoola").
-- ============================================================

-- ── Core auth ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id          SERIAL PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('student','doctor','admin','parent')),
    full_name   TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT UNIQUE NOT NULL,
    user_id         INTEGER REFERENCES public.users(id),
    department      TEXT,
    year            INTEGER,
    face_encoding   BYTEA,
    photo_path      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctors (
    id          SERIAL PRIMARY KEY,
    doctor_id   TEXT UNIQUE NOT NULL,
    user_id     INTEGER REFERENCES public.users(id),
    department  TEXT,
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.face_encodings (
    student_id  TEXT PRIMARY KEY,
    embedding   TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lectures ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lectures (
    id              SERIAL PRIMARY KEY,
    lecture_id      TEXT UNIQUE NOT NULL,
    doctor_id       TEXT REFERENCES public.doctors(doctor_id),
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
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
    course_id   TEXT NOT NULL,
    student_id  TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (course_id, student_id)
);

-- ── Attendance ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT REFERENCES public.students(student_id),
    lecture_id      TEXT REFERENCES public.lectures(lecture_id),
    week            INTEGER DEFAULT 1,
    check_in_time   TIMESTAMPTZ DEFAULT NOW(),
    check_out_time  TIMESTAMPTZ,
    method          TEXT DEFAULT 'face_recognition',
    status          TEXT DEFAULT 'present',
    confidence      REAL,
    date            DATE DEFAULT CURRENT_DATE
);

-- ── Emotion records ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emotion_records (
    id               SERIAL PRIMARY KEY,
    student_id       TEXT REFERENCES public.students(student_id),
    lecture_id       TEXT REFERENCES public.lectures(lecture_id),
    timestamp        TIMESTAMPTZ DEFAULT NOW(),
    emotion          TEXT NOT NULL,
    confidence       REAL NOT NULL,
    attention_score  REAL,
    engagement_score REAL
);

-- ── Grades ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grades (
    id          SERIAL PRIMARY KEY,
    student_id  TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT,
    grade       REAL NOT NULL,
    doctor_id   TEXT,
    added_by    TEXT DEFAULT 'doctor',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_code)
);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
    id          SERIAL PRIMARY KEY,
    course_code TEXT NOT NULL,
    sender_id   TEXT NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Excuses ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.excuses (
    id          SERIAL PRIMARY KEY,
    student_id  TEXT NOT NULL,
    course_code TEXT,
    week        INTEGER DEFAULT 1,
    reason      TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── System alerts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id          TEXT PRIMARY KEY,
    type        TEXT DEFAULT 'info',
    title       TEXT,
    message     TEXT,
    student_id  TEXT,
    doctor_id   TEXT,
    course_id   TEXT,
    alert_kind  TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id          SERIAL PRIMARY KEY,
    lecture_id  TEXT REFERENCES public.lectures(lecture_id),
    student_id  TEXT,
    alert_type  TEXT,
    message     TEXT,
    severity    TEXT DEFAULT 'warning',
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
    id          TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL,
    course_name TEXT,
    doctor_id   TEXT,
    doctor_name TEXT,
    title       TEXT NOT NULL,
    body        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Exam schedule ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_schedule (
    id          TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL,
    course_name TEXT,
    type        TEXT DEFAULT 'midterm',
    date        TEXT,
    time        TEXT,
    room        TEXT,
    duration    INTEGER DEFAULT 120,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Course resources ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_resources (
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
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assignments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
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
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Submissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submissions (
    id              TEXT PRIMARY KEY,
    assignment_id   TEXT REFERENCES public.assignments(id),
    student_id      TEXT NOT NULL,
    course_id       TEXT,
    content         TEXT,
    file_name       TEXT,
    file_size       INTEGER DEFAULT 0,
    file_data       TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    grade           REAL,
    feedback        TEXT,
    graded_at       TEXT,
    graded_by       TEXT
);

-- ── Complaints ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
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
    created_at      DATE DEFAULT CURRENT_DATE,
    updated_at      DATE DEFAULT CURRENT_DATE
);

-- ── Fees ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_fees (
    student_id  TEXT PRIMARY KEY,
    paid        BOOLEAN DEFAULT TRUE,
    amount      REAL DEFAULT 1500,
    due_date    TEXT DEFAULT '2024-12-01'
);

-- ── Waitlist ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_waitlist (
    id          SERIAL PRIMARY KEY,
    course_id   TEXT NOT NULL,
    student_id  TEXT NOT NULL,
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

-- ── QR sessions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qr_sessions (
    token       TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL,
    week        INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    used_by     TEXT DEFAULT '[]'
);

-- ── Registration status ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registration_status (
    id       INTEGER PRIMARY KEY DEFAULT 1,
    is_open  BOOLEAN DEFAULT TRUE,
    semester TEXT DEFAULT 'Fall 2024',
    deadline TEXT DEFAULT '2024-12-15'
);
INSERT INTO public.registration_status (id, is_open, semester, deadline)
VALUES (1, TRUE, 'Fall 2024', '2024-12-15')
ON CONFLICT DO NOTHING;

-- ── Proctoring ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proctoring_sessions (
    id                  SERIAL PRIMARY KEY,
    student_id          TEXT NOT NULL,
    exam_id             TEXT NOT NULL,
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    identity_verified   BOOLEAN DEFAULT FALSE,
    status              TEXT DEFAULT 'active',
    suspicious_count    INTEGER DEFAULT 0,
    total_checks        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id          SERIAL PRIMARY KEY,
    session_id  INTEGER REFERENCES public.proctoring_sessions(id),
    student_id  TEXT NOT NULL,
    exam_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    severity    TEXT DEFAULT 'warning',
    details     TEXT,
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Advising ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advisor_appointments (
    id              SERIAL PRIMARY KEY,
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
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.advisor_student_notes (
    id          SERIAL PRIMARY KEY,
    student_id  TEXT NOT NULL,
    advisor_id  TEXT NOT NULL,
    note        TEXT NOT NULL,
    is_private  BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.degree_requirements (
    id              SERIAL PRIMARY KEY,
    program         TEXT NOT NULL,
    department      TEXT,
    course_code     TEXT NOT NULL,
    course_name     TEXT NOT NULL,
    credits         INTEGER DEFAULT 3,
    category        TEXT DEFAULT 'core',
    is_required     BOOLEAN DEFAULT TRUE,
    semester_order  INTEGER DEFAULT 1
);

-- ── At-risk ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.at_risk_assessments (
    id                  SERIAL PRIMARY KEY,
    student_id          TEXT UNIQUE NOT NULL,
    risk_score          REAL NOT NULL DEFAULT 0,
    risk_level          TEXT NOT NULL DEFAULT 'low',
    attendance_factor   REAL DEFAULT 0,
    grade_factor        REAL DEFAULT 0,
    emotion_factor      REAL DEFAULT 0,
    assignment_factor   REAL DEFAULT 0,
    details             TEXT DEFAULT '{}',
    advisor_notified    BOOLEAN DEFAULT FALSE,
    parent_notified     BOOLEAN DEFAULT FALSE,
    assessed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Office hours ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.office_hours_slots (
    id          TEXT PRIMARY KEY,
    doctor_id   TEXT NOT NULL,
    day         TEXT NOT NULL,
    time        TEXT NOT NULL,
    duration    INTEGER DEFAULT 15,
    available   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.office_hours_bookings (
    id           TEXT PRIMARY KEY,
    slot_id      TEXT NOT NULL,
    doctor_id    TEXT NOT NULL,
    student_id   TEXT NOT NULL,
    student_name TEXT,
    doctor_name  TEXT,
    day          TEXT,
    time         TEXT,
    duration     INTEGER DEFAULT 15,
    note         TEXT,
    status       TEXT DEFAULT 'confirmed',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Grant table privileges to app user
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO edusense;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO edusense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO edusense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO edusense;
