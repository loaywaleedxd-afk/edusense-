"""
Migrate data from SQLite JSON exports → PostgreSQL (asyncpg)
Run inside the backend container:
  docker compose -f docker-compose.ip.yml exec backend python migrate_to_pg.py
"""
import asyncio, asyncpg, json, os
from pathlib import Path

DATA = Path(__file__).parent / "migration_data"

async def load(name):
    f = DATA / f"{name}.json"
    if not f.exists(): return []
    return json.loads(f.read_text(encoding="utf-8"))

async def run():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url)
    print(f"Connected to PostgreSQL")

    # ── USERS ────────────────────────────────────────────────────────────────
    users = await load("users")
    for u in users:
        await conn.execute("""
            INSERT INTO users (id, username, password, role, full_name, email)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (username) DO UPDATE SET
              password=EXCLUDED.password, full_name=EXCLUDED.full_name,
              email=EXCLUDED.email, role=EXCLUDED.role
        """, u["id"], u["username"], u["password"],
             u.get("role","student"), u.get("full_name",""), u.get("email",""))
    # Sync the serial sequence
    if users:
        max_id = max(u["id"] for u in users)
        await conn.execute(f"SELECT setval('users_id_seq', {max_id}, true)")
    print(f"✓ users: {len(users)}")

    # ── STUDENTS ─────────────────────────────────────────────────────────────
    students = await load("students")
    for s in students:
        await conn.execute("""
            INSERT INTO students (student_id, user_id, department, year, photo_path)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (student_id) DO UPDATE SET
              department=EXCLUDED.department, year=EXCLUDED.year,
              photo_path=EXCLUDED.photo_path
        """, s["student_id"], s.get("user_id"),
             s.get("department",""), s.get("year",1), s.get("photo_path"))
    print(f"✓ students: {len(students)}")

    # ── DOCTORS ──────────────────────────────────────────────────────────────
    doctors = await load("doctors")
    for d in doctors:
        await conn.execute("""
            INSERT INTO doctors (doctor_id, user_id, department, title)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (doctor_id) DO UPDATE SET
              department=EXCLUDED.department, title=EXCLUDED.title
        """, d["doctor_id"], d.get("user_id"),
             d.get("department",""), d.get("title",""))
    print(f"✓ doctors: {len(doctors)}")

    # ── LECTURES ─────────────────────────────────────────────────────────────
    lectures = await load("lectures")
    for l in lectures:
        await conn.execute("""
            INSERT INTO lectures (lecture_id, doctor_id, course_name, course_code,
              room, color, scheduled_at, duration_min, days, days_label, semester, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT (lecture_id) DO UPDATE SET
              course_name=EXCLUDED.course_name, room=EXCLUDED.room,
              scheduled_at=EXCLUDED.scheduled_at
        """, l["lecture_id"], l.get("doctor_id"), l.get("course_name",""),
             l.get("course_code",""), l.get("room",""), l.get("color","#3b82f6"),
             l.get("scheduled_at",""), l.get("duration_min",90),
             l.get("days","[]"), l.get("days_label",""),
             l.get("semester","Fall 2024"), l.get("status","scheduled"))
    print(f"✓ lectures: {len(lectures)}")

    # ── COURSE ENROLLMENTS ───────────────────────────────────────────────────
    enrollments = await load("course_enrollments")
    for e in enrollments:
        await conn.execute("""
            INSERT INTO course_enrollments (course_id, student_id)
            VALUES ($1,$2) ON CONFLICT DO NOTHING
        """, e["course_id"], e["student_id"])
    print(f"✓ course_enrollments: {len(enrollments)}")

    # ── ATTENDANCE ───────────────────────────────────────────────────────────
    att = await load("attendance")
    for a in att:
        await conn.execute("""
            INSERT INTO attendance (student_id, lecture_id, week, method, status, date)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT DO NOTHING
        """, a.get("student_id"), a.get("lecture_id"),
             a.get("week",1), a.get("method","face_recognition"),
             a.get("status","present"), a.get("date"))
    print(f"✓ attendance: {len(att)}")

    # ── GRADES ───────────────────────────────────────────────────────────────
    grades = await load("grades")
    for g in grades:
        await conn.execute("""
            INSERT INTO grades (student_id, course_code, course_name, grade, doctor_id)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (student_id, course_code) DO UPDATE SET
              grade=EXCLUDED.grade
        """, g["student_id"], g.get("course_code",""),
             g.get("course_name",""), float(g.get("grade",0)),
             g.get("doctor_id"))
    print(f"✓ grades: {len(grades)}")

    # ── ANNOUNCEMENTS ────────────────────────────────────────────────────────
    anns = await load("announcements")
    for a in anns:
        await conn.execute("""
            INSERT INTO announcements (id, course_id, course_name, doctor_id, doctor_name, title, body)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO NOTHING
        """, str(a["id"]), a.get("course_id",""), a.get("course_name",""),
             a.get("doctor_id",""), a.get("doctor_name",""),
             a.get("title",""), a.get("body",""))
    print(f"✓ announcements: {len(anns)}")

    # ── EXAM SCHEDULE ────────────────────────────────────────────────────────
    exams = await load("exam_schedule")
    for e in exams:
        await conn.execute("""
            INSERT INTO exam_schedule (id, course_id, course_name, type, date, time, room, duration, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO NOTHING
        """, str(e["id"]), e.get("course_id",""), e.get("course_name",""),
             e.get("type","midterm"), e.get("date"), e.get("time"),
             e.get("room",""), e.get("duration",120), e.get("notes",""))
    print(f"✓ exam_schedule: {len(exams)}")

    # ── ASSIGNMENTS ──────────────────────────────────────────────────────────
    assignments = await load("assignments")
    for a in assignments:
        await conn.execute("""
            INSERT INTO assignments (id, course_id, course_name, doctor_id, title, description, deadline, max_score)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
        """, str(a["id"]), a.get("course_id",""), a.get("course_name",""),
             a.get("doctor_id",""), a.get("title",""), a.get("description",""),
             a.get("deadline"), a.get("max_score",100))
    print(f"✓ assignments: {len(assignments)}")

    # ── SUBMISSIONS ──────────────────────────────────────────────────────────
    subs = await load("submissions")
    for s in subs:
        await conn.execute("""
            INSERT INTO submissions (id, assignment_id, student_id, course_id, content, grade, feedback)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO NOTHING
        """, str(s["id"]), s.get("assignment_id"), s.get("student_id",""),
             s.get("course_id",""), s.get("content",""),
             float(s["grade"]) if s.get("grade") else None,
             s.get("feedback",""))
    print(f"✓ submissions: {len(subs)}")

    # ── STUDENT FEES ─────────────────────────────────────────────────────────
    fees = await load("student_fees")
    for f in fees:
        await conn.execute("""
            INSERT INTO student_fees (student_id, paid, amount, due_date)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (student_id) DO UPDATE SET paid=EXCLUDED.paid
        """, f["student_id"], bool(f.get("paid",True)),
             float(f.get("amount",1500)), f.get("due_date","2026-12-01"))
    print(f"✓ student_fees: {len(fees)}")

    # ── MESSAGES ─────────────────────────────────────────────────────────────
    msgs = await load("messages")
    for m in msgs:
        await conn.execute("""
            INSERT INTO messages (course_code, sender_id, sender_name, sender_role, text)
            VALUES ($1,$2,$3,$4,$5)
        """, m.get("course_code",""), str(m.get("sender_id","")),
             m.get("sender_name",""), m.get("sender_role","student"),
             m.get("text",""))
    print(f"✓ messages: {len(msgs)}")

    # ── COURSE RESOURCES ─────────────────────────────────────────────────────
    res = await load("course_resources")
    for r in res:
        await conn.execute("""
            INSERT INTO course_resources (id, course_id, week, title, url, type, description, doctor_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
        """, str(r["id"]), r.get("course_id",""), r.get("week",1),
             r.get("title",""), r.get("url",""), r.get("type","link"),
             r.get("description",""), r.get("doctor_id",""))
    print(f"✓ course_resources: {len(res)}")

    # ── DEGREE REQUIREMENTS ───────────────────────────────────────────────────
    degs = await load("degree_requirements")
    for d in degs:
        await conn.execute("""
            INSERT INTO degree_requirements (program, department, course_code, course_name, credits, category, is_required, semester_order)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
        """, d.get("program","CS"), d.get("department",""),
             d.get("course_code",""), d.get("course_name",""),
             d.get("credits",3), d.get("category","core"),
             bool(d.get("is_required",True)), d.get("semester_order",1))
    print(f"✓ degree_requirements: {len(degs)}")

    # ── OFFICE HOURS SLOTS ────────────────────────────────────────────────────
    slots = await load("office_hours_slots")
    for s in slots:
        await conn.execute("""
            INSERT INTO office_hours_slots (id, doctor_id, day, time, duration, available)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (id) DO NOTHING
        """, str(s["id"]), s.get("doctor_id",""),
             s.get("day",""), s.get("time",""),
             s.get("duration",15), bool(s.get("available",True)))
    print(f"✓ office_hours_slots: {len(slots)}")

    # ── REGISTRATION STATUS ───────────────────────────────────────────────────
    reg = await load("registration_status")
    for r in reg:
        await conn.execute("""
            INSERT INTO registration_status (id, is_open, semester, deadline)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT DO NOTHING
        """, r.get("id",1), bool(r.get("is_open",True)),
             r.get("semester","Fall 2024"), r.get("deadline","2026-12-15"))
    print(f"✓ registration_status: {len(reg)}")

    await conn.close()
    print("\n✅ Migration complete! All data imported into PostgreSQL.")

asyncio.run(run())
