"""Community chat messages router — protected by JWT auth."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import get_db
from auth_utils import require_auth

router = APIRouter()


class Message(BaseModel):
    course_code: str
    sender_id: str
    sender_name: str
    sender_role: str
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
    caller_id = payload.get("sub")
    await db.execute(
        "INSERT INTO messages (course_code,sender_id,sender_name,sender_role,text) VALUES ($1,$2,$3,$4,$5)",
        msg.course_code, caller_id, msg.sender_name, payload.get("role"), msg.text,
    )
    return {"message": "Sent"}
