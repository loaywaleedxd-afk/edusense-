"""
Seed degree requirements for all departments.
Run once: python seed_degree_requirements.py
"""
import sqlite3, os

DB = os.getenv("DB_PATH", "emotion_system.db")

REQUIREMENTS = [
    # ── Computer Science ─────────────────────────────────────────────────────
    ("Computer Science", "CS101", "Introduction to Programming",        3, "core",     1, 1),
    ("Computer Science", "CS102", "Programming Fundamentals",           3, "core",     1, 1),
    ("Computer Science", "CS201", "Data Structures",                    3, "core",     2, 1),
    ("Computer Science", "CS202", "Discrete Mathematics",               3, "core",     2, 1),
    ("Computer Science", "CS203", "Computer Organization",              3, "core",     2, 1),
    ("Computer Science", "CS301", "Algorithms",                         3, "core",     3, 1),
    ("Computer Science", "CS302", "Operating Systems",                  3, "core",     3, 1),
    ("Computer Science", "CS303", "Database Systems",                   3, "core",     3, 1),
    ("Computer Science", "CS304", "Software Engineering",               3, "core",     3, 1),
    ("Computer Science", "CS305", "Computer Networks",                  3, "core",     3, 1),
    ("Computer Science", "CS401", "Artificial Intelligence",            3, "core",     4, 1),
    ("Computer Science", "CS402", "Machine Learning",                   3, "elective", 4, 0),
    ("Computer Science", "CS403", "Data Science",                       3, "elective", 4, 0),
    ("Computer Science", "CS404", "Computer Vision",                    3, "elective", 4, 0),
    ("Computer Science", "CS405", "Deep Learning",                      3, "elective", 4, 0),
    ("Computer Science", "CS499", "Graduation Project",                 6, "core",     4, 1),
    ("Computer Science", "MATH101","Calculus I",                        3, "general",  1, 1),
    ("Computer Science", "MATH102","Calculus II",                       3, "general",  2, 1),
    ("Computer Science", "MATH201","Linear Algebra",                    3, "general",  2, 1),
    ("Computer Science", "MATH202","Probability & Statistics",          3, "general",  3, 1),
    ("Computer Science", "ENG101", "Technical Writing",                 2, "general",  1, 1),
    ("Computer Science", "ENG102", "Communication Skills",              2, "general",  2, 1),

    # ── Data Science ─────────────────────────────────────────────────────────
    ("Data Science", "CS101",  "Introduction to Programming",           3, "core",     1, 1),
    ("Data Science", "CS201",  "Data Structures",                       3, "core",     2, 1),
    ("Data Science", "CS301",  "Algorithms",                            3, "core",     3, 1),
    ("Data Science", "CS303",  "Database Systems",                      3, "core",     2, 1),
    ("Data Science", "CS401",  "Artificial Intelligence",               3, "core",     3, 1),
    ("Data Science", "CS402",  "Machine Learning",                      3, "core",     3, 1),
    ("Data Science", "CS403",  "Data Science",                          3, "core",     2, 1),
    ("Data Science", "CS405",  "Deep Learning",                         3, "elective", 4, 0),
    ("Data Science", "CS404",  "Computer Vision",                       3, "elective", 4, 0),
    ("Data Science", "MATH201","Linear Algebra",                        3, "core",     1, 1),
    ("Data Science", "MATH202","Probability & Statistics",              3, "core",     2, 1),
    ("Data Science", "MATH301","Statistical Inference",                 3, "core",     3, 1),
    ("Data Science", "DS499",  "Data Science Capstone Project",         6, "core",     4, 1),
    ("Data Science", "ENG101", "Technical Writing",                     2, "general",  1, 1),

    # ── Mathematics ──────────────────────────────────────────────────────────
    ("Mathematics", "MATH101","Calculus I",                             3, "core",     1, 1),
    ("Mathematics", "MATH102","Calculus II",                            3, "core",     1, 1),
    ("Mathematics", "MATH103","Calculus III",                           3, "core",     2, 1),
    ("Mathematics", "MATH201","Linear Algebra",                         3, "core",     2, 1),
    ("Mathematics", "MATH202","Probability & Statistics",               3, "core",     2, 1),
    ("Mathematics", "MATH301","Statistical Inference",                  3, "core",     3, 1),
    ("Mathematics", "MATH302","Differential Equations",                 3, "core",     3, 1),
    ("Mathematics", "MATH303","Numerical Analysis",                     3, "core",     3, 1),
    ("Mathematics", "MATH401","Abstract Algebra",                       3, "core",     4, 1),
    ("Mathematics", "MATH402","Real Analysis",                          3, "core",     4, 1),
    ("Mathematics", "CS101",  "Introduction to Programming",            3, "elective", 2, 0),
    ("Mathematics", "CS201",  "Data Structures",                        3, "elective", 3, 0),
    ("Mathematics", "MATH499","Mathematics Thesis",                     6, "core",     4, 1),
    ("Mathematics", "ENG101", "Technical Writing",                      2, "general",  1, 1),

    # ── Engineering ──────────────────────────────────────────────────────────
    ("Engineering", "ENG101", "Technical Writing",                      2, "general",  1, 1),
    ("Engineering", "ENG201", "Engineering Mechanics",                  3, "core",     1, 1),
    ("Engineering", "ENG202", "Thermodynamics",                         3, "core",     2, 1),
    ("Engineering", "ENG203", "Fluid Mechanics",                        3, "core",     2, 1),
    ("Engineering", "ENG301", "Structural Analysis",                    3, "core",     3, 1),
    ("Engineering", "ENG302", "Control Systems",                        3, "core",     3, 1),
    ("Engineering", "ENG303", "Electronics",                            3, "core",     3, 1),
    ("Engineering", "ENG401", "Engineering Design",                     3, "core",     4, 1),
    ("Engineering", "ENG499", "Engineering Graduation Project",         6, "core",     4, 1),
    ("Engineering", "MATH101","Calculus I",                             3, "general",  1, 1),
    ("Engineering", "MATH102","Calculus II",                            3, "general",  2, 1),
    ("Engineering", "MATH201","Linear Algebra",                         3, "general",  2, 1),
    ("Engineering", "CS101",  "Introduction to Programming",            3, "general",  2, 1),

    # ── Physics ──────────────────────────────────────────────────────────────
    ("Physics", "PHYS101","General Physics I",                          3, "core",     1, 1),
    ("Physics", "PHYS102","General Physics II",                         3, "core",     1, 1),
    ("Physics", "PHYS201","Classical Mechanics",                        3, "core",     2, 1),
    ("Physics", "PHYS202","Electromagnetism",                           3, "core",     2, 1),
    ("Physics", "PHYS301","Quantum Mechanics",                          3, "core",     3, 1),
    ("Physics", "PHYS302","Thermodynamics",                             3, "core",     3, 1),
    ("Physics", "PHYS401","Solid State Physics",                        3, "core",     4, 1),
    ("Physics", "PHYS402","Nuclear Physics",                            3, "elective", 4, 0),
    ("Physics", "PHYS499","Physics Research Project",                   6, "core",     4, 1),
    ("Physics", "MATH101","Calculus I",                                 3, "general",  1, 1),
    ("Physics", "MATH102","Calculus II",                                3, "general",  2, 1),
    ("Physics", "MATH201","Linear Algebra",                             3, "general",  2, 1),
    ("Physics", "MATH302","Differential Equations",                     3, "general",  3, 1),

    # ── General (fallback for any department) ─────────────────────────────────
    ("General", "CS101",  "Introduction to Programming",                3, "core",     1, 1),
    ("General", "CS201",  "Data Structures",                            3, "core",     2, 1),
    ("General", "CS301",  "Algorithms",                                 3, "core",     3, 1),
    ("General", "CS401",  "Artificial Intelligence",                    3, "core",     4, 1),
    ("General", "MATH101","Calculus I",                                 3, "general",  1, 1),
    ("General", "MATH202","Probability & Statistics",                   3, "general",  2, 1),
    ("General", "ENG101", "Technical Writing",                          2, "general",  1, 1),
    ("General", "GEN499", "Graduation Project",                         6, "core",     4, 1),
]

def seed():
    db = sqlite3.connect(DB)
    # Create table if it doesn't exist yet
    db.execute("""
        CREATE TABLE IF NOT EXISTS degree_requirements (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            program         TEXT NOT NULL,
            department      TEXT,
            course_code     TEXT NOT NULL,
            course_name     TEXT NOT NULL,
            credits         INTEGER DEFAULT 3,
            category        TEXT DEFAULT 'core',
            is_required     INTEGER DEFAULT 1,
            semester_order  INTEGER DEFAULT 1
        )
    """)
    db.execute("DELETE FROM degree_requirements")   # clear first to avoid dupes

    for row in REQUIREMENTS:
        program, code, name, credits, category, sem_order, is_req = row
        db.execute(
            """INSERT OR IGNORE INTO degree_requirements
               (program, department, course_code, course_name, credits,
                category, semester_order, is_required)
               VALUES (?,?,?,?,?,?,?,?)""",
            (program, program, code, name, credits, category, sem_order, is_req)
        )

    db.commit()
    count = db.execute("SELECT COUNT(*) FROM degree_requirements").fetchone()[0]
    print(f"[OK] Seeded {count} degree requirements across {len(set(r[0] for r in REQUIREMENTS))} programs")
    db.close()

if __name__ == "__main__":
    seed()
