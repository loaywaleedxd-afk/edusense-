"""
Office Hours Booking — FastAPI router
Provides 15-minute slot management for doctors and booking for students.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import os
import json
from datetime import datetime

from database import get_db

router = APIRouter()


# ── DB init (called inline for new tables) ────────────────────────────────────
async def _ensure_tables(db):
    """Office hours tables are created in init_tenant_schema; this is a no-op safety guard."""
    pass


# ── Pydantic models ────────────────────────────────────────────────────────────
class SlotModel(BaseModel):
    id: str
    doctor_id: str
    day: str
    time: str
    duration: int = 15
    available: bool = True


class BookingModel(BaseModel):
    id: Optional[str] = None
    slotId: str
    doctorId: str
    doctorName: Optional[str] = ''
    studentId: str
    studentName: Optional[str] = ''
    day: str
    time: str
    duration: int = 15
    note: Optional[str] = ''
    status: str = 'confirmed'


# ── GET /slots/{doctor_id} ─────────────────────────────────────────────────────
@router.get("/slots/{doctor_id}")
async def get_slots(doctor_id: str, db=Depends(get_db)):
    try:
        rows = await db.fetch(
            "SELECT * FROM office_hours_slots WHERE doctor_id = $1 ORDER BY day, time",
            doctor_id
        )
        booked = await db.fetch(
            "SELECT slot_id FROM office_hours_bookings WHERE doctor_id = $1 AND status = 'confirmed'",
            doctor_id
        )
        booked_ids = {r["slot_id"] for r in booked}

        slots = []
        for r in rows:
            slot = dict(r)
            slot["available"] = bool(slot["available"]) and slot["id"] not in booked_ids
            slots.append(slot)

        return {"slots": slots, "doctor_id": doctor_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /slots ────────────────────────────────────────────────────────────────
@router.post("/slots")
async def create_slot(slot: SlotModel, db=Depends(get_db)):
    try:
        await db.execute(
            """INSERT INTO office_hours_slots (id,doctor_id,day,time,duration,available)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO UPDATE SET
                 doctor_id=EXCLUDED.doctor_id, day=EXCLUDED.day, time=EXCLUDED.time,
                 duration=EXCLUDED.duration, available=EXCLUDED.available""",
            slot.id, slot.doctor_id, slot.day, slot.time, slot.duration, slot.available
        )
        return {"ok": True, "slot": slot.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── PATCH /slots/{slot_id} — toggle availability ───────────────────────────────
@router.patch("/slots/{slot_id}")
async def toggle_slot(slot_id: str, body: dict, db=Depends(get_db)):
    try:
        available = bool(body.get("available", True))
        await db.execute(
            "UPDATE office_hours_slots SET available = $1 WHERE id = $2",
            available, slot_id
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /book ─────────────────────────────────────────────────────────────────
@router.post("/book")
async def book_slot(booking: BookingModel, db=Depends(get_db)):
    try:
        existing = await db.fetchrow(
            "SELECT id FROM office_hours_bookings WHERE slot_id = $1 AND status = 'confirmed'",
            booking.slotId
        )
        if existing:
            raise HTTPException(status_code=409, detail="Slot already booked")

        booking_id = booking.id or f"bk-{int(datetime.now().timestamp()*1000)}"
        await db.execute(
            """INSERT INTO office_hours_bookings
               (id,slot_id,doctor_id,student_id,student_name,doctor_name,day,time,duration,note,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)""",
            booking_id, booking.slotId, booking.doctorId, booking.studentId,
            booking.studentName, booking.doctorName, booking.day, booking.time,
            booking.duration, booking.note or '', booking.status
        )
        return {"ok": True, "booking": {"id": booking_id, **booking.dict()}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /bookings/student/{student_id} ────────────────────────────────────────
@router.get("/bookings/student/{student_id}")
async def get_student_bookings(student_id: str, db=Depends(get_db)):
    try:
        rows = await db.fetch(
            "SELECT * FROM office_hours_bookings WHERE student_id = $1 ORDER BY created_at DESC",
            student_id
        )
        return {"bookings": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /bookings/doctor/{doctor_id} ──────────────────────────────────────────
@router.get("/bookings/doctor/{doctor_id}")
async def get_doctor_bookings(doctor_id: str, db=Depends(get_db)):
    try:
        rows = await db.fetch(
            "SELECT * FROM office_hours_bookings WHERE doctor_id = $1 ORDER BY day, time",
            doctor_id
        )
        return {"bookings": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DELETE /booking/{booking_id} ──────────────────────────────────────────────
@router.delete("/booking/{booking_id}")
async def cancel_booking(booking_id: str, db=Depends(get_db)):
    try:
        await db.execute(
            "UPDATE office_hours_bookings SET status = 'cancelled' WHERE id = $1",
            booking_id
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
