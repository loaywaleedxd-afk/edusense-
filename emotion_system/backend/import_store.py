"""Import all students and data from store.json into the SQLite database."""
import json, sqlite3, random, os
from datetime import datetime, timedelta

DB  = os.path.join(os.path.dirname(__file__), "emotion_system.db")
SRC = os.path.join(os.path.dirname(__file__), "../store.json")

data     = json.load(open(SRC, encoding='utf-8'))
students = data.get('students', [])
courses  = data.get('courses', [])
attend   = data.get('attendance', [])

conn = sqlite3.connect(DB)
c    = conn.cursor()

random.seed(99)

# ── 1. Import students ───────────────────────────────────────────────────────
inserted_students = 0
skipped = 0
for s in students:
    sid   = s['id']
    name  = s.get('name', 'Unknown')
    email = s.get('email') or f"{sid.lower()}@university.edu"
    dept  = s.get('dept', 'General')
    year  = s.get('year', 1)
    uname = sid.lower()          # e.g. "s001"

    # make email unique by appending student id if needed
    safe_email = f"{sid.lower()}@university.edu"
    c.execute("INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES (?,?,?,?,?)",
              (uname, 'pass123', 'student', name, safe_email))
    # get user id (works whether just inserted or already existed)
    c.execute("SELECT id FROM users WHERE username=?", (uname,))
    row = c.fetchone()
    if not row:
        skipped += 1
        continue
    uid = row[0]

    # student row
    c.execute("INSERT OR IGNORE INTO students (student_id,user_id,department,year) VALUES (?,?,?,?)",
              (sid, uid, dept, year))
    inserted_students += 1

conn.commit()
print(f"Students: {inserted_students} processed, {skipped} skipped")

# ── 2. Import courses as lectures ────────────────────────────────────────────
inserted_lec = 0
lecture_ids  = []
base_date    = datetime(2025, 1, 15, 9, 0)

# Use courses from store.json if available, else generate from student dept data
if courses:
    for i, co in enumerate(courses[:20]):   # cap at 20 lectures
        lid       = co.get('id') or f"LEC{i+1:03d}"
        cname     = co.get('name') or co.get('title', f'Course {i+1}')
        ccode     = co.get('code') or f"CS{200+i}"
        scheduled = (base_date + timedelta(weeks=i//2, days=(i%2)*3)).strftime('%Y-%m-%d %H:%M:%S')
        c.execute("INSERT OR IGNORE INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at,status) VALUES (?,?,?,?,?,?,?)",
                  (lid, 'D001', cname, ccode, f'Room {chr(65+i%5)}{i%4+1}', scheduled, 'ended'))
        lecture_ids.append(lid)
        inserted_lec += 1
else:
    depts = list({s.get('dept','General') for s in students})
    course_map = {'Computer Science':'CS','Engineering':'ENG','Mathematics':'MATH',
                  'Physics':'PHY','Data Science':'DS','Chemistry':'CHEM','Biology':'BIO'}
    lec_defs = []
    for d in depts[:5]:
        code = course_map.get(d, d[:3].upper())
        lec_defs += [
            (f"LEC_{code}_01", f"Introduction to {d}", f"{code}101"),
            (f"LEC_{code}_02", f"Advanced {d}",        f"{code}201"),
        ]
    for i, (lid, cname, ccode) in enumerate(lec_defs[:20]):
        scheduled = (base_date + timedelta(weeks=i//2, days=(i%2)*3)).strftime('%Y-%m-%d %H:%M:%S')
        c.execute("INSERT OR IGNORE INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at,status) VALUES (?,?,?,?,?,?,?)",
                  (lid, 'D001', cname, ccode, f'Room {chr(65+i%5)}{i%4+1}', scheduled, 'ended'))
        lecture_ids.append(lid)
        inserted_lec += 1

conn.commit()
print(f"Lectures: {inserted_lec} created")

# ── 3. Generate attendance from store attendance_rate field ──────────────────
c.execute("SELECT student_id FROM students")
all_sids = [r[0] for r in c.fetchall()]

att_count = 0
for s in students:
    sid  = s['id']
    rate = s.get('attendance_rate', 80) / 100.0
    for lid in lecture_ids:
        # check if already exists
        c.execute("SELECT id FROM attendance WHERE student_id=? AND lecture_id=?", (sid, lid))
        if c.fetchone():
            continue
        status = 'present' if random.random() < rate else 'absent'
        ts     = (base_date + timedelta(hours=random.randint(0,800))).strftime('%Y-%m-%d %H:%M:%S')
        conf   = round(random.uniform(0.70, 0.99), 2) if status == 'present' else None
        c.execute("INSERT INTO attendance (student_id,lecture_id,status,method,confidence,check_in_time) VALUES (?,?,?,?,?,?)",
                  (sid, lid, status, 'face_recognition', conf, ts))
        att_count += 1

conn.commit()
print(f"Attendance: {att_count} records added")

# ── 4. Generate emotion records from student emotion/engagement fields ────────
emotions_pool = ['happy','engaged','neutral','neutral','confused','bored','happy','engaged','neutral','happy']
emo_count = 0
for s in students:
    sid        = s['id']
    base_emo   = s.get('emotion', 'neutral')
    base_eng   = s.get('engagement', 70) / 100.0
    base_att   = s.get('attention_score', 70) / 100.0

    for lid in lecture_ids[:10]:   # 10 lectures per student
        for _ in range(random.randint(4, 10)):
            # bias toward the student's known emotion
            emotion = base_emo if random.random() < 0.4 else random.choice(emotions_pool)
            eng = round(min(1.0, max(0.1, base_eng + random.uniform(-0.2, 0.2))), 2)
            att = round(min(1.0, max(0.1, base_att + random.uniform(-0.2, 0.2))), 2)
            ts  = (base_date + timedelta(hours=random.randint(0,800), minutes=random.randint(0,59))).strftime('%Y-%m-%d %H:%M:%S')
            c.execute("INSERT INTO emotion_records (student_id,lecture_id,emotion,confidence,attention_score,engagement_score,timestamp) VALUES (?,?,?,?,?,?,?)",
                      (sid, lid, emotion, round(random.uniform(0.65,0.99),2), att, eng, ts))
            emo_count += 1

conn.commit()
conn.close()

print(f"Emotions: {emo_count} records added")
print(f"\nDone! {len(students)} students imported into the database.")
