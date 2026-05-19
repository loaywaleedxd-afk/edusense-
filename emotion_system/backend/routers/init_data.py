"""
/api/init — single endpoint that returns all data the caller needs.
Called once after login; populates the frontend dataStore in one round-trip.
"""
from fastapi import APIRouter, Depends
import aiosqlite, os, json
from auth_utils import require_auth

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


async def _q(db, sql, params=()):
    db.row_factory = aiosqlite.Row
    async with db.execute(sql, params) as cur:
        return [dict(r) for r in await cur.fetchall()]


async def _one(db, sql, params=()):
    db.row_factory = aiosqlite.Row
    async with db.execute(sql, params) as cur:
        r = await cur.fetchone()
        return dict(r) if r else None


@router.get("/")
async def init_data(payload: dict = Depends(require_auth)):
    role = payload.get("role")
    uid  = int(payload.get("sub"))

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # ── Registration status (everyone needs this) ─────────────────────────
        reg_row = await _one(db, "SELECT * FROM registration_status WHERE id=1")
        reg = {"open": bool(reg_row["is_open"]), "semester": reg_row["semester"],
               "deadline": reg_row["deadline"]} if reg_row else {"open": True}

        # ── Courses / lectures ────────────────────────────────────────────────
        all_courses = await _q(db,
            """SELECT l.*, u.full_name as doctor_name
               FROM lectures l
               LEFT JOIN doctors d ON d.doctor_id = l.doctor_id
               LEFT JOIN users u ON u.id = d.user_id
               ORDER BY l.course_code"""
        )

        # ── All students (for doctor/admin) ───────────────────────────────────
        all_students = await _q(db,
            """SELECT s.student_id as id, u.full_name as name, u.email,
                      s.department as dept, s.year
               FROM students s JOIN users u ON u.id = s.user_id"""
        )

        # ── All doctors ───────────────────────────────────────────────────────
        all_doctors = await _q(db,
            """SELECT d.doctor_id as id, u.full_name as name, u.email,
                      d.department as dept, d.title
               FROM doctors d JOIN users u ON u.id = d.user_id"""
        )

        # ── Enrollments ───────────────────────────────────────────────────────
        enroll_rows = await _q(db, "SELECT course_id, student_id FROM course_enrollments")
        course_enrollments = {}
        for r in enroll_rows:
            course_enrollments.setdefault(r["course_id"], []).append(r["student_id"])

        # ── Grades ────────────────────────────────────────────────────────────
        grade_rows = await _q(db, "SELECT * FROM grades")
        exam_results = {}
        for g in grade_rows:
            sid = g["student_id"]
            cid = g["course_code"]
            exam_results.setdefault(sid, {})[cid] = {
                "grade": g["grade"], "date": g["created_at"], "addedBy": g.get("doctor_id","")
            }

        # ── Attendance ────────────────────────────────────────────────────────
        att_rows = await _q(db, "SELECT * FROM attendance")
        # Build nested dict: { "COURSEID_W01": { studentId: {record} } }
        attendance = {}
        for r in att_rows:
            week = r.get("week") or 1
            key  = f"{r['lecture_id']}_W{str(week).zfill(2)}"
            attendance.setdefault(key, {})[r["student_id"]] = {
                "studentId": r["student_id"], "courseId": r["lecture_id"],
                "week": week, "status": r["status"],
                "time": (r.get("check_in_time") or "")[-8:],
                "date": r.get("date",""), "method": r.get("method","manual"),
                "confidence": r.get("confidence",1.0),
            }

        # ── Messages ─────────────────────────────────────────────────────────
        msg_rows = await _q(db, "SELECT * FROM messages ORDER BY created_at ASC")
        chat_messages = {}
        for m in msg_rows:
            cc = m.get("course_code","general")
            chat_messages.setdefault(cc, []).append({
                "id": str(m["id"]), "sender": m.get("sender_name",""),
                "senderId": m.get("sender_id",""), "role": m.get("sender_role",""),
                "text": m.get("text",""),
                "timestamp": m.get("created_at",""),
                "reactions": {},
            })

        # ── Common collections ────────────────────────────────────────────────
        announcements  = await _q(db, "SELECT * FROM announcements ORDER BY created_at DESC")
        exam_schedule  = await _q(db, "SELECT * FROM exam_schedule ORDER BY date")
        course_resources = await _q(db, "SELECT * FROM course_resources ORDER BY created_at DESC")
        all_assignments  = await _q(db, "SELECT * FROM assignments ORDER BY created_at DESC")
        all_submissions  = await _q(db, "SELECT * FROM submissions ORDER BY submitted_at DESC")
        all_complaints   = await _q(db, "SELECT * FROM complaints ORDER BY created_at DESC")
        all_alerts       = await _q(db,
            "SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT 200")

        # ── Fees (student-specific or full for admin) ─────────────────────────
        fees_rows = await _q(db, "SELECT * FROM student_fees")
        student_fees = {r["student_id"]: {
            "paid": bool(r["paid"]), "amount": r["amount"], "dueDate": r["due_date"]
        } for r in fees_rows}

        # ── Excuses ───────────────────────────────────────────────────────────
        excuse_rows = await _q(db, "SELECT * FROM excuses ORDER BY created_at DESC")

        # ── Scope data to role ────────────────────────────────────────────────
        if role == "student":
            # Find this student's student_id
            stu_row = await _one(db, "SELECT student_id FROM students WHERE user_id=?", (uid,))
            stu_id  = stu_row["student_id"] if stu_row else ""

            enrolled_courses = [c for c in all_courses
                                if stu_id in course_enrollments.get(c["course_code"] or c["lecture_id"],"")]
            # Also include by lecture_id key
            enrolled_ids = set()
            for c in all_courses:
                cid = c.get("course_code") or c.get("lecture_id","")
                if stu_id in course_enrollments.get(cid, []):
                    enrolled_ids.add(cid)

            my_announcements = [a for a in announcements
                                if a["course_id"] in enrolled_ids]
            my_exams = [e for e in exam_schedule
                        if e["course_id"] in enrolled_ids]
            my_resources = [r for r in course_resources
                            if r["course_id"] in enrolled_ids]
            my_assignments = [a for a in all_assignments
                              if a["course_id"] in enrolled_ids]
            my_submissions = [s for s in all_submissions
                              if s["student_id"] == stu_id]
            my_complaints = [c for c in all_complaints
                             if c["student_id"] == stu_id]
            my_alerts = [a for a in all_alerts
                         if a.get("student_id") == stu_id]
            my_excuses = [e for e in excuse_rows
                          if e["student_id"] == stu_id]
            my_fees = student_fees.get(stu_id, {"paid": True, "amount": 1500, "dueDate": "2024-12-01"})

            return {
                "role": "student", "studentId": stu_id,
                "courses": all_courses,
                "courseEnrollments": course_enrollments,
                "students": all_students,
                "announcements": my_announcements,
                "examSchedule": my_exams,
                "courseResources": my_resources,
                "assignments": my_assignments,
                "submissions": my_submissions,
                "complaints": my_complaints,
                "systemAlerts": my_alerts,
                "excuses": my_excuses,
                "examResults": exam_results,
                "attendance": attendance,
                "chatMessages": chat_messages,
                "registrationStatus": reg,
                "studentFees": {stu_id: my_fees},
            }

        elif role == "doctor":
            doc_row = await _one(db, "SELECT doctor_id FROM doctors WHERE user_id=?", (uid,))
            doc_id  = doc_row["doctor_id"] if doc_row else ""

            my_courses = [c for c in all_courses if c.get("doctor_id") == doc_id]
            my_course_ids = {c.get("course_code") or c.get("lecture_id","") for c in my_courses}

            my_assignments = [a for a in all_assignments if a.get("doctor_id") == doc_id]
            my_asn_ids     = {a["id"] for a in my_assignments}
            my_submissions = [s for s in all_submissions if s.get("assignment_id") in my_asn_ids]
            my_resources   = [r for r in course_resources if r.get("doctor_id") == doc_id]
            my_announcements = [a for a in announcements if a.get("doctor_id") == doc_id]
            my_exams       = [e for e in exam_schedule if e.get("course_id") in my_course_ids]
            my_complaints  = [c for c in all_complaints if c.get("doctor_id") == doc_id]
            my_alerts      = [a for a in all_alerts if a.get("doctor_id") == doc_id]

            return {
                "role": "doctor", "doctorId": doc_id,
                "courses": all_courses,
                "courseEnrollments": course_enrollments,
                "students": all_students,
                "doctors": all_doctors,
                "announcements": my_announcements,
                "examSchedule": my_exams,
                "courseResources": my_resources,
                "assignments": my_assignments,
                "submissions": my_submissions,
                "complaints": my_complaints,
                "systemAlerts": my_alerts,
                "examResults": exam_results,
                "attendance": attendance,
                "chatMessages": chat_messages,
                "registrationStatus": reg,
                "studentFees": student_fees,
            }

        else:  # admin
            return {
                "role": "admin",
                "courses": all_courses,
                "courseEnrollments": course_enrollments,
                "students": all_students,
                "doctors": all_doctors,
                "announcements": announcements,
                "examSchedule": exam_schedule,
                "courseResources": course_resources,
                "assignments": all_assignments,
                "submissions": all_submissions,
                "complaints": all_complaints,
                "systemAlerts": all_alerts,
                "examResults": exam_results,
                "attendance": attendance,
                "chatMessages": chat_messages,
                "registrationStatus": reg,
                "studentFees": student_fees,
                "excuses": excuse_rows,
            }
