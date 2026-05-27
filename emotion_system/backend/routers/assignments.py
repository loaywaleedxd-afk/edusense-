"""Assignments and submissions router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from database import get_db
from auth_utils import require_auth, require_role
from notifier import manager
from utils import parse_dt

router = APIRouter()


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/")
async def get_assignments(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT a.* FROM assignments a
               JOIN course_enrollments ce ON ce.course_id = a.course_id
               JOIN students s ON s.student_id = ce.student_id
               WHERE s.user_id = $1 ORDER BY a.created_at DESC""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT a.* FROM assignments a
               JOIN doctors d ON d.doctor_id = a.doctor_id
               WHERE d.user_id = $1 ORDER BY a.created_at DESC""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM assignments ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("/")
async def add_assignment(data: dict, request: Request, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute(
        """INSERT INTO assignments
           (id, course_id, course_name, doctor_id, title, description, deadline,
            max_score, attachment_name, attachment_size, attachment_data, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET
             course_id=EXCLUDED.course_id, course_name=EXCLUDED.course_name,
             doctor_id=EXCLUDED.doctor_id, title=EXCLUDED.title,
             description=EXCLUDED.description, deadline=EXCLUDED.deadline,
             max_score=EXCLUDED.max_score, attachment_name=EXCLUDED.attachment_name,
             attachment_size=EXCLUDED.attachment_size, attachment_data=EXCLUDED.attachment_data,
             created_at=EXCLUDED.created_at""",
        data["id"], data.get("courseId",""), data.get("courseName",""),
        data.get("doctorId",""), data.get("title",""),
        data.get("description",""), data.get("deadline",""),
        int(data.get("maxScore",100)),
        data.get("attachmentName",""), int(data.get("attachmentSize",0)),
        data.get("attachmentData"), parse_dt(data.get("createdAt"))
    )
    # Push to all enrolled students in real-time
    course_id = data.get("courseId","")
    if course_id:
        rows = await db.fetch(
            """SELECT s.user_id FROM students s
               JOIN course_enrollments ce ON ce.student_id = s.student_id
               WHERE ce.course_id = $1""",
            course_id,
        )
        notification = {
            "type": "assignment",
            "title": f"📋 New Assignment — {data.get('courseName', '')}",
            "message": data.get("title", "New assignment posted"),
            "icon": "📋",
            "color": "#f59e0b",
        }
        for row in rows:
            if row["user_id"]:
                await manager.notify_user(str(row["user_id"]), notification)
    return {"ok": True}


@router.delete("/{asn_id}")
async def delete_assignment(asn_id: str, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute("DELETE FROM submissions WHERE assignment_id=$1", asn_id)
    await db.execute("DELETE FROM assignments WHERE id=$1", asn_id)
    return {"ok": True}


# ── Submissions ───────────────────────────────────────────────────────────────

@router.get("/submissions")
async def get_submissions(payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Returns submissions scoped to the caller's role."""
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT sub.* FROM submissions sub
               JOIN students s ON s.student_id = sub.student_id
               WHERE s.user_id = $1 ORDER BY sub.submitted_at DESC""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT sub.* FROM submissions sub
               JOIN assignments a ON a.id = sub.assignment_id
               JOIN doctors d ON d.doctor_id = a.doctor_id
               WHERE d.user_id = $1 ORDER BY sub.submitted_at DESC""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM submissions ORDER BY submitted_at DESC")
    return [dict(r) for r in rows]


@router.post("/submissions")
async def upsert_submission(data: dict, payload: dict = Depends(require_auth), db=Depends(get_db)):
    # Students may only submit for themselves
    caller_role = payload.get("role")
    caller_uid  = int(payload.get("sub"))
    if caller_role == "student":
        stu_row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", caller_uid
        )
        if not stu_row or stu_row["student_id"].upper() != str(data.get("studentId", "")).upper():
            raise HTTPException(status_code=403, detail="You may only submit for yourself")

    await db.execute(
        """INSERT INTO submissions
           (id, assignment_id, student_id, course_id, content,
            file_name, file_size, file_data, submitted_at,
            grade, feedback, graded_at, graded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             assignment_id=EXCLUDED.assignment_id, student_id=EXCLUDED.student_id,
             course_id=EXCLUDED.course_id, content=EXCLUDED.content,
             file_name=EXCLUDED.file_name, file_size=EXCLUDED.file_size,
             file_data=EXCLUDED.file_data, submitted_at=EXCLUDED.submitted_at,
             grade=EXCLUDED.grade, feedback=EXCLUDED.feedback,
             graded_at=EXCLUDED.graded_at, graded_by=EXCLUDED.graded_by""",
        data["id"], data.get("assignmentId",""), data.get("studentId",""),
        data.get("courseId",""), data.get("content",""),
        data.get("fileName",""), int(data.get("fileSize",0)),
        data.get("fileData"), parse_dt(data.get("submittedAt")),
        data.get("grade"), data.get("feedback",""),
        parse_dt(data.get("gradedAt")), data.get("gradedBy","")
    )
    return {"ok": True}


@router.put("/submissions/grade")
async def grade_submission(data: dict, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute(
        """UPDATE submissions
           SET grade=$1, feedback=$2, graded_at=$3, graded_by=$4
           WHERE assignment_id=$5 AND student_id=$6""",
        data.get("grade"), data.get("feedback",""),
        parse_dt(data.get("gradedAt")), data.get("gradedBy",""),
        data.get("assignmentId",""), data.get("studentId","")
    )
    return {"ok": True}
