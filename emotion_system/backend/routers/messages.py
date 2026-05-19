"""Community chat messages router — protected by JWT auth."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import aiosqlite, os

from auth_utils import require_auth

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


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
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM messages WHERE course_code=? ORDER BY created_at ASC LIMIT 100",
            (course_code,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def send_message(
    msg: Message,
    payload: dict = Depends(require_auth),
):
    # Force sender_id to match the authenticated user's identity
    caller_id = payload.get("sub")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO messages (course_code,sender_id,sender_name,sender_role,text) VALUES (?,?,?,?,?)",
            (msg.course_code, caller_id, msg.sender_name, payload.get("role"), msg.text),
        )
        await db.commit()
    return {"message": "Sent"}
