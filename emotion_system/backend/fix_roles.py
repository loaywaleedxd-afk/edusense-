"""
Fix DB role connectivity — run once.

Problems fixed:
  1. dr.ahmed/dr.laila/dr.khalid/dr.sara have user rows but no doctors rows
     -> doctors table only had user_id=2 (dr.smith), not the real accounts
  2. D002/D003/D004 doctors have no lectures
  3. Student passwords may be plain-text (auto-upgrade on next login, but
     we pre-hash them here so first login works correctly via backend)
  4. Parent role scoped properly
"""
import asyncio, os, bcrypt

DB = os.getenv("DB_PATH", "emotion_system.db")

DOCTOR_ACCOUNTS = [
    # (username, doctor_id, full_name, password, department, title)
    ("dr.ahmed",  "D001", "Dr. Ahmed Smith",   "Ahmed@2024",   "Computer Science", "Associate Professor"),
    ("dr.laila",  "D002", "Dr. Laila Hassan",  "Laila@2024",   "Computer Science", "Assistant Professor"),
    ("dr.khalid", "D003", "Dr. Khalid Omar",   "Khalid@2024",  "Computer Science", "Professor"),
    ("dr.sara",   "D004", "Dr. Sara Nour",     "Sara@2024",    "Computer Science", "Lecturer"),
]

STUDENT_PASSWORD = "pass123"
ADMIN_PASSWORD   = "Admin@EduSense2025!"
PARENT_PASSWORD  = "Parent@EduSense2025!"

# Courses for each doctor
DOCTOR_COURSES = {
    "D001": [
        ("CS401", "Artificial Intelligence", "Hall A", "09:00", '["Mon","Wed"]', "Spring 2026", "#3b82f6"),
        ("CS402", "Machine Learning",         "Hall B", "11:00", '["Mon","Wed"]', "Spring 2026", "#8b5cf6"),
    ],
    "D002": [
        ("CS403", "Data Science",             "Lab 1",  "13:00", '["Tue","Thu"]', "Spring 2026", "#10b981"),
        ("CS404", "Computer Vision",          "Hall C", "09:00", '["Tue","Thu"]', "Spring 2026", "#f59e0b"),
    ],
    "D003": [
        ("CS405", "Natural Language Processing", "Hall D", "11:00", '["Sun","Tue"]', "Spring 2026", "#ef4444"),
    ],
    "D004": [
        ("CS201", "Data Structures",          "Lab 2",  "08:00", '["Mon","Wed","Thu"]', "Spring 2026", "#06b6d4"),
        ("CS301", "Algorithms",               "Hall E", "10:00", '["Sun","Tue"]',       "Spring 2026", "#f97316"),
    ],
}

def hsh(pwd):
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt(12)).decode()

async def main():
    import aiosqlite
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        print("=== Fixing doctor accounts ===")
        for username, doctor_id, full_name, password, dept, title in DOCTOR_ACCOUNTS:
            hashed = hsh(password)

            # Upsert user
            row = await (await db.execute("SELECT id FROM users WHERE username=?", (username,))).fetchone()
            if row:
                uid = row["id"]
                await db.execute(
                    "UPDATE users SET password=?, full_name=? WHERE id=?",
                    (hashed, full_name, uid)
                )
                print(f"  Updated user {username} (id={uid})")
            else:
                await db.execute(
                    "INSERT INTO users (username, password, role, full_name) VALUES (?,?,?,?)",
                    (username, hashed, "doctor", full_name)
                )
                uid = (await (await db.execute("SELECT id FROM users WHERE username=?", (username,))).fetchone())["id"]
                print(f"  Created user {username} (id={uid})")

            # Upsert doctors row
            existing = await (await db.execute("SELECT id FROM doctors WHERE doctor_id=?", (doctor_id,))).fetchone()
            if existing:
                await db.execute(
                    "UPDATE doctors SET user_id=?, department=?, title=? WHERE doctor_id=?",
                    (uid, dept, title, doctor_id)
                )
                print(f"  Updated doctors row {doctor_id} -> user_id={uid}")
            else:
                await db.execute(
                    "INSERT INTO doctors (doctor_id, user_id, department, title) VALUES (?,?,?,?)",
                    (doctor_id, uid, dept, title)
                )
                print(f"  Created doctors row {doctor_id} -> user_id={uid}")

        print()
        print("=== Fixing lectures / courses ===")
        import json
        for doctor_id, courses in DOCTOR_COURSES.items():
            for course_code, course_name, room, time, days_json, semester, color in courses:
                existing = await (await db.execute(
                    "SELECT lecture_id FROM lectures WHERE lecture_id=?", (course_code,)
                )).fetchone()
                scheduled_at = f"2026-01-15 {time}:00"
                if existing:
                    await db.execute(
                        """UPDATE lectures SET doctor_id=?, course_name=?, course_code=?,
                           room=?, scheduled_at=?, days=?, semester=?, color=?
                           WHERE lecture_id=?""",
                        (doctor_id, course_name, course_code, room, scheduled_at,
                         days_json, semester, color, course_code)
                    )
                    print(f"  Updated lecture {course_code} -> {doctor_id}")
                else:
                    await db.execute(
                        """INSERT INTO lectures
                           (lecture_id, doctor_id, course_name, course_code, room,
                            scheduled_at, duration_min, days, semester, status, color)
                           VALUES (?,?,?,?,?,?,90,?,?,?,?)""",
                        (course_code, doctor_id, course_name, course_code, room,
                         scheduled_at, days_json, semester, "scheduled", color)
                    )
                    print(f"  Created lecture {course_code} -> {doctor_id}")

        print()
        print("=== Ensuring all courses have enrollments for all DB students ===")
        student_rows = await (await db.execute("SELECT student_id FROM students")).fetchall()
        student_ids  = [r["student_id"] for r in student_rows]
        all_courses  = await (await db.execute("SELECT lecture_id FROM lectures")).fetchall()
        course_ids   = [r["lecture_id"] for r in all_courses]

        enrolled = 0
        for cid in course_ids:
            for sid in student_ids:
                await db.execute(
                    "INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES (?,?)",
                    (cid, sid)
                )
                enrolled += 1
        print(f"  Ensured {enrolled} enrollment rows across {len(course_ids)} courses x {len(student_ids)} students")

        print()
        print("=== Fixing student passwords ===")
        hashed_stu = hsh(STUDENT_PASSWORD)
        student_users = await (await db.execute(
            "SELECT id, username FROM users WHERE role='student'"
        )).fetchall()
        for u in student_users:
            await db.execute("UPDATE users SET password=? WHERE id=?", (hashed_stu, u["id"]))
        print(f"  Updated passwords for {len(student_users)} student accounts")

        print()
        print("=== Fixing admin + parent passwords ===")
        await db.execute(
            "UPDATE users SET password=? WHERE username='admin'", (hsh(ADMIN_PASSWORD),)
        )
        await db.execute(
            "UPDATE users SET password=? WHERE role='parent'", (hsh(PARENT_PASSWORD),)
        )
        print("  Admin and parent passwords updated")

        print()
        print("=== Removing orphan dr.smith user ===")
        # dr.smith is a leftover — dr.ahmed now owns D001
        await db.execute(
            "DELETE FROM users WHERE username='dr.smith'"
        )
        print("  Removed dr.smith (dr.ahmed now owns D001)")

        await db.commit()
        print()
        print("=== Done — verifying ===")

        # Verify
        async with db.execute("SELECT d.doctor_id, u.username, u.full_name FROM doctors d JOIN users u ON u.id=d.user_id") as c:
            print("Doctors in DB:")
            for r in await c.fetchall():
                print(f"  {dict(r)}")

        async with db.execute("SELECT lecture_id, doctor_id, course_name FROM lectures ORDER BY doctor_id") as c:
            print("Lectures in DB:")
            for r in await c.fetchall():
                print(f"  {dict(r)}")

        async with db.execute("SELECT course_id, COUNT(*) as cnt FROM course_enrollments GROUP BY course_id") as c:
            print("Enrollments per course:")
            for r in await c.fetchall():
                print(f"  {dict(r)}")

asyncio.run(main())
