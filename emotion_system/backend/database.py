"""
Database setup — PostgreSQL via asyncpg
All tables for EduSense: auth, students, doctors, lectures, attendance,
emotions, grades, messages, excuses, announcements, exam schedule,
course resources, assignments, submissions, complaints, alerts,
fees, waitlists, QR sessions, enrollments.

Multi-tenancy: each school lives in its own Postgres schema.
The public schema holds the tenants registry.
"""
import asyncpg
import os
from fastapi import Request

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/edusense")


async def init_pool(app):
    """Create the asyncpg connection pool and store it on app.state."""
    app.state.pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=20)
    print("[OK] Database pool created")


async def init_tenant_schema(pool, schema: str):
    """Create all tables inside *schema* (creates the schema if needed)."""
    async with pool.acquire() as conn:
        # Create tenants table in public schema
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS public.tenants (
                id                       SERIAL PRIMARY KEY,
                schema_name              TEXT UNIQUE NOT NULL,
                name                     TEXT NOT NULL,
                domain                   TEXT UNIQUE,
                contact_email            TEXT,
                active                   BOOLEAN DEFAULT TRUE,
                plan                     TEXT DEFAULT 'trial',
                billing_status           TEXT DEFAULT 'trial',
                expires_at               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
                face_recognition_enabled BOOLEAN DEFAULT TRUE,
                max_students             INTEGER DEFAULT 500,
                created_at               TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # Add new columns to existing installs (safe — ignored if already present)
        for _col in [
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'trial'",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS face_recognition_enabled BOOLEAN DEFAULT TRUE",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 500",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6'",
            "ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_data TEXT",
        ]:
            await conn.execute(_col)

        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
        await conn.execute(f'SET search_path TO "{schema}"')

        # ── Core auth ────────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".users (
                id          SERIAL PRIMARY KEY,
                username    TEXT UNIQUE NOT NULL,
                password    TEXT NOT NULL,
                role        TEXT NOT NULL CHECK(role IN ('student','doctor','admin','parent','superadmin')),
                full_name   TEXT NOT NULL,
                email       TEXT UNIQUE NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".students (
                id              SERIAL PRIMARY KEY,
                student_id      TEXT UNIQUE NOT NULL,
                user_id         INTEGER REFERENCES "{schema}".users(id),
                department      TEXT,
                year            INTEGER,
                face_encoding   BYTEA,
                photo_path      TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".doctors (
                id          SERIAL PRIMARY KEY,
                doctor_id   TEXT UNIQUE NOT NULL,
                user_id     INTEGER REFERENCES "{schema}".users(id),
                department  TEXT,
                title       TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Face encodings ───────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".face_encodings (
                student_id  TEXT PRIMARY KEY,
                embedding   TEXT NOT NULL,
                updated_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Courses / Lectures ───────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".lectures (
                id              SERIAL PRIMARY KEY,
                lecture_id      TEXT UNIQUE NOT NULL,
                doctor_id       TEXT REFERENCES "{schema}".doctors(doctor_id),
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
            )
        """)

        # ── Course enrollments ───────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".course_enrollments (
                course_id   TEXT NOT NULL,
                student_id  TEXT NOT NULL,
                enrolled_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (course_id, student_id)
            )
        """)

        # ── Attendance ───────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".attendance (
                id              SERIAL PRIMARY KEY,
                student_id      TEXT REFERENCES "{schema}".students(student_id),
                lecture_id      TEXT REFERENCES "{schema}".lectures(lecture_id),
                week            INTEGER DEFAULT 1,
                check_in_time   TIMESTAMPTZ DEFAULT NOW(),
                check_out_time  TIMESTAMPTZ,
                method          TEXT DEFAULT 'face_recognition',
                status          TEXT DEFAULT 'present',
                confidence      REAL,
                date            DATE DEFAULT CURRENT_DATE
            )
        """)

        # ── Emotion records ──────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".emotion_records (
                id               SERIAL PRIMARY KEY,
                student_id       TEXT REFERENCES "{schema}".students(student_id),
                lecture_id       TEXT REFERENCES "{schema}".lectures(lecture_id),
                timestamp        TIMESTAMPTZ DEFAULT NOW(),
                emotion          TEXT NOT NULL,
                confidence       REAL NOT NULL,
                attention_score  REAL,
                engagement_score REAL
            )
        """)

        # ── Grades ──────────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".grades (
                id          SERIAL PRIMARY KEY,
                student_id  TEXT NOT NULL,
                course_code TEXT NOT NULL,
                course_name TEXT,
                grade       REAL NOT NULL,
                doctor_id   TEXT,
                added_by    TEXT DEFAULT 'doctor',
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(student_id, course_code)
            )
        """)

        # ── Messages ────────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".messages (
                id          SERIAL PRIMARY KEY,
                course_code TEXT NOT NULL,
                sender_id   TEXT NOT NULL,
                sender_name TEXT,
                sender_role TEXT,
                text        TEXT NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Excuses ─────────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".excuses (
                id          SERIAL PRIMARY KEY,
                student_id  TEXT NOT NULL,
                course_code TEXT,
                week        INTEGER DEFAULT 1,
                reason      TEXT,
                status      TEXT DEFAULT 'pending',
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── System alerts / notifications ────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".system_alerts (
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
            )
        """)

        # ── Legacy alerts (face-detection engine) ────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".alerts (
                id          SERIAL PRIMARY KEY,
                lecture_id  TEXT REFERENCES "{schema}".lectures(lecture_id),
                student_id  TEXT,
                alert_type  TEXT,
                message     TEXT,
                severity    TEXT DEFAULT 'warning',
                is_read     BOOLEAN DEFAULT FALSE,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Announcements ────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".announcements (
                id          TEXT PRIMARY KEY,
                course_id   TEXT NOT NULL,
                course_name TEXT,
                doctor_id   TEXT,
                doctor_name TEXT,
                title       TEXT NOT NULL,
                body        TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Exam schedule ────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".exam_schedule (
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
            )
        """)

        # ── Course resources ─────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".course_resources (
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
            )
        """)

        # ── Assignments ──────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".assignments (
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
            )
        """)

        # ── Submissions ──────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".submissions (
                id              TEXT PRIMARY KEY,
                assignment_id   TEXT REFERENCES "{schema}".assignments(id),
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
            )
        """)

        # ── Complaints / Appeals ─────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".complaints (
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
            )
        """)

        # ── Student fees ─────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".student_fees (
                student_id  TEXT PRIMARY KEY,
                paid        BOOLEAN DEFAULT TRUE,
                amount      REAL DEFAULT 1500,
                due_date    TEXT DEFAULT '2024-12-01'
            )
        """)

        # ── Course waitlist ──────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".course_waitlist (
                id          SERIAL PRIMARY KEY,
                course_id   TEXT NOT NULL,
                student_id  TEXT NOT NULL,
                joined_at   TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(course_id, student_id)
            )
        """)

        # ── QR attendance sessions ───────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".qr_sessions (
                token       TEXT PRIMARY KEY,
                course_id   TEXT NOT NULL,
                week        INTEGER NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                used_by     TEXT DEFAULT '[]'
            )
        """)

        # ── Registration status ──────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".registration_status (
                id       INTEGER PRIMARY KEY DEFAULT 1,
                is_open  BOOLEAN DEFAULT TRUE,
                semester TEXT DEFAULT 'Fall 2024',
                deadline TEXT DEFAULT '2024-12-15'
            )
        """)

        await conn.execute(f"""
            INSERT INTO "{schema}".registration_status (id, is_open, semester, deadline)
            VALUES (1, TRUE, 'Fall 2024', '2024-12-15')
            ON CONFLICT DO NOTHING
        """)

        # ── Exam Proctoring ──────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".proctoring_sessions (
                id                  SERIAL PRIMARY KEY,
                student_id          TEXT NOT NULL,
                exam_id             TEXT NOT NULL,
                started_at          TIMESTAMPTZ DEFAULT NOW(),
                ended_at            TIMESTAMPTZ,
                identity_verified   BOOLEAN DEFAULT FALSE,
                status              TEXT DEFAULT 'active',
                suspicious_count    INTEGER DEFAULT 0,
                total_checks        INTEGER DEFAULT 0
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".proctoring_events (
                id          SERIAL PRIMARY KEY,
                session_id  INTEGER REFERENCES "{schema}".proctoring_sessions(id),
                student_id  TEXT NOT NULL,
                exam_id     TEXT NOT NULL,
                event_type  TEXT NOT NULL,
                severity    TEXT DEFAULT 'warning',
                details     TEXT,
                timestamp   TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Academic Advising ────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".advisor_appointments (
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
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".advisor_student_notes (
                id          SERIAL PRIMARY KEY,
                student_id  TEXT NOT NULL,
                advisor_id  TEXT NOT NULL,
                note        TEXT NOT NULL,
                is_private  BOOLEAN DEFAULT TRUE,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".degree_requirements (
                id              SERIAL PRIMARY KEY,
                program         TEXT NOT NULL,
                department      TEXT,
                course_code     TEXT NOT NULL,
                course_name     TEXT NOT NULL,
                credits         INTEGER DEFAULT 3,
                category        TEXT DEFAULT 'core',
                is_required     BOOLEAN DEFAULT TRUE,
                semester_order  INTEGER DEFAULT 1
            )
        """)

        # ── At-Risk Early Warning ────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".at_risk_assessments (
                id                  SERIAL PRIMARY KEY,
                student_id          TEXT UNIQUE NOT NULL,
                risk_score          REAL NOT NULL DEFAULT 0,
                risk_level          TEXT NOT NULL DEFAULT 'low',
                attendance_factor   REAL DEFAULT 0,
                grade_factor        REAL DEFAULT 0,
                emotion_factor      REAL DEFAULT 0,
                assignment_factor   REAL DEFAULT 0,
                details             TEXT DEFAULT '{{}}',
                advisor_notified    BOOLEAN DEFAULT FALSE,
                parent_notified     BOOLEAN DEFAULT FALSE,
                assessed_at         TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Office Hours ─────────────────────────────────────────────────────
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".office_hours_slots (
                id          TEXT PRIMARY KEY,
                doctor_id   TEXT NOT NULL,
                day         TEXT NOT NULL,
                time        TEXT NOT NULL,
                duration    INTEGER DEFAULT 15,
                available   BOOLEAN DEFAULT TRUE,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS "{schema}".office_hours_bookings (
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
            )
        """)

    print(f"[OK] Schema '{schema}' initialized")


async def get_db(request: Request):
    """
    FastAPI dependency — acquires a connection from the pool and sets
    search_path to the tenant schema derived from the request host.
    Yields an asyncpg Connection; the caller must NOT call .close().
    """
    pool   = request.app.state.pool
    tenant = getattr(request.state, "tenant", "public")
    async with pool.acquire() as conn:
        await conn.execute(f'SET search_path TO "{tenant}", public')
        yield conn
