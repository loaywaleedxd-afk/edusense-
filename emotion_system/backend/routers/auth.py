"""Authentication router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosqlite, os

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(req: LoginRequest):
    uname = req.username.strip().lower()
    pwd   = req.password.strip()

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # Match by username or email
        async with db.execute(
            "SELECT * FROM users WHERE LOWER(username)=? OR LOWER(email)=?",
            (uname, uname)
        ) as cur:
            user = await cur.fetchone()

        # Match by student_id (students log in with their ID)
        if not user:
            async with db.execute(
                """SELECT u.* FROM users u
                   JOIN students s ON s.user_id=u.id
                   WHERE LOWER(s.student_id)=?""",
                (uname.upper(),)
            ) as cur:
                user = await cur.fetchone()

    if user:
        user = dict(user)
        stored_pw = user.get("password") or user.get("password_hash") or ""
        # Accept: exact password match, or username as password, or student_id as password
        if pwd == stored_pw or pwd == uname or pwd.upper() == uname.upper():
            role = user.get("role", "student")
            return {
                "token": f"token_{user['id']}",
                "user": {
                    "id":       user["id"],
                    "username": user.get("username") or uname,
                    "name":     user.get("full_name") or user.get("name") or uname,
                    "email":    user.get("email", ""),
                    "role":     role,
                    "child_id": user.get("username") if role == "parent" else None,
                },
                "message": "Login successful"
            }

    raise HTTPException(status_code=401, detail="Invalid username or password")

@router.get("/me")
async def get_me():
    return {"message": "Authenticated"}
