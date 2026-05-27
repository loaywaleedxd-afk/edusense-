"""
At-Risk Early Warning System
— Calculates a 0-100 risk score per student using 4 factors:
    1. Attendance rate       (max 30 pts)
    2. Average grade         (max 30 pts)
    3. Negative emotion rate (max 20 pts)
    4. Assignment submission  (max 20 pts)
— Risk levels: low (<20) | medium (20-39) | high (40-59) | critical (>=60)
— Sends email alerts to advisor and parent when triggered
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import json, smtplib, ssl, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from database import get_db
from auth_utils import require_auth, require_role

router  = APIRouter()
SMTP_USER = os.getenv("SMTP_USER", os.getenv("VITE_SMTP_USER", ""))
SMTP_PASS = os.getenv("SMTP_PASS", os.getenv("VITE_SMTP_PASS", ""))


# ── Risk calculation ──────────────────────────────────────────────────────────

def _risk_level(score: float) -> str:
    if score >= 60: return "critical"
    if score >= 40: return "high"
    if score >= 20: return "medium"
    return "low"

def _level_color(level: str) -> str:
    return {"critical": "#dc2626", "high": "#f97316",
            "medium": "#eab308", "low": "#22c55e"}.get(level, "#64748b")


async def _compute_student_risk(db, student_id: str) -> dict:
    """Compute a risk score for one student from all available data."""

    # ── Factor 1: Attendance ─────────────────────────────────────────────────
    att = await db.fetchrow("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
        FROM attendance WHERE student_id=$1
    """, student_id)
    att_rate = ((att["present"] or 0) / att["total"] * 100) if att and att["total"] else 100
    if att_rate < 50:   att_factor = 30
    elif att_rate < 70: att_factor = 20
    elif att_rate < 80: att_factor = 10
    else:               att_factor = 0

    # ── Factor 2: Grades ─────────────────────────────────────────────────────
    grades = await db.fetchrow(
        "SELECT AVG(grade) as avg FROM grades WHERE student_id=$1", student_id
    )
    avg_grade = grades["avg"] if grades and grades["avg"] is not None else 100
    if avg_grade < 50:   grade_factor = 30
    elif avg_grade < 60: grade_factor = 20
    elif avg_grade < 70: grade_factor = 10
    else:                grade_factor = 0

    # ── Factor 3: Emotions (negative rate from recent records) ───────────────
    em = await db.fetchrow("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN emotion IN ('sad','bored','angry','disgust','fear') THEN 1 ELSE 0 END) as neg
        FROM emotion_records WHERE student_id=$1
    """, student_id)
    neg_rate = (em["neg"] / em["total"]) if em and em["total"] else 0
    if neg_rate > 0.70:   em_factor = 20
    elif neg_rate > 0.50: em_factor = 12
    elif neg_rate > 0.30: em_factor = 6
    else:                 em_factor = 0

    # ── Factor 4: Assignment submissions ─────────────────────────────────────
    assign_total = await db.fetchrow(
        "SELECT COUNT(*) as n FROM assignments WHERE course_id IN "
        "(SELECT course_id FROM course_enrollments WHERE student_id=$1)",
        student_id
    )
    assign_done = await db.fetchrow(
        "SELECT COUNT(*) as n FROM submissions WHERE student_id=$1 AND grade IS NOT NULL",
        student_id
    )
    n_assign = assign_total["n"] if assign_total else 0
    n_done   = assign_done["n"]  if assign_done  else 0
    sub_rate = (n_done / n_assign * 100) if n_assign else 100
    if sub_rate < 50:   assign_factor = 20
    elif sub_rate < 70: assign_factor = 12
    elif sub_rate < 85: assign_factor = 6
    else:               assign_factor = 0

    risk_score = att_factor + grade_factor + em_factor + assign_factor
    level      = _risk_level(risk_score)

    return {
        "student_id":       student_id,
        "risk_score":       round(risk_score, 1),
        "risk_level":       level,
        "attendance_factor": att_factor,
        "grade_factor":     grade_factor,
        "emotion_factor":   em_factor,
        "assignment_factor": assign_factor,
        "details": json.dumps({
            "attendance_rate":  round(att_rate, 1),
            "avg_grade":        round(avg_grade, 1),
            "negative_emotion": round(neg_rate * 100, 1),
            "submission_rate":  round(sub_rate, 1),
        })
    }


# ── Email notification ────────────────────────────────────────────────────────

def _send_alert_email(to: str, student_name: str, risk_level: str,
                      risk_score: float, details: dict, recipient_type: str):
    if not SMTP_USER or not SMTP_PASS or not to:
        return
    color   = _level_color(risk_level)
    subject = f"[EduSense] {risk_level.upper()} Risk Alert - {student_name}"

    html = f"""
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f0f4f8">
<div style="background:#1a237e;padding:24px;text-align:center">
  <div style="font-size:26px;font-weight:900;color:#fff">EduSense</div>
  <div style="font-size:11px;color:#90caf9;letter-spacing:2px">EARLY WARNING SYSTEM</div>
</div>
<div style="background:#fff;padding:28px">
  <div style="background:{color}15;border-left:4px solid {color};padding:16px 20px;border-radius:8px;margin-bottom:24px">
    <div style="font-size:22px;font-weight:900;color:{color}">{risk_level.upper()} RISK</div>
    <div style="font-size:14px;color:#374151;margin-top:4px">
      Student <strong>{student_name}</strong> has a risk score of
      <strong style="color:{color}">{risk_score}/100</strong>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr style="background:#1a237e">
      <td colspan="2" style="padding:10px 14px;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px">
        RISK FACTOR BREAKDOWN
      </td>
    </tr>
    {"".join(f'''<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;font-size:13px;color:#6b7280">{k}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#111827">{v}</td>
    </tr>''' for k,v in {
        "Attendance Rate": f"{details.get('attendance_rate', '-')}%",
        "Average Grade":   f"{details.get('avg_grade', '-')}%",
        "Negative Emotions": f"{details.get('negative_emotion', '-')}%",
        "Assignment Submission": f"{details.get('submission_rate', '-')}%",
    }.items())}
  </table>
  <p style="font-size:13px;color:#374151;line-height:1.7">
    {'<strong>Action required:</strong> Please contact this student immediately and arrange an advising session.' if risk_level in ('critical','high') else 'This student may benefit from early support. Consider reaching out.'}
  </p>
</div>
<div style="background:#1a237e;padding:12px;text-align:center">
  <p style="color:#90caf9;font-size:11px;margin:0">EduSense Early Warning System - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
</div>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f'"EduSense Alerts" <{SMTP_USER}>'
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as s:
            s.starttls(context=ctx)
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, to, msg.as_string())
    except Exception as e:
        print(f"[at_risk] email error: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/assess")
async def run_assessment(payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """Re-calculate risk scores for all students and save to DB."""
    students = await db.fetch("SELECT student_id FROM students")

    updated = 0
    for s in students:
        sid   = s["student_id"]
        data  = await _compute_student_risk(db, sid)
        await db.execute("""
            INSERT INTO at_risk_assessments
              (student_id, risk_score, risk_level,
               attendance_factor, grade_factor, emotion_factor,
               assignment_factor, details, assessed_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
            ON CONFLICT(student_id) DO UPDATE SET
              risk_score=EXCLUDED.risk_score,
              risk_level=EXCLUDED.risk_level,
              attendance_factor=EXCLUDED.attendance_factor,
              grade_factor=EXCLUDED.grade_factor,
              emotion_factor=EXCLUDED.emotion_factor,
              assignment_factor=EXCLUDED.assignment_factor,
              details=EXCLUDED.details,
              assessed_at=EXCLUDED.assessed_at
        """, sid, data["risk_score"], data["risk_level"],
             data["attendance_factor"], data["grade_factor"],
             data["emotion_factor"], data["assignment_factor"],
             data["details"])
        updated += 1

    return {"assessed": updated, "message": "Risk assessment complete"}


@router.get("/students")
async def at_risk_list(
    min_level: str = "medium",
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    """Return students at or above the given risk level."""
    level_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    min_idx     = level_order.get(min_level, 1)

    rows = await db.fetch("""
        SELECT a.*,
               u.full_name   as student_name,
               u.email       as student_email,
               s.department
        FROM at_risk_assessments a
        JOIN students s ON a.student_id = s.student_id
        JOIN users    u ON s.user_id    = u.id
        ORDER BY a.risk_score DESC
    """)

    result = []
    for r in rows:
        rd = dict(r)
        if level_order.get(rd["risk_level"], 0) >= min_idx:
            try: rd["details"] = json.loads(rd["details"])
            except: pass
            result.append(rd)
    return result


@router.get("/student/{student_id}")
async def student_risk(student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    row = await db.fetchrow(
        "SELECT * FROM at_risk_assessments WHERE student_id=$1", student_id
    )
    if not row:
        return {"student_id": student_id, "risk_score": 0, "risk_level": "low",
                "message": "No assessment yet — run /api/at-risk/assess first"}
    rd = dict(row)
    try: rd["details"] = json.loads(rd["details"])
    except: pass
    return rd


@router.post("/notify/{student_id}")
async def notify_at_risk(
    student_id: str,
    background_tasks: BackgroundTasks,
    notify_advisor: bool = True,
    notify_parent:  bool = True,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    """Send email alerts to advisor and/or parent for an at-risk student."""
    risk = await db.fetchrow(
        "SELECT * FROM at_risk_assessments WHERE student_id=$1", student_id
    )
    if not risk:
        raise HTTPException(404, "No risk assessment found — run /api/at-risk/assess first")
    risk = dict(risk)
    try: details = json.loads(risk["details"])
    except: details = {}

    student = await db.fetchrow("""
        SELECT u.full_name, u.email, s.department
        FROM students s JOIN users u ON s.user_id = u.id
        WHERE s.student_id=$1
    """, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    student = dict(student)

    parent = await db.fetchrow("""
        SELECT u.email FROM users u
        JOIN parent_students ps ON ps.parent_user_id = u.id
        WHERE ps.student_id = $1 AND u.role = 'parent'
        LIMIT 1
    """, student_id)

    advisor = await db.fetchrow("""
        SELECT u.email, u.full_name FROM lectures l
        JOIN doctors d ON l.doctor_id = d.doctor_id
        JOIN users   u ON d.user_id   = u.id
        JOIN course_enrollments ce ON ce.course_id = l.lecture_id
        WHERE ce.student_id=$1
        LIMIT 1
    """, student_id)

    notified = []

    if notify_advisor and advisor and advisor["email"]:
        background_tasks.add_task(
            _send_alert_email,
            advisor["email"], student["full_name"],
            risk["risk_level"], risk["risk_score"],
            details, "advisor"
        )
        await db.execute(
            "UPDATE at_risk_assessments SET advisor_notified=TRUE WHERE student_id=$1",
            student_id
        )
        notified.append(f"advisor ({advisor['email']})")

    if notify_parent and parent and parent["email"]:
        background_tasks.add_task(
            _send_alert_email,
            parent["email"], student["full_name"],
            risk["risk_level"], risk["risk_score"],
            details, "parent"
        )
        await db.execute(
            "UPDATE at_risk_assessments SET parent_notified=TRUE WHERE student_id=$1",
            student_id
        )
        notified.append(f"parent ({parent['email']})")

    return {
        "message": f"Alerts sent to: {', '.join(notified) if notified else 'no recipients found'}",
        "student_id": student_id,
        "risk_level": risk["risk_level"],
        "risk_score": risk["risk_score"],
    }
