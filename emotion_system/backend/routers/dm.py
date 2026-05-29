"""
Direct Messages router — private Doctor ↔ Student chat.
Conversations are identified by the sorted pair of user IDs (TEXT).
"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import require_auth
from notifier import manager

router = APIRouter()


@router.get("/conversations")
async def list_conversations(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return conversations for the current user with last message time and unread count."""
    uid = str(payload.get("sub"))

    # PostgreSQL requires repeating the CASE expression in GROUP BY (can't use alias)
    rows = await db.fetch(
        """
        SELECT
            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id,
            MAX(created_at) AS last_at,
            COUNT(*) FILTER (WHERE receiver_id = $1 AND is_read = FALSE) AS unread
        FROM direct_messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
        ORDER BY MAX(created_at) DESC
        """,
        uid,
    )

    result = []
    for r in rows:
        other_id = r["other_id"]
        try:
            user_row = await db.fetchrow(
                "SELECT full_name, role, photo FROM users WHERE id = $1",
                int(other_id),
            )
        except (ValueError, TypeError):
            user_row = None

        result.append({
            "other_id":    other_id,
            "other_name":  user_row["full_name"] if user_row else f"User {other_id}",
            "other_role":  user_row["role"]      if user_row else "unknown",
            "other_photo": user_row["photo"]     if user_row else None,
            "last_at":     str(r["last_at"]),
            "unread":      r["unread"],
        })
    return result


@router.get("/with/{other_id}")
async def get_messages(
    other_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return all messages between the caller and other_id, and mark received ones as read."""
    uid = str(payload.get("sub"))

    rows = await db.fetch(
        """
        SELECT id, sender_id, receiver_id, text, is_read, created_at
        FROM direct_messages
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at DESC
        LIMIT 200
        """,
        uid, other_id,
    )
    rows = list(reversed(rows))  # return oldest-first for display

    # Mark messages sent by the other party to us as read
    await db.execute(
        """
        UPDATE direct_messages
        SET is_read = TRUE
        WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
        """,
        other_id, uid,
    )

    return [dict(r) for r in rows]


@router.post("/send")
async def send_message(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Send a direct message and push a real-time WS notification to the recipient."""
    uid      = str(payload.get("sub"))
    other_id = str(data.get("receiver_id", "")).strip()
    text     = str(data.get("text", "")).strip()

    if not other_id or not text:
        raise HTTPException(status_code=400, detail="receiver_id and text are required")

    row = await db.fetchrow(
        """
        INSERT INTO direct_messages (sender_id, receiver_id, text)
        VALUES ($1, $2, $3)
        RETURNING id, sender_id, receiver_id, text, is_read, created_at
        """,
        uid, other_id, text,
    )

    # Look up sender name for the push notification
    sender_row = await db.fetchrow(
        "SELECT full_name FROM users WHERE id = $1", int(uid)
    )
    sender_name = sender_row["full_name"] if sender_row else "Someone"

    # Push WS notification to recipient
    await manager.notify_user(other_id, {
        "type":    "dm",
        "title":   f"💬 {sender_name}",
        "message": text[:80] + ("…" if len(text) > 80 else ""),
        "icon":    "💬",
        "color":   "#8b5cf6",
        "from_id": uid,
    })

    return dict(row)


@router.get("/contacts")
async def get_contacts(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """
    Return the list of people the caller can start a DM with:
    - Students  → doctors who teach their enrolled courses
    - Doctors   → students enrolled in their courses
    - Admin     → all students and doctors
    """
    role = payload.get("role")
    uid  = int(payload.get("sub"))

    if role == "student":
        # Get the student's record
        stu_row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id = $1", uid
        )
        if not stu_row:
            return []
        stu_id = stu_row["student_id"]

        rows = await db.fetch(
            """
            SELECT DISTINCT
                u.id, u.full_name AS name, u.role, u.photo,
                d.title, d.department
            FROM course_enrollments ce
            JOIN lectures l ON l.course_code = ce.course_id
            JOIN doctors d ON d.doctor_id = l.doctor_id
            JOIN users u ON u.id = d.user_id
            WHERE ce.student_id = $1
            ORDER BY u.full_name
            """,
            stu_id,
        )

    elif role == "doctor":
        doc_row = await db.fetchrow(
            "SELECT doctor_id FROM doctors WHERE user_id = $1", uid
        )
        if not doc_row:
            return []
        doc_id = doc_row["doctor_id"]

        rows = await db.fetch(
            """
            SELECT DISTINCT
                u.id, u.full_name AS name, u.role, u.photo,
                s.student_id, s.department, s.year
            FROM lectures l
            JOIN course_enrollments ce ON ce.course_id = l.course_code
            JOIN students s ON s.student_id = ce.student_id
            JOIN users u ON u.id = s.user_id
            WHERE l.doctor_id = $1
            ORDER BY u.full_name
            """,
            doc_id,
        )

    else:  # admin — can message anyone
        rows = await db.fetch(
            """
            SELECT id, full_name AS name, role, photo
            FROM users
            WHERE role IN ('student', 'doctor')
            ORDER BY role, full_name
            """
        )

    return [dict(r) for r in rows]
