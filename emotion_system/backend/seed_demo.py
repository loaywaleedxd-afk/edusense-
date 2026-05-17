"""Seed the database with demo data for testing."""
import sqlite3, random, os
from datetime import datetime, timedelta

DB = os.path.join(os.path.dirname(__file__), "emotion_system.db")
conn = sqlite3.connect(DB)
c = conn.cursor()

random.seed(42)
base = datetime(2025, 2, 10, 9, 0)

# --- users ---
users = [
    ('s001',    'student', 'Sara Johnson',       'sara.j@university.edu'),
    ('s002',    'student', 'Ahmed Hassan',        'ahmed.h@university.edu'),
    ('s003',    'student', 'Maria Garcia',        'maria.g@university.edu'),
    ('s004',    'student', 'James Chen',          'james.c@university.edu'),
    ('s005',    'student', 'Fatima Al-Rashid',    'fatima.r@university.edu'),
    ('dr.smith','doctor',  'Dr. Ahmed Smith',     'ahmed.smith@university.edu'),
    ('admin',   'admin',   'System Administrator','admin@university.edu'),
]
for username, role, name, email in users:
    c.execute("INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES (?,?,?,?,?)",
              (username, 'pass123', role, name, email))
conn.commit()

c.execute("SELECT id, username FROM users")
user_map = {row[1]: row[0] for row in c.fetchall()}

# --- students ---
student_rows = [
    ('S001','s001','Computer Science',3),
    ('S002','s002','Computer Science',2),
    ('S003','s003','Mathematics',3),
    ('S004','s004','Physics',1),
    ('S005','s005','Computer Science',4),
]
for sid, uname, dept, year in student_rows:
    uid = user_map.get(uname)
    if uid:
        c.execute("INSERT OR IGNORE INTO students (student_id,user_id,department,year) VALUES (?,?,?,?)",
                  (sid, uid, dept, year))

# --- doctor ---
uid = user_map.get('dr.smith')
if uid:
    c.execute("INSERT OR IGNORE INTO doctors (doctor_id,user_id,department,title) VALUES (?,?,?,?)",
              ('D001', uid, 'Computer Science', 'Dr.'))
conn.commit()

# --- lectures ---
courses = [
    ('LEC001','D001','Data Structures','CS201','Room A1'),
    ('LEC002','D001','Algorithms','CS301','Room B2'),
    ('LEC003','D001','Data Structures','CS201','Room A1'),
    ('LEC004','D001','Machine Learning','CS401','Lab 3'),
    ('LEC005','D001','Data Structures','CS201','Room A1'),
    ('LEC006','D001','Algorithms','CS301','Room B2'),
    ('LEC007','D001','Machine Learning','CS401','Lab 3'),
    ('LEC008','D001','Data Structures','CS201','Room A1'),
    ('LEC009','D001','Algorithms','CS301','Room B2'),
    ('LEC010','D001','Machine Learning','CS401','Lab 3'),
]
lecture_ids = []
for i, (lid, did, cname, ccode, room) in enumerate(courses):
    scheduled = (base + timedelta(weeks=i//2, days=(i%2)*3)).strftime('%Y-%m-%d %H:%M:%S')
    c.execute("INSERT OR IGNORE INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at,status) VALUES (?,?,?,?,?,?,?)",
              (lid, did, cname, ccode, room, scheduled, 'ended'))
    lecture_ids.append(lid)
conn.commit()

# --- attendance ---
students = ['S001','S002','S003','S004','S005']
for lid in lecture_ids:
    for sid in students:
        ts = (base + timedelta(hours=random.randint(0,500))).strftime('%Y-%m-%d %H:%M:%S')
        status = 'present' if random.random() < 0.80 else 'absent'
        conf = round(random.uniform(0.75, 0.99), 2) if status == 'present' else None
        c.execute("INSERT OR IGNORE INTO attendance (student_id,lecture_id,status,method,confidence,check_in_time) VALUES (?,?,?,?,?,?)",
                  (sid, lid, status, 'face_recognition', conf, ts))

# --- emotion records ---
emotions_pool = ['happy','engaged','neutral','neutral','confused','bored','happy','engaged']
for lid in lecture_ids:
    for sid in students:
        for _ in range(random.randint(5, 15)):
            emotion = random.choice(emotions_pool)
            ts = (base + timedelta(hours=random.randint(0,500), minutes=random.randint(0,59))).strftime('%Y-%m-%d %H:%M:%S')
            c.execute("INSERT INTO emotion_records (student_id,lecture_id,emotion,confidence,attention_score,engagement_score,timestamp) VALUES (?,?,?,?,?,?,?)",
                      (sid, lid, emotion,
                       round(random.uniform(0.70,0.99),2),
                       round(random.uniform(0.50,0.98),2),
                       round(random.uniform(0.45,0.95),2),
                       ts))

conn.commit()
conn.close()
print("Demo data seeded successfully!")
print(f"  {len(students)} students, {len(lecture_ids)} lectures")
print("  Attendance and emotion records added.")
