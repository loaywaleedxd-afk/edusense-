"""
Office Hours Booking — FastAPI router
Provides 15-minute slot management for doctors and booking for students.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────
class SlotModel(BaseModel):
    id: str
    doctorId: Optional[str] = None   # camelCase from frontend
    doctor_id: Optional[str] = None  # snake_case fallback
    day: str
    time: str
    duration: int = 15
    available: bool = True

    def get_doctor_id(self) -> str:
        return self.doctorId or self.doctor_id or ''


class BookingModel(BaseModel):
    id: Optional[str] = None
    slotId: str
    doctorId: Optional[str] = None   # made Optional — will be resolved from slot if missing
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
        # Mark slots booked by ANY student (match by slot_id, not doctor_id)
        booked = await db.fetch(
            """SELECT slot_id FROM office_hours_bookings
               WHERE slot_id IN (SELECT id FROM office_hours_slots WHERE doctor_id = $1)
               AND status = 'confirmed'""",
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
        doctor_id = slot.get_doctor_id()
        await db.execute(
            """INSERT INTO office_hours_slots (id,doctor_id,day,time,duration,available)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO UPDATE SET
                 doctor_id=EXCLUDED.doctor_id, day=EXCLUDED.day, time=EXCLUDED.time,
                 duration=EXCLUDED.duration, available=EXCLUDED.available""",
            slot.id, doctor_id, slot.day, slot.time, slot.duration, slot.available
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /slots/bulk — seed all slots at once ──────────────────────────────────
@router.post("/slots/bulk")
async def bulk_create_slots(body: dict, db=Depends(get_db)):
    slots = body.get("slots", [])
    try:
        async with db.transaction():
            for s in slots:
                doctor_id = s.get("doctorId") or s.get("doctor_id", "")
                await db.execute(
                    """INSERT INTO office_hours_slots (id,doctor_id,day,time,duration,available)
                       VALUES ($1,$2,$3,$4,$5,$6)
                       ON CONFLICT (id) DO NOTHING""",
                    s["id"], doctor_id, s["day"], s["time"],
                    int(s.get("duration", 15)), bool(s.get("available", True))
                )
        return {"ok": True, "count": len(slots)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── PATCH /slots/{slot_id} — toggle availability ───────────────────────────────
@router.patch("/slots/{slot_id}")
async def toggle_slot(slot_id: str, body: dict, db=Depends(get_db)):
    try:
        available = bool(body.get("available", True))
        result = await db.execute(
            "UPDATE office_hours_slots SET available = $1 WHERE id = $2",
            available, slot_id
        )
        if result == "UPDATE 0":
            doctor_id = body.get("doctorId") or body.get("doctor_id", "")
            await db.execute(
                """INSERT INTO office_hours_slots (id,doctor_id,day,time,duration,available)
                   VALUES ($1,$2,$3,$4,$5,$6)
                   ON CONFLICT (id) DO UPDATE SET available=EXCLUDED.available""",
                slot_id, doctor_id, body.get("day",""), body.get("time",""),
                int(body.get("duration", 15)), available
            )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /book ─────────────────────────────────────────────────────────────────
@router.post("/book")
async def book_slot(booking: BookingModel, db=Depends(get_db)):
    try:
        # Resolve doctor_id from slot if not provided or empty
        doctor_id = booking.doctorId or ''
        if not doctor_id:
            slot_row = await db.fetchrow(
                "SELECT doctor_id FROM office_hours_slots WHERE id = $1", booking.slotId
            )
            doctor_id = slot_row["doctor_id"] if slot_row else ''

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
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (id) DO NOTHING""",
            booking_id, booking.slotId, doctor_id, booking.studentId,
            booking.studentName or '', booking.doctorName or '',
            booking.day, booking.time, booking.duration,
            booking.note or '', booking.status
        )
        return {"ok": True, "booking": {"id": booking_id, "doctorId": doctor_id, **booking.dict()}}
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
        # Match by doctor_id column OR by slot ownership (catches bookings with wrong stored doctor_id)
        rows = await db.fetch(
            """SELECT DISTINCT b.* FROM office_hours_bookings b
               LEFT JOIN office_hours_slots s ON s.id = b.slot_id
               WHERE b.doctor_id = $1
                  OR s.doctor_id = $1
               ORDER BY b.day, b.time""",
            doctor_id
        )
        # Fix any bookings that have wrong doctor_id stored
        for r in rows:
            if r["doctor_id"] != doctor_id:
                await db.execute(
                    "UPDATE office_hours_bookings SET doctor_id = $1 WHERE id = $2",
                    doctor_id, r["id"]
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
