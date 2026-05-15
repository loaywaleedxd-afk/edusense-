"""
DataStore — Complete rebuild with all features + Exam Results
"""
import random, json, os
from datetime import datetime

STORE_FILE = os.path.join(os.path.dirname(__file__), "store.json")
SAMPLE_NAMES = [
    ("Sara Johnson","👩","#3b82f6"),("Ahmed Hassan","👦","#10b981"),
    ("Nour Ali","👩","#8b5cf6"),("Mohamed Karim","👦","#f59e0b"),
    ("Layla Ibrahim","👩","#ef4444"),("Omar Salah","👦","#06b6d4"),
    ("Fatima Zahra","👩","#ec4899"),("Yusuf Ahmad","👦","#10b981"),
    ("Hana Mostafa","👩","#3b82f6"),("Tariq Nasser","👦","#8b5cf6"),
    ("Rania Said","👩","#f59e0b"),("Khalid Faris","👦","#ef4444"),
    ("Dina Wael","👩","#06b6d4"),("Sami Lotfy","👦","#ec4899"),
    ("Aya Ramadan","👩","#10b981"),
]
EMOTIONS=["happy","neutral","confused","bored","surprise","sad"]
DEPARTMENTS=["Computer Science","Engineering","Mathematics","Physics","Data Science"]
TITLES=["Professor","Associate Professor","Lecturer","Assistant Professor"]
COURSE_DATA=[
    ("Artificial Intelligence","CS401","Hall A","#3b82f6"),
    ("Machine Learning","CS402","Hall B","#8b5cf6"),
    ("Data Science","CS403","Lab 1","#10b981"),
    ("Computer Vision","CS404","Lab 2","#f59e0b"),
    ("Deep Learning","CS405","Hall C","#06b6d4"),
]
def _r(a,b): return random.randint(a,b)
def _rf(a,b): return round(random.uniform(a,b),2)

class DataStore:
    def __init__(self):
        random.seed(42)
        self._init_defaults()
        self._load_persisted()

    def _init_defaults(self):
        self.students=self._make_students()
        self.doctors=self._make_doctors()
        self.lectures=self._make_lectures()
        self.courses=self._make_courses()
        self.course_enrollments={}
        self.attendance={}
        self.emotions=[]
        self.emotion_dist=self._make_emo_dist()
        self.trend_data=self._make_trend()
        self.alerts=self._make_alerts()
        self.users=self._make_default_users()
        self.current_week=1
        self.exam_results={}   # ← {student_id: {course_id: {grade, date, added_by}}}
        self.chat_messages={}  # ← {course_id: [{id, sender, sender_id, role, text, timestamp, type, reactions}]}
        self._init_sample_enrollments()

    def _make_students(self):
        out=[]
        for i,(name,emoji,color) in enumerate(SAMPLE_NAMES):
            out.append({"id":f"S{i+1:03d}","name":name,"emoji":emoji,"color":color,
                "dept":DEPARTMENTS[i%len(DEPARTMENTS)],"year":(i%4)+1,
                "email":f"{name.split()[0].lower()}.{name.split()[1].lower()}@university.edu",
                "phone":f"+20-10{_r(10000000,99999999)}",
                "emotion":EMOTIONS[i%len(EMOTIONS)],
                "attention":["attentive","moderate","distracted"][i%3],
                "engagement":_r(40,95),"attention_score":_r(35,90),
                "attendance_rate":_r(65,100),"gpa":round(random.uniform(2.0,4.0),1),
                "present":i<12,"confidence":_rf(0.65,0.97),
                "has_face":False,"registered_at":""})
        return out

    def _make_doctors(self):
        return [
            {"id":"D001","name":"Dr. Ahmed Smith","emoji":"👨‍🏫","color":"#3b82f6",
             "dept":"Computer Science","title":"Associate Professor",
             "email":"ahmed.smith@university.edu","phone":"+20-100000001",
             "courses":5,"students":142,"engagement":72,"has_face":False},
            {"id":"D002","name":"Dr. Laila Hassan","emoji":"👩‍🏫","color":"#8b5cf6",
             "dept":"Mathematics","title":"Professor",
             "email":"laila.hassan@university.edu","phone":"+20-100000002",
             "courses":3,"students":98,"engagement":68,"has_face":False},
            {"id":"D003","name":"Dr. Khalid Omar","emoji":"👨‍🏫","color":"#10b981",
             "dept":"Engineering","title":"Lecturer",
             "email":"khalid.omar@university.edu","phone":"+20-100000003",
             "courses":4,"students":120,"engagement":75,"has_face":False},
            {"id":"D004","name":"Dr. Sara Nour","emoji":"👩‍🏫","color":"#f59e0b",
             "dept":"Physics","title":"Associate Professor",
             "email":"sara.nour@university.edu","phone":"+20-100000004",
             "courses":2,"students":56,"engagement":81,"has_face":False},
        ]

    def _make_lectures(self):
        times=["09:00","11:00","13:00","15:00","17:00"]
        stats=["active","scheduled","scheduled","ended","ended"]
        return [{"id":f"L{i+1:03d}","name":n,"code":c,"room":r,"color":col,
                 "time":times[i],"duration":90,"status":stats[i],
                 "students":_r(28,48),"present":_r(20,40),
                 "avg_engagement":_r(50,90),"avg_attention":_r(45,85),
                 "dominant_emotion":EMOTIONS[i%len(EMOTIONS)],
                 "doctor":"Dr. Ahmed Smith","doctor_id":"D001"}
                for i,(n,c,r,col) in enumerate(COURSE_DATA)]

    def _make_courses(self):
        doctors=["D001","D002","D003","D004","D001"]
        dnames=["Dr. Ahmed Smith","Dr. Laila Hassan","Dr. Khalid Omar","Dr. Sara Nour","Dr. Ahmed Smith"]
        times=["09:00","11:00","13:00","15:00","17:00"]
        return [{"id":code,"name":name,"code":code,"room":room,"color":color,
                 "time":times[i],"duration":90,"doctor_id":doctors[i],
                 "doctor_name":dnames[i],"weeks":list(range(1,17)),
                 "semester":"Fall 2024","enrolled_count":_r(25,45)}
                for i,(name,code,room,color) in enumerate(COURSE_DATA)]

    def _init_sample_enrollments(self):
        for i,course in enumerate(self.courses):
            cid=course["id"]
            if cid not in self.course_enrollments:
                offset=(i*3)%len(self.students)
                enrolled=[s["id"] for s in self.students[offset:offset+10]]
                if len(enrolled)<10:
                    enrolled+=[s["id"] for s in self.students[:10-len(enrolled)]]
                self.course_enrollments[cid]=enrolled

    def _make_default_users(self):
        return [
            {"username":"admin","password":"demo123","role":"admin",
             "name":"System Administrator","email":"admin@university.edu"},
            {"username":"dr.smith","password":"demo123","role":"doctor",
             "name":"Dr. Ahmed Smith","email":"ahmed.smith@university.edu","doctor_id":"D001"},
            {"username":"s001","password":"demo123","role":"student",
             "name":"Sara Johnson","email":"sara.johnson@university.edu","student_id":"S001"},
            {"username":"parent1","password":"demo123","role":"parent",
             "name":"Parent User","email":"parent1@university.edu","student_id":"S001"},
        ]

    @staticmethod
    def _emo_color(e):
        return {"happy":"#10b981","neutral":"#6366f1","confused":"#8b5cf6",
                "bored":"#64748b","surprise":"#f59e0b","sad":"#475569",
                "angry":"#ef4444","fear":"#f97316"}.get(e,"#64748b")

    def _make_emo_dist(self):
        ws=[0.32,0.28,0.14,0.10,0.08,0.05,0.02,0.01]
        es=["neutral","happy","confused","bored","surprise","sad","angry","fear"]
        return [{"emotion":e,"count":int(1200*w),"pct":int(w*100),
                 "color":self._emo_color(e)} for e,w in zip(es,ws)]

    def _make_trend(self):
        return {"labels":[f"W{i+1}" for i in range(16)],
                "engagement":[_r(45,92) for _ in range(16)],
                "attention":[_r(40,88) for _ in range(16)]}

    def _make_alerts(self):
        return [
            {"type":"Low Engagement","msg":"Engagement dropped below 40%",
             "student":"Ahmed Hassan","lecture":"CS401","severity":"Warning",
             "time":"10:23","details":"Engagement dropped to 32%"},
            {"type":"Distracted","msg":"Student distracted for 15+ minutes",
             "student":"Nour Ali","lecture":"CS402","severity":"Info",
             "time":"11:15","details":"Attention score below threshold"},
            {"type":"Absent","msg":"Student not detected in session",
             "student":"Mohamed Karim","lecture":"CS403","severity":"Critical",
             "time":"13:05","details":"Not detected in session"},
        ]

    # ── Persistence ──────────────────────────────────────
    def _load_persisted(self):
        if not os.path.exists(STORE_FILE): return
        try:
            with open(STORE_FILE,encoding='utf-8') as f:
                data=json.load(f)

            stored_students = data.get("students", [])
            if stored_students:
                stored_map = {s["id"]: s for s in stored_students}
                for s in self.students:
                    if s["id"] in stored_map:
                        s.update(stored_map[s["id"]])
                exist_ids = {s["id"] for s in self.students}
                for s in stored_students:
                    if s["id"] not in exist_ids:
                        self.students.append(s)
                        exist_ids.add(s["id"])

            stored_doctors = data.get("doctors", [])
            if stored_doctors:
                stored_map = {d["id"]: d for d in stored_doctors}
                for d in self.doctors:
                    if d["id"] in stored_map:
                        d.update(stored_map[d["id"]])
                exist_ids = {d["id"] for d in self.doctors}
                for d in stored_doctors:
                    if d["id"] not in exist_ids:
                        self.doctors.append(d)
                        exist_ids.add(d["id"])

            self.attendance.update(data.get("attendance", {}))

            stored_courses = data.get("courses", [])
            if stored_courses:
                stored_map = {c["id"]: c for c in stored_courses}
                for c in self.courses:
                    if c["id"] in stored_map:
                        c.update(stored_map[c["id"]])
                exist_ids = {c["id"] for c in self.courses}
                for c in stored_courses:
                    if c["id"] not in exist_ids:
                        self.courses.append(c)
                        exist_ids.add(c["id"])

            stored_enroll = data.get("course_enrollments", {})
            if stored_enroll:
                for cid, sids in stored_enroll.items():
                    if cid not in self.course_enrollments:
                        self.course_enrollments[cid] = sids
                    else:
                        existing = set(self.course_enrollments[cid])
                        for sid in sids:
                            if sid not in existing:
                                self.course_enrollments[cid].append(sid)

            stored_users = data.get("users", [])
            if stored_users:
                stored_usernames = {u["username"] for u in stored_users}
                kept_defaults = [u for u in self.users
                                 if u["username"] not in stored_usernames]
                self.users = kept_defaults + stored_users

            # ← NEW: load exam results
            self.exam_results.update(data.get("exam_results", {}))
            # ← NEW: load chat messages
            self.chat_messages.update(data.get("chat_messages", {}))

        except Exception as e:
            print(f"[DataStore] load error: {e}")

    def _persist(self):
        try:
            default_u={"admin","dr.smith","s001","parent1"}
            with open(STORE_FILE,"w",encoding='utf-8') as f:
                json.dump({
                    "students":          self.students,
                    "doctors":           self.doctors,
                    "attendance":        self.attendance,
                    "courses":           self.courses,
                    "course_enrollments":self.course_enrollments,
                    "exam_results":      self.exam_results,   # ← NEW
                    "chat_messages":     self.chat_messages,  # ← NEW
                    "users":[u for u in self.users if u["username"] not in default_u],
                },f,indent=2,ensure_ascii=False)
        except Exception as e:
            print(f"[DataStore] persist error: {e}")

    # ── Auth ─────────────────────────────────────────────
    def authenticate(self,username,password):
        username=username.strip().lower(); password=password.strip()
        if not password: return None
        for u in self.users:
            if u.get("username","").lower()==username and u.get("password","")==password:
                return {
                    "username":     u["username"],
                    "name":         u.get("name", username),
                    "role":         u.get("role", "student"),
                    "email":        u.get("email", ""),
                    "id":           u.get("student_id", u.get("doctor_id", "ADM")),
                    "student_id":   u.get("student_id", ""),
                    "doctor_id":    u.get("doctor_id", ""),
                    "student_name": u.get("student_name", ""),
                    "phone":        u.get("phone", ""),
                    "initials":     "".join(w[0].upper() for w in u.get("name","??").split()[:2]),
                }
        return None

    # ── Student CRUD ─────────────────────────────────────
    def next_student_id(self):
        nums=[int(s["id"][1:]) for s in self.students if s["id"][1:].isdigit()]
        return f"S{(max(nums)+1):03d}" if nums else "S001"

    def add_student(self,data):
        sid=self.next_student_id()
        s={"id":sid,"name":data.get("name","New Student"),
           "emoji":random.choice(["👦","👩"]),
           "color":random.choice(["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4"]),
           "dept":data.get("dept",DEPARTMENTS[0]),"year":int(data.get("year",1)),
           "email":data.get("email",""),"phone":data.get("phone",""),
           "emotion":"neutral","attention":"moderate","engagement":50,
           "attention_score":50,"attendance_rate":0,"gpa":0.0,
           "present":False,"confidence":0.0,"has_face":data.get("has_face",False),
           "registered_at":datetime.now().strftime("%Y-%m-%d %H:%M") if data.get("has_face") else ""}
        self.students.append(s); self._persist(); return s

    def update_student(self,sid,data):
        for s in self.students:
            if s["id"]==sid: s.update(data); self._persist(); return s
        return None

    def delete_student(self,sid):
        n=len(self.students); self.students=[s for s in self.students if s["id"]!=sid]
        if len(self.students)<n: self._persist(); return True
        return False

    def get_student(self,sid):
        return next((s for s in self.students if s["id"]==sid),None)

    # ── Doctor CRUD ──────────────────────────────────────
    def next_doctor_id(self):
        nums=[int(d["id"][1:]) for d in self.doctors if d["id"][1:].isdigit()]
        return f"D{(max(nums)+1):03d}" if nums else "D001"

    def add_doctor(self,data):
        did=self.next_doctor_id()
        d={"id":did,"name":data.get("name","New Doctor"),
           "emoji":random.choice(["👨‍🏫","👩‍🏫"]),
           "color":random.choice(["#3b82f6","#8b5cf6","#10b981","#f59e0b"]),
           "dept":data.get("dept",DEPARTMENTS[0]),"title":data.get("title","Lecturer"),
           "email":data.get("email",""),"phone":data.get("phone",""),
           "courses":0,"students":0,"engagement":0,"has_face":data.get("has_face",False)}
        self.doctors.append(d); self._persist(); return d

    def delete_doctor(self,did):
        n=len(self.doctors); self.doctors=[d for d in self.doctors if d["id"]!=did]
        if len(self.doctors)<n: self._persist(); return True
        return False

    def get_doctor(self,did):
        return next((d for d in self.doctors if d["id"]==did),None)

    # ── Course Management ────────────────────────────────
    def add_course(self,data):
        code=data.get("code",f"C{len(self.courses)+1:03d}").upper()
        doctor=self.get_doctor(data.get("doctor_id",""))
        course={"id":code,"name":data.get("name","New Course"),"code":code,
                "room":data.get("room",""),"color":data.get("color","#3b82f6"),
                "time":data.get("time","09:00"),"duration":int(data.get("duration",90)),
                "doctor_id":data.get("doctor_id",""),
                "doctor_name":doctor["name"] if doctor else "Unassigned",
                "weeks":data.get("weeks",list(range(1,17))),
                "semester":data.get("semester","Fall 2024"),"enrolled_count":0}
        self.courses.append(course)
        self.course_enrollments[code]=[]
        self._persist(); return course

    def update_course(self,course_id,data):
        for c in self.courses:
            if c["id"]==course_id:
                c.update(data)
                if "doctor_id" in data:
                    doctor=self.get_doctor(data["doctor_id"])
                    c["doctor_name"]=doctor["name"] if doctor else "Unassigned"
                self._persist(); return c
        return None

    def delete_course(self,course_id):
        n=len(self.courses); self.courses=[c for c in self.courses if c["id"]!=course_id]
        if len(self.courses)<n:
            if course_id in self.course_enrollments: del self.course_enrollments[course_id]
            self._persist(); return True
        return False

    def get_course(self,course_id):
        return next((c for c in self.courses if c["id"]==course_id),None)

    def get_doctor_courses(self,doctor_id):
        return [c for c in self.courses if c.get("doctor_id")==doctor_id]

    def assign_doctor_to_course(self,course_id,doctor_id):
        course=self.get_course(course_id); doctor=self.get_doctor(doctor_id)
        if course and doctor:
            course["doctor_id"]=doctor_id; course["doctor_name"]=doctor["name"]
            self._persist(); return True
        return False

    # ── Enrollment ───────────────────────────────────────
    def enroll_student(self,course_id,student_id):
        if course_id not in self.course_enrollments:
            self.course_enrollments[course_id]=[]
        if student_id not in self.course_enrollments[course_id]:
            self.course_enrollments[course_id].append(student_id)
            c=self.get_course(course_id)
            if c: c["enrolled_count"]=len(self.course_enrollments[course_id])
            self._persist(); return True
        return False

    def unenroll_student(self,course_id,student_id):
        if course_id in self.course_enrollments and student_id in self.course_enrollments[course_id]:
            self.course_enrollments[course_id].remove(student_id)
            c=self.get_course(course_id)
            if c: c["enrolled_count"]=len(self.course_enrollments[course_id])
            self._persist(); return True
        return False

    def get_enrolled_students(self,course_id):
        ids=self.course_enrollments.get(course_id,[])
        return [s for s in self.students if s["id"] in ids]

    def get_unenrolled_students(self,course_id):
        ids=set(self.course_enrollments.get(course_id,[]))
        return [s for s in self.students if s["id"] not in ids]

    def get_student_courses(self,student_id):
        return [self.get_course(cid) for cid,sids in self.course_enrollments.items()
                if student_id in sids and self.get_course(cid)]

    # ── Attendance (Week-based) ──────────────────────────
    def _att_key(self,course_id,week):
        return f"{course_id}_W{week:02d}"

    def mark_attendance(self,course_id,student_id,confidence=1.0,method="face",week=None):
        if week is None: week=self.current_week
        key=self._att_key(course_id,week)
        if key not in self.attendance: self.attendance[key]={}
        if student_id not in self.attendance[key]:
            self.attendance[key][student_id]={
                "student_id":student_id,"course_id":course_id,
                "lecture_id":course_id,"week":week,
                "time":datetime.now().strftime("%H:%M:%S"),
                "date":datetime.now().strftime("%Y-%m-%d"),
                "method":method,"confidence":round(confidence,3),"status":"present"}
            self._persist(); return True
        return False

    def get_attendance(self,course_id,week=None):
        if week is not None:
            return self.attendance.get(self._att_key(course_id,week),{})
        result={}
        for key,recs in self.attendance.items():
            if key.startswith(f"{course_id}_W"): result.update(recs)
        if course_id in self.attendance: result.update(self.attendance[course_id])
        return result

    def get_weekly_attendance(self,course_id):
        return {w:self.attendance[self._att_key(course_id,w)]
                for w in range(1,17) if self._att_key(course_id,w) in self.attendance}

    def get_student_attendance(self,student_id):
        return [rec for recs in self.attendance.values()
                for sid,rec in recs.items() if sid==student_id]

    def get_student_course_attendance(self,student_id,course_id):
        return {w:self.attendance[self._att_key(course_id,w)][student_id]
                for w in range(1,17)
                if self._att_key(course_id,w) in self.attendance
                and student_id in self.attendance[self._att_key(course_id,w)]}

    # ── Emotions ─────────────────────────────────────────
    def add_emotion(self,record): self.emotions.append(record)
    def get_lecture_emotions(self,lid):
        return [e for e in self.emotions if e.get("lecture_id")==lid or e.get("course_id")==lid]
    def get_student_emotions(self,sid):
        return [e for e in self.emotions if e.get("student_id")==sid]

    # ── User Management ──────────────────────────────────
    def add_user(self,data):
        for u in self.users:
            if u.get("username")==data.get("username"):
                u.update(data); self._persist(); return True
        self.users.append(data); self._persist(); return True

    def get_user(self,username):
        return next((u for u in self.users if u.get("username")==username),None)

    # ── Exam Results ─────────────────────────────────────
    # Structure: exam_results[student_id][course_id] = {grade, date, added_by}

    def add_exam_result(self, student_id: str, course_id: str,
                        grade: float, doctor_id: str) -> bool:
        """Add or update a grade for a student in a course."""
        if student_id not in self.exam_results:
            self.exam_results[student_id] = {}
        self.exam_results[student_id][course_id] = {
            "grade":    round(float(grade), 1),
            "added_by": doctor_id,
            "date":     datetime.now().strftime("%Y-%m-%d"),
        }
        self._persist()
        return True

    def get_student_results(self, student_id: str) -> dict:
        """Return all results for a student: {course_id: {grade, date, added_by}}"""
        return self.exam_results.get(student_id, {})

    def get_course_results(self, course_id: str) -> dict:
        """Return all results for a course: {student_id: {grade, date, added_by}}"""
        out = {}
        for sid, courses in self.exam_results.items():
            if course_id in courses:
                out[sid] = courses[course_id]
        return out

    # ── Community Chat ────────────────────────────────────
    # Structure: chat_messages[course_id] = [{id, sender, sender_id, role, text, timestamp, type, reactions}]
    # type: "announcement" (doctor only) | "message" (student)

    def post_message(self, course_id: str, sender: str, sender_id: str,
                     role: str, text: str, msg_type: str = "message") -> dict:
        """Post a message to a course chat."""
        if course_id not in self.chat_messages:
            self.chat_messages[course_id] = []
        msg = {
            "id":        f"{course_id}_{len(self.chat_messages[course_id])+1}",
            "sender":    sender,
            "sender_id": sender_id,
            "role":      role,
            "text":      text.strip(),
            "type":      msg_type,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "reactions": {},   # {emoji: [sender_id, ...]}
        }
        self.chat_messages[course_id].append(msg)
        self._persist()
        return msg

    def get_messages(self, course_id: str) -> list:
        """Return all messages for a course, newest last."""
        return self.chat_messages.get(course_id, [])

    def add_reaction(self, course_id: str, msg_id: str,
                     emoji: str, sender_id: str) -> bool:
        """Toggle a reaction on a message."""
        for msg in self.chat_messages.get(course_id, []):
            if msg["id"] == msg_id:
                if emoji not in msg["reactions"]:
                    msg["reactions"][emoji] = []
                if sender_id in msg["reactions"][emoji]:
                    msg["reactions"][emoji].remove(sender_id)
                else:
                    msg["reactions"][emoji].append(sender_id)
                self._persist()
                return True
        return False

    def delete_message(self, course_id: str, msg_id: str) -> bool:
        """Delete a message (doctor or own message only)."""
        msgs = self.chat_messages.get(course_id, [])
        before = len(msgs)
        self.chat_messages[course_id] = [m for m in msgs if m["id"] != msg_id]
        if len(self.chat_messages[course_id]) < before:
            self._persist()
            return True
        return False

    def delete_exam_result(self, student_id: str, course_id: str) -> bool:
        """Delete a specific grade."""
        if (student_id in self.exam_results and
                course_id in self.exam_results[student_id]):
            del self.exam_results[student_id][course_id]
            if not self.exam_results[student_id]:
                del self.exam_results[student_id]
            self._persist()
            return True
        return False