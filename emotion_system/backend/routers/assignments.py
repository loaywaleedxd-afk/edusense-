"""Assignments and submissions router."""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/")
async def get_assignments(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT a.* FROM assignments a
                   JOIN course_enrollments ce ON ce.course_id = a.course_id
                   JOIN students s ON s.student_id = ce.student_id
                   WHERE s.user_id = ? ORDER BY a.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT a.* FROM assignments a
                   JOIN doctors d ON d.doctor_id = a.doctor_id
                   WHERE d.user_id = ? ORDER BY a.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM assignments ORDER BY created_at DESC") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def add_assignment(data: dict, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO assignments
               (id, course_id, course_name, doctor_id, title, description, deadline,
                max_score, attachment_name, attachment_size, attachment_data, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("courseId",""), data.get("courseName",""),
             data.get("doctorId",""), data.get("title",""),
             data.get("description",""), data.get("deadline",""),
             int(data.get("maxScore",100)),
             data.get("attachmentName",""), int(data.get("attachmentSize",0)),
             data.get("attachmentData"), data.get("createdAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{asn_id}")
async def delete_assignment(asn_id: str, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM submissions WHERE assignment_id=?", (asn_id,))
        await db.execute("DELETE FROM assignments WHERE id=?", (asn_id,))
        await db.commit()
    return {"ok": True}


# ── Submissions ───────────────────────────────────────────────────────────────

@router.get("/submissions")
async def get_submissions(payload: dict = Depends(require_auth)):
    """Returns submissions scoped to the caller's role."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT sub.* FROM submissions sub
                   JOIN students s ON s.student_id = sub.student_id
                   WHERE s.user_id = ? ORDER BY sub.submitted_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT sub.* FROM submissions sub
                   JOIN assignments a ON a.id = sub.assignment_id
                   JOIN doctors d ON d.doctor_id = a.doctor_id
                   WHERE d.user_id = ? ORDER BY sub.submitted_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM submissions ORDER BY submitted_at DESC") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/submissions")
async def upsert_submission(data: dict, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO submissions
               (id, assignment_id, student_id, course_id, content,
                file_name, file_size, file_data, submitted_at,
                grade, feedback, graded_at, graded_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("assignmentId",""), data.get("studentId",""),
             data.get("courseId",""), data.get("content",""),
             data.get("fileName",""), int(data.get("fileSize",0)),
             data.get("fileData"), data.get("submittedAt",""),
             data.get("grade"), data.get("feedback",""),
             data.get("gradedAt"), data.get("gradedBy",""))
        )
        await db.commit()
    return {"ok": True}


@router.put("/submissions/grade")
async def grade_submission(data: dict, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """UPDATE submissions
               SET grade=?, feedback=?, graded_at=?, graded_by=?
               WHERE assignment_id=? AND student_id=?""",
            (data.get("grade"), data.get("feedback",""),
             data.get("gradedAt",""), data.get("gradedBy",""),
             data.get("assignmentId",""), data.get("studentId",""))
        )
        await db.commit()
    return {"ok": True}
