"""Community chat messages router — protected by JWT auth."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import get_db
from auth_utils import require_auth

router = APIRouter()


class Message(BaseModel):
    course_code: str
    text: str


@router.get("/")
async def get_messages(
    course_code: str = "general",
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM messages WHERE course_code=$1 ORDER BY created_at ASC LIMIT 100",
        course_code,
    )
    return [dict(r) for r in rows]


@router.post("/")
async def send_message(
    msg: Message,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    # Derive sender identity from JWT — never trust client-supplied name/role
    caller_id   = payload.get("sub")
    caller_role = payload.get("role")
    user_row = await db.fetchrow(
        "SELECT full_name FROM users WHERE id=$1", int(caller_id)
    )
    sender_name = user_row["full_name"] if user_row else "Unknown"

    await db.execute(
        "INSERT INTO messages (course_code,sender_id,sender_name,sender_role,text) VALUES ($1,$2,$3,$4,$5)",
        msg.course_code, caller_id, sender_name, caller_role, msg.text,
    )
    return {"message": "Sent"}
