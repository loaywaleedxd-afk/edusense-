"""Community chat messages router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import aiosqlite, os

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")

class Message(BaseModel):
    course_code: str
    sender_id: str
    sender_name: str
    sender_role: str
    text: str

@router.get("/")
async def get_messages(course_code: str = "general"):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM messages WHERE course_code=? ORDER BY created_at ASC LIMIT 100",
            (course_code,)
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def send_message(msg: Message):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO messages (course_code,sender_id,sender_name,sender_role,text) VALUES (?,?,?,?,?)",
            (msg.course_code, msg.sender_id, msg.sender_name, msg.sender_role, msg.text)
        )
        await db.commit()
    return {"message": "Sent"}
