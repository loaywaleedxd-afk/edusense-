"""
Analytics router — engagement scoring, clustering, trend analysis
Integrates with R via subprocess or rpy2
"""
from fastapi import APIRouter
from typing import List, Dict, Any
import aiosqlite, os, json, subprocess, tempfile

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")
R_SCRIPTS = os.path.join(os.path.dirname(__file__), "../../r_analysis")

EMOTION_SCORE = {
    "happy":1.0,"neutral":0.7,"surprise":0.8,"confused":0.45,
    "sad":0.2,"bored":0.1,"angry":0.2,"disgust":0.1,"fear":0.3
}


@router.get("/engagement-overview")
async def engagement_overview():
    """Overall platform engagement metrics."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                 COUNT(DISTINCT student_id) as total_students,
                 COUNT(DISTINCT lecture_id) as total_lectures,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(*) as total_records
               FROM emotion_records"""
        )
        overview = dict(await cursor.fetchone())
        # per-emotion breakdown
        emo_cursor = await db.execute(
            """SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_conf
               FROM emotion_records GROUP BY emotion ORDER BY count DESC"""
        )
        emotions = [dict(r) for r in await emo_cursor.fetchall()]
    return {**overview, "emotions": emotions}


@router.get("/lecture-comparison")
async def lecture_comparison():
    """Compare engagement across all lectures."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
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
               GROUP BY er.lecture_id
               ORDER BY avg_engagement DESC"""
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/student-clusters")
async def student_clusters():
    """
    Cluster students by engagement/attention behavior.
    Simplified k-means style bucketing (3 clusters).
    For full clustering: calls R script.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                 student_id,
                 AVG(engagement_score) as avg_eng,
                 AVG(attention_score) as avg_att,
                 COUNT(*) as records
               FROM emotion_records
               GROUP BY student_id"""
        )
        rows = [dict(r) for r in await cursor.fetchall()]
    # Simple cluster assignment
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
async def time_trends():
    """Engagement trends over time across all lectures."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                 strftime('%Y-%m-%d', timestamp) as date,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100 as avg_attention,
                 COUNT(DISTINCT student_id) as students,
                 COUNT(*) as records
               FROM emotion_records
               GROUP BY date ORDER BY date DESC LIMIT 30"""
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/alerts/low-engagement/{lecture_id}")
async def low_engagement_alerts(lecture_id: str, threshold: float = 0.35):
    """Identify students with low engagement in recent window."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                 er.student_id,
                 u.full_name,
                 AVG(er.engagement_score) as avg_eng,
                 AVG(er.attention_score) as avg_att,
                 COUNT(*) as samples
               FROM emotion_records er
               LEFT JOIN students s ON er.student_id=s.student_id
               LEFT JOIN users u ON s.user_id=u.id
               WHERE er.lecture_id=?
                 AND er.timestamp > datetime('now','-10 minutes')
               GROUP BY er.student_id
               HAVING avg_eng < ?
               ORDER BY avg_eng ASC""",
            (lecture_id, threshold)
        )
        rows = await cursor.fetchall()
    return {
        "lecture_id": lecture_id,
        "threshold": threshold,
        "at_risk_students": [dict(r) for r in rows]
    }


@router.post("/run-r-analysis")
async def run_r_analysis(lecture_id: str = None):
    """
    Trigger R analysis script and return results.
    The R script reads from CSV exported from DB.
    """
    # Export data to CSV for R
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        q = """SELECT * FROM emotion_records"""
        params = ()
        if lecture_id:
            q += " WHERE lecture_id=?"
            params = (lecture_id,)
        cursor = await db.execute(q, params)
        rows = [dict(r) for r in await cursor.fetchall()]

    if not rows:
        return {"message": "No data to analyze", "results": {}}

    csv_path = tempfile.mktemp(suffix=".csv")
    with open(csv_path, "w") as f:
        if rows:
            f.write(",".join(rows[0].keys()) + "\n")
            for r in rows:
                f.write(",".join(str(v) for v in r.values()) + "\n")

    # Run R script
    r_script = os.path.join(R_SCRIPTS, "analysis.R")
    result_path = tempfile.mktemp(suffix=".json")
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
