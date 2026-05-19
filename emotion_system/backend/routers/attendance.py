"""Attendance router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db
import aiosqlite, os

from auth_utils import require_auth, require_role

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


class AttendanceRecord(BaseModel):
    student_id: str
    lecture_id: str
    status: str = "present"
    method: str = "face_recognition"
    confidence: Optional[float] = None


class CheckOutRequest(BaseModel):
    student_id: str
    lecture_id: str


@router.post("/mark")
async def mark_attendance(
    rec: AttendanceRecord,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Mark attendance — doctors and admins only."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM attendance WHERE student_id=? AND lecture_id=? AND status='present'",
            (rec.student_id, rec.lecture_id),
        )
        if await cursor.fetchone():
            return {"message": "Already marked present", "duplicate": True}
        await db.execute(
            "INSERT INTO attendance (student_id,lecture_id,status,method,confidence) VALUES (?,?,?,?,?)",
            (rec.student_id, rec.lecture_id, rec.status, rec.method, rec.confidence),
        )
        await db.commit()
    return {"message": "Attendance marked", "student_id": rec.student_id, "status": rec.status}


@router.post("/checkout")
async def checkout(
    req: CheckOutRequest,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE attendance SET check_out_time=datetime('now') WHERE student_id=? AND lecture_id=? AND check_out_time IS NULL",
            (req.student_id, req.lecture_id),
        )
        await db.commit()
    return {"message": "Checked out"}


@router.get("/lecture/{lecture_id}")
async def get_lecture_attendance(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Full attendance list for a lecture — doctors/admins only."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT a.*, s.student_id, u.full_name, s.department
               FROM attendance a
               JOIN students s ON a.student_id = s.student_id
               JOIN users u ON s.user_id = u.id
               WHERE a.lecture_id=? ORDER BY a.check_in_time""",
            (lecture_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    payload: dict = Depends(require_auth),
):
    """Students can only view their own attendance; doctors/admins can view any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT student_id FROM students WHERE user_id=?", (int(caller_id),)
            ) as cur:
                row = await cur.fetchone()
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT a.*, l.course_name, l.course_code, l.scheduled_at
               FROM attendance a
               JOIN lectures l ON a.lecture_id = l.lecture_id
               WHERE a.student_id=? ORDER BY a.check_in_time DESC""",
            (student_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/summary/{lecture_id}")
async def attendance_summary(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        total_cursor = await db.execute("SELECT COUNT(*) as total FROM students")
        total = (await total_cursor.fetchone())["total"]
        present_cursor = await db.execute(
            "SELECT COUNT(*) as present FROM attendance WHERE lecture_id=? AND status='present'",
            (lecture_id,),
        )
        present = (await present_cursor.fetchone())["present"]
    return {
        "lecture_id": lecture_id,
        "total_students": total,
        "present": present,
        "absent": total - present,
        "attendance_rate": round(present / max(total, 1) * 100, 1),
    }
