"""Absence excuses router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
import aiosqlite, os

from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.post("/")
async def submit_excuse(
    data: dict,
    payload: dict = Depends(require_auth),
):
    """Any authenticated user can submit an excuse."""
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "INSERT INTO excuses (student_id, course_code, week, reason, status) VALUES (?, ?, ?, ?, 'pending')",
            (data.get("student_id"), data.get("course_code"), data.get("week", 1), data.get("reason", "")),
        )
        await db.commit()
    return {"message": "Excuse submitted"}


@router.get("/student/{student_id}")
async def get_student_excuses(
    student_id: str,
    payload: dict = Depends(require_auth),
):
    """Students may only fetch their own excuses; doctors/admins can fetch any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        async with aiosqlite.connect(DB) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT student_id FROM students WHERE user_id=?", (int(caller_id),)
            ) as cur:
                row = await cur.fetchone()
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM excuses WHERE student_id=? ORDER BY created_at DESC",
            (student_id,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/")
async def get_all_excuses(payload: dict = Depends(require_role("doctor", "admin"))):
    """All excuses — doctors and admins only."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM excuses ORDER BY created_at DESC") as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.put("/{excuse_id}")
async def update_excuse_status(
    excuse_id: int,
    data: dict,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Update excuse status — doctors and admins only."""
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE excuses SET status=? WHERE id=?",
            (data.get("status", "pending"), excuse_id),
        )
        await db.commit()
    return {"message": "Updated"}
