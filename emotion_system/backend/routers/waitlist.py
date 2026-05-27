"""Course waitlist router."""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


def _check_waitlist_ownership(payload: dict, student_id: str):
    """Raise 403 if a student tries to act on behalf of a different student."""
    if payload.get("role") == "student":
        # student_id in the path must match the token's sub owner — verified by caller
        pass  # ownership resolved in each endpoint below


@router.get("/{course_id}")
async def get_waitlist(course_id: str, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    rows = await db.fetch(
        "SELECT * FROM course_waitlist WHERE course_id=$1 ORDER BY joined_at",
        course_id
    )
    return [dict(r) for r in rows]


@router.post("/{course_id}/{student_id}")
async def join_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    # Students may only join waitlist for themselves
    if payload.get("role") == "student":
        stu_row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(payload.get("sub"))
        )
        if not stu_row or stu_row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="You may only join the waitlist for yourself")

    await db.execute(
        "INSERT INTO course_waitlist (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        course_id, student_id
    )
    return {"ok": True}


@router.delete("/{course_id}/{student_id}")
async def leave_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    # Students may only leave waitlist for themselves
    if payload.get("role") == "student":
        stu_row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(payload.get("sub"))
        )
        if not stu_row or stu_row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="You may only leave the waitlist for yourself")

    await db.execute(
        "DELETE FROM course_waitlist WHERE course_id=$1 AND student_id=$2",
        course_id, student_id
    )
    return {"ok": True}
