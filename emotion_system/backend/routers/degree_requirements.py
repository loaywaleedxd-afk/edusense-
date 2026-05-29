"""Degree Requirements router — admin manages curriculum, students see progress."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


class RequirementCreate(BaseModel):
    course_code:    str
    course_name:    str
    program:        str = "General"
    credits:        int = 3
    category:       str = "Core"
    semester_order: int = 1
    is_required:    bool = True
    department:     Optional[str] = None


@router.get("/")
async def list_requirements(
    department: Optional[str] = None,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    if department:
        rows = await db.fetch(
            "SELECT * FROM degree_requirements WHERE department=$1 OR department IS NULL ORDER BY semester_order, category",
            department,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM degree_requirements ORDER BY semester_order, category"
        )
    return [dict(r) for r in rows]


@router.post("/", status_code=201)
async def add_requirement(
    body: RequirementCreate,
    payload: dict = Depends(require_role("admin", "superadmin")),
    db=Depends(get_db),
):
    row = await db.fetchrow(
        """INSERT INTO degree_requirements
           (program, course_code, course_name, credits, category, semester_order, is_required, department)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id""",
        body.program, body.course_code, body.course_name, body.credits,
        body.category, body.semester_order, body.is_required, body.department,
    )
    return {"id": row["id"], "ok": True}


@router.post("/bulk", status_code=201)
async def bulk_add_requirements(
    body: dict,
    payload: dict = Depends(require_role("admin", "superadmin")),
    db=Depends(get_db),
):
    """Add many requirements at once. Skips duplicates by course_code+department."""
    items = body.get("requirements", [])
    created = 0
    skipped = 0
    for r in items:
        try:
            result = await db.execute(
                """INSERT INTO degree_requirements
                   (program, course_code, course_name, credits, category, semester_order, is_required, department)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                   ON CONFLICT DO NOTHING""",
                r.get("program", "General"),
                r.get("course_code",""), r.get("course_name",""),
                int(r.get("credits", 3)), r.get("category","Core"),
                int(r.get("semester_order", 1)), bool(r.get("is_required", True)),
                r.get("department"),
            )
            if result == "INSERT 0 0":
                skipped += 1
            else:
                created += 1
        except Exception:
            pass
    return {"created": created, "skipped": skipped}


@router.delete("/{req_id}")
async def delete_requirement(
    req_id: int,
    payload: dict = Depends(require_role("admin", "superadmin")),
    db=Depends(get_db),
):
    await db.execute("DELETE FROM degree_requirements WHERE id=$1", req_id)
    return {"ok": True}
