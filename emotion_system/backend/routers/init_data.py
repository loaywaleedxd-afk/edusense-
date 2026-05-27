"""
/api/init — single endpoint that returns all data the caller needs.
Called once after login; populates the frontend dataStore in one round-trip.
"""
from fastapi import APIRouter, Depends
import json
from database import get_db
from auth_utils import require_auth

router = APIRouter()


async def _q(db, sql, *params):
    rows = await db.fetch(sql, *params)
    return [dict(r) for r in rows]


async def _one(db, sql, *params):
    r = await db.fetchrow(sql, *params)
    return dict(r) if r else None


@router.get("/")
async def init_data(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = int(payload.get("sub"))

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
                  s.department as dept, s.year, s.photo_path
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
            "grade": g["grade"], "date": str(g["created_at"]), "addedBy": g.get("doctor_id","")
        }

    # ── Attendance ────────────────────────────────────────────────────────
    # Scope the attendance query to the current user's role so we never send
    # thousands of rows to users who only need their own data.
    if role == "student":
        # Students only need their own attendance — typically < 200 rows
        stu_row_for_att = await _one(db, "SELECT student_id FROM students WHERE user_id=$1", uid)
        stu_id_for_att  = stu_row_for_att["student_id"] if stu_row_for_att else ""
        att_rows = await _q(db,
            "SELECT * FROM attendance WHERE student_id=$1 ORDER BY check_in_time DESC",
            stu_id_for_att
        ) if stu_id_for_att else []
    elif role == "doctor":
        # Doctors need attendance for their own courses only (≤ 16 weeks × capacity)
        doc_row_for_att = await _one(db, "SELECT doctor_id FROM doctors WHERE user_id=$1", uid)
        doc_id_for_att  = doc_row_for_att["doctor_id"] if doc_row_for_att else ""
        att_rows = await _q(db,
            """SELECT a.* FROM attendance a
               JOIN lectures l ON a.lecture_id = l.lecture_id
               WHERE l.doctor_id = $1
               ORDER BY a.check_in_time DESC LIMIT 2000""",
            doc_id_for_att
        ) if doc_id_for_att else []
    elif role == "parent":
        att_rows = []   # parent attendance scoped below after linked_ids is known
    else:
        # Admin gets full dataset — capped to keep payload manageable
        att_rows = await _q(db,
            "SELECT * FROM attendance ORDER BY check_in_time DESC LIMIT 5000"
        )

    def _build_attendance(rows):
        att = {}
        for r in rows:
            week = r.get("week") or 1
            key  = f"{r['lecture_id']}_W{str(week).zfill(2)}"
            att.setdefault(key, {})[r["student_id"]] = {
                "studentId": r["student_id"], "courseId": r["lecture_id"],
                "week": week, "status": r["status"],
                "time": (str(r.get("check_in_time") or ""))[-8:],
                "date": str(r.get("date","") or ""), "method": r.get("method","manual"),
                "confidence": r.get("confidence",1.0),
            }
        return att

    attendance = _build_attendance(att_rows)

    # ── Messages ─────────────────────────────────────────────────────────
    msg_rows = await _q(db, "SELECT * FROM messages ORDER BY created_at ASC")
    chat_messages = {}
    for m in msg_rows:
        cc = m.get("course_code","general")
        chat_messages.setdefault(cc, []).append({
            "id": str(m["id"]), "sender": m.get("sender_name",""),
            "senderId": m.get("sender_id",""), "role": m.get("sender_role",""),
            "text": m.get("text",""),
            "timestamp": str(m.get("created_at","")),
            "reactions": {},
        })

    # ── Common collections ────────────────────────────────────────────────
    calendar_events  = await _q(db, "SELECT * FROM calendar_events ORDER BY date, created_at")
    announcements    = await _q(db, "SELECT * FROM announcements ORDER BY created_at DESC")
    exam_schedule    = await _q(db, "SELECT * FROM exam_schedule ORDER BY date")
    course_resources = await _q(db, "SELECT * FROM course_resources ORDER BY created_at DESC")
    all_assignments  = await _q(db, "SELECT * FROM assignments ORDER BY created_at DESC")
    all_submissions  = await _q(db, "SELECT * FROM submissions ORDER BY submitted_at DESC")
    all_complaints   = await _q(db, "SELECT * FROM complaints ORDER BY created_at DESC")
    all_alerts       = await _q(db,
        "SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT 200")

    # ── Fees ─────────────────────────────────────────────────────────────
    fees_rows = await _q(db, "SELECT * FROM student_fees")
    student_fees = {r["student_id"]: {
        "paid": bool(r["paid"]), "amount": r["amount"], "dueDate": r["due_date"]
    } for r in fees_rows}

    # ── Excuses ───────────────────────────────────────────────────────────
    excuse_rows = await _q(db, "SELECT * FROM excuses ORDER BY created_at DESC")

    # ── Parent ↔ student links ────────────────────────────────────────────
    parent_student_rows = await _q(db, "SELECT parent_id, student_id FROM parent_students")

    # ── Scope data to role ────────────────────────────────────────────────
    if role == "parent":
        # Find which students this parent is linked to
        linked_ids = [r["student_id"] for r in parent_student_rows if r["parent_id"] == uid]
        my_courses = [c for c in all_courses if any(
            sid in course_enrollments.get(c.get("course_code") or c.get("lecture_id",""), [])
            for sid in linked_ids
        )]
        my_grades = {sid: exam_results.get(sid, {}) for sid in linked_ids}
        # Fetch attendance only for linked students (att_rows was [] for parents above)
        if linked_ids:
            placeholders = ",".join(f"${i+1}" for i in range(len(linked_ids)))
            parent_att = await _q(db,
                f"SELECT * FROM attendance WHERE student_id IN ({placeholders}) ORDER BY check_in_time DESC",
                *linked_ids
            )
        else:
            parent_att = []
        my_attendance = _build_attendance(parent_att)
        linked_students = [s for s in all_students if s["id"] in linked_ids]
        return {
            "role": "parent",
            "linkedStudentIds": linked_ids,
            "students": linked_students,
            "courses": my_courses,
            "courseEnrollments": {
                cid: [s for s in sids if s in linked_ids]
                for cid, sids in course_enrollments.items()
            },
            "examResults": my_grades,
            "attendance": my_attendance,
            "announcements": [a for a in announcements if a["course_id"] in {
                c.get("course_code") or c.get("lecture_id","") for c in my_courses
            }],
            "examSchedule": [e for e in exam_schedule if e["course_id"] in {
                c.get("course_code") or c.get("lecture_id","") for c in my_courses
            }],
            "calendarEvents": calendar_events,
        }

    if role == "student":
        stu_row = await _one(db, "SELECT student_id FROM students WHERE user_id=$1", uid)
        stu_id  = stu_row["student_id"] if stu_row else ""

        enrolled_ids = set()
        for c in all_courses:
            cid = c.get("course_code") or c.get("lecture_id","")
            if stu_id in course_enrollments.get(cid, []):
                enrolled_ids.add(cid)

        my_announcements = [a for a in announcements if a["course_id"] in enrolled_ids]
        my_exams = [e for e in exam_schedule if e["course_id"] in enrolled_ids]
        my_resources = [r for r in course_resources if r["course_id"] in enrolled_ids]
        my_assignments = [a for a in all_assignments if a["course_id"] in enrolled_ids]
        my_submissions = [s for s in all_submissions if s["student_id"] == stu_id]
        my_complaints = [c for c in all_complaints if c["student_id"] == stu_id]
        my_alerts = [a for a in all_alerts if a.get("student_id") == stu_id]
        my_excuses = [e for e in excuse_rows if e["student_id"] == stu_id]
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
            "calendarEvents": calendar_events,
        }

    elif role == "doctor":
        doc_row = await _one(db, "SELECT doctor_id FROM doctors WHERE user_id=$1", uid)
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
            "calendarEvents": calendar_events,
        }

    else:  # admin
        # All parents
        all_parents = await _q(db,
            "SELECT id, full_name AS name, email FROM users WHERE role='parent' ORDER BY full_name"
        )
        return {
            "role": "admin",
            "courses": all_courses,
            "courseEnrollments": course_enrollments,
            "students": all_students,
            "doctors": all_doctors,
            "parents": all_parents,
            "parentStudents": [dict(r) for r in parent_student_rows],
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
            "calendarEvents": calendar_events,
        }
