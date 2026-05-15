"""Authentication router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
import aiosqlite

router = APIRouter()

DEMO_USERS = {
    "admin":    {"id":1,"role":"admin",  "name":"System Administrator","email":"admin@university.edu"},
    "dr.smith": {"id":2,"role":"doctor", "name":"Dr. Ahmed Smith",      "email":"ahmed.smith@university.edu"},
    "s001":     {"id":3,"role":"student","name":"Sara Johnson",          "email":"sara.j@university.edu"},
}

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(req: LoginRequest):
    user = DEMO_USERS.get(req.username.lower())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"demo_token_{user['id']}",
        "user": {**user, "username": req.username},
        "message": "Login successful"
    }

@router.get("/me")
async def get_me():
    return {"message": "Use token to identify user"}
