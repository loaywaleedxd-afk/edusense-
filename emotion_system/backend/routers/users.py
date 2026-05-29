"""User management router — admin only, protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends, Request

from database import get_db
from auth_utils import require_role, require_auth, hash_password

router = APIRouter()


@router.get("/")
async def list_users(
    role: str = None,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """List all users — admin only. Passwords are never returned."""
    if role:
        rows = await db.fetch(
            "SELECT id, username, full_name as name, email, role FROM users WHERE role=$1 ORDER BY full_name",
            role,
        )
    else:
        rows = await db.fetch(
            "SELECT id, username, full_name as name, email, role FROM users ORDER BY role, full_name"
        )
    return [dict(r) for r in rows]


@router.post("/")
async def create_user(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Create any user — admin only. Password is bcrypt-hashed on creation."""
    plain_pwd = (data.get("password") or data.get("username", "")).strip()
    if len(plain_pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    try:
        await db.execute(
            "INSERT INTO users (username, full_name, email, role, password) VALUES ($1, $2, $3, $4, $5)",
            data.get("username", "").strip(),
            data.get("name", data.get("full_name", "")).strip(),
            data.get("email", "").strip(),
            data.get("role", "student"),
            hash_password(plain_pwd),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "User created"}


# ── User preferences (any authenticated user) ─────────────────────────────────

@router.get("/preferences")
async def get_preferences(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return the calling user's preferences (language, etc.)."""
    uid = int(payload.get("sub"))
    row = await db.fetchrow("SELECT language FROM users WHERE id=$1", uid)
    return {"language": (row["language"] if row else None) or "en"}


@router.put("/preferences")
async def update_preferences(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Update the calling user's preferences (language, etc.)."""
    uid = int(payload.get("sub"))
    if "language" in data:
        lang = data["language"]
        if lang not in ("en", "ar"):
            raise HTTPException(status_code=400, detail="Unsupported language")
        await db.execute("UPDATE users SET language=$1 WHERE id=$2", lang, uid)
    return {"ok": True}


# ── Self-service profile ──────────────────────────────────────────────────────

@router.get("/me")
async def get_my_profile(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return the full profile for the calling user."""
    uid = int(payload.get("sub"))
    row = await db.fetchrow(
        "SELECT id, username, full_name, email, role, language, photo, bio, phone FROM users WHERE id=$1",
        uid,
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    result = dict(row)
    role = payload.get("role")
    # Attach doctor-specific fields
    if role == "doctor":
        doc = await db.fetchrow(
            "SELECT doctor_id, department, title, bio, research_interests, website, office_location FROM doctors WHERE user_id=$1",
            uid,
        )
        if doc:
            result["doctor_id"]          = doc["doctor_id"]
            result["department"]         = doc["department"]
            result["title"]              = doc["title"]
            result["doctor_bio"]         = doc["bio"]
            result["research_interests"] = doc["research_interests"]
            result["website"]            = doc["website"]
            result["office_location"]    = doc["office_location"]
    elif role == "student":
        stu = await db.fetchrow(
            "SELECT student_id, department, year FROM students WHERE user_id=$1", uid
        )
        if stu:
            result["student_id"] = stu["student_id"]
            result["department"] = stu["department"]
            result["year"]       = stu["year"]
    return result


@router.put("/me")
async def update_my_profile(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Update the calling user's own profile (name, email, bio, photo, phone)."""
    uid  = int(payload.get("sub"))
    role = payload.get("role")

    # Build update fields for users table
    sets, vals = [], []
    for field in ("full_name", "email", "bio", "phone", "photo"):
        if field in data:
            sets.append(f"{field}=${len(vals)+1}")
            vals.append(data[field])
    if sets:
        vals.append(uid)
        await db.execute(
            f"UPDATE users SET {', '.join(sets)} WHERE id=${len(vals)}",
            *vals,
        )

    # Doctor extra fields
    if role == "doctor":
        doc_sets, doc_vals = [], []
        for field in ("department", "title", "bio", "research_interests", "website", "office_location"):
            if field in data:
                doc_sets.append(f"{field}=${len(doc_vals)+1}")
                doc_vals.append(data[field])
        if doc_sets:
            doc_vals.append(uid)
            await db.execute(
                f"UPDATE doctors SET {', '.join(doc_sets)} WHERE user_id=${len(doc_vals)}",
                *doc_vals,
            )

    return {"ok": True}


# ── Admin: parent–student linking ─────────────────────────────────────────────

@router.get("/parent-students")
async def list_parent_students(
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    rows = await db.fetch(
        """SELECT ps.parent_id, ps.student_id,
                  u.full_name AS parent_name, u.email AS parent_email
           FROM parent_students ps
           JOIN users u ON u.id = ps.parent_id
           ORDER BY u.full_name"""
    )
    return [dict(r) for r in rows]


@router.post("/parent-students")
async def link_parent_student(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    try:
        await db.execute(
            "INSERT INTO parent_students (parent_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            int(data["parent_id"]), data["student_id"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


@router.delete("/parent-students/{parent_id}/{student_id}")
async def unlink_parent_student(
    parent_id: int, student_id: str,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    await db.execute(
        "DELETE FROM parent_students WHERE parent_id=$1 AND student_id=$2",
        parent_id, student_id,
    )
    return {"ok": True}
