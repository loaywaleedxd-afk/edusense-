"""Attendance router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db

from auth_utils import require_auth, require_role

router = APIRouter()


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
    db=Depends(get_db),
):
    """Mark attendance — doctors and admins only."""
    existing = await db.fetchrow(
        "SELECT id FROM attendance WHERE student_id=$1 AND lecture_id=$2 AND status='present'",
        rec.student_id, rec.lecture_id,
    )
    if existing:
        return {"message": "Already marked present", "duplicate": True}
    await db.execute(
        "INSERT INTO attendance (student_id,lecture_id,status,method,confidence) VALUES ($1,$2,$3,$4,$5)",
        rec.student_id, rec.lecture_id, rec.status, rec.method, rec.confidence,
    )
    return {"message": "Attendance marked", "student_id": rec.student_id, "status": rec.status}


@router.post("/checkout")
async def checkout(
    req: CheckOutRequest,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    await db.execute(
        "UPDATE attendance SET check_out_time=NOW() WHERE student_id=$1 AND lecture_id=$2 AND check_out_time IS NULL",
        req.student_id, req.lecture_id,
    )
    return {"message": "Checked out"}


@router.get("/lecture/{lecture_id}")
async def get_lecture_attendance(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Full attendance list for a lecture — doctors/admins only."""
    rows = await db.fetch(
        """SELECT a.*, s.student_id, u.full_name, s.department
           FROM attendance a
           JOIN students s ON a.student_id = s.student_id
           JOIN users u ON s.user_id = u.id
           WHERE a.lecture_id=$1 ORDER BY a.check_in_time""",
        lecture_id,
    )
    return [dict(r) for r in rows]


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Students can only view their own attendance; doctors/admins can view any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    rows = await db.fetch(
        """SELECT a.*, l.course_name, l.course_code, l.scheduled_at
           FROM attendance a
           JOIN lectures l ON a.lecture_id = l.lecture_id
           WHERE a.student_id=$1 ORDER BY a.check_in_time DESC""",
        student_id,
    )
    return [dict(r) for r in rows]


@router.get("/summary/{lecture_id}")
async def attendance_summary(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    total_row = await db.fetchrow("SELECT COUNT(*) as total FROM students")
    total = total_row["total"] if total_row else 0
    present_row = await db.fetchrow(
        "SELECT COUNT(*) as present FROM attendance WHERE lecture_id=$1 AND status='present'",
        lecture_id,
    )
    present = present_row["present"] if present_row else 0
    return {
        "lecture_id": lecture_id,
        "total_students": total,
        "present": present,
        "absent": total - present,
        "attendance_rate": round(present / max(total, 1) * 100, 1),
    }
