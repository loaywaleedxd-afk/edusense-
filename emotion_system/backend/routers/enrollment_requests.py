"""
Enrollment Requests — students browse open courses and request enrollment.
Admin approves or rejects; approved requests auto-enroll the student.
"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import require_auth, require_role
from notifier import manager

router = APIRouter()


@router.get("/available-courses")
async def available_courses(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return all courses with capacity, current enrollment count, and this student's request status."""
    uid  = int(payload.get("sub"))
    role = payload.get("role")

    stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
    stu_id  = stu_row["student_id"] if stu_row else None

    rows = await db.fetch(
        """SELECT DISTINCT ON (l.course_code)
                  l.lecture_id, l.course_code, l.course_name, l.room,
                  l.capacity, l.scheduled_at, l.days_label, l.semester,
                  l.color, u.full_name AS doctor_name,
                  (SELECT COUNT(*) FROM course_enrollments
                   WHERE course_id = l.course_code) AS enrolled_count
           FROM lectures l
           LEFT JOIN doctors d ON d.doctor_id = l.doctor_id
           LEFT JOIN users u ON u.id = d.user_id
           ORDER BY l.course_code"""
    )
    courses = [dict(r) for r in rows]

    if stu_id:
        # Attach request status for each course
        req_rows = await db.fetch(
            "SELECT course_id, status FROM enrollment_requests WHERE student_id=$1",
            stu_id,
        )
        req_map = {r["course_id"]: r["status"] for r in req_rows}
        enrolled_rows = await db.fetch(
            "SELECT course_id FROM course_enrollments WHERE student_id=$1", stu_id
        )
        enrolled_set = {r["course_id"] for r in enrolled_rows}

        for c in courses:
            cid = c["course_code"]
            if cid in enrolled_set:
                c["my_status"] = "enrolled"
            else:
                c["my_status"] = req_map.get(cid, "none")
    return courses


@router.get("/")
async def list_requests(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Admin/doctor: all requests. Student: own requests only."""
    role = payload.get("role")
    uid  = int(payload.get("sub"))

    if role == "student":
        stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
        stu_id  = stu_row["student_id"] if stu_row else ""
        rows = await db.fetch(
            """SELECT er.*, l.course_name, l.course_code
               FROM enrollment_requests er
               LEFT JOIN lectures l ON l.course_code = er.course_id
               WHERE er.student_id=$1 ORDER BY er.created_at DESC""",
            stu_id,
        )
    else:
        rows = await db.fetch(
            """SELECT er.*, l.course_name, u.full_name AS student_name
               FROM enrollment_requests er
               LEFT JOIN lectures l ON l.course_code = er.course_id
               LEFT JOIN students s ON s.student_id = er.student_id
               LEFT JOIN users u ON u.id = s.user_id
               WHERE er.status='pending'
               ORDER BY er.created_at DESC"""
        )
    return [dict(r) for r in rows]


@router.post("/")
async def create_request(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Student requests enrollment in a course."""
    uid = int(payload.get("sub"))
    stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
    if not stu_row:
        raise HTTPException(status_code=400, detail="Student record not found")
    stu_id    = stu_row["student_id"]
    course_id = data.get("course_id", "")

    # Check already enrolled
    existing = await db.fetchrow(
        "SELECT 1 FROM course_enrollments WHERE course_id=$1 AND student_id=$2",
        course_id, stu_id,
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    try:
        await db.execute(
            """INSERT INTO enrollment_requests (student_id, course_id, note)
               VALUES ($1,$2,$3)
               ON CONFLICT (student_id, course_id) DO UPDATE
               SET status='pending', note=EXCLUDED.note, updated_at=NOW()""",
            stu_id, course_id, data.get("note", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


@router.put("/{req_id}")
async def process_request(
    req_id: int,
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Admin approves or rejects an enrollment request."""
    status = data.get("status")  # 'approved' | 'rejected'
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")

    req_row = await db.fetchrow(
        "SELECT * FROM enrollment_requests WHERE id=$1", req_id
    )
    if not req_row:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.execute(
        "UPDATE enrollment_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3",
        status, data.get("admin_note", ""), req_id,
    )

    stu_id    = req_row["student_id"]
    course_id = req_row["course_id"]

    if status == "approved":
        # Actually enroll the student
        await db.execute(
            "INSERT INTO course_enrollments (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            course_id, stu_id,
        )

    # Notify the student
    stu_row = await db.fetchrow(
        "SELECT user_id FROM students WHERE student_id=$1", stu_id
    )
    if stu_row and stu_row["user_id"]:
        course_row = await db.fetchrow(
            "SELECT course_name FROM lectures WHERE course_code=$1", course_id
        )
        course_name = course_row["course_name"] if course_row else course_id
        icon  = "✅" if status == "approved" else "❌"
        color = "#10b981" if status == "approved" else "#ef4444"
        await manager.notify_user(str(stu_row["user_id"]), {
            "type":    "enrollment_" + status,
            "title":   f"{icon} Enrollment {status.capitalize()}",
            "message": f"Your request for {course_name} was {status}.",
            "icon":    icon,
            "color":   color,
        })

    return {"ok": True}


@router.delete("/{req_id}")
async def cancel_request(
    req_id: int,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Student cancels their own pending request."""
    uid = int(payload.get("sub"))
    stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
    stu_id  = stu_row["student_id"] if stu_row else ""
    await db.execute(
        "DELETE FROM enrollment_requests WHERE id=$1 AND student_id=$2 AND status='pending'",
        req_id, stu_id,
    )
    return {"ok": True}
