"""
Analytics router — engagement scoring, clustering, trend analysis
Integrates with R via subprocess or rpy2
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
import os, json, subprocess, tempfile, csv

from database import get_db
from auth_utils import require_role

router = APIRouter()
R_SCRIPTS = os.path.join(os.path.dirname(__file__), "../../r_analysis")

EMOTION_SCORE = {
    "happy":1.0,"neutral":0.7,"surprise":0.8,"confused":0.45,
    "sad":0.2,"bored":0.1,"angry":0.2,"disgust":0.1,"fear":0.3
}


@router.get("/engagement-overview")
async def engagement_overview(
    student_id: Optional[str] = Query(None),
    payload: dict = Depends(require_role("doctor", "admin", "student", "parent")),
    db=Depends(get_db),
):
    """Overall platform engagement metrics."""
    role = payload.get("role")

    # Students always see only their own data; resolve their student_id from
    # the users table via the students join since the JWT only carries the user id.
    if role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1",
            int(payload["sub"]),
        )
        student_id = row["student_id"] if row else None

    if student_id:
        overview = await db.fetchrow(
            """SELECT
                 COUNT(DISTINCT student_id) as total_students,
                 COUNT(DISTINCT lecture_id) as total_lectures,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(*) as total_records
               FROM emotion_records
               WHERE student_id = $1""",
            student_id,
        )
        emotions = await db.fetch(
            """SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_conf
               FROM emotion_records
               WHERE student_id = $1
               GROUP BY emotion ORDER BY count DESC""",
            student_id,
        )
    else:
        overview = await db.fetchrow(
            """SELECT
                 COUNT(DISTINCT student_id) as total_students,
                 COUNT(DISTINCT lecture_id) as total_lectures,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(*) as total_records
               FROM emotion_records"""
        )
        emotions = await db.fetch(
            "SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_conf FROM emotion_records GROUP BY emotion ORDER BY count DESC"
        )
    base = dict(overview) if overview else {
        "total_students": 0, "total_lectures": 0,
        "avg_engagement": 0, "avg_attention": 0, "total_records": 0,
    }
    return {**base, "emotions": [dict(r) for r in emotions]}


@router.get("/lecture-comparison")
async def lecture_comparison(
    student_id: Optional[str] = Query(None),
    payload: dict = Depends(require_role("doctor", "admin", "student", "parent")),
    db=Depends(get_db),
):
    """Compare engagement across all lectures."""
    role = payload.get("role")

    if role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1",
            int(payload["sub"]),
        )
        student_id = row["student_id"] if row else None

    if student_id:
        rows = await db.fetch(
            """SELECT
                 er.lecture_id,
                 l.course_name,
                 l.course_code,
                 AVG(er.engagement_score)*100 as avg_engagement,
                 AVG(er.attention_score)*100 as avg_attention,
                 COUNT(DISTINCT er.student_id) as students_tracked,
                 COUNT(*) as records
               FROM emotion_records er
               JOIN lectures l ON er.lecture_id=l.lecture_id
               WHERE er.student_id = $1
               GROUP BY er.lecture_id, l.course_name, l.course_code
               ORDER BY avg_engagement DESC""",
            student_id,
        )
    else:
        rows = await db.fetch(
            """SELECT
                 er.lecture_id,
                 l.course_name,
                 l.course_code,
                 AVG(er.engagement_score)*100 as avg_engagement,
                 AVG(er.attention_score)*100 as avg_attention,
                 COUNT(DISTINCT er.student_id) as students_tracked,
                 COUNT(*) as records
               FROM emotion_records er
               JOIN lectures l ON er.lecture_id=l.lecture_id
               GROUP BY er.lecture_id, l.course_name, l.course_code
               ORDER BY avg_engagement DESC"""
        )
    return [dict(r) for r in rows]


@router.get("/student-clusters")
async def student_clusters(payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """Cluster students by engagement/attention behavior."""
    rows = await db.fetch(
        """SELECT
             student_id,
             AVG(engagement_score) as avg_eng,
             AVG(attention_score) as avg_att,
             COUNT(*) as records
           FROM emotion_records
           GROUP BY student_id"""
    )
    rows = [dict(r) for r in rows]
    clusters = {"high_engagement":[],"moderate_engagement":[],"low_engagement":[]}
    for r in rows:
        eng = (r["avg_eng"] or 0) * 100
        if eng >= 65:
            clusters["high_engagement"].append(r)
        elif eng >= 40:
            clusters["moderate_engagement"].append(r)
        else:
            clusters["low_engagement"].append(r)
    return {
        "clusters": clusters,
        "summary": {k: len(v) for k, v in clusters.items()}
    }


@router.get("/time-trends")
async def time_trends(
    student_id: Optional[str] = Query(None),
    payload: dict = Depends(require_role("doctor", "admin", "student", "parent")),
    db=Depends(get_db),
):
    """Engagement trends over time across all lectures."""
    role = payload.get("role")

    if role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1",
            int(payload["sub"]),
        )
        student_id = row["student_id"] if row else None

    if student_id:
        rows = await db.fetch(
            """SELECT
                 timestamp::date as date,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(DISTINCT student_id) as students,
                 COUNT(*) as records
               FROM emotion_records
               WHERE student_id = $1
               GROUP BY timestamp::date ORDER BY date DESC LIMIT 30""",
            student_id,
        )
    else:
        rows = await db.fetch(
            """SELECT
                 timestamp::date as date,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(DISTINCT student_id) as students,
                 COUNT(*) as records
               FROM emotion_records
               GROUP BY timestamp::date ORDER BY date DESC LIMIT 30"""
        )
    return [dict(r) for r in rows]


@router.get("/alerts/low-engagement/{lecture_id}")
async def low_engagement_alerts(lecture_id: str, threshold: float = 0.35, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """Identify students with low engagement in recent window."""
    rows = await db.fetch(
        """SELECT
             er.student_id,
             u.full_name,
             AVG(er.engagement_score) as avg_eng,
             AVG(er.attention_score) as avg_att,
             COUNT(*) as samples
           FROM emotion_records er
           LEFT JOIN students s ON er.student_id=s.student_id
           LEFT JOIN users u ON s.user_id=u.id
           WHERE er.lecture_id=$1
             AND er.timestamp > NOW() - INTERVAL '10 minutes'
           GROUP BY er.student_id, u.full_name
           HAVING AVG(er.engagement_score) < $2
           ORDER BY avg_eng ASC""",
        lecture_id, threshold
    )
    return {
        "lecture_id": lecture_id,
        "threshold": threshold,
        "at_risk_students": [dict(r) for r in rows]
    }


@router.post("/run-r-analysis")
async def run_r_analysis(lecture_id: str = None, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """Trigger R analysis script and return results."""
    if lecture_id:
        rows = await db.fetch("SELECT * FROM emotion_records WHERE lecture_id=$1", lecture_id)
    else:
        rows = await db.fetch("SELECT * FROM emotion_records")
    rows = [dict(r) for r in rows]

    if not rows:
        return {"message": "No data to analyze", "results": {}}

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as tmp_csv:
        csv_path = tmp_csv.name
        if rows:
            writer = csv.DictWriter(tmp_csv, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

    r_script = os.path.join(R_SCRIPTS, "analysis.R")
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_json:
        result_path = tmp_json.name
    try:
        proc = subprocess.run(
            ["Rscript", r_script, csv_path, result_path],
            capture_output=True, text=True, timeout=30
        )
        if proc.returncode == 0 and os.path.exists(result_path):
            with open(result_path) as f:
                r_results = json.load(f)
            return {"source": "R", "results": r_results}
        else:
            return {"source": "python_fallback", "results": {
                "total_records": len(rows),
                "note": "R not available; using Python fallback"
            }, "r_error": proc.stderr}
    except Exception as e:
        return {"source": "python_fallback", "error": str(e), "results": {}}
    finally:
        for p in [csv_path, result_path]:
            if os.path.exists(p):
                os.remove(p)
