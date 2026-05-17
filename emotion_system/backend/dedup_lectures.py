"""Remove duplicate lectures — keep one per course_code."""
import sqlite3, os

DB = os.path.join(os.path.dirname(__file__), "emotion_system.db")
db = sqlite3.connect(DB)

rows = db.execute("SELECT lecture_id, course_code, course_name FROM lectures ORDER BY lecture_id").fetchall()
print("Before:", len(rows), "lectures")

# Group by course_code — prefer CS### prefix, then L###, then LEC###
def priority(lid):
    if lid.startswith('CS'): return 0
    if lid.startswith('L0') or lid.startswith('L0'): return 1
    return 2

seen = {}   # course_code -> best lecture_id
for lid, code, name in rows:
    if code not in seen or priority(lid) < priority(seen[code]):
        seen[code] = lid

keep = set(seen.values())
to_delete = [lid for lid, code, name in rows if lid not in keep]

for lid in to_delete:
    db.execute("DELETE FROM lectures WHERE lecture_id=?", (lid,))
db.commit()

remaining = db.execute("SELECT lecture_id, course_code, course_name FROM lectures ORDER BY lecture_id").fetchall()
print("After:", len(remaining), "lectures")
for r in remaining:
    print(f"  {r[0]:12s}  {r[1]:8s}  {r[2]}")
print(f"Deleted {len(to_delete)}: {to_delete}")
db.close()
