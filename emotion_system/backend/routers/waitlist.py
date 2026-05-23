"""Course waitlist router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.get("/{course_id}")
async def get_waitlist(course_id: str, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    rows = await db.fetch(
        "SELECT * FROM course_waitlist WHERE course_id=$1 ORDER BY joined_at",
        course_id
    )
    return [dict(r) for r in rows]


@router.post("/{course_id}/{student_id}")
async def join_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    await db.execute(
        "INSERT INTO course_waitlist (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        course_id, student_id
    )
    return {"ok": True}


@router.delete("/{course_id}/{student_id}")
async def leave_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    await db.execute(
        "DELETE FROM course_waitlist WHERE course_id=$1 AND student_id=$2",
        course_id, student_id
    )
    return {"ok": True}
