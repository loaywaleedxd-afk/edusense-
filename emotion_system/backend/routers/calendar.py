"""Academic Calendar router — read for all, write for admin/doctor."""
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth_utils import require_auth, require_role
import uuid

router = APIRouter()


@router.get("/")
async def get_events(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    rows = await db.fetch("SELECT * FROM calendar_events ORDER BY date, created_at")
    return [dict(r) for r in rows]


@router.post("/")
async def add_event(
    data: dict,
    payload: dict = Depends(require_role("admin", "doctor")),
    db=Depends(get_db),
):
    uid = int(payload.get("sub"))
    event_id = data.get("id") or str(uuid.uuid4())
    await db.execute(
        """INSERT INTO calendar_events (id, date, title, type, description, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             date=$2, title=$3, type=$4, description=$5""",
        event_id,
        data.get("date", ""),
        data.get("title", "").strip(),
        data.get("type", "exam"),
        data.get("description", ""),
        uid,
    )
    return {"id": event_id, "ok": True}


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    payload: dict = Depends(require_role("admin", "doctor")),
    db=Depends(get_db),
):
    result = await db.execute("DELETE FROM calendar_events WHERE id=$1", event_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}
