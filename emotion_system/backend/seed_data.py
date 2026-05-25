"""
seed_data.py - Populate empty tables in EduSense SQLite database.
Run once:  python seed_data.py
"""
import sqlite3, random, uuid
from datetime import date, timedelta

DB = "emotion_system.db"
random.seed(42)

def uid():
    return str(uuid.uuid4())[:8]

def future(days):
    return (date.today() + timedelta(days=days)).isoformat()

def past(days):
    return (date.today() - timedelta(days=days)).isoformat()

COURSES = [
    ("CS401", "Artificial Intelligence", "D001", "Dr. Ahmed Smith"),
    ("CS402", "Machine Learning",        "D001", "Dr. Ahmed Smith"),
    ("CS403", "Data Science",            "D001", "Dr. Ahmed Smith"),
    ("CS404", "Computer Vision",         "D001", "Dr. Ahmed Smith"),
    ("CS405", "Deep Learning",           "D001", "Dr. Ahmed Smith"),
    ("CS201", "Data Structures",         "D001", "Dr. Ahmed Smith"),
    ("CS301", "Algorithms",              "D001", "Dr. Ahmed Smith"),
]

SEED_STUDENTS = [f"S{str(i).zfill(3)}" for i in range(1, 16)]

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row

# 1. FEES - all students
print("Seeding fees...")
all_students = [r[0] for r in db.execute("SELECT student_id FROM students")]
fee_rows = []
for i, sid in enumerate(all_students):
    paid = 0 if (i % 10) in (2, 5, 8) else 1
    amount = random.choice([1500, 2000, 2500, 3000])
    due = future(random.randint(10, 90)) if not paid else past(random.randint(1, 60))
    fee_rows.append((sid, paid, amount, due))

db.executemany(
    "INSERT OR IGNORE INTO student_fees (student_id, paid, amount, due_date) VALUES (?,?,?,?)",
    fee_rows
)
print(f"  -> {len(fee_rows)} fee records")

# 2. GRADES - seed students across courses
print("Seeding grades...")
grade_rows = []
for sid in SEED_STUDENTS:
    for code, name, did, dname in COURSES:
        g = round(random.uniform(50, 100), 1)
        grade_rows.append((sid, code, name, g, did))

db.executemany(
    "INSERT OR IGNORE INTO grades (student_id, course_code, course_name, grade, doctor_id) VALUES (?,?,?,?,?)",
    grade_rows
)
print(f"  -> {len(grade_rows)} grade records")

# 3. ANNOUNCEMENTS - 3 per course
print("Seeding announcements...")
ANN_TEMPLATES = [
    ("Welcome to {name}",
     "Welcome everyone! Please check the syllabus and make sure you have all required materials for this semester. Office hours are posted on the course page."),
    ("Midterm Exam Details",
     "The midterm exam will cover chapters 1-6. It will be held in the main lecture hall. Bring your student ID. No electronic devices allowed."),
    ("New Resources Available",
     "New lecture slides and practice problems have been uploaded to the course resources section. Highly recommended before the upcoming exam."),
]
ann_rows = []
for code, name, did, dname in COURSES:
    for i, (title_t, body) in enumerate(ANN_TEMPLATES):
        title = title_t.format(name=name)
        created = past(random.randint(1, 30) + i * 5)
        ann_rows.append((uid(), code, name, did, dname, title, body, created))

db.executemany(
    "INSERT OR IGNORE INTO announcements (id, course_id, course_name, doctor_id, doctor_name, title, body, created_at) VALUES (?,?,?,?,?,?,?,?)",
    ann_rows
)
print(f"  -> {len(ann_rows)} announcements")

# 4. EXAM SCHEDULE - midterm + final per course
print("Seeding exam schedule...")
EXAM_ROOMS = ["Hall A", "Hall B", "Hall C", "Lab 1", "Lab 2", "Auditorium"]
exam_rows = []
for i, (code, name, did, dname) in enumerate(COURSES):
    exam_rows.append((
        uid(), code, name, "midterm",
        future(18 + i), "10:00",
        random.choice(EXAM_ROOMS), 120,
        "Covers weeks 1-7. Closed book.", past(10)
    ))
    exam_rows.append((
        uid(), code, name, "final",
        future(56 + i), "09:00",
        random.choice(EXAM_ROOMS), 180,
        "Comprehensive final exam. Formula sheet provided.", past(5)
    ))

db.executemany(
    "INSERT OR IGNORE INTO exam_schedule (id, course_id, course_name, type, date, time, room, duration, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    exam_rows
)
print(f"  -> {len(exam_rows)} exams")

# 5. COURSE RESOURCES - 3 per course
print("Seeding resources...")
RES_TEMPLATES = [
    ("Week 1 Lecture Slides", "link",
     "Introduction and course overview slides.",
     "https://drive.google.com/slides/intro"),
    ("Recommended Textbook", "link",
     "Free PDF of the recommended course textbook.",
     "https://textbook.example.com/free"),
    ("Practice Problems Set 1", "link",
     "Practice problems to prepare for the midterm.",
     "https://drive.google.com/problems/set1"),
]
res_rows = []
for code, name, did, _ in COURSES:
    for j, (title, rtype, desc, url) in enumerate(RES_TEMPLATES):
        res_rows.append((
            uid(), code, j + 1, title, url, rtype, desc, did,
            "", 0, None, past(random.randint(1, 20))
        ))

db.executemany(
    "INSERT OR IGNORE INTO course_resources (id, course_id, week, title, url, type, description, doctor_id, file_name, file_size, file_data, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    res_rows
)
print(f"  -> {len(res_rows)} resources")

# 6. ASSIGNMENTS - 2 per course
print("Seeding assignments...")
ASN_TEMPLATES = [
    ("Assignment 1 - Fundamentals",
     "Complete the exercises in chapter 2 and submit a PDF report. Show all your work clearly.",
     future(7), 100),
    ("Assignment 2 - Implementation",
     "Implement the algorithm discussed in class and submit your code with a short write-up explaining your approach.",
     future(21), 100),
]
asn_rows = []
asn_ids = {}
for code, name, did, _ in COURSES:
    asn_ids[code] = []
    for title, desc, deadline, max_score in ASN_TEMPLATES:
        aid = uid()
        asn_ids[code].append(aid)
        asn_rows.append((
            aid, code, name, did, title, desc, deadline,
            max_score, "", 0, None, past(random.randint(1, 14))
        ))

db.executemany(
    "INSERT OR IGNORE INTO assignments (id, course_id, course_name, doctor_id, title, description, deadline, max_score, attachment_name, attachment_size, attachment_data, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    asn_rows
)
print(f"  -> {len(asn_rows)} assignments")

# 7. COURSE ENROLLMENTS - seed students in all courses
print("Seeding enrollments...")
enroll_rows = []
for code, _, _, _ in COURSES:
    for sid in SEED_STUDENTS:
        enroll_rows.append((code, sid))

db.executemany(
    "INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES (?,?)",
    enroll_rows
)
print(f"  -> {len(enroll_rows)} enrollments")

# 8. MESSAGES - 3 seed messages per course
print("Seeding chat messages...")
MSG_TEMPLATES = [
    ("Dr. Ahmed Smith", "doctor",  "D001",
     "Welcome to the course chat! Feel free to ask questions here anytime."),
    ("Sara Johnson",    "student", "S001",
     "Thank you Doctor! Will office hours be held online or in person?"),
    ("Dr. Ahmed Smith", "doctor",  "D001",
     "Office hours are in-person - Room 204, Building A, Wednesdays 2-4 PM."),
]
msg_rows = []
for code, _, _, _ in COURSES:
    for i, (name, role, sender_id, text) in enumerate(MSG_TEMPLATES):
        msg_rows.append((code, sender_id, name, role, text, past(random.randint(1, 10) + i)))

db.executemany(
    "INSERT INTO messages (course_code, sender_id, sender_name, sender_role, text, created_at) VALUES (?,?,?,?,?,?)",
    msg_rows
)
print(f"  -> {len(msg_rows)} messages")

# 9. SUBMISSIONS - S001-S005 submitted assignment 1 for each course
print("Seeding submissions...")
FEEDBACKS = [
    "Good work! Clear explanation and correct implementation.",
    "Nice effort. Check the edge cases in your solution.",
    "Well structured. Minor improvements needed in documentation.",
    "Excellent submission. Full marks.",
    "Satisfactory. Please review the feedback and resubmit if needed.",
]
sub_rows = []
for code, _, _, _ in COURSES:
    aids = asn_ids.get(code, [])
    if not aids:
        continue
    aid = aids[0]
    for j, sid in enumerate(SEED_STUDENTS[:5]):
        grade = round(random.uniform(70, 100), 1)
        sub_rows.append((
            uid(), aid, sid, code,
            f"My solution for {code} Assignment 1.",
            "", 0, None,
            past(random.randint(1, 6)),
            grade, FEEDBACKS[j % len(FEEDBACKS)],
            past(random.randint(0, 3)), "D001"
        ))

db.executemany(
    "INSERT OR IGNORE INTO submissions (id, assignment_id, student_id, course_id, content, file_name, file_size, file_data, submitted_at, grade, feedback, graded_at, graded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    sub_rows
)
print(f"  -> {len(sub_rows)} submissions")

db.commit()
db.close()

print("\nDone! Final counts:")
db2 = sqlite3.connect(DB)
for tbl in ["student_fees", "grades", "announcements", "exam_schedule",
            "course_resources", "assignments", "submissions",
            "course_enrollments", "messages"]:
    n = db2.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    print(f"  {tbl:<25} {n:>5} rows")
db2.close()
