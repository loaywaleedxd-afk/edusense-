"""Absence excuses router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends

from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.post("/")
async def submit_excuse(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Any authenticated user can submit an excuse."""
    await db.execute(
        "INSERT INTO excuses (student_id, course_code, week, reason, status) VALUES ($1, $2, $3, $4, 'pending')",
        data.get("student_id"), data.get("course_code"), data.get("week", 1), data.get("reason", ""),
    )
    return {"message": "Excuse submitted"}


@router.get("/student/{student_id}")
async def get_student_excuses(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Students may only fetch their own excuses; doctors/admins can fetch any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    rows = await db.fetch(
        "SELECT * FROM excuses WHERE student_id=$1 ORDER BY created_at DESC",
        student_id,
    )
    return [dict(r) for r in rows]


@router.get("/")
async def get_all_excuses(payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """All excuses — doctors and admins only."""
    rows = await db.fetch("SELECT * FROM excuses ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.put("/{excuse_id}")
async def update_excuse_status(
    excuse_id: int,
    data: dict,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Update excuse status — doctors and admins only."""
    await db.execute(
        "UPDATE excuses SET status=$1 WHERE id=$2",
        data.get("status", "pending"), excuse_id,
    )
    return {"message": "Updated"}
