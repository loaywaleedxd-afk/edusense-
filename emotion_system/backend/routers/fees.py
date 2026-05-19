"""Student fees router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/{student_id}")
async def get_fee_status(student_id: str, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM student_fees WHERE student_id=?", (student_id,)
        ) as cur:
            row = await cur.fetchone()
    if row:
        return dict(row)
    return {"student_id": student_id, "paid": True, "amount": 1500, "due_date": "2024-12-01"}


@router.put("/{student_id}")
async def set_fee_status(student_id: str, data: dict,
                         payload: dict = Depends(require_role("admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO student_fees (student_id, paid, amount, due_date)
               VALUES (?,?,?,?)
               ON CONFLICT(student_id) DO UPDATE SET paid=excluded.paid,
               amount=excluded.amount, due_date=excluded.due_date""",
            (student_id, 1 if data.get("paid") else 0,
             data.get("amount", 1500), data.get("dueDate","2024-12-01"))
        )
        await db.commit()
    return {"ok": True}
