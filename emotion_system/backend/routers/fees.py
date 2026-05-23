"""Student fees router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.get("/{student_id}")
async def get_fee_status(student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    row = await db.fetchrow(
        "SELECT * FROM student_fees WHERE student_id=$1", student_id
    )
    if row:
        return dict(row)
    return {"student_id": student_id, "paid": True, "amount": 1500, "due_date": "2024-12-01"}


@router.put("/{student_id}")
async def set_fee_status(student_id: str, data: dict,
                         payload: dict = Depends(require_role("admin")),
                         db=Depends(get_db)):
    await db.execute(
        """INSERT INTO student_fees (student_id, paid, amount, due_date)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT(student_id) DO UPDATE SET paid=EXCLUDED.paid,
           amount=EXCLUDED.amount, due_date=EXCLUDED.due_date""",
        student_id, bool(data.get("paid")),
        data.get("amount", 1500), data.get("dueDate","2024-12-01")
    )
    return {"ok": True}
