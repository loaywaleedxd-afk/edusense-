import storeData from './data/store.json';
import { STUDENT_CREDS, DOCTOR_CREDS } from './data/credentials.js';
import { api, setToken, clearToken } from './api.js';

const EMOTIONS = ['happy','neutral','confused','bored','surprise','sad','angry','fear'];
const DEPARTMENTS = ['Computer Science','Engineering','Mathematics','Physics','Data Science'];
const TITLES = ['Professor','Associate Professor','Lecturer','Assistant Professor'];
const COURSE_DATA = [
  ['Artificial Intelligence','CS401','Hall A','#3b82f6'],
  ['Machine Learning','CS402','Hall B','#8b5cf6'],
  ['Data Science','CS403','Lab 1','#10b981'],
  ['Computer Vision','CS404','Lab 2','#f59e0b'],
  ['Deep Learning','CS405','Hall C','#06b6d4'],
];

function seededRandom(seed){
  let s=seed;
  return ()=>{s=(s*16807+0)%2147483647;return(s-1)/2147483646;};
}

function normalizeStudent(s) {
  return {
    id: s.id,
    name: s.name || '',
    emoji: s.emoji || '👦',
    color: s.color || '#3b82f6',
    dept: s.dept || 'Computer Science',
    year: s.year || 1,
    email: s.email || '',
    phone: s.phone || '',
    emotion: s.emotion || 'neutral',
    attention: s.attention || 'moderate',
    engagement: s.engagement ?? 50,
    attentionScore: s.attention_score ?? s.attentionScore ?? 50,
    attendanceRate: s.attendance_rate ?? s.attendanceRate ?? 0,
    gpa: s.gpa ?? 0,
    present: s.present ?? false,
    confidence: s.confidence ?? 0,
    hasFace: s.has_face ?? s.hasFace ?? false,
    registeredAt: s.registered_at ?? s.registeredAt ?? '',
  };
}

function normalizeDoctor(d) {
  return {
    id: d.id,
    name: d.name || '',
    emoji: d.emoji || '👨‍🏫',
    color: d.color || '#3b82f6',
    dept: d.dept || 'Computer Science',
    title: d.title || 'Lecturer',
    email: d.email || '',
    phone: d.phone || '',
    courses: d.courses ?? 0,
    students: d.students ?? 0,
    engagement: d.engagement ?? 0,
    hasFace: d.has_face ?? d.hasFace ?? false,
  };
}

// Extract numeric ID from a student's email prefix for photo lookup
// e.g. "231014184.0@university.edu" → "231014184.0"
function emailToNumericId(email) {
  if (!email) return null;
  return email.split('@')[0];
}

class DataStore {
  constructor(){
    this._rng = seededRandom(42);
    this._initDefaults();
    this._loadPersisted();
    this._initEnrollments(); // run after localStorage restore to fix stale low-count data
    this._syncStats();
  }

  _ri(a,b){ return Math.floor(this._rng()*(b-a+1))+a; }
  _rf(a,b){ return +(this._rng()*(b-a)+a).toFixed(2); }
  _choice(arr){ return arr[Math.floor(this._rng()*arr.length)]; }

  _initDefaults(){
    this.students = this._loadStudents();
    this.doctors  = this._loadDoctors();
    this.lectures = this._makeLectures();
    this.courses  = this._makeCourses();
    this.courseEnrollments = {};
    this.attendance = {};
    this.emotions  = [];
    this.emotionDist = this._makeEmoDist();
    this.trendData = this._makeTrend();
    this.alerts   = this._makeAlerts();
    this.users    = this._makeUsers();
    this.currentWeek = 1;
    this.examResults = {};
    this.chatMessages = {};
    this.complaints = [];
    this.registrationStatus = { open: true, semester: 'Fall 2024', deadline: '2024-12-15' };
    this.studentFees = {};
    this.courseWaitlists = {};
    this.announcements = [];
    this.examSchedule = [];
    this.courseResources = [];
    this.assignments = [];
    this.submissions = [];
    this.qrSessions = {};
  }

  _loadStudents(){
    if (!storeData?.students?.length) return this._makeFallbackStudents();
    // Filter out garbage test entries (no real name or obviously test data)
    const real = storeData.students.filter(s =>
      s.id && s.name && s.name.length > 1 &&
      !['gcghfh','alia waleed','loay nabil','ziad hamam','mahmoud amr',
        'lily sadek','judy essam'].includes(s.name.toLowerCase())
    );
    return real.map(normalizeStudent);
  }

  _loadDoctors(){
    // Use just the 4 canonical doctors from CSV credentials (D001-D004)
    return DOCTOR_CREDS.map((dc, i) => ({
      id: `D00${i+1}`,
      name: dc.name,
      emoji: i % 2 === 0 ? '👨‍🏫' : '👩‍🏫',
      color: ['#3b82f6','#8b5cf6','#10b981','#f59e0b'][i],
      dept: dc.dept,
      title: dc.title,
      email: dc.email,
      phone: dc.phone,
      courses: 0,
      students: 0,
      engagement: 0,
      hasFace: false,
    }));
  }

  _makeFallbackStudents(){
    const NAMES=[
      ['Sara Johnson','👩','#3b82f6'],['Ahmed Hassan','👦','#10b981'],
      ['Nour Ali','👩','#8b5cf6'],['Mohamed Karim','👦','#f59e0b'],
      ['Layla Ibrahim','👩','#ef4444'],['Omar Salah','👦','#06b6d4'],
      ['Fatima Zahra','👩','#ec4899'],['Yusuf Ahmad','👦','#10b981'],
      ['Hana Mostafa','👩','#3b82f6'],['Tariq Nasser','👦','#8b5cf6'],
      ['Rania Said','👩','#f59e0b'],['Khalid Faris','👦','#ef4444'],
      ['Dina Wael','👩','#06b6d4'],['Sami Lotfy','👦','#ec4899'],
      ['Aya Ramadan','👩','#10b981'],
    ];
    return NAMES.map(([name,emoji,color],i)=>({
      id:`S${String(i+1).padStart(3,'0')}`,name,emoji,color,
      dept:DEPARTMENTS[i%DEPARTMENTS.length],year:(i%4)+1,
      email:`${name.split(' ')[0].toLowerCase()}@university.edu`,phone:'',
      emotion:EMOTIONS[i%EMOTIONS.length],attention:['attentive','moderate','distracted'][i%3],
      engagement:this._ri(40,95),attentionScore:this._ri(35,90),
      attendanceRate:this._ri(65,100),gpa:+this._rf(2.0,4.0).toFixed(1),
      present:i<12,confidence:this._rf(0.65,0.97),hasFace:false,registeredAt:'',
    }));
  }

  _makeLectures(){
    const times   = ['09:00','11:00','13:00','15:00','17:00'];
    const doctors = ['Dr. Ahmed Smith','Dr. Laila Hassan','Dr. Khalid Omar','Dr. Sara Nour','Dr. Ahmed Smith'];
    const docIds  = ['D001','D002','D003','D004','D001'];
    // Each course meets on two weekdays (JS: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu)
    const courseDays      = [[0,3],[1,4],[2,4],[0,3],[1,3]]; // Sun&Wed, Mon&Thu, Tue&Thu, Sun&Wed, Mon&Wed
    const courseDaysLabel = ['Sun & Wed','Mon & Thu','Tue & Thu','Sun & Wed','Mon & Wed'];
    const now    = new Date();
    const today  = now.getDay();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const getStatus = (time, days) => {
      if (!days.includes(today)) return 'scheduled';
      const [h, m] = time.split(':').map(Number);
      const start  = h * 60 + m;
      if (nowMin >= start && nowMin < start + 90) return 'active';
      return 'scheduled';
    };
    return COURSE_DATA.map(([name,code,room,color],i)=>({
      id:`L${String(i+1).padStart(3,'0')}`,name,code,room,color,
      time:times[i],duration:90,
      days:courseDays[i],daysLabel:courseDaysLabel[i],
      status:getStatus(times[i],courseDays[i]),
      students:this._ri(28,48),present:this._ri(20,40),
      avgEngagement:this._ri(50,90),avgAttention:this._ri(45,85),
      dominantEmotion:EMOTIONS[i%EMOTIONS.length],
      doctor:doctors[i],doctorId:docIds[i],
    }));
  }

  _makeCourses(){
    const doctors     = ['D001','D002','D003','D004','D001'];
    const dnames      = ['Dr. Ahmed Smith','Dr. Laila Hassan','Dr. Khalid Omar','Dr. Sara Nour','Dr. Ahmed Smith'];
    const times       = ['09:00','11:00','13:00','15:00','17:00'];
    const courseDays  = [[0,3],[1,4],[2,4],[0,3],[1,3]];
    const daysLabels  = ['Sun & Wed','Mon & Thu','Tue & Thu','Sun & Wed','Mon & Wed'];
    return COURSE_DATA.map(([name,code,room,color],i)=>({
      id:code,name,code,room,color,
      time:times[i],duration:90,
      days:courseDays[i],daysLabel:daysLabels[i],
      doctorId:doctors[i],doctorName:dnames[i],
      weeks:Array.from({length:16},(_,k)=>k+1),
      semester:'Fall 2024',enrolledCount:0,capacity:300,
    }));
  }

  _initEnrollments(){
    const n = this.courses.length || 1;
    // Each student is enrolled in 4 out of 5 courses (skip exactly 1 per student
    // determined by (studentIndex + courseIndex) % n === 0). This guarantees
    // every student sees courses, and each course has ~80% of all students.
    const needsReset = this.courses.some(c =>
      !this.courseEnrollments[c.id] || this.courseEnrollments[c.id].length < 50
    );
    if (!needsReset) return;
    this.courses.forEach((course, ci) => {
      this.courseEnrollments[course.id] = this.students
        .filter((_, si) => (si + ci) % n !== 0)
        .map(s => s.id);
    });
  }

  _syncStats(){
    // Sync course enrolledCount and ensure weeks is always full 16
    this.courses.forEach(c => {
      c.enrolledCount = (this.courseEnrollments[c.id] || []).length;
      if (!c.weeks || c.weeks.length < 16) {
        c.weeks = Array.from({length: 16}, (_, k) => k + 1);
      }
    });
    // Compute doctor stats dynamically from actual courses + enrollments
    this.doctors.forEach(d => {
      const docCourses = this.courses.filter(c => c.doctorId === d.id);
      const studentIds = new Set();
      docCourses.forEach(c => {
        (this.courseEnrollments[c.id] || []).forEach(sid => studentIds.add(sid));
      });
      const stuList = this.students.filter(s => studentIds.has(s.id));
      d.courses    = docCourses.length;
      d.students   = studentIds.size;
      d.engagement = stuList.length
        ? Math.round(stuList.reduce((a, s) => a + (s.attendanceRate ?? s.engagement ?? 0), 0) / stuList.length)
        : 0;
    });
    // Recompute aggregates so they reflect actual student data after localStorage restore
    this.emotionDist = this._makeEmoDist();
    this.trendData   = this._makeTrend();
    this.alerts      = this._makeAlerts();
  }

  _makeUsers(){
    // IMPORTANT: change these passwords before deploying to production.
    // Use environment variables or a secure vault — never commit real credentials.
    const users = [
      {username:'admin',password:'Admin@EduSense2025!',role:'admin',name:'System Administrator',email:'admin@university.edu'},
      {username:'parent',password:'Parent@EduSense2025!',role:'parent',name:'Parent User',email:'parent@university.edu',studentId:this.students[0]?.id||'S001'},
    ];

    // Doctor accounts
    DOCTOR_CREDS.forEach((dc, i) => {
      users.push({
        username: dc.username,
        password: dc.password,
        role: 'doctor',
        name: dc.name,
        email: dc.email,
        doctorId: `D00${i+1}`,
      });
    });

    // Student accounts — match username to student record via email prefix
    STUDENT_CREDS.forEach(sc => {
      const normalizedId = sc.username.replace(/\.0$/, '');
      const student = this.students.find(s => {
        const emailId = (s.email || '').split('@')[0];
        return emailId === sc.username ||
               emailId === normalizedId ||
               emailId.replace(/\.0$/, '') === normalizedId;
      });
      users.push({
        username: sc.username,
        password: sc.password,
        role: 'student',
        name: sc.name || (student?.name ?? sc.username),
        email: `${sc.username}@university.edu`,
        studentId: student?.id || '',
      });
    });

    return users;
  }

  _emoColor(e){
    return {happy:'#10b981',neutral:'#6366f1',confused:'#8b5cf6',bored:'#64748b',
            surprise:'#f59e0b',sad:'#475569',angry:'#ef4444',fear:'#f97316'}[e]||'#64748b';
  }

  _makeEmoDist(){
    // Count actual student emotions from store data
    const counts = {};
    this.students.forEach(s => {
      const e = (s.emotion || 'neutral').toLowerCase();
      counts[e] = (counts[e] || 0) + 1;
    });
    const total = this.students.length || 1;
    const order = ['neutral','happy','confused','bored','surprise','sad','angry','fear'];
    return order
      .map(e => ({ emotion:e, count:counts[e]||0, pct:Math.round(((counts[e]||0)/total)*100), color:this._emoColor(e) }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  _makeTrend(){
    // Base on actual student averages, vary ±8 per week via seeded RNG
    const total = this.students.length || 1;
    const avgEng = Math.round(this.students.reduce((a,s)=>a+(s.engagement||70),0)/total);
    const avgAtt = Math.round(this.students.reduce((a,s)=>a+(s.attendanceRate||75),0)/total);
    return {
      labels:     Array.from({length:16}, (_,i) => `W${i+1}`),
      engagement: Array.from({length:16}, () => Math.min(100,Math.max(30, avgEng + this._ri(-8,8)))),
      attention:  Array.from({length:16}, () => Math.min(100,Math.max(25, avgAtt + this._ri(-10,10)))),
    };
  }

  _makeAlerts(){
    const alerts = [];
    const lowEng = this.students.filter(s=>(s.engagement||100)<45).slice(0,2);
    lowEng.forEach(s=>{
      const course = this.courses[0];
      alerts.push({type:'warning',msg:`Engagement dropped below 45%`,student:s.name,
        lecture:course?.code||'CS401',severity:'Warning',time:'10:23',details:`Engagement at ${s.engagement}%`});
    });
    const lowAtt = this.students.filter(s=>(s.attendanceRate||100)<60).slice(0,2);
    lowAtt.forEach(s=>{
      const course = this.courses[2];
      alerts.push({type:'critical',msg:`Critical attendance alert`,student:s.name,
        lecture:course?.code||'CS403',severity:'Critical',time:'13:05',details:`Attendance at ${s.attendanceRate}%`});
    });
    if(!alerts.length){
      const s0=this.students[0];
      alerts.push({type:'info',msg:'System running normally',student:s0?.name||'—',
        lecture:'—',severity:'Info',time:'—',details:'All metrics within normal range'});
    }
    return alerts.slice(0,4);
  }

  // Returns the URL to display a student's photo, or null if not available
  getPhotoUrl(student){
    if (!student?.email) return null;
    const emailId = student.email.split('@')[0];
    if (!emailId || emailId.includes('@') || emailId.length < 5) return null;
    return `/student_photos/${emailId}.jpg`;
  }

  _loadPersisted(){
    try {
      const raw = localStorage.getItem('edusense_store');
      if(!raw) return;
      const data = JSON.parse(raw);
      if(data.examResults) Object.assign(this.examResults, data.examResults);
      if(data.chatMessages) Object.assign(this.chatMessages, data.chatMessages);
      if(data.students){
        const map = {};
        data.students.forEach(s=>{ map[s.id]=s; });
        this.students.forEach(s=>{ if(map[s.id]) Object.assign(s,map[s.id]); });
        data.students.forEach(s=>{ if(!this.students.find(x=>x.id===s.id)) this.students.push(s); });
      }
      if(data.doctors){
        const map = {};
        data.doctors.forEach(d=>{ map[d.id]=d; });
        this.doctors.forEach(d=>{ if(map[d.id]) Object.assign(d,map[d.id]); });
        data.doctors.forEach(d=>{ if(!this.doctors.find(x=>x.id===d.id)) this.doctors.push(d); });
      }
      if(data.courses){
        const map = {};
        data.courses.forEach(c=>{ map[c.id]=c; });
        this.courses.forEach(c=>{ if(map[c.id]) Object.assign(c,map[c.id]); });
        data.courses.forEach(c=>{ if(!this.courses.find(x=>x.id===c.id)) this.courses.push(c); });
      }
      if(data.courseEnrollments) Object.assign(this.courseEnrollments, data.courseEnrollments);
      if(data.attendance) Object.assign(this.attendance, data.attendance);
      if(data.systemAlerts) this.systemAlerts = data.systemAlerts;
      if(data.complaints) this.complaints = data.complaints;
      if(data.registrationStatus) Object.assign(this.registrationStatus, data.registrationStatus);
      if(data.studentFees) this.studentFees = data.studentFees;
      if(data.courseWaitlists) this.courseWaitlists = data.courseWaitlists;
      if(data.announcements) this.announcements = data.announcements;
      if(data.examSchedule) this.examSchedule = data.examSchedule;
      if(data.courseResources) this.courseResources = data.courseResources;
      if(data.assignments) this.assignments = data.assignments;
      if(data.submissions) this.submissions = data.submissions;
      if(data.qrSessions) Object.assign(this.qrSessions, data.qrSessions);
    } catch(e){ console.warn('DataStore load error',e); }
  }

  _persist(){
    try {
      localStorage.setItem('edusense_store', JSON.stringify({
        students: this.students,
        doctors: this.doctors,
        courses: this.courses,
        courseEnrollments: this.courseEnrollments,
        attendance: this.attendance,
        examResults: this.examResults,
        chatMessages: this.chatMessages,
        systemAlerts: this.systemAlerts,
        complaints: this.complaints,
        registrationStatus: this.registrationStatus,
        studentFees: this.studentFees,
        courseWaitlists: this.courseWaitlists,
        announcements: this.announcements,
        examSchedule: this.examSchedule,
        courseResources: this.courseResources,
        assignments: this.assignments,
        submissions: this.submissions,
        qrSessions: this.qrSessions || {},
      }));
    } catch(e){ console.warn('DataStore persist error',e); }
  }

  /** Authenticate — tries the real backend first, falls back to local auth. */
  async authenticate(username, password){
    try {
      const result = await api.login(username, password);
      setToken(result.token);
      // Bulk-load all user-relevant data from the backend
      try {
        const initData = await api.init();
        this._loadFromAPI(initData);
      } catch(e){ console.warn('[dataStore] init load failed:', e.message); }
      const u = result.user;
      const nameParts = (u.name||u.username).split(' ');
      let photoUrl = null;
      if (u.role === 'student') {
        const s = this.getStudent(u.id) || this.students.find(x=>x.email?.startsWith(u.username));
        if (s) photoUrl = this.getPhotoUrl(s);
      }
      return {
        username: u.username, name: u.name||u.username, role: u.role,
        email: u.email||'', id: u.id||'ADM',
        studentId: u.role==='student' ? (u.id||'') : '',
        doctorId:  u.role==='doctor'  ? (u.id||'') : '',
        initials:  nameParts.slice(0,2).map(w=>w[0]?.toUpperCase()||'').join(''),
        photoUrl,
      };
    } catch(apiErr){
      // Backend unreachable — fall back to local credential check
      console.warn('[dataStore] Backend login failed, using local auth:', apiErr.message);
      const u = this.users.find(u=>
        u.username.toLowerCase()===username.toLowerCase().trim() &&
        u.password===password.trim()
      );
      if(!u) return null;
      const nameParts = (u.name||u.username).split(' ');
      let photoUrl = null;
      if (u.role === 'student' && u.studentId) {
        const s = this.getStudent(u.studentId);
        if (s) photoUrl = this.getPhotoUrl(s);
      }
      return {
        username:u.username, name:u.name||u.username, role:u.role,
        email:u.email||'', id:u.studentId||u.doctorId||'ADM',
        studentId:u.studentId||'', doctorId:u.doctorId||'',
        initials:nameParts.slice(0,2).map(w=>w[0]?.toUpperCase()||'').join(''),
        photoUrl,
      };
    }
  }

  /** Clear JWT token on logout. */
  signOut(){ clearToken(); }

  nextStudentId(){
    const nums = this.students.map(s=>parseInt(s.id.replace(/\D/g,''))||0);
    return `S${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
  }

  addStudent(data){
    const sid = this.nextStudentId();
    const colors=['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
    const s={id:sid,name:data.name||'New Student',emoji:['👦','👩'][Math.floor(Math.random()*2)],
      color:colors[Math.floor(Math.random()*colors.length)],dept:data.dept||DEPARTMENTS[0],
      year:parseInt(data.year)||1,email:data.email||'',phone:data.phone||'',
      emotion:'neutral',attention:'moderate',engagement:50,attentionScore:50,
      attendanceRate:0,gpa:0,present:false,confidence:0,hasFace:false,registeredAt:''};
    this.students.push(s); this._persist(); return s;
  }

  updateStudent(sid,data){ const s=this.students.find(x=>x.id===sid); if(s){Object.assign(s,data);this._persist();} return s||null; }
  deleteStudent(sid){ const n=this.students.length; this.students=this.students.filter(x=>x.id!==sid); if(this.students.length<n){this._persist();return true;} return false; }
  getStudent(sid){ return this.students.find(x=>x.id===sid)||null; }

  nextDoctorId(){
    const nums = this.doctors.map(d=>parseInt(d.id.slice(1))||0);
    return `D${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
  }

  addDoctor(data){
    const did = this.nextDoctorId();
    const colors=['#3b82f6','#8b5cf6','#10b981','#f59e0b'];
    const d={id:did,name:data.name||'New Doctor',emoji:['👨‍🏫','👩‍🏫'][Math.floor(Math.random()*2)],
      color:colors[Math.floor(Math.random()*colors.length)],dept:data.dept||DEPARTMENTS[0],
      title:data.title||'Lecturer',email:data.email||'',phone:data.phone||'',
      courses:0,students:0,engagement:0,hasFace:false};
    this.doctors.push(d); this._persist(); return d;
  }

  deleteDoctor(did){ const n=this.doctors.length; this.doctors=this.doctors.filter(x=>x.id!==did); if(this.doctors.length<n){this._persist();return true;} return false; }
  getDoctor(did){ return this.doctors.find(x=>x.id===did)||null; }
  getDoctorCourses(doctorId){ return this.courses.filter(c=>c.doctorId===doctorId); }

  addCourse(data){
    const code=(data.code||`C${String(this.courses.length+1).padStart(3,'0')}`).toUpperCase();
    const doctor = this.getDoctor(data.doctorId||'');
    const days = Array.isArray(data.days) && data.days.length ? data.days : [1,4];
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daysLabel = days.map(d=>DAY_NAMES[d]).join(' & ');
    const course={id:code,name:data.name||'New Course',code,room:data.room||'',
      color:data.color||'#3b82f6',time:data.time||'09:00',duration:parseInt(data.duration)||90,
      doctorId:data.doctorId||'',doctorName:doctor?doctor.name:'Unassigned',
      days, daysLabel,
      weeks:data.weeks||Array.from({length:16},(_,k)=>k+1),
      semester:data.semester||'Fall 2024',enrolledCount:0};
    this.courses.push(course); this.courseEnrollments[code]=[]; this._persist(); return course;
  }

  updateCourse(courseId,data){
    const c=this.courses.find(x=>x.id===courseId);
    if(c){ Object.assign(c,data); if(data.doctorId){const d=this.getDoctor(data.doctorId);c.doctorName=d?d.name:'Unassigned';} this._persist(); }
    return c||null;
  }

  deleteCourse(courseId){
    const n=this.courses.length; this.courses=this.courses.filter(x=>x.id!==courseId);
    if(this.courses.length<n){delete this.courseEnrollments[courseId];this._persist();return true;} return false;
  }

  getCourse(id){ return this.courses.find(x=>x.id===id)||null; }

  enrollStudent(courseId,studentId){
    if(!this.courseEnrollments[courseId]) this.courseEnrollments[courseId]=[];
    if(!this.courseEnrollments[courseId].includes(studentId)){
      this.courseEnrollments[courseId].push(studentId);
      const c=this.getCourse(courseId); if(c) c.enrolledCount=this.courseEnrollments[courseId].length;
      this._persist(); return true;
    }
    return false;
  }

  unenrollStudent(courseId,studentId){
    if(this.courseEnrollments[courseId]?.includes(studentId)){
      this.courseEnrollments[courseId]=this.courseEnrollments[courseId].filter(x=>x!==studentId);
      const c=this.getCourse(courseId); if(c) c.enrolledCount=this.courseEnrollments[courseId].length;
      this._persist(); return true;
    }
    return false;
  }

  getEnrolledStudents(courseId){ const ids=this.courseEnrollments[courseId]||[]; return this.students.filter(s=>ids.includes(s.id)); }
  getUnenrolledStudents(courseId){ const ids=new Set(this.courseEnrollments[courseId]||[]); return this.students.filter(s=>!ids.has(s.id)); }
  getStudentCourses(studentId){ return Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>this.getCourse(cid)).filter(Boolean); }

  _attKey(courseId,week){ return `${courseId}_W${String(week).padStart(2,'0')}`; }

  markAttendance(courseId,studentId,confidence=1.0,method='manual',week=null){
    const w=week||this.currentWeek; const key=this._attKey(courseId,w);
    if(!this.attendance[key]) this.attendance[key]={};
    if(!this.attendance[key][studentId]){
      this.attendance[key][studentId]={studentId,courseId,week:w,time:new Date().toTimeString().slice(0,8),date:new Date().toISOString().slice(0,10),method,confidence:+confidence.toFixed(3),status:'present'};
      this._persist(); return true;
    }
    return false;
  }

  getAttendance(courseId,week=null){
    if(week!==null) return this.attendance[this._attKey(courseId,week)]||{};
    const result={};
    Object.entries(this.attendance).forEach(([key,recs])=>{ if(key.startsWith(`${courseId}_W`)) Object.assign(result,recs); });
    return result;
  }

  getStudentAttendance(studentId){ return Object.values(this.attendance).flatMap(recs=>Object.entries(recs).filter(([sid])=>sid===studentId).map(([,rec])=>rec)); }
  getStudentCourseAttendance(studentId,courseId){ const result={}; for(let w=1;w<=16;w++){const key=this._attKey(courseId,w);if(this.attendance[key]?.[studentId]) result[w]=this.attendance[key][studentId];} return result; }

  addExamResult(studentId,courseId,grade,doctorId){
    if(!this.examResults[studentId]) this.examResults[studentId]={};
    this.examResults[studentId][courseId]={grade:+parseFloat(grade).toFixed(1),addedBy:doctorId,date:new Date().toISOString().slice(0,10)};
    this._callAPI(()=>api.saveCourseGrade({student_id:studentId,course_code:courseId,course_name:this.getCourse(courseId)?.name||courseId,grade:+parseFloat(grade).toFixed(1),doctor_id:doctorId}));
    // Notify student — skip when called from system/bulk publish to avoid spamming
    if(doctorId && doctorId!=='system' && doctorId!=='publish'){
      const course=this.getCourse(courseId);
      const g=+parseFloat(grade).toFixed(1);
      this.addAlert({alertKind:'grade',type:'info',studentId,courseId,
        title:`Grade Posted — ${course?.name||courseId}`,
        message:`Your grade of ${g}% has been posted for ${course?.name||courseId}.`});
    }
    this._persist(); return true;
  }

  getStudentResults(studentId){ return this.examResults[studentId]||{}; }
  getCourseResults(courseId){ const out={}; Object.entries(this.examResults).forEach(([sid,courses])=>{ if(courses[courseId]) out[sid]=courses[courseId]; }); return out; }
  deleteExamResult(studentId,courseId){ if(this.examResults[studentId]?.[courseId]){delete this.examResults[studentId][courseId];if(!Object.keys(this.examResults[studentId]).length)delete this.examResults[studentId];this._persist();return true;} return false; }

  postMessage(courseId,sender,senderId,role,text,type='message'){
    if(!this.chatMessages[courseId]) this.chatMessages[courseId]=[];
    const msg={id:`${courseId}_${this.chatMessages[courseId].length+1}`,sender,senderId,role,text:text.trim(),type,timestamp:new Date().toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),reactions:{}};
    this.chatMessages[courseId].push(msg);
    this._callAPI(()=>api.sendMessage({course_code:courseId,sender_id:senderId,sender_name:sender,sender_role:role,text:text.trim()}));
    this._persist(); return msg;
  }

  getMessages(courseId){ return this.chatMessages[courseId]||[]; }

  addReaction(courseId,msgId,emoji,senderId){
    const msgs=this.chatMessages[courseId]||[];
    const msg=msgs.find(m=>m.id===msgId);
    if(msg){
      if(!msg.reactions[emoji]) msg.reactions[emoji]=[];
      const idx=msg.reactions[emoji].indexOf(senderId);
      if(idx>=0) msg.reactions[emoji].splice(idx,1); else msg.reactions[emoji].push(senderId);
      this._persist(); return true;
    }
    return false;
  }

  deleteMessage(courseId,msgId){
    const before=(this.chatMessages[courseId]||[]).length;
    if(this.chatMessages[courseId]) this.chatMessages[courseId]=this.chatMessages[courseId].filter(m=>m.id!==msgId);
    if((this.chatMessages[courseId]||[]).length<before){this._persist();return true;} return false;
  }

  addUser(data){
    const existing=this.users.find(u=>u.username===data.username);
    if(existing) Object.assign(existing,data); else this.users.push(data);
    this._persist(); return true;
  }

  getUser(username){ return this.users.find(u=>u.username===username)||null; }

  // ── ABSENCE EXCUSES ──────────────────────────────────────────────────────
  submitExcuse(data){
    if(!this.excuses) this.excuses=[];
    const ex={
      id:`EX${Date.now()}`,
      studentId:data.studentId, studentName:data.studentName,
      courseId:data.courseId, courseName:data.courseName,
      week:data.week, reason:data.reason,
      status:'pending', submittedAt:new Date().toISOString(),
      reviewedAt:null, reviewedBy:null,
    };
    this.excuses.push(ex); this._persist(); return ex;
  }

  updateExcuse(id, status, reviewedBy){
    if(!this.excuses) this.excuses=[];
    const ex=this.excuses.find(e=>e.id===id);
    if(ex){
      ex.status=status; ex.reviewedAt=new Date().toISOString(); ex.reviewedBy=reviewedBy;
      if(status==='approved'){
        this.markAttendance(ex.courseId, ex.studentId, 1.0, 'excused', ex.week);
        const key=this._attKey(ex.courseId, ex.week);
        if(this.attendance[key]?.[ex.studentId]) this.attendance[key][ex.studentId].status='excused';
      }
      this._persist(); return true;
    }
    return false;
  }

  getExcuses(courseId=null){
    if(!this.excuses) this.excuses=[];
    return courseId ? this.excuses.filter(e=>e.courseId===courseId) : this.excuses;
  }

  getStudentExcuses(studentId){
    if(!this.excuses) this.excuses=[];
    return this.excuses.filter(e=>e.studentId===studentId);
  }

  // ── GRADE WEIGHTS & COMPONENTS ───────────────────────────────────────────
  setGradeWeights(courseId, weights){
    if(!this.gradeWeights) this.gradeWeights={};
    this.gradeWeights[courseId]=weights; this._persist();
  }

  getGradeWeights(courseId){
    if(!this.gradeWeights) this.gradeWeights={};
    return this.gradeWeights[courseId]||{midterm:30,final:50,assignments:15,attendance:5};
  }

  setGradeComponents(studentId, courseId, components){
    if(!this.gradeComponents) this.gradeComponents={};
    if(!this.gradeComponents[studentId]) this.gradeComponents[studentId]={};
    this.gradeComponents[studentId][courseId]=components;
    // Auto-calculate final grade
    const w=this.getGradeWeights(courseId);
    const c=components;
    const grade=+(
      (c.midterm??0)*(w.midterm/100)+
      (c.final??0)*(w.final/100)+
      (c.assignments??0)*(w.assignments/100)+
      (c.attendance??0)*(w.attendance/100)
    ).toFixed(1);
    this.addExamResult(studentId, courseId, grade, 'system');
    this._persist();
  }

  getGradeComponents(studentId, courseId){
    if(!this.gradeComponents) this.gradeComponents={};
    return this.gradeComponents[studentId]?.[courseId]||null;
  }

  // ── QR ATTENDANCE SESSIONS ────────────────────────────────────────────────
  createQRSession(courseId, week){
    const token=Math.random().toString(36).slice(2,8).toUpperCase();
    this.qrSessions[token]={courseId, week, createdAt:new Date().toISOString(), usedBy:[]};
    this._persist(); return token;
  }

  useQRToken(token, studentId){
    // Always pull the latest sessions from localStorage so codes created in
    // another tab (e.g. Doctor's tab) are visible here immediately.
    try {
      const raw=localStorage.getItem('edusense_store');
      if(raw){ const d=JSON.parse(raw); if(d.qrSessions) Object.assign(this.qrSessions,d.qrSessions); }
    } catch(e){}
    const s=this.qrSessions[token];
    if(!s) return {ok:false, error:'Invalid code'};
    const age=(Date.now()-new Date(s.createdAt).getTime())/60000;
    if(age>90) return {ok:false, error:'Code expired (valid for 90 min)'};
    if(s.usedBy.includes(studentId)) return {ok:false, error:'Already checked in'};
    s.usedBy.push(studentId);
    this.markAttendance(s.courseId, studentId, 1.0, 'qr', s.week);
    this._persist();
    return {ok:true, courseId:s.courseId, week:s.week};
  }

  // ── ATTENDANCE ALERT ENGINE ───────────────────────────────────────────────
  // Called when a student logs in. Checks every enrolled course and fires
  // a warning / danger alert if their attendance is below threshold.
  // Deduplicates: only one alert per student+course per calendar day.
  checkAttendanceAlerts(studentId){
    const WARN_PCT  = 75;  // below this → warning
    const CRIT_PCT  = 60;  // below this → critical
    const today     = new Date().toISOString().slice(0,10);
    const courses   = this.getStudentCourses(studentId);
    const stu       = this.getStudent(studentId);
    const newAlerts = [];

    const overallRate = stu?.attendanceRate ?? 0;

    // Remove stale attendance alerts for this student so outdated ones don't linger
    if (this.systemAlerts) {
      this.systemAlerts = this.systemAlerts.filter(a =>
        !(a.studentId === studentId && a.alertKind === 'attendance')
      );
    }

    courses.forEach((course, i) => {
      const recs       = this.getStudentCourseAttendance(studentId, course.id);
      const recorded   = Object.keys(recs).length;
      const totalWeeks = Math.max(1, course.weeks?.length || 16);

      let attended, pct;
      if (recorded > 0) {
        attended = Object.values(recs).filter(r => r.status === 'present' || r.status === 'excused').length;
        pct = Math.round((attended / totalWeeks) * 100);
      } else {
        // No real records — use overall rate directly so alert logic matches the displayed stat
        pct = Math.round(overallRate);
        attended = Math.round(pct / 100 * totalWeeks);
      }

      if (pct >= WARN_PCT) return; // fine, skip

      // Dedup: skip if we already fired this alert today
      const existing = (this.systemAlerts || []).find(a =>
        a.studentId === studentId &&
        a.courseId  === course.id &&
        a.alertKind === 'attendance' &&
        a.createdAt?.slice(0,10) === today
      );
      if (existing) return;

      const isCritical = pct < CRIT_PCT;
      const alert = this.addAlert({
        type:      isCritical ? 'danger' : 'warning',
        title:     isCritical
          ? `Critical Attendance — ${course.name}`
          : `Low Attendance Warning — ${course.name}`,
        message:   `You have attended ${attended} of ${totalWeeks} weeks (${pct}%). ` +
                   (isCritical
                     ? 'You are at serious risk of failing due to absences. Immediate action required.'
                     : 'Your attendance is below the 75% minimum required. Please attend upcoming sessions.'),
        studentId,
        courseId:  course.id,
        alertKind: 'attendance',
        pct,
        attended,
        totalWeeks,
      });
      newAlerts.push(alert);
    });

    return newAlerts;
  }

  // Returns only attendance alerts for a specific student (for the banner)
  getStudentAttendanceAlerts(studentId){
    if(!this.systemAlerts) return [];
    return this.systemAlerts.filter(a =>
      a.studentId === studentId && a.alertKind === 'attendance' && !a.read
    );
  }

  // ── SYSTEM ALERTS ─────────────────────────────────────────────────────────
  addAlert(data){
    if(!this.systemAlerts) this.systemAlerts=[];
    const alert={
      ...data,
      id:`AL${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      type:data.type||'info',
      studentId:data.studentId||null, courseId:data.courseId||null,
      read:false, createdAt:new Date().toISOString(),
    };
    this.systemAlerts.unshift(alert);
    if(this.systemAlerts.length>100) this.systemAlerts=this.systemAlerts.slice(0,100);
    this._callAPI(()=>api.addNotification({id:alert.id,type:alert.type,title:alert.title,message:alert.message,studentId:alert.studentId,doctorId:alert.doctorId,courseId:alert.courseId,alertKind:alert.alertKind,createdAt:alert.createdAt}));
    this._persist(); return alert;
  }

  getAlerts(unreadOnly=false){
    if(!this.systemAlerts) this.systemAlerts=[];
    return unreadOnly ? this.systemAlerts.filter(a=>!a.read) : this.systemAlerts;
  }

  markAlertRead(id){
    if(!this.systemAlerts) this.systemAlerts=[];
    const a=this.systemAlerts.find(x=>x.id===id);
    if(a){a.read=true; this._persist(); return true;} return false;
  }

  markAllAlertsRead(){
    if(!this.systemAlerts) this.systemAlerts=[];
    this.systemAlerts.forEach(a=>a.read=true); this._persist();
  }

  clearAlert(id){
    if(!this.systemAlerts) this.systemAlerts=[];
    this.systemAlerts=this.systemAlerts.filter(a=>a.id!==id); this._persist();
  }
  // ── COMPLAINTS ──
  submitComplaint(data){
    const c={id:`CP${Date.now()}`,studentId:data.studentId,studentName:data.studentName||'',
      type:data.type||'general',courseId:data.courseId||'',courseName:data.courseName||'',
      description:data.description||'',status:'pending',
      doctorId:data.doctorId||'',doctorResponse:'',adminResponse:'',
      createdAt:new Date().toISOString().slice(0,10),updatedAt:new Date().toISOString().slice(0,10)};
    this.complaints.push(c);
    this._callAPI(()=>api.upsertComplaint({id:c.id,studentId:c.studentId,studentName:c.studentName,type:c.type,courseId:c.courseId,courseName:c.courseName,description:c.description,status:c.status,doctorId:c.doctorId,doctorResponse:'',adminResponse:'',createdAt:c.createdAt,updatedAt:c.updatedAt}));
    // Notify doctor of new appeal
    if(data.doctorId){
      this.addAlert({alertKind:'new_appeal',type:'warning',doctorId:data.doctorId,studentId:null,
        title:`New Appeal — ${data.studentName||'Student'}`,
        message:`${data.studentName} submitted a ${(data.type||'').replace(/_/g,' ')} for ${data.courseName||'a course'}.`});
    }
    this._persist(); return c;
  }
  updateComplaint(id,updates){
    const c=this.complaints.find(x=>x.id===id);
    if(c){
      const prevStatus=c.status;
      Object.assign(c,updates,{updatedAt:new Date().toISOString().slice(0,10)});
      this._callAPI(()=>api.updateComplaint(id,{status:c.status,doctorResponse:c.doctorResponse||'',adminResponse:c.adminResponse||''}));
      // Notify student when status changes
      if(updates.status && updates.status!==prevStatus && c.studentId){
        const label=updates.status==='reviewed'?'Reviewed by Lecturer':'Resolved by Admin';
        const resp=updates.status==='reviewed'?updates.doctorResponse:updates.adminResponse;
        this.addAlert({alertKind:'appeal',type:'info',studentId:c.studentId,
          title:`Appeal ${label} — ${c.courseName||''}`,
          message:resp?`Response: "${resp}"`:`Your ${(c.type||'').replace(/_/g,' ')} has been ${updates.status}.`});
      }
      this._persist();
    }
    return c||null;
  }
  getStudentComplaints(studentId){return this.complaints.filter(c=>c.studentId===studentId);}
  getDoctorComplaints(doctorId){return this.complaints.filter(c=>c.doctorId===doctorId);}
  getAllComplaints(){return [...this.complaints].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  getPendingComplaintsCount(){return this.complaints.filter(c=>c.status==='pending').length;}

  // ── REGISTRATION ──
  getRegistrationStatus(){return this.registrationStatus;}
  setRegistrationStatus(data){Object.assign(this.registrationStatus,data);this._persist();}

  // ── FEES ──
  getStudentFeeStatus(studentId){return this.studentFees[studentId]||{paid:true,amount:1500,dueDate:'2024-12-01'};}
  setStudentFeeStatus(studentId,data){this.studentFees[studentId]={...this.getStudentFeeStatus(studentId),...data};this._persist();}

  // ── WAITLIST ──
  joinWaitlist(courseId,studentId){
    if(!this.courseWaitlists[courseId])this.courseWaitlists[courseId]=[];
    if(!this.courseWaitlists[courseId].includes(studentId)){this.courseWaitlists[courseId].push(studentId);this._persist();return true;}
    return false;
  }
  removeFromWaitlist(courseId,studentId){
    const list=this.courseWaitlists[courseId]||[];const idx=list.indexOf(studentId);
    if(idx>=0){this.courseWaitlists[courseId].splice(idx,1);this._persist();return true;}return false;
  }
  getWaitlist(courseId){return(this.courseWaitlists[courseId]||[]).map(sid=>this.getStudent(sid)).filter(Boolean);}
  isCourseFull(courseId){const c=this.getCourse(courseId);if(!c||!c.capacity)return false;return(this.courseEnrollments[courseId]||[]).length>=c.capacity;}
  promoteFromWaitlist(courseId){
    const list=this.courseWaitlists[courseId]||[];if(!list.length)return null;
    const studentId=list[0];
    if(this.enrollStudent(courseId,studentId)){this.removeFromWaitlist(courseId,studentId);return studentId;}
    return null;
  }
  isOnWaitlist(courseId,studentId){return(this.courseWaitlists[courseId]||[]).includes(studentId);}

  // ── NOTIFICATIONS (user-scoped view of systemAlerts) ──────────────────────
  getUserNotifications(user){
    if(!this.systemAlerts) return [];
    if(user?.role==='student'){
      const sid=user.studentId||user.id;
      return this.systemAlerts.filter(a=>a.studentId===sid);
    }
    if(user?.role==='doctor'){
      const did=user.doctorId;
      return this.systemAlerts.filter(a=>a.doctorId===did||
        (a.alertKind==='new_appeal'&&a.doctorId===did));
    }
    if(user?.role==='admin') return this.systemAlerts;
    return [];
  }
  markAllUserAlertsRead(user){
    const notifs=this.getUserNotifications(user);
    notifs.forEach(a=>{a.read=true;});
    this._persist();
  }

  // ── COURSE RESOURCES ─────────────────────────────────────────────────────
  addResource(data){
    if(!this.courseResources) this.courseResources=[];
    const r={
      id:`RES${Date.now()}`,
      courseId:data.courseId||'', week:parseInt(data.week)||1,
      title:data.title||'', url:data.url||'',
      type:data.type||'link', description:data.description||'',
      doctorId:data.doctorId||'', createdAt:new Date().toISOString(),
      fileData:data.fileData||null, fileName:data.fileName||'', fileSize:data.fileSize||0,
    };
    this.courseResources.push(r);
    this._callAPI(()=>api.addResource({id:r.id,courseId:r.courseId,week:r.week,title:r.title,url:r.url,type:r.type,description:r.description,doctorId:r.doctorId,fileName:r.fileName,fileSize:r.fileSize,fileData:r.fileData,createdAt:r.createdAt}));
    this._persist(); return r;
  }
  getCourseResources(courseId){
    if(!this.courseResources) this.courseResources=[];
    return this.courseResources.filter(r=>r.courseId===courseId);
  }
  getCourseWeekResources(courseId,week){
    if(!this.courseResources) this.courseResources=[];
    return this.courseResources.filter(r=>r.courseId===courseId&&r.week===week);
  }
  getStudentResources(studentId){
    if(!this.courseResources) this.courseResources=[];
    const ids=new Set(Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>cid));
    return this.courseResources.filter(r=>ids.has(r.courseId));
  }
  deleteResource(id){
    if(!this.courseResources) this.courseResources=[];
    const n=this.courseResources.length;
    this.courseResources=this.courseResources.filter(r=>r.id!==id);
    if(this.courseResources.length<n){this._callAPI(()=>api.deleteResource(id));this._persist();return true;} return false;
  }

  // ── ATTENDANCE MARKING (Doctor) ───────────────────────────────────────────
  markStudentStatus(courseId, week, studentId, status){
    const key=this._attKey(courseId,week);
    if(!this.attendance[key]) this.attendance[key]={};
    this.attendance[key][studentId]={
      studentId,courseId,week,status,
      time:new Date().toTimeString().slice(0,8),
      date:new Date().toISOString().slice(0,10),
      method:'manual',confidence:1.0,
    };
    this._persist(); return true;
  }
  getCourseWeekAttendance(courseId,week){ return this.attendance[this._attKey(courseId,week)]||{}; }

  // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  addAnnouncement(data){
    if(!this.announcements) this.announcements=[];
    const doc=this.getDoctor(data.doctorId||'');
    const a={
      id:`ANN${Date.now()}`,
      courseId:data.courseId||'',courseName:data.courseName||'',
      doctorId:data.doctorId||'',doctorName:doc?doc.name:(data.doctorName||''),
      title:data.title||'',body:data.body||'',
      createdAt:new Date().toISOString(),
    };
    this.announcements.unshift(a);
    this._callAPI(()=>api.addAnnouncement({id:a.id,courseId:a.courseId,courseName:a.courseName,doctorId:a.doctorId,doctorName:a.doctorName,title:a.title,body:a.body,createdAt:a.createdAt}));
    // Notify all enrolled students
    const enrolled=this.getEnrolledStudents(data.courseId||'');
    enrolled.forEach(s=>{
      this.addAlert({alertKind:'announcement',type:'info',studentId:s.id,courseId:data.courseId,
        title:`📢 ${a.title}`,
        message:`${a.doctorName} posted for ${a.courseName}: ${a.body.slice(0,80)}${a.body.length>80?'…':''}`});
    });
    this._persist(); return a;
  }
  getCourseAnnouncements(courseId){ if(!this.announcements) this.announcements=[]; return this.announcements.filter(a=>a.courseId===courseId); }
  getStudentAnnouncements(studentId){
    if(!this.announcements) this.announcements=[];
    const ids=new Set(Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>cid));
    return this.announcements.filter(a=>ids.has(a.courseId));
  }
  deleteAnnouncement(id){
    if(!this.announcements) this.announcements=[];
    const n=this.announcements.length;
    this.announcements=this.announcements.filter(a=>a.id!==id);
    if(this.announcements.length<n){this._callAPI(()=>api.deleteAnnouncement(id));this._persist();return true;} return false;
  }

  // ── EXAM SCHEDULE ─────────────────────────────────────────────────────────
  addExam(data){
    if(!this.examSchedule) this.examSchedule=[];
    const course=this.getCourse(data.courseId||'');
    const e={
      id:`EXS${Date.now()}`,
      courseId:data.courseId||'',courseName:course?.name||data.courseName||'',
      type:data.type||'midterm',date:data.date||'',time:data.time||'',
      room:data.room||'',duration:parseInt(data.duration)||120,notes:data.notes||'',
      createdAt:new Date().toISOString(),
    };
    this.examSchedule.push(e);
    this._callAPI(()=>api.addExam({id:e.id,courseId:e.courseId,courseName:e.courseName,type:e.type,date:e.date,time:e.time,room:e.room,duration:e.duration,notes:e.notes,createdAt:e.createdAt}));
    this._persist(); return e;
  }
  getStudentExams(studentId){
    if(!this.examSchedule) this.examSchedule=[];
    const ids=new Set(Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>cid));
    return this.examSchedule.filter(e=>ids.has(e.courseId)).sort((a,b)=>a.date.localeCompare(b.date));
  }
  getAllExams(){ if(!this.examSchedule) this.examSchedule=[]; return [...this.examSchedule].sort((a,b)=>a.date.localeCompare(b.date)); }
  getDoctorExams(doctorId){
    if(!this.examSchedule) this.examSchedule=[];
    const ids=new Set(this.getDoctorCourses(doctorId).map(c=>c.id));
    return this.examSchedule.filter(e=>ids.has(e.courseId)).sort((a,b)=>a.date.localeCompare(b.date));
  }
  deleteExam(id){
    if(!this.examSchedule) this.examSchedule=[];
    const n=this.examSchedule.length;
    this.examSchedule=this.examSchedule.filter(e=>e.id!==id);
    if(this.examSchedule.length<n){this._callAPI(()=>api.deleteExam(id));this._persist();return true;} return false;
  }

  // ── ASSIGNMENTS ───────────────────────────────────────────────────────────
  addAssignment(data){
    if(!this.assignments) this.assignments=[];
    const course=this.getCourse(data.courseId||'');
    const a={
      id:`ASN${Date.now()}`,
      courseId:data.courseId||'', courseName:course?.name||'',
      doctorId:data.doctorId||'', title:data.title||'',
      description:data.description||'', deadline:data.deadline||'',
      maxScore:parseInt(data.maxScore)||100,
      createdAt:new Date().toISOString(),
      attachmentData:data.attachmentData||null, attachmentName:data.attachmentName||'', attachmentSize:data.attachmentSize||0,
    };
    this.assignments.unshift(a);
    this._callAPI(()=>api.addAssignment({id:a.id,courseId:a.courseId,courseName:a.courseName,doctorId:a.doctorId,title:a.title,description:a.description,deadline:a.deadline,maxScore:a.maxScore,attachmentName:a.attachmentName,attachmentSize:a.attachmentSize,attachmentData:a.attachmentData,createdAt:a.createdAt}));
    // Notify enrolled students
    const enrolled=this.getEnrolledStudents(data.courseId||'');
    enrolled.forEach(s=>{
      this.addAlert({alertKind:'assignment',type:'info',studentId:s.id,
        courseId:data.courseId,
        title:`📋 New Assignment: ${a.title}`,
        message:`${course?.name||''} — due ${a.deadline||'no deadline'}`,
      });
    });
    this._persist(); return a;
  }
  getAssignment(id){ return (this.assignments||[]).find(a=>a.id===id)||null; }
  getCourseAssignments(courseId){ return (this.assignments||[]).filter(a=>a.courseId===courseId); }
  getDoctorAssignments(doctorId){ return (this.assignments||[]).filter(a=>a.doctorId===doctorId); }
  getStudentAssignments(studentId){
    if(!this.assignments) return [];
    const ids=new Set(Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>cid));
    return this.assignments.filter(a=>ids.has(a.courseId));
  }
  deleteAssignment(id){
    if(!this.assignments) return false;
    const n=this.assignments.length;
    this.assignments=this.assignments.filter(a=>a.id!==id);
    if(this.assignments.length<n){
      if(!this.submissions) this.submissions=[];
      this.submissions=this.submissions.filter(s=>s.assignmentId!==id);
      this._callAPI(()=>api.deleteAssignment(id));
      this._persist(); return true;
    } return false;
  }

  // ── SUBMISSIONS ───────────────────────────────────────────────────────────
  submitAssignment(assignmentId, studentId, content, fileData=null, fileName='', fileSize=0){
    if(!this.submissions) this.submissions=[];
    const existing=this.submissions.find(s=>s.assignmentId===assignmentId&&s.studentId===studentId);
    if(existing){
      existing.content=content; existing.submittedAt=new Date().toISOString();
      existing.fileData=fileData; existing.fileName=fileName; existing.fileSize=fileSize;
      existing.grade=null; existing.feedback=''; existing.gradedAt=null;
      this._persist(); return existing;
    }
    const asn=this.getAssignment(assignmentId);
    const sub={
      id:`SUB${Date.now()}`, assignmentId, studentId,
      courseId:asn?.courseId||'', content,
      fileData, fileName, fileSize,
      submittedAt:new Date().toISOString(),
      grade:null, feedback:'', gradedAt:null, gradedBy:'',
    };
    this.submissions.push(sub);
    this._callAPI(()=>api.upsertSubmission({id:sub.id,assignmentId,studentId,courseId:sub.courseId,content,fileName,fileSize,fileData,submittedAt:sub.submittedAt,grade:null,feedback:'',gradedAt:null,gradedBy:''}));
    this._persist(); return sub;
  }
  getSubmission(assignmentId, studentId){
    return (this.submissions||[]).find(s=>s.assignmentId===assignmentId&&s.studentId===studentId)||null;
  }
  getAssignmentSubmissions(assignmentId){
    return (this.submissions||[]).filter(s=>s.assignmentId===assignmentId);
  }
  gradeSubmission(assignmentId, studentId, grade, feedback, doctorId){
    if(!this.submissions) return false;
    const sub=this.submissions.find(s=>s.assignmentId===assignmentId&&s.studentId===studentId);
    if(!sub) return false;
    sub.grade=parseFloat(grade); sub.feedback=feedback||'';
    sub.gradedAt=new Date().toISOString(); sub.gradedBy=doctorId||'';
    this._callAPI(()=>api.gradeSubmission({assignmentId,studentId,grade:sub.grade,feedback:sub.feedback,gradedAt:sub.gradedAt,gradedBy:sub.gradedBy}));
    const asn=this.getAssignment(assignmentId);
    this.addAlert({alertKind:'grade',type:'success',studentId,courseId:asn?.courseId||'',
      title:`✅ Assignment Graded: ${asn?.title||''}`,
      message:`Score: ${sub.grade}/${asn?.maxScore||100}${feedback?` — ${feedback}`:''}`,
    });
    this._persist(); return true;
  }

  // ── API BRIDGE ────────────────────────────────────────────────────────────

  /** Fire-and-forget: call an API method, log but don't throw on failure. */
  _callAPI(fn){ fn().catch(e => console.warn('[API sync]', e.message)); }

  /**
   * Merge data returned from /api/init into the in-memory store.
   * Maps snake_case API keys → camelCase store keys.
   */
  _loadFromAPI(d){
    const sc2cc = obj => {
      if(!obj || typeof obj !== 'object') return obj;
      const map = {
        course_id:'courseId', course_name:'courseName', doctor_id:'doctorId',
        doctor_name:'doctorName', student_id:'studentId', student_name:'studentName',
        created_at:'createdAt', updated_at:'updatedAt', submitted_at:'submittedAt',
        graded_at:'gradedAt', graded_by:'gradedBy', assignment_id:'assignmentId',
        file_name:'fileName', file_size:'fileSize', file_data:'fileData',
        max_score:'maxScore', attachment_name:'attachmentName',
        attachment_size:'attachmentSize', attachment_data:'attachmentData',
        alert_kind:'alertKind', is_read:'read', doctor_response:'doctorResponse',
        admin_response:'adminResponse', due_date:'dueDate', lecture_id:'id',
        course_code:'code', duration_min:'duration', days_label:'daysLabel',
      };
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        const key = map[k] || k;
        out[key] = v;
      }
      return out;
    };
    const mapArr = arr => (arr||[]).map(sc2cc);

    // Courses — map lecture rows to course format
    if (d.courses?.length) {
      const mapped = d.courses.map(c => {
        const r = sc2cc(c);
        const code = r.code || r.course_code || r.lecture_id || r.id || '';
        let days = [];
        try { days = typeof r.days === 'string' ? JSON.parse(r.days) : (r.days||[]); } catch{}
        return {
          id: code, code, name: r.course_name || r.name || code,
          room: r.room||'', color: r.color||'#3b82f6',
          time: r.scheduled_at ? (r.scheduled_at.split(' ')[1]||'09:00').slice(0,5) : (r.time||'09:00'),
          duration: r.duration_min || r.duration || 90,
          doctorId: r.doctor_id || r.doctorId || '',
          doctorName: r.doctor_name || r.doctorName || '',
          days, daysLabel: r.days_label || r.daysLabel || '',
          weeks: Array.from({length:16},(_,i)=>i+1),
          semester: r.semester || 'Fall 2024',
          enrolledCount: 0, capacity: r.capacity || 300,
        };
      });
      // Merge: keep existing entries for fields not in DB
      const byId = {};
      this.courses.forEach(c => { byId[c.id] = c; });
      mapped.forEach(c => { byId[c.id] = { ...(byId[c.id]||{}), ...c }; });
      this.courses = Object.values(byId);
    }

    if (d.courseEnrollments) Object.assign(this.courseEnrollments, d.courseEnrollments);
    if (d.announcements)  this.announcements  = mapArr(d.announcements);
    if (d.examSchedule)   this.examSchedule   = mapArr(d.examSchedule);
    if (d.courseResources)this.courseResources = mapArr(d.courseResources);
    if (d.assignments)    this.assignments     = mapArr(d.assignments);
    if (d.submissions)    this.submissions     = mapArr(d.submissions);
    if (d.complaints)     this.complaints      = mapArr(d.complaints);
    if (d.examResults)    Object.assign(this.examResults, d.examResults);
    if (d.attendance)     Object.assign(this.attendance,  d.attendance);
    if (d.chatMessages)   Object.assign(this.chatMessages, d.chatMessages);
    if (d.registrationStatus) Object.assign(this.registrationStatus, d.registrationStatus);
    if (d.studentFees)    Object.assign(this.studentFees, d.studentFees);

    // System alerts — map is_read → read boolean
    if (d.systemAlerts) {
      this.systemAlerts = d.systemAlerts.map(a => ({
        ...sc2cc(a), read: Boolean(a.is_read ?? a.read),
      }));
    }

    // Students from API (merge with seed data)
    if (d.students?.length) {
      const apiStudents = d.students.map(s => ({
        id: s.student_id||s.id, name: s.full_name||s.name,
        email: s.email||'', dept: s.department||s.dept||'',
        year: s.year||1, emoji:'👦', color:'#3b82f6',
        emotion:'neutral', attention:'moderate', engagement:50,
        attentionScore:50, attendanceRate:0, gpa:0,
        present:false, confidence:0, hasFace:false, registeredAt:'',
      }));
      const byId = {};
      this.students.forEach(s => { byId[s.id] = s; });
      apiStudents.forEach(s => { byId[s.id] = { ...(byId[s.id]||{}), ...s }; });
      this.students = Object.values(byId);
    }

    this._syncStats();
    this._persist();
  }

  // ── GPA & ACADEMIC STANDING ───────────────────────────────────────────────
  gradeToPoints(grade){
    if(grade>=90)return 4.0; if(grade>=85)return 4.0; if(grade>=80)return 3.5;
    if(grade>=75)return 3.0; if(grade>=70)return 2.5; if(grade>=65)return 2.0;
    if(grade>=60)return 1.5; if(grade>=50)return 1.0; return 0.0;
  }
  calculateSemesterGPA(studentId){
    const entries=Object.entries(this.getStudentResults(studentId));
    if(!entries.length) return null;
    return +(entries.reduce((sum,[,v])=>sum+this.gradeToPoints(v.grade),0)/entries.length).toFixed(2);
  }
  getAcademicStanding(studentId){
    const gpa=this.calculateSemesterGPA(studentId);
    if(gpa===null) return 'No Grades Yet';
    if(gpa>=3.5) return 'Honors';
    if(gpa>=2.0) return 'Good Standing';
    if(gpa>=1.5) return 'Academic Warning';
    return 'Academic Probation';
  }
  getStudentsOnProbation(){
    return this.students.filter(s=>this.getAcademicStanding(s.id)==='Academic Probation');
  }

  // ── DEGREE AUDIT ──────────────────────────────────────────────────────────
  getDegreeAudit(studentId){
    const REQUIRED=['CS401','CS402','CS403','CS404','CS405'];
    const CREDITS=3;
    const results=this.getStudentResults(studentId);
    const enrolled=new Set(Object.entries(this.courseEnrollments).filter(([,ids])=>ids.includes(studentId)).map(([cid])=>cid));
    const audit=REQUIRED.map(cid=>{
      const course=this.getCourse(cid);
      const rec=results[cid];
      let status;
      if(rec) status=rec.grade>=50?'completed':'failed';
      else if(enrolled.has(cid)) status='in_progress';
      else status='not_started';
      return{courseId:cid,courseName:course?.name||cid,credits:CREDITS,status,grade:rec?.grade??null};
    });
    const completed=audit.filter(a=>a.status==='completed');
    const failed=audit.filter(a=>a.status==='failed');
    const inProgress=audit.filter(a=>a.status==='in_progress');
    const notStarted=audit.filter(a=>a.status==='not_started');
    const creditsEarned=completed.length*CREDITS;
    const creditsRequired=REQUIRED.length*CREDITS;
    return{audit,completed,failed,inProgress,notStarted,creditsEarned,creditsRequired,
      progressPct:Math.round((creditsEarned/creditsRequired)*100),
      readyToGraduate:completed.length===REQUIRED.length};
  }

  // ── PUBLISH GRADES ─────────────────────────────────────────────────────────
  publishCourseGrades(courseId, doctorId){
    const course=this.getCourse(courseId);
    const enrolled=this.getEnrolledStudents(courseId);
    let published=0;
    enrolled.forEach(s=>{
      const rec=this.examResults[s.id]?.[courseId];
      if(rec){
        this.addAlert({alertKind:'grade',type:'info',studentId:s.id,courseId,
          title:`Grade Published — ${course?.name||courseId}`,
          message:`Your final grade of ${rec.grade}% has been officially published for ${course?.name||courseId}.`});
        published++;
      }
    });
    this._persist();
    return published;
  }
}

export const store = new DataStore();
export default store;
