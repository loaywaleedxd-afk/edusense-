"""Registration status router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.get("/")
async def get_registration(payload: dict = Depends(require_auth), db=Depends(get_db)):
    row = await db.fetchrow("SELECT * FROM registration_status WHERE id=1")
    if row:
        r = dict(row)
        return {"open": bool(r["is_open"]), "semester": r["semester"], "deadline": r["deadline"]}
    return {"open": True, "semester": "Fall 2024", "deadline": "2024-12-15"}


@router.put("/")
async def set_registration(data: dict, payload: dict = Depends(require_role("admin")), db=Depends(get_db)):
    await db.execute(
        """INSERT INTO registration_status (id, is_open, semester, deadline)
           VALUES (1,$1,$2,$3)
           ON CONFLICT(id) DO UPDATE SET is_open=EXCLUDED.is_open,
           semester=EXCLUDED.semester, deadline=EXCLUDED.deadline""",
        bool(data.get("open")),
        data.get("semester","Fall 2024"), data.get("deadline","2024-12-15")
    )
    return {"ok": True}
