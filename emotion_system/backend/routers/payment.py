"""
Payment confirmation router.
Verifies Paymob HMAC signature before marking a fee as paid in the DB.
Called by the frontend after Paymob redirects back.
"""
from fastapi import APIRouter, HTTPException
import aiosqlite, os, hmac, hashlib

router = APIRouter()
DB            = os.getenv("DB_PATH", "emotion_system.db")
HMAC_SECRET   = os.getenv("PAYMOB_HMAC_SECRET", "")

# Fields Paymob concatenates for HMAC-SHA512 (order matters)
_HMAC_FIELDS = [
    "amount_cents", "created_at", "currency", "error_occured",
    "has_parent_transaction", "id", "integration_id", "is_3d_secure",
    "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order", "owner", "pending",
    "source_data.pan", "source_data.sub_type", "source_data.type", "success",
]


def _verify_hmac(params: dict) -> bool:
    """Return True if the Paymob HMAC in *params* is valid."""
    if not HMAC_SECRET:
        return True   # secret not configured — skip verification (dev mode)
    received = params.get("hmac", "")
    payload  = "".join(str(params.get(f, "")) for f in _HMAC_FIELDS)
    expected = hmac.new(
        HMAC_SECRET.encode(), payload.encode(), hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, received)


@router.post("/confirm")
async def confirm_payment(data: dict):
    """
    Called by the frontend with all Paymob redirect URL parameters.
    Verifies HMAC, then marks the fee as paid in the database.
    """
    # 1. HMAC verification
    if not _verify_hmac(data):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # 2. Must be a successful transaction
    success = str(data.get("success", "")).lower() == "true"
    if not success:
        return {"confirmed": False, "reason": "payment_not_successful"}

    # 3. Extract student info from our own payload (stored in pending param)
    student_id = data.get("student_id")
    amount     = data.get("amount")

    if not student_id:
        raise HTTPException(status_code=400, detail="Missing student_id in payment data")

    # 4. Write directly to DB (server-side, no role check needed here)
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO student_fees (student_id, paid, amount, due_date)
               VALUES (?, 1, ?, date('now'))
               ON CONFLICT(student_id) DO UPDATE
               SET paid=1, amount=excluded.amount, due_date=excluded.due_date""",
            (student_id, float(amount) if amount else 0)
        )
        await db.commit()

    return {"confirmed": True, "student_id": student_id, "amount": amount}
