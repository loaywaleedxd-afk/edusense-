from fastapi import APIRouter
import aiosqlite

router = APIRouter()
DB = "emotion_system.db"

@router.post("/")
async def submit_excuse(data: dict):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO excuses (student_id, course_code, week, reason, status)
               VALUES (?, ?, ?, ?, 'pending')""",
            (data.get("student_id"), data.get("course_code"), data.get("week", 1), data.get("reason", ""))
        )
        await db.commit()
    return {"message": "Excuse submitted"}

@router.get("/student/{student_id}")
async def get_student_excuses(student_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM excuses WHERE student_id = ? ORDER BY created_at DESC",
            (student_id,)
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]

@router.get("/")
async def get_all_excuses():
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM excuses ORDER BY created_at DESC") as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]

@router.put("/{excuse_id}")
async def update_excuse_status(excuse_id: int, data: dict):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE excuses SET status = ? WHERE id = ?",
            (data.get("status", "pending"), excuse_id)
        )
        await db.commit()
    return {"message": "Updated"}
