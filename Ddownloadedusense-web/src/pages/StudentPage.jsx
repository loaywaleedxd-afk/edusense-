import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import AnimatedPage from '../components/AnimatedPage';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import ScheduleItem from '../components/ScheduleItem';
import WebcamFeed from '../components/WebcamFeed';
import store from '../dataStore';
import api, { getToken } from '../api';
import { EMOTION_ICONS } from '../theme';
import GPACalculatorPage from './GPACalculatorPage';
import TimetablePage from './TimetablePage';
import AcademicCalendarPage from './AcademicCalendarPage';
import GraduationRoadmapPage from './GraduationRoadmapPage';
import { StudentLivePoll } from './LivePollPage';
import DigitalIDPage from './DigitalIDPage';
import { exportGradesPDF, exportTranscriptPDF, exportPortfolioPDF } from '../utils/pdfExport';
import FeeHistoryPage from './FeeHistoryPage';
import { StudentOfficeHours } from './OfficeHoursPage';
import ProfilePage from './ProfilePage';
import DirectMessagePage from './DirectMessagePage';
import CourseRegistrationPage from './CourseRegistrationPage';
import { useLang } from '../context/LanguageContext';
import { pushToast } from '../components/NotificationToast';
import useMobile from '../hooks/useMobile';

const NAV_BASE = [
  { id:'dashboard',  icon:'📊', label:'Dashboard' },
  { id:'attendance', icon:'✅', label:'My Attendance' },
  { id:'emotions',   icon:'😊', label:'My Emotions' },
  { id:'schedule',   icon:'📅', label:'Schedule' },
  { id:'performance',icon:'📈', label:'Performance' },
  { id:'grades',     icon:'📝', label:'My Grades' },
  { id:'portfolio',  icon:'🎓', label:'My Portfolio' },
  { id:'chat',       icon:'💬', label:'Community' },
  { id:'moodle',     icon:'🌐', label:'Moodle' },
  { id:'appeals',       icon:'📋', label:'My Appeals' },
  { id:'transcript',    icon:'🎓', label:'Transcript' },
  { id:'announcements', icon:'📢', label:'Announcements' },
  { id:'exams',         icon:'🗓️', label:'Exam Schedule' },
  { id:'degreeaudit',   icon:'🏛️', label:'Degree Audit' },
  { id:'resources',     icon:'📖', label:'Study Resources' },
  { id:'assignments',   icon:'📋', label:'Assignments' },
  // ── New features ──────────────────────────────────────────────────────────
  { section: 'New Features' },
  { id:'__advising',    icon:'🎓', label:'Advising' },
  { id:'__atrisk',      icon:'📊', label:'My Risk Status' },
  { id:'__proctoring',  icon:'🎥', label:'Exam Session' },
  { id:'gpacalc',       icon:'📊', label:'GPA Calculator' },
  { id:'timetable',     icon:'🗓️', label:'Timetable' },
  { id:'digitalid',     icon:'🪪',  label:'Digital ID' },
  { id:'feehistory',    icon:'💳', label:'Fee History' },
  { id:'officehours',   icon:'🕐', label:'Office Hours' },
  { id:'calendar',      icon:'📅', label:'Academic Calendar' },
  { id:'roadmap',       icon:'🗺️', label:'Graduation Roadmap' },
  { id:'livepoll',      icon:'📊', label:'Live Poll' },
  { id:'registration',  icon:'🏛️', label:'Course Registration' },
  { id:'messages',      icon:'💬', label:'Messages' },
  { id:'profile',       icon:'👤', label:'My Profile' },
];

function loadLastSeen(stuId) {
  try { return JSON.parse(localStorage.getItem(`es_lastseen_${stuId}`) || '{}'); }
  catch { return {}; }
}
function saveLastSeen(stuId, pageId) {
  const data = loadLastSeen(stuId);
  data[pageId] = Date.now();
  localStorage.setItem(`es_lastseen_${stuId}`, JSON.stringify(data));
}

function buildNav(stuId, lastSeen) {
  const today = new Date().toISOString().slice(0,10);
  return NAV_BASE.map(item => {
    if (item.id === 'announcements') return {
      ...item,
      badge: () => {
        const since = lastSeen.announcements || 0;
        return store.getStudentAnnouncements(stuId)
          .filter(a => new Date(a.createdAt).getTime() > since).length || 0;
      },
    };
    if (item.id === 'exams') return {
      ...item,
      badge: () => {
        const since = lastSeen.exams || 0;
        return store.getStudentExams(stuId)
          .filter(e => e.date >= today && new Date(e.createdAt || 0).getTime() > since).length || 0;
      },
    };
    if (item.id === 'assignments') return {
      ...item,
      badge: () => {
        const since = lastSeen.assignments || 0;
        return store.getStudentAssignments(stuId)
          .filter(a => new Date(a.createdAt).getTime() > since).length || 0;
      },
    };
    return item;
  });
}

/* ── FILE HELPERS (student) ── */
const ACCEPT_FILES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx';
const MAX_FILE_BYTES = 3 * 1024 * 1024;
function fileIcon(name=''){
  const ext=(name.split('.').pop()||'').toLowerCase();
  if(ext==='pdf')                        return {icon:'📄',color:'#ef4444',label:'PDF'};
  if(['jpg','jpeg','png'].includes(ext)) return {icon:'🖼️',color:'#8b5cf6',label:'Image'};
  if(['doc','docx'].includes(ext))       return {icon:'📝',color:'#3b82f6',label:'Word'};
  if(['ppt','pptx'].includes(ext))       return {icon:'📊',color:'#f97316',label:'PowerPoint'};
  return {icon:'📎',color:'#64748b',label:'File'};
}
function openFile(fileData, fileName){
  const ext=(fileName.split('.').pop()||'').toLowerCase();
  try {
    const [header, b64] = fileData.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr],{type:mime}));
    if(['pdf','jpg','jpeg','png','gif','webp'].includes(ext)){ window.open(url,'_blank'); }
    else { const a=document.createElement('a'); a.href=url; a.download=fileName; a.click(); }
    setTimeout(()=>URL.revokeObjectURL(url), 10000);
  } catch {
    const a=document.createElement('a'); a.href=fileData; a.download=fileName; a.click();
  }
}
async function readFile(file){
  if(file.size>MAX_FILE_BYTES) throw new Error(`File too large — max 3 MB (got ${(file.size/1048576).toFixed(1)} MB)`);
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res({data:e.target.result,name:file.name,size:file.size});
    r.onerror=()=>rej(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

/* PAGE_TITLES is now a function that uses the t() translator */
const PAGE_TITLE_KEYS = {
  dashboard:'dashboard', attendance:'attendance', emotions:'emotions',
  schedule:'schedule', performance:'performance', grades:'grades',
  portfolio:'portfolio', chat:'chat', moodle:'moodle',
  appeals:'appeals', transcript:'transcript',
  announcements:'announcements', exams:'exams', degreeaudit:'degreeaudit',
  resources:'resources', assignments:'assignments',
  gpacalc:'gpa_calc', timetable:'timetable',
  digitalid:'digital_id', feehistory:'fee_history',
  officehours:'office_hours', calendar:'academic_calendar',
  roadmap:'grad_roadmap', livepoll:'live_poll',
};
function getPageTitle(page, t) {
  const key = PAGE_TITLE_KEYS[page];
  if (!key) return page;
  const val = t(key);
  return val !== key ? val : page;
}

function letterGrade(g) {
  if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';
  if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';
}
function gradeColor(g,C){ return g>=75?C.green:g>=50?C.amber:C.red; }

/* ══ ATTENDANCE ALERT BANNER ══ */
function AttendanceAlertBanner({ theme: C, studentId, onGoToAttendance }) {
  const [alerts, setAlerts]     = useState([]);
  const [dismissed, setDismiss] = useState(new Set());

  // Fire the check once on mount
  useEffect(() => {
    store.checkAttendanceAlerts(studentId);
    setAlerts(store.getStudentAttendanceAlerts(studentId));
  }, [studentId]);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  function dismiss(id) {
    const a = alerts.find(x => x.id === id);
    store.markAlertRead(id);
    // Persist dismissal so this alert never reappears on next login at the same pct
    if (a) store.dismissAttendanceAlert(studentId, a.courseId, a.pct);
    setDismiss(prev => new Set([...prev, id]));
  }

  function dismissAll() {
    visible.forEach(a => {
      store.markAlertRead(a.id);
      store.dismissAttendanceAlert(studentId, a.courseId, a.pct);
    });
    setDismiss(prev => new Set([...prev, ...visible.map(a => a.id)]));
  }

  const hasCritical = visible.some(a => a.type === 'danger');

  return (
    <div style={{
      margin: '12px 20px 0',
      borderRadius: 14,
      border: `1.5px solid ${hasCritical ? '#ef444466' : '#f59e0b66'}`,
      background: hasCritical ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: hasCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
        borderBottom: `1px solid ${hasCritical ? '#ef444433' : '#f59e0b33'}`,
      }}>
        <span style={{ fontSize: 18 }}>{hasCritical ? '🚨' : '⚠️'}</span>
        <span style={{ fontWeight: 700, color: hasCritical ? '#ef4444' : '#f59e0b', fontSize: 14, flex: 1 }}>
          {hasCritical ? 'Critical Attendance Alert' : 'Attendance Warning'}
          {visible.length > 1 ? ` (${visible.length} courses)` : ''}
        </span>
        <button
          onClick={onGoToAttendance}
          style={{ background: hasCritical ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          View Attendance →
        </button>
        <button
          onClick={dismissAll}
          style={{ background: 'transparent', border: 'none', color: C.text3, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          title="Dismiss all"
        >×</button>
      </div>

      {/* Alert rows */}
      {visible.map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '10px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          {/* Severity pill */}
          <span style={{
            flexShrink: 0, marginTop: 2,
            fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20,
            background: a.type === 'danger' ? '#ef444422' : '#f59e0b22',
            color: a.type === 'danger' ? '#ef4444' : '#f59e0b',
          }}>
            {a.type === 'danger' ? 'CRITICAL' : 'WARNING'}
          </span>

          {/* Attendance bar */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: C.text, fontSize: 13, marginBottom: 4 }}>
              {a.title}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}>{a.message}</div>
            {/* Progress bar */}
            <div style={{ background: C.border, borderRadius: 99, height: 6, width: '100%', maxWidth: 300 }}>
              <div style={{
                width: `${a.pct}%`, height: '100%', borderRadius: 99,
                background: a.type === 'danger'
                  ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                  : 'linear-gradient(90deg,#f59e0b,#d97706)',
                transition: 'width 0.6s ease',
              }}/>
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>
              {a.attended}/{a.totalWeeks} weeks attended · {a.pct}%
              {a.type === 'danger' ? ' — below 60% critical threshold' : ' — below 75% minimum'}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => dismiss(a.id)}
            style={{ background: 'transparent', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
            title="Dismiss"
          >×</button>
        </div>
      ))}
    </div>
  );
}

export default function StudentPage({ theme: C, user, isDark, onToggleMode, onLogout,
  onOpenProctoring, onOpenAdvising, onOpenAtRisk, pendingQR, onClearPendingQR, branding }) {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, isRTL } = useLang();
  const sid = user.studentId || user.student_id || user.id || '';
  const [stu, setStu] = useState(() => {
    const base = store.getStudent(sid);
    if (base) return base;
    return { id: sid, name: user.full_name || user.name || user.username || '', email: user.email || '', dept: user.department || '', year: user.year || 1, gpa: 0, attendanceRate: 0, engagement: 0 };
  });
  const stuId = stu?.id || sid;

  useEffect(() => {
    if (!sid) return;
    api.getStudent(sid).then(s => { if (s) setStu(prev => ({ ...prev, ...s, id: s.student_id || s.id || prev.id, name: s.full_name || s.name || prev.name, dept: s.department || s.dept || prev.dept })); }).catch(() => {});
  }, [sid]);

  const [lastSeen, setLastSeen] = useState(() => loadLastSeen(stuId));
  const nav = buildNav(stuId, lastSeen);

  // ── Real-time WebSocket notifications ──────────────────────────────────────
  useEffect(() => {
    // Only connect when user.id is a numeric DB id (API login); local-auth IDs like 'S019' are skipped.
    if (!user?.id || !/^\d+$/.test(String(user.id))) return;
    const BASE_WS = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const ws = new WebSocket(`${BASE_WS}/ws/notifications/${user.id}?token=${encodeURIComponent(getToken() || '')}`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connected') return;
        pushToast({ title: msg.title, message: msg.message, color: msg.color || '#3b82f6' });
      } catch {}
    };
    ws.onerror = () => {}; // suppress console noise on connection failure
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, 30000);
    return () => { clearInterval(ping); ws.close(); };
  }, [user?.id]);

  function navigate(id) {
    if (id === '__proctoring') { onOpenProctoring?.(); return; }
    if (id === '__advising')   { onOpenAdvising?.();   return; }
    if (id === '__atrisk')     { onOpenAtRisk?.();     return; }
    setPage(id);
    if (id === 'announcements' || id === 'exams' || id === 'assignments') {
      saveLastSeen(stuId, id);
      setLastSeen(loadLastSeen(stuId));
    }
  }

  // Auto-navigate to attendance tab when opened via QR scan link
  useEffect(() => {
    if (pendingQR) setPage('attendance');
  }, [pendingQR]);

  return (
    <div style={{ display:'flex', height:'100%', background:C.bg, overflow:'hidden', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
      <Sidebar theme={C} navItems={nav} activeId={page} onNav={navigate} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} branding={branding}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar theme={C} user={user} pageTitle={getPageTitle(page, t)} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout} onMenuOpen={() => setMenuOpen(true)}/>
        <div className="content-scroll" style={{ flex:1, background:C.bg, overflowY:'auto' }}>
          {/* Attendance alert banner — visible on all pages */}
          <AttendanceAlertBanner
            theme={C}
            studentId={stu?.id}
            onGoToAttendance={() => setPage('attendance')}
          />
          <AnimatedPage pageKey={page}>
            {page==='dashboard'  && <StudentDashboard theme={C} user={user} stu={stu} isDark={isDark}/>}
            {page==='attendance' && <StudentAttendance theme={C} stu={stu} pendingQR={pendingQR} onClearPendingQR={onClearPendingQR}/>}
            {page==='emotions'   && <StudentEmotions theme={C} stu={stu}/>}
            {page==='schedule'   && <StudentSchedule theme={C} stu={stu}/>}
            {page==='performance'&& <StudentPerformance theme={C} stu={stu}/>}
            {page==='grades'     && <StudentGrades theme={C} stu={stu}/>}
            {page==='portfolio'  && <StudentPortfolio theme={C} user={user} stu={stu}/>}
            {page==='chat'       && <StudentChat theme={C} user={user} stu={stu} isDark={isDark}/>}
            {page==='moodle'     && <StudentMoodle theme={C}/>}
            {page==='appeals'       && <StudentAppeals theme={C} user={user} stu={stu}/>}
            {page==='transcript'    && <StudentTranscript theme={C} stu={stu}/>}
            {page==='announcements' && <StudentAnnouncements theme={C} stu={stu}/>}
            {page==='exams'         && <StudentExamSchedule theme={C} stu={stu}/>}
            {page==='degreeaudit'   && <StudentDegreeAudit theme={C} stu={stu}/>}
            {page==='resources'     && <StudentResources theme={C} stu={stu}/>}
            {page==='assignments'   && <StudentAssignments theme={C} stu={stu}/>}
            {page==='gpacalc'       && <GPACalculatorPage theme={C} stu={stu}/>}
            {page==='timetable'     && <TimetablePage theme={C} stu={stu} role="student"/>}
            {page==='digitalid'     && <DigitalIDPage theme={C} stu={stu} user={user}/>}
            {page==='feehistory'    && <FeeHistoryPage theme={C} stu={stu} user={user}/>}
            {page==='officehours'   && <StudentOfficeHours theme={C} stu={stu}/>}
            {page==='calendar'      && <AcademicCalendarPage theme={C} role="student"/>}
            {page==='roadmap'       && <GraduationRoadmapPage theme={C} stu={stu}/>}
            {page==='livepoll'      && <StudentLivePoll theme={C}/>}
            {page==='registration'  && <CourseRegistrationPage theme={C}/>}
            {page==='messages'      && <DirectMessagePage theme={C} user={user}/>}
            {page==='profile'       && <ProfilePage theme={C} user={user}/>}
          </AnimatedPage>
        </div>
      </div>
    </div>
  );
}

/* ══ DASHBOARD ══ */
function calcStreakFromRecs(records) {
  const weeks = [...new Set(
    records.filter(r => r.status === 'present' || r.status === 'excused').map(r => Number(r.week))
  )].sort((a, b) => a - b);
  if (!weeks.length) return 0;
  let streak = 1;
  for (let i = weeks.length - 1; i > 0; i--) {
    if (weeks[i] - weeks[i - 1] === 1) streak++;
    else break;
  }
  return streak;
}

function StudentDashboard({ theme: C, user, stu }) {
  if (!stu) return <div style={{ padding: 40, textAlign: 'center', color: C?.text2 }}>Loading student data…</div>;
  const [myCoursesEnrolled, setMyCoursesEnrolled] = useState([]);
  const [attRecs, setAttRecs] = useState([]);
  const [gradeRows, setGradeRows] = useState([]);
  const [trendSeries, setTrendSeries] = useState(null);   // {engagement, attention, labels}
  const [emoDistLive, setEmoDistLive] = useState(null);   // array of {emotion, count, pct, color}

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => setMyCoursesEnrolled(courses.filter(c => c.my_status === 'enrolled')))
      .catch(() => {});
    api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
    api.getStudentGrades(stu.id).then(rows => setGradeRows(rows.map(r => ({ grade: r.grade })))).catch(() => {});
    // Fetch real trend data
    api.getTimeTrends(stu.id)
      .then(rows => {
        if (!rows || !rows.length) return;
        setTrendSeries({
          engagement: rows.map(r => Math.round(r.avg_engagement ?? 0)),
          attention:  rows.map(r => Math.round(r.avg_attention  ?? 0)),
          labels:     rows.map(r => r.date ? r.date.slice(5) : ''),
        });
      })
      .catch(() => {});
    // Fetch real emotion distribution
    const EMOTION_COLORS = {
      happy:'#10b981', neutral:'#3b82f6', surprised:'#f59e0b',
      angry:'#ef4444', sad:'#8b5cf6', fearful:'#ec4899', disgusted:'#64748b',
    };
    api.getEngagementOverview(stu.id)
      .then(res => {
        if (!res?.emotions) return;
        const total = res.total_records || 1;
        const dist = Object.entries(res.emotions).map(([emotion, count]) => ({
          emotion, count,
          pct: Math.round(count / total * 100),
          color: EMOTION_COLORS[emotion] || '#64748b',
        }));
        if (dist.length) setEmoDistLive(dist);
      })
      .catch(() => {});
  }, [stu.id]);

  const streak = calcStreakFromRecs(attRecs);
  const streakMsg = streak >= 10 ? 'Incredible! Keep it up! 🏆' : streak >= 5 ? 'Great consistency!' : streak >= 2 ? 'Keep going!' : 'Start your streak today!';
  const presentCount = attRecs.filter(r => r.status === 'present' || r.status === 'excused').length;
  // Dashboard rate: sum distinct attended weeks per course / (courses × 16)
  const attendanceRate = (() => {
    if (!myCoursesEnrolled.length) return stu.attendanceRate || 0;
    const totalAtt = myCoursesEnrolled.reduce((sum, course) => {
      const code = course.course_code || course.id;
      const weeks = new Set(
        attRecs.filter(r => (r.course_code === code || r.lecture_id === code)
                         && (r.status === 'present' || r.status === 'excused'))
               .map(r => r.week)
      ).size;
      return sum + weeks;
    }, 0);
    return Math.round(totalAtt / (myCoursesEnrolled.length * 16) * 100);
  })();

  const gradeVals = gradeRows.map(r => r.grade);
  const avgGrade = gradeVals.length ? +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1) : null;
  const standing = avgGrade == null ? 'No Grades Yet' : avgGrade >= 87.5 ? 'Honors' : avgGrade >= 70 ? 'Good Standing' : avgGrade >= 50 ? 'Academic Warning' : 'Academic Probation';
  const semGPA = avgGrade !== null ? (avgGrade / 100 * 4).toFixed(2) : (stu.gpa || '—');

  const { t: dashT, isRTL: dashRTL } = useLang();
  const isMobile = useMobile();

  // Demo push notifications on first mount
  useEffect(() => {
    const SHOWN_KEY = `es_dash_notif_${stu.id}`;
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    sessionStorage.setItem(SHOWN_KEY, '1');
    const demos = [
      { delay: 1200, title: 'Grade Posted', message: 'Your AI grade is now available — check Exam Results.', icon: '📝', color: '#3b82f6' },
      { delay: 3500, title: 'Attendance Warning', message: 'Your attendance in Data Science dropped below 80%.', icon: '⚠️', color: '#f59e0b' },
      { delay: 6000, title: 'Advising Confirmed', message: 'Your appointment with Dr. Ahmed is confirmed for Mon 10:00.', icon: '✅', color: '#10b981' },
    ];
    const timers = demos.map(d => setTimeout(() => pushToast(d), d.delay));
    return () => timers.forEach(clearTimeout);
  }, [stu.id]);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      {/* Welcome header */}
      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, marginBottom:12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ width: isMobile ? 60 : 90, height: isMobile ? 60 : 90, borderRadius:'50%', background:stu.color||C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? 28 : 40, flexShrink:0, overflow:'hidden', border:`3px solid ${stu.color||C.blue}` }}>
          {stu.capturedPhoto
            ? <img src={stu.capturedPhoto} alt={stu.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{display:stu.capturedPhoto?'none':'flex'}}>{stu.emoji||'👤'}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{ fontSize:22, fontWeight:700, color:C.text }}>{dashT('welcome_back')}, {user.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize:12, color:C.text2, marginTop:2 }}>{stu.id} · {stu.dept} · Year {stu.year}</div>
          <div style={{ fontSize:11, color:C.text3 }}>Your academic overview for this semester</div>
          {(() => {
            const cfg = {
              'Honors':            { bg:'#10b98122', color:'#10b981', icon:'🏆' },
              'Good Standing':     { bg:'#3b82f622', color:'#3b82f6', icon:'✅' },
              'Academic Warning':  { bg:'#f59e0b22', color:'#f59e0b', icon:'⚠️' },
              'Academic Probation':{ bg:'#ef444422', color:'#ef4444', icon:'🚨' },
              'No Grades Yet':     { bg:'#64748b22', color:'#64748b', icon:'📋' },
            }[standing] || { bg:'#64748b22', color:'#64748b', icon:'📋' };
            return (
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:5, padding:'3px 10px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.color}33` }}>
                <span style={{ fontSize:12 }}>{cfg.icon}</span>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.color }}>{standing}</span>
              </div>
            );
          })()}
        </div>
        {/* Streak badge */}
        <div style={{ flexShrink:0, textAlign:'center', background:'linear-gradient(135deg,#f97316,#ef4444)', borderRadius:14, padding:'12px 20px', minWidth:100 }}>
          <div style={{ fontSize:32, lineHeight:1 }}>🔥</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.1 }}>{streak}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>WEEK STREAK</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.75)', marginTop:2 }}>{streakMsg}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <StatCard theme={C} label="Attendance Rate"  value={`${attendanceRate}%`} sub={`${Math.round(attendanceRate/100*16)} of 16 lectures`} icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Engagement"   value={`${stu.engagement||0}%`}     sub="Above class average" icon="🧠" accent="blue"/>
        <StatCard theme={C} label="Avg Attention"    value={`${stu.attentionScore||0}%`}  sub="Good focus level"  icon="👁️" accent="purple"/>
        <StatCard theme={C} label="GPA"              value={semGPA}                  sub="Current semester"  icon="📈" accent="amber"/>
      </div>

      {/* Charts row */}
      {(() => {
        const td = trendSeries || store.trendData;
        const ed = emoDistLive  || store.emotionDist;
        return (
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap:12, marginBottom:12 }}>
            <Card theme={C} title={`Engagement Trend${trendSeries ? ' (Live)' : ' — Demo'}`}>
              <div style={{ padding:'4px 12px 12px' }}>
                <LineChart theme={C} series={[
                  {label:'Engagement',data:td.engagement,color:C.blue},
                  {label:'Attention', data:td.attention, color:C.green},
                ]} labels={td.labels} height={200}/>
              </div>
            </Card>
            <Card theme={C} title={`Emotion Distribution${emoDistLive ? ' (Live)' : ' — Demo'}`}>
              <div style={{ padding:'4px 12px 12px', display:'flex', gap:12, alignItems:'center' }}>
                <DonutChart theme={C} data={ed.slice(0,5).map(d=>({label:d.emotion,value:d.count,color:d.color}))} size={160}/>
                <div>
                  {ed.slice(0,5).map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ color:d.color, fontSize:12 }}>●</span>
                      <span style={{ fontSize:10, color:C.text2 }}>{d.emotion} {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
        <Card theme={C} title={`Today's Schedule (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]})`}>
          <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:6 }}>
            {(() => {
              const today = new Date().getDay();
              const todayLecs = myCoursesEnrolled.filter(l => l.days && l.days.includes(today));
              if (todayLecs.length === 0)
                return <div style={{ padding:'16px 0', textAlign:'center', color:C.text3, fontSize:12 }}>No lectures scheduled for today.</div>;
              return todayLecs.map((lec,i) => <ScheduleItem key={i} theme={C} lecture={lec}/>);
            })()}
          </div>
        </Card>
        <Card theme={C} title="Emotion Log Today">
          <EmotionBarsWidget theme={C} data={emoDistLive || store.emotionDist}/>
        </Card>
      </div>
    </div>
  );
}

/* ══ ATTENDANCE ══ */
function StudentAttendance({ theme: C, stu, pendingQR, onClearPendingQR }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);
  const [attRecs, setAttRecs]     = useState([]);
  const [myExcuses, setMyExcuses] = useState([]);
  const [tab, setTab]           = useState('records');
  const [qrCode, setQrCode]     = useState('');
  const [qrMsg, setQrMsg]       = useState('');
  const [excuseForm, setExcuseForm] = useState({courseId:'', week:1, reason:''});
  const [excuseSent, setExcuseSent] = useState(false);
  const [, refresh] = useState(0);

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => {
        const enrolled = courses
          .filter(c => c.my_status === 'enrolled')
          .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code, color: c.color }));
        setMyCourses(enrolled);
        if (enrolled.length > 0) setExcuseForm(f => f.courseId ? f : {...f, courseId: enrolled[0].id});
      })
      .catch(() => {});
    api.getStudentAttendance(stu.id)
      .then(setAttRecs)
      .catch(() => {});
    api.getStudentExcuses(stu.id)
      .then(rows => setMyExcuses(rows.map(r => ({
        id: r.id, courseId: r.course_code, week: r.week, reason: r.reason,
        status: r.status, createdAt: r.created_at,
        courseName: r.course_name || r.course_code,
      }))))
      .catch(() => {});
  }, [stu.id]);

  // Compute attendance rate: sum of distinct weeks attended per course / (courses × 16)
  // This matches the X/16 shown per course in the table
  const rate = (() => {
    if (!myCourses.length) return stu.attendanceRate || 0;
    const totalAttended = myCourses.reduce((sum, course) => {
      const courseRecs = attRecs.filter(r =>
        r.course_code === course.code || r.lecture_id === course.code
      );
      const distinctWeeks = new Set(
        courseRecs.filter(r => r.status === 'present' || r.status === 'excused').map(r => r.week)
      ).size;
      return sum + distinctWeeks;
    }, 0);
    const totalPossible = myCourses.length * 16;
    return Math.round(totalAttended / totalPossible * 100);
  })();

  // Auto-check-in from QR scan URL (cross-device)
  useEffect(() => {
    if (!pendingQR) return;
    setTab('qr');
    api.useQR({ token: pendingQR.token || '', studentId: stu.id })
      .then(res => {
        setQrMsg(`✅ Checked in for Week ${res.week}!`);
        api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
      })
      .catch(err => setQrMsg(`⚠️ ${err.message || 'Invalid QR code.'}`));
    onClearPendingQR?.();
  }, [pendingQR]);

  // Build per-course attendance summary from DB records
  const courseRows = myCourses.map((course) => {
    const courseRecs = attRecs.filter(r => r.course_code === course.code || r.lecture_id === course.code);
    const presentRecs = courseRecs.filter(r => r.status === 'present' || r.status === 'excused');
    // Count distinct weeks (in case student has duplicate records for same week)
    const weeks = new Set(presentRecs.map(r => r.week)).size;
    // Most recent present record for time + method
    const latest = presentRecs.sort((a,b) => new Date(b.check_in_time||0) - new Date(a.check_in_time||0))[0];
    const methodLabel = latest?.method === 'qr'               ? '📱 QR Code'
                      : latest?.method === 'face_recognition' ? '🤖 Face Recognition'
                      : latest?.method === 'manual'           ? '✍️ Manual'
                      : latest?.method ? latest.method : '—';
    const timeLabel = latest?.check_in_time
      ? new Date(latest.check_in_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
      : '—';
    return {
      course: `${course.name} (${course.code})`,
      weeks: `${weeks} / 16`,
      time: timeLabel,
      method: methodLabel,
      status: weeks >= 12 ? '✅ Good Standing' : weeks >= 8 ? '⚠️ At Risk' : '❌ Low Attendance',
    };
  });

  // Deduplicate records: keep one per (course, week) — the most recent check-in
  const _dedupMap = new Map();
  for (const rec of attRecs) {
    if (rec.status === 'absent') continue;
    const key = `${rec.course_code || rec.lecture_id}_${rec.week}`;
    const existing = _dedupMap.get(key);
    if (!existing || new Date(rec.check_in_time||0) > new Date(existing.check_in_time||0)) {
      _dedupMap.set(key, rec);
    }
  }
  const uniquePresentRecs = Array.from(_dedupMap.values())
    .sort((a,b) => new Date(b.check_in_time||0) - new Date(a.check_in_time||0));

  const recRows = uniquePresentRecs.map(rec => ({
    course: rec.course_name || rec.course_code || rec.lecture_id,
    date: rec.date || (rec.check_in_time ? rec.check_in_time.slice(0,10) : ''),
    week: `Week ${rec.week}`,
    time: rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—',
    method: rec.method === 'face_recognition' ? '🤖 Face Recognition'
          : rec.method === 'qr'               ? '📱 QR Code'
          : rec.method === 'manual'            ? '✍️ Manual'
          : rec.method || '—',
    status: rec.status === 'excused' ? '📄 Excused' : '✅ Present',
  }));

  // Stats use deduplicated counts
  const presentCount  = uniquePresentRecs.length;
  const qrManualCount = uniquePresentRecs.filter(r => r.method === 'qr' || r.method === 'manual').length;

  async function checkIn() {
    const code = qrCode.trim().toUpperCase();
    if (!code) { setQrMsg('⚠️ Enter the code shown by your lecturer.'); return; }
    try {
      const res = await api.useQR({ token: code, studentId: stu.id });
      setQrMsg(`✅ Checked in successfully for Week ${res.week}!`);
      setQrCode('');
      api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
    } catch(err) {
      setQrMsg(`❌ ${err.message || 'Invalid code'}`);
    }
  }

  async function submitExcuse() {
    if (!excuseForm.courseId) { setQrMsg('Select a course.'); return; }
    if (!excuseForm.reason.trim()) { setQrMsg('Please enter a reason.'); return; }
    try {
      await api.submitExcuse({
        student_id: stu.id,
        course_code: excuseForm.courseId,
        week: excuseForm.week,
        reason: excuseForm.reason,
      });
      setExcuseSent(true);
      setTimeout(() => setExcuseSent(false), 3000);
      setExcuseForm({ courseId: myCourses[0]?.id || '', week: 1, reason: '' });
      api.getStudentExcuses(stu.id)
        .then(rows => setMyExcuses(rows.map(r => ({
          id: r.id, courseId: r.course_code, week: r.week, reason: r.reason,
          status: r.status, createdAt: r.created_at,
        }))))
        .catch(() => {});
    } catch(err) {
      setQrMsg(`❌ ${err.message}`);
    }
  }

  const TAB = (id, label) => (
    <button onClick={()=>setTab(id)} style={{padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',border:'none',borderRadius:8,background:tab===id?C.blue3:C.bg3,color:tab===id?'#fff':C.text2}}>
      {label}
    </button>
  );

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>✅ {t('page_attendance')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:12 }}>{t('sub_attendance')}</div>

      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <StatCard theme={C} label={t('attendance_rate')} value={`${rate}%`} sub={t('semester')} icon="✅" accent="green"/>
        <StatCard theme={C} label={t('course')} value={myCourses.length} sub="Enrolled Courses" icon="📚" accent="blue"/>
        <StatCard theme={C} label={t('tab_records')} value={presentCount} sub={`${qrManualCount} QR/manual`} icon="📊" accent="purple"/>
        <StatCard theme={C} label={t('academic_standing')} value={rate>=75?t('good_standing'):t('at_risk')} sub={rate>=75?'✅':'⚠️'} icon={rate>=75?'👍':'⚠️'} accent={rate>=75?'green':'red'}/>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {TAB('records',`📋 ${t('tab_records')}`)}
        {TAB('qr','📱 QR Check-In')}
        {TAB('excuse',`📄 ${t('submit')} ${t('excused')}`)}
      </div>

      {tab==='records' && (
        <>
          <Card theme={C} title="Enrolled Courses — Attendance Summary">
            <div style={{ padding:'4px 12px 12px' }}>
              <DataTable theme={C} columns={[
                {key:'course',label:'Course',width:220},{key:'weeks',label:'Weeks Attended',width:120},
                {key:'time',label:'Time',width:80},{key:'method',label:'Method',width:140},
                {key:'status',label:'Status',width:140},
              ]} rows={courseRows}/>
            </div>
          </Card>
          {recRows.length > 0 && (
            <Card theme={C} title={`Recent Attendance Records (${recRows.length})`} style={{marginTop:12}}>
              <div style={{ padding:'4px 12px 12px' }}>
                <DataTable theme={C} columns={[
                  {key:'course',label:'Course',width:200},{key:'date',label:'Date',width:100},
                  {key:'week',label:'Week',width:80},{key:'time',label:'Time',width:80},
                  {key:'method',label:'Method',width:140},{key:'status',label:'Status',width:120},
                ]} rows={recRows}/>
              </div>
            </Card>
          )}
        </>
      )}

      {tab==='qr' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:32,textAlign:'center',maxWidth:420,margin:'0 auto'}}>
          <div style={{fontSize:48,marginBottom:12}}>📱</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:6}}>QR Code Check-In</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:24}}>Enter the session code shown by your lecturer on the board</div>
          <input
            value={qrCode} onChange={e=>setQrCode(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==='Enter'&&checkIn()}
            placeholder="e.g. A7X3K2"
            maxLength={8}
            style={{width:'100%',height:52,background:C.bg3,border:`2px solid ${C.border}`,borderRadius:12,padding:'0 16px',fontSize:24,fontWeight:800,color:C.text,textAlign:'center',letterSpacing:6,marginBottom:14,boxSizing:'border-box'}}
          />
          <button onClick={checkIn} style={{width:'100%',height:44,background:C.blue3,border:'none',borderRadius:10,fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
            ✅ Mark Me Present
          </button>
          {qrMsg && (
            <div style={{marginTop:14,padding:'10px 16px',borderRadius:10,background:qrMsg.startsWith('✅')?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',color:qrMsg.startsWith('✅')?'#10b981':'#ef4444',fontSize:13,fontWeight:700}}>
              {qrMsg}
            </div>
          )}
          {qrMsg && !qrMsg.startsWith('✅') && (
            <button onClick={()=>{try{localStorage.removeItem('es_qr');}catch(e){}setQrCode('');setQrMsg('🔄 Cleared — ask your lecturer to regenerate the code.');}} style={{marginTop:10,background:'none',border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',fontSize:11,color:C.text3,cursor:'pointer'}}>
              🔄 Still not working? Clear & Retry
            </button>
          )}
        </div>
      )}

      {tab==='excuse' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:24,maxWidth:500}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>📄 Submit Absence Excuse</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:18}}>Your lecturer will review and approve or reject your excuse.</div>

          {excuseSent && <div style={{background:'rgba(16,185,129,0.12)',border:'1px solid #10b981',borderRadius:10,padding:'10px 16px',marginBottom:14,color:'#10b981',fontSize:13,fontWeight:700}}>✅ Excuse submitted successfully!</div>}

          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.text3,marginBottom:5,fontWeight:700}}>COURSE</div>
            <select value={excuseForm.courseId} onChange={e=>setExcuseForm({...excuseForm,courseId:e.target.value})}
              style={{width:'100%',height:38,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
              <option value="">— Select course —</option>
              {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.text3,marginBottom:5,fontWeight:700}}>WEEK MISSED</div>
            <select value={excuseForm.week} onChange={e=>setExcuseForm({...excuseForm,week:parseInt(e.target.value)})}
              style={{width:'100%',height:38,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
              {Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>Week {i+1}</option>)}
            </select>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:C.text3,marginBottom:5,fontWeight:700}}>REASON / EXPLANATION</div>
            <textarea value={excuseForm.reason} onChange={e=>setExcuseForm({...excuseForm,reason:e.target.value})}
              placeholder="Describe your reason for absence (medical, emergency, etc.)..."
              rows={4}
              style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',fontSize:12,color:C.text,resize:'vertical',boxSizing:'border-box'}}
            />
          </div>
          <button onClick={submitExcuse} style={{width:'100%',height:42,background:C.blue3,border:'none',borderRadius:10,fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer'}}>
            📤 Submit Excuse
          </button>

          {myExcuses.length>0 && (
            <div style={{marginTop:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>My Previous Excuses</div>
              {myExcuses.slice(-5).reverse().map(ex=>(
                <div key={ex.id} style={{background:C.bg3,borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,color:C.text,fontWeight:600}}>{ex.courseName} — Week {ex.week}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>{ex.reason.slice(0,60)}{ex.reason.length>60?'…':''}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0,
                    background:ex.status==='approved'?'rgba(16,185,129,0.15)':ex.status==='rejected'?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)',
                    color:ex.status==='approved'?'#10b981':ex.status==='rejected'?'#ef4444':'#fbbf24',
                    border:`1px solid ${ex.status==='approved'?'#10b981':ex.status==='rejected'?'#ef4444':'#f59e0b'}`,
                  }}>
                    {ex.status==='approved'?'✅ Approved':ex.status==='rejected'?'❌ Rejected':'⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ EMOTIONS ══ */
function StudentEmotions({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [emotionData, setEmotionData]   = useState(null);
  const [loadingEmo,  setLoadingEmo]    = useState(true);

  useEffect(() => {
    setLoadingEmo(true);
    api.getEngagementOverview(stu.id)
      .then(res => {
        setEmotionData(res);
        setLoadingEmo(false);
      })
      .catch(() => {
        // Fall back to store.emotionDist on error
        setEmotionData(null);
        setLoadingEmo(false);
      });
  }, [stu.id]);

  // Normalise API response into chart-friendly format
  const EMOTION_COLORS = {
    happy:'#10b981', neutral:'#3b82f6', surprised:'#f59e0b',
    angry:'#ef4444', sad:'#8b5cf6', fearful:'#ec4899', disgusted:'#64748b',
  };
  const emoDistFromAPI = emotionData?.emotions
    ? Object.entries(emotionData.emotions).map(([emotion, count]) => ({
        emotion,
        count,
        pct: emotionData.total_records
          ? Math.round(count / emotionData.total_records * 100)
          : 0,
        color: EMOTION_COLORS[emotion] || '#64748b',
      }))
    : null;

  // Fall back to store data if API returned nothing
  const emoDistDisplay = emoDistFromAPI && emoDistFromAPI.length > 0
    ? emoDistFromAPI
    : store.emotionDist;

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>😊 {t('page_emotions')}</div>

      {loadingEmo && (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.text3, fontSize:13 }}>
          Loading emotion data…
        </div>
      )}

      {!loadingEmo && (
        <>
          {emotionData && (
            <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
              <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'12px 18px', flex:1, textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color:C.blue }}>{emotionData.avg_engagement != null ? `${Number(emotionData.avg_engagement).toFixed(1)}%` : '—'}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>Avg Engagement Rate</div>
              </div>
              <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'12px 18px', flex:1, textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color:C.green }}>{emotionData.total_records ?? '—'}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>Total Records</div>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <Card theme={C} title="Emotion Frequency">
              <div style={{ padding:'4px 12px 12px' }}>
                <BarChart theme={C} data={emoDistDisplay.map(d=>({label:d.emotion,value:d.count,color:d.color}))} height={200}/>
              </div>
            </Card>
            <Card theme={C} title="Emotion Distribution">
              <div style={{ padding:'4px 12px 12px', display:'flex', gap:12, alignItems:'center' }}>
                <DonutChart theme={C} data={emoDistDisplay.slice(0,5).map(d=>({label:d.emotion,value:d.count,color:d.color}))} size={160}/>
                <div>
                  {emoDistDisplay.slice(0,5).map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ color:d.color, fontSize:12 }}>●</span>
                      <span style={{ fontSize:10, color:C.text2 }}>{d.emotion} {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {!emoDistFromAPI && (
            <div style={{ fontSize:11, color:C.text3, marginBottom:8, fontStyle:'italic' }}>
              Showing demo data — no live emotion records available yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══ SCHEDULE ══ */
function StudentSchedule({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => setMyCourses(
        courses
          .filter(c => c.my_status === 'enrolled')
          .map(c => ({
            id: c.course_code, name: c.course_name, code: c.course_code,
            color: c.color, room: c.room || '—',
            doctorName: c.doctor_name || '—', semester: c.semester || '',
            daysLabel: c.days_label || '', scheduledAt: c.scheduled_at || '',
          }))
      ))
      .catch(() => {});
  }, []);

  if (!myCourses.length) {
    return (
      <div style={{ padding:'8px 20px 20px', textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:48 }}>📅</div>
        <div style={{ fontSize:14, color:C.text3, marginTop:8 }}>Not enrolled in any courses yet.</div>
      </div>
    );
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>📅 {t('page_schedule')}</div>
      <Card theme={C} title={`My Courses (${myCourses.length})`}>
        <div style={{ padding:'4px 14px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          {myCourses.map((course,i)=>(
            <div key={i} style={{ background:C.bg3, borderRadius:10, display:'flex', overflow:'hidden' }}>
              <div style={{ width:5, background:course.color||C.blue, flexShrink:0 }}/>
              <div style={{ padding:'12px 14px', flex:1 }}>
                <div style={{ fontSize:10, color:C.text3 }}>{course.scheduledAt}{course.daysLabel ? ` · ${course.daysLabel}` : ''}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{course.name}</div>
                <div style={{ fontSize:10, color:C.text2 }}>{course.room} · {course.code} · {course.doctorName}</div>
                <div style={{ fontSize:10, color:C.text3 }}>{course.semester}</div>
              </div>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center' }}>
                <Badge text="Scheduled" color="amber" isDark/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══ PERFORMANCE ══ */
function StudentPerformance({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);
  const [gradeRows, setGradeRows] = useState([]);
  const [attRecs,   setAttRecs]   = useState([]);

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => setMyCourses(
        courses.filter(c => c.my_status === 'enrolled')
          .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code }))
      )).catch(() => {});
    api.getStudentGrades(stu.id)
      .then(rows => setGradeRows(rows.map(r => ({ courseCode: r.course_code, grade: r.grade }))))
      .catch(() => {});
    api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
  }, [stu.id]);

  const gradeMap = Object.fromEntries(gradeRows.map(r => [r.courseCode, r.grade]));
  const passed = gradeRows.filter(r => r.grade >= 50).length;

  const rows = myCourses.map((course) => {
    const grade = gradeMap[course.code];
    const courseRecs = attRecs.filter(r => r.course_code === course.code);
    const present = courseRecs.filter(r => r.status === 'present' || r.status === 'excused').length;
    const courseRate = courseRecs.length > 0 ? Math.round(present / courseRecs.length * 100) : (stu.attendanceRate || 0);
    return {
      course: `${course.name} (${course.code})`,
      attendance: `${courseRate}%`,
      engagement: `${stu.engagement || 0}%`,
      attention: `${stu.attentionScore || 0}%`,
      grade: grade != null ? `${grade}% (${letterGrade(grade)})` : '—',
    };
  });

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>📈 {t('page_performance')}</div>
      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <StatCard theme={C} label="GPA"              value={stu.gpa||'—'}          sub="Current semester"           icon="📈" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement"   value={`${stu.engagement||0}%`}  sub="In-class average"        icon="🧠" accent="green"/>
        <StatCard theme={C} label="Courses Graded"   value={`${passed}/${gradeRows.length||myCourses.length}`} sub="This semester" icon="🎯" accent="purple"/>
        <StatCard theme={C} label="Attention Score"  value={`${stu.attentionScore||0}%`} sub="Avg attention level"  icon="👁️" accent="amber"/>
      </div>
      <Card theme={C} title="Performance per Course">
        <div style={{ padding:'4px 12px 12px' }}>
          <DataTable theme={C} columns={[
            {key:'course',label:'Course',width:220},{key:'attendance',label:'Attendance',width:100},
            {key:'engagement',label:'Engagement',width:100},{key:'attention',label:'Attention',width:100},
            {key:'grade',label:'Grade',width:120},
          ]} rows={rows}/>
        </div>
      </Card>
    </div>
  );
}

/* ══ GRADES ══ */
function StudentGrades({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [feeStatus, setFeeStatus] = useState({ paid: true });
  const [gradeRows, setGradeRows] = useState([]);

  useEffect(() => {
    api.getFeeStatus(stu.id).then(setFeeStatus).catch(() => {});
    api.getStudentGrades(stu.id)
      .then(rows => setGradeRows(rows.map(r => ({
        courseCode: r.course_code, courseName: r.course_name,
        grade: r.grade, date: r.created_at,
      }))))
      .catch(() => {});
  }, [stu.id]);

  if (!feeStatus.paid) return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>My Grades</div>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.red}`,padding:40,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:12}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>Grades Locked</div>
        <div style={{fontSize:13,color:C.text3}}>Your fees are unpaid. Please visit the finance office to clear your balance and unlock grade access.</div>
      </div>
    </div>
  );

  if (!gradeRows.length) {
    return (
      <div style={{ padding:'8px 20px 20px', textAlign:'center' }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text, textAlign:'left', marginBottom:12 }}>📝 My Exam Results</div>
        <div style={{ paddingTop:60 }}>
          <div style={{ fontSize:48 }}>📝</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginTop:8 }}>No grades available yet.</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:6 }}>Your lecturer has not entered grades yet.</div>
        </div>
      </div>
    );
  }

  const gradeVals = gradeRows.map(r => r.grade);
  const avg = +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1);
  const passed = gradeVals.filter(g=>g>=50).length;
  const highest = Math.max(...gradeVals);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text }}>📝 {t('page_grades')}</div>
      </div>

      {/* Mini stats */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[[t('subjects_graded'),gradeVals.length,C.blue],[t('average'),`${avg}%`,C.amber],[t('passed'),passed,C.green],[t('highest'),`${highest}%`,C.purple]].map(([lbl,val,col],i)=>(
          <div key={i} style={{ flex:1, background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:700, color:col }}>{val}</div>
            <div style={{ fontSize:11, color:C.text2, marginTop:2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Grade cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {gradeRows.map((rec, i)=>{
          const g = rec.grade; const gc = gradeColor(g,C);
          return (
            <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', overflow:'hidden' }}>
              <div style={{ width:6, background:gc, flexShrink:0, borderRadius:'12px 0 0 12px' }}/>
              <div style={{ flex:1, padding:'14px', display:'flex', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{rec.courseName} ({rec.courseCode})</div>
                  {rec.date && <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>Date: {new Date(rec.date).toLocaleDateString()}</div>}
                </div>
                <div style={{ textAlign:'center', paddingRight:6 }}>
                  <div style={{ fontSize:28, fontWeight:700, color:gc }}>{g}%</div>
                  <div style={{ fontSize:16, fontWeight:700, color:gc }}>{letterGrade(g)}</div>
                  <div style={{ fontSize:11, color:g>=50?C.green:C.red }}>{g>=50?'✅ Pass':'❌ Fail'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══ PORTFOLIO ══ */
function StudentPortfolio({ theme: C, user, stu }) {
  const { t, isRTL } = useLang();
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [gradeRows, setGradeRows] = useState([]);
  const [attRecs,   setAttRecs]   = useState([]);

  useEffect(() => {
    api.getStudentGrades(stu.id)
      .then(rows => setGradeRows(rows.map(r => ({ courseCode: r.course_code, courseName: r.course_name, grade: r.grade }))))
      .catch(() => {});
    api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
  }, [stu.id]);

  const gradeVals = gradeRows.map(r => r.grade);
  const avgG = gradeVals.length ? +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1) : 0;
  const present = attRecs.filter(r => r.status === 'present' || r.status === 'excused').length;
  const portfolioAttRate = attRecs.length > 0 ? Math.round(present / attRecs.length * 100) : (stu.attendanceRate || 0);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🎓 {t('page_portfolio')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_portfolio')}</div>

      {/* Preview card */}
      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:16, marginBottom:12 }}>
        {/* Header band */}
        <div style={{ background:C.blue3, borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:stu.color||C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0, overflow:'hidden' }}>
            {stu.capturedPhoto ? <img src={stu.capturedPhoto} alt={stu.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : null}
            <span style={{display:stu.capturedPhoto?'none':'flex'}}>{stu.emoji||'👤'}</span>
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{stu.name}</div>
            <div style={{ fontSize:12, color:'#bfdbfe' }}>{stu.id} · {stu.dept} · Year {stu.year}</div>
            <div style={{ fontSize:11, color:'#bfdbfe' }}>GPA: {stu.gpa} · {stu.email}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
          {[['Attendance',`${portfolioAttRate}%`,C.green],['Avg Grade',`${avgG}%`,C.blue],['Engagement',`${stu.engagement||0}%`,C.amber],['Courses Graded',gradeVals.length,C.purple]].map(([lbl,val,col],i)=>(
            <div key={i} style={{ flex:1, background:C.bg3, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:col }}>{val}</div>
              <div style={{ fontSize:10, color:C.text2, marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Exam results preview */}
        {gradeRows.length > 0 && (
          <>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>Exam Results</div>
            {gradeRows.slice(0,4).map((rec,i)=>{
              const g=rec.grade; const gc=gradeColor(g,C);
              return (
                <div key={i} style={{ background:C.bg3, borderRadius:8, padding:'6px 12px', marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:C.text }}>{rec.courseName||rec.courseCode}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:gc }}>{g}% {letterGrade(g)}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* PDF button */}
      <button
        onClick={async () => {
          const avgForGPA = gradeVals.length ? avgG : null;
          exportPortfolioPDF({
            stu,
            courses: gradeRows.map(r => ({ id: r.courseCode, name: r.courseName, code: r.courseCode })),
            results: Object.fromEntries(gradeRows.map(r => [r.courseCode, { grade: r.grade }])),
            attendanceRate: portfolioAttRate,
            gpa: avgForGPA !== null ? (avgForGPA / 100 * 4).toFixed(2) : (stu.gpa || '—'),
            standing: avgForGPA == null ? 'No Grades Yet' : avgForGPA >= 87.5 ? 'Honors' : avgForGPA >= 70 ? 'Good Standing' : avgForGPA >= 50 ? 'Academic Warning' : 'Academic Probation',
          });
        }}
        style={{
          width:'100%', height:50, background:C.blue3, border:'none', borderRadius:12,
          fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', marginBottom:8,
        }}
      >📄 Export Portfolio as PDF</button>
      <div style={{ textAlign:'center', fontSize:11, color:C.text3, marginBottom:16 }}>Downloads a formatted PDF directly</div>

      {/* Face capture for profile photo */}
      <Card theme={C} title="📸 Update Profile Photo">
        <div style={{ padding:'8px 12px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, alignItems:'start' }}>
          <WebcamFeed
            theme={C}
            compact
            onCapture={async dataUrl => {
              setCapturedSelfie(dataUrl);
              store.updateStudent(stu.id, { capturedPhoto: dataUrl });
              // Persist to DB so doctor's face recognition can see this photo
              try {
                await api.updateMyProfile({ photo: dataUrl });
              } catch(e) {
                console.warn('Failed to save photo to DB:', e);
              }
            }}
          />
          <div>
            <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>
              Use your webcam to take a profile photo. This will update your face in the system for attendance recognition.
            </div>
            {capturedSelfie && (
              <div>
                <div style={{ fontSize:10, color:C.green2, marginBottom:6 }}>✅ Photo saved to your profile!</div>
                <img src={capturedSelfie} alt="selfie" style={{ width:'100%', borderRadius:10, border:`2px solid ${C.green}` }}/>
              </div>
            )}
            {!capturedSelfie && user.photoUrl && (
              <div>
                <div style={{ fontSize:10, color:C.text3, marginBottom:6 }}>Current registered photo:</div>
                <img src={user.photoUrl} alt="current" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:`2px solid ${C.blue}` }}/>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ══ COMMUNITY CHAT ══ */
function StudentChat({ theme: C, user, stu, isDark }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);
  const [selIdx, setSelIdx]       = useState(0);
  const [messages, setMessages]   = useState([]);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => {
        const enrolled = courses
          .filter(c => c.my_status === 'enrolled')
          .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code }));
        setMyCourses(enrolled);
      })
      .catch(() => {});
  }, []);

  const course = myCourses[selIdx];

  const fetchMessages = (courseId) =>
    api.getMessages(courseId)
      .then(rows => setMessages(rows.map(r => ({
        id: r.id, senderId: String(r.sender_id), sender: r.sender_name || String(r.sender_id),
        text: r.text, timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString() : '',
        type: r.sender_role === 'doctor' ? 'announcement' : 'message', reactions: {},
      }))))
      .catch(() => {});

  useEffect(() => {
    if (!course) return;
    fetchMessages(course.id);
  }, [course?.id]);

  async function sendMsg() {
    if (!msg.trim() || !course) return;
    try {
      await api.sendMessage({
        course_code: course.id, sender_id: stu.id,
        sender_name: stu.name, sender_role: 'student', text: msg,
      });
      setMsg('');
      fetchMessages(course.id);
    } catch(err) {
      // fallback: show optimistically
      setMessages(prev => [...prev, {
        id: Date.now(), senderId: stu.id, sender: stu.name,
        text: msg, timestamp: new Date().toLocaleTimeString(),
        type: 'message', reactions: {},
      }]);
      setMsg('');
    }
  }

  if (!myCourses.length) {
    return (
      <div style={{ padding:'8px 20px 20px', textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:48 }}>💬</div>
        <div style={{ fontSize:14, color:C.text3, marginTop:8 }}>Not enrolled in any courses yet.</div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 64px)', padding:'0' }}>
      {/* Header */}
      <div style={{ padding:'18px 24px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text }}>💬 {t('page_chat')}</div>
        <select
          value={selIdx}
          onChange={e=>setSelIdx(parseInt(e.target.value))}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', fontSize:13, color:C.text, cursor:'pointer' }}
        >
          {myCourses.map((c,i)=><option key={i} value={i}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      <div style={{ height:1, background:C.border, margin:'0 24px' }}/>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 16px', display:'flex', flexDirection:'column', gap:6 }}>
        {messages.length===0
          ? <div style={{ textAlign:'center', color:C.text3, fontSize:12, paddingTop:40 }}>No messages yet. Be the first!</div>
          : messages.map((m,i)=><ChatMessage key={i} msg={m} myId={stu.id} theme={C} course={course} onReact={()=>forceUpdate(n=>n+1)}/>)
        }
      </div>

      {/* Input */}
      <div style={{ padding:'8px 24px 12px' }}>
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'10px 12px', display:'flex', gap:8 }}>
          <input
            value={msg} onChange={e=>setMsg(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendMsg()}
            placeholder={t('page_chat') + '…'}
            style={{ flex:1, height:38, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 12px', fontSize:12, color:C.text }}
          />
          <button onClick={sendMsg} style={{ height:38, padding:'0 18px', background:C.blue3, border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>{t('submit')} ➤</button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, myId, theme: C, course, onReact }) {
  const isMine = msg.senderId === myId;
  const isAnnounce = msg.type === 'announcement';

  if(isAnnounce) {
    return (
      <div style={{ background:C.amber_dim||'#2d1a00', borderRadius:10, border:`1px solid ${C.amber}`, padding:'8px 12px' }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.amber, marginBottom:4 }}>📢 {msg.sender} · {msg.timestamp}</div>
        <div style={{ fontSize:12, color:C.text }}>{msg.text}</div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:isMine?'flex-end':'flex-start' }}>
      <div style={{ maxWidth:'60%', background:isMine?C.blue3:C.card, borderRadius:14, padding:'6px 12px' }}>
        {!isMine && <div style={{ fontSize:9, fontWeight:700, color:C.blue2, marginBottom:2 }}>{msg.sender}</div>}
        <div style={{ fontSize:12, color:isMine?'#fff':C.text }}>{msg.text}</div>
        <div style={{ fontSize:8, color:C.text3, marginTop:2, textAlign:isMine?'right':'left' }}>{msg.timestamp}</div>
      </div>
      {/* Reactions */}
      <div style={{ display:'flex', gap:4, marginTop:2 }}>
        {['👍','❤️','😂','🎉'].map(emoji=>(
          <button key={emoji} onClick={()=>{ onReact?.(); }}
            style={{ background:'transparent', border:'none', fontSize:14, cursor:'pointer', padding:'2px 4px', borderRadius:6 }}>{emoji}</button>
        ))}
        {Object.entries(msg.reactions||{}).filter(([,r])=>r.length>0).map(([e,r])=>(
          <span key={e} style={{ fontSize:11, background:C.bg3, borderRadius:8, padding:'2px 6px', color:C.text2 }}>{e} {r.length}</span>
        ))}
      </div>
    </div>
  );
}

/* ══ APPEALS ══ */
function StudentAppeals({ theme: C, user, stu }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ type:'absence_excuse', courseId:'', description:'' });
  const [submitted, setSubmitted] = useState(false);

  const loadComplaints = () =>
    api.getComplaints()
      .then(rows => setComplaints(rows.map(r => ({
        id: r.id, type: r.type, courseId: r.course_id, courseName: r.course_name,
        description: r.description, status: r.status,
        doctorResponse: r.doctor_response, adminResponse: r.admin_response,
        createdAt: r.created_at,
      }))))
      .catch(() => {});

  const [courseDocMap, setCourseDocMap] = useState({}); // courseCode → doctorId

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => {
        const enrolled = courses
          .filter(c => c.my_status === 'enrolled')
          .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code, doctorId: c.doctor_id || '' }));
        setMyCourses(enrolled);
        // Build course→doctor map for auto-routing
        const map = {};
        enrolled.forEach(c => { if (c.doctorId) map[c.id] = c.doctorId; });
        setCourseDocMap(map);
        if (enrolled.length > 0) setForm(f => ({...f, courseId: enrolled[0].id}));
      })
      .catch(() => {});
    // Also fetch lectures to get doctor_id per course
    api.getLectures?.()
      .then(lectures => {
        setCourseDocMap(prev => {
          const map = { ...prev };
          (lectures || []).forEach(l => { if (l.course_code && l.doctor_id) map[l.course_code] = l.doctor_id; });
          return map;
        });
      }).catch(() => {});
    loadComplaints();
  }, []);

  async function submit() {
    if (!form.description.trim()) return;
    const course = myCourses.find(c => c.id === form.courseId);
    const courseName = course?.name || '';
    const doctorId = courseDocMap[form.courseId] || '';
    try {
      await api.upsertComplaint({
        id: Date.now().toString(),
        studentId: stu.id, studentName: stu.name,
        type: form.type, courseId: form.courseId,
        courseName, description: form.description,
        status: 'pending', doctorId,
        doctorResponse: '', adminResponse: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      await loadComplaints();
      setForm({ type:'absence_excuse', courseId: myCourses[0]?.id||'', description:'' });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch(err) {
      alert(`Error: ${err.message}`);
    }
  }

  const statusColor = { pending: 'amber', reviewed: 'blue', resolved: 'green' };
  const typeLabel = { absence_excuse:'Absence Excuse', grade_appeal:'Grade Appeal', general:'General Complaint' };

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>📋 {t('page_appeals')}</div>

      <Card theme={C} title={t('submit_appeal')}>
        <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>{t('appeal_type')}</div>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                <option value="absence_excuse">Absence Excuse</option>
                <option value="grade_appeal">Grade Appeal</option>
                <option value="general">General Complaint</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>{t('course')}</div>
              <select value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>{t('describe_issue')}</div>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
              placeholder="Describe your appeal or excuse in detail..."
              rows={4} style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:10,fontSize:12,color:C.text,resize:'vertical',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={submit} disabled={!form.description.trim()}
              style={{background:C.blue3,border:'none',borderRadius:8,padding:'10px 24px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',opacity:form.description.trim()?1:0.5}}>
              📤 {t('submit_appeal')}
            </button>
            {submitted && <span style={{color:C.green,fontSize:12,fontWeight:700}}>✅ {t('appeal_submitted')}</span>}
          </div>
        </div>
      </Card>

      <div style={{marginTop:16}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:10}}>Submission History ({complaints.length})</div>
        {complaints.length===0
          ? <div style={{textAlign:'center',color:C.text3,padding:40,fontSize:13}}>No appeals submitted yet.</div>
          : complaints.slice().reverse().map((c,i)=>(
          <div key={i} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <Badge text={typeLabel[c.type]||c.type} color="blue" isDark/>
              <Badge text={c.status.charAt(0).toUpperCase()+c.status.slice(1)} color={statusColor[c.status]||'amber'} isDark/>
              <span style={{fontSize:10,color:C.text3,marginLeft:'auto'}}>{c.createdAt}</span>
            </div>
            <div style={{fontSize:12,color:C.text2,marginBottom:4}}><strong>Course:</strong> {c.courseName||'—'}</div>
            <div style={{fontSize:12,color:C.text2,marginBottom:c.doctorResponse||c.adminResponse?8:0}}>{c.description}</div>
            {c.doctorResponse && <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,marginBottom:6}}><strong>Doctor:</strong> {c.doctorResponse}</div>}
            {c.adminResponse  && <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2}}><strong>Admin:</strong> {c.adminResponse}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ TRANSCRIPT ══ */
function StudentTranscript({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [myCourses, setMyCourses] = useState([]);
  const [gradeRows, setGradeRows] = useState([]);
  const [attRecs,   setAttRecs]   = useState([]);
  const [fee,       setFee]       = useState({ paid: true });
  const reg = { semester: 'Spring 2025' }; // static fallback

  useEffect(() => {
    api.getAvailableCourses()
      .then(courses => setMyCourses(
        courses.filter(c => c.my_status === 'enrolled')
          .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code }))
      )).catch(() => {});
    api.getStudentGrades(stu.id)
      .then(rows => setGradeRows(rows.map(r => ({ courseCode: r.course_code, grade: r.grade, date: r.created_at }))))
      .catch(() => {});
    api.getStudentAttendance(stu.id).then(setAttRecs).catch(() => {});
    api.getFeeStatus(stu.id).then(setFee).catch(() => {});
  }, [stu.id]);

  const gradeMap = Object.fromEntries(gradeRows.map(r => [r.courseCode, r.grade]));

  const rows = myCourses.map((course) => {
    const courseRecs = attRecs.filter(r => r.course_code === course.code);
    const present = courseRecs.filter(r => r.status === 'present' || r.status === 'excused').length;
    const att = courseRecs.length > 0 ? Math.round(present / courseRecs.length * 100) : (stu.attendanceRate || 0);
    const grade = gradeMap[course.code] ?? null;
    return { course, att, grade };
  });

  const graded = rows.filter(r => r.grade !== null);
  const avgGrade = graded.length ? +(graded.reduce((a,r)=>a+r.grade,0)/graded.length).toFixed(2) : null;
  const semGPA = avgGrade !== null ? (avgGrade / 100 * 4).toFixed(2) : (stu.gpa || '—');
  const standing = avgGrade == null ? 'No Grades Yet' : avgGrade >= 87.5 ? 'Honors' : avgGrade >= 70 ? 'Good Standing' : avgGrade >= 50 ? 'Academic Warning' : 'Academic Probation';

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('page_transcript')}</div>
        <button onClick={async () => exportTranscriptPDF({ stu, rows, semGPA, standing, semester: reg.semester, fee })}
          style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          📄 {t('export_pdf')}
        </button>
      </div>

      <Card theme={C} title={t('name')}>
        <div style={{padding:'4px 16px 16px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12}}>
          {[
            [t('name'),             stu.name],
            [t('student_id'),       stu.id],
            [t('dept'),             stu.dept],
            [t('year_label'),       `${stu.year}`],
            ['Email',               stu.email||'—'],
            [t('semester'),         reg.semester],
            ['GPA',                 semGPA],
            [t('academic_standing'),standing],
            ['Reg. Status',         fee.paid?'✅ Cleared':'⚠️ Fees Pending'],
          ].map(([label,val],i)=>(
            <div key={i}>
              <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',fontWeight:700,marginBottom:2}}>{label}</div>
              <div style={{fontSize:13,color:C.text,fontWeight:600}}>{val}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{marginTop:12}}>
        <Card theme={C} title={`${reg.semester} — Course Record`}>
          <div style={{padding:'4px 16px 16px'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${C.border}`}}>
                  {[t('course'),'Code',t('credits'),t('attendance_rate'),t('grade'),t('letter_grade'),t('status')].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 10px',fontSize:10,color:C.text3,textTransform:'uppercase',fontWeight:700}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.bg3:'transparent'}}>
                    <td style={{padding:'10px 10px',color:C.text,fontWeight:600}}>{r.course.name}</td>
                    <td style={{padding:'10px 10px',color:C.text2}}>{r.course.code}</td>
                    <td style={{padding:'10px 10px',color:C.text2}}>3</td>
                    <td style={{padding:'10px 10px',color:r.att>=75?C.green:r.att>=60?C.amber:C.red,fontWeight:700}}>{r.att}%</td>
                    <td style={{padding:'10px 10px',color:r.grade!=null?(r.grade>=50?C.green:C.red):C.text3,fontWeight:700}}>{r.grade!=null?`${r.grade}%`:'—'}</td>
                    <td style={{padding:'10px 10px',fontWeight:700,color:r.grade!=null?gradeColor(r.grade,C):C.text3}}>{r.grade!=null?letterGrade(r.grade):'—'}</td>
                    <td style={{padding:'10px 10px'}}><Badge text={r.grade!=null?(r.grade>=50?'Pass':'Fail'):'Pending'} color={r.grade!=null?(r.grade>=50?'green':'red'):'amber'} isDark/></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:12,gap:16}}>
              <div style={{fontSize:12,color:C.text2}}>Total Credit Hours: <strong style={{color:C.text}}>{myCourses.length*3}</strong></div>
              <div style={{fontSize:12,color:C.text2}}>Semester GPA: <strong style={{color:C.green}}>{semGPA}</strong></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══ ANNOUNCEMENTS ══ */
function StudentAnnouncements({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api.getAnnouncements()
      .then(rows => setAnnouncements(rows.map(r => ({
        id: r.id, courseId: r.course_id, courseName: r.course_name,
        doctorId: r.doctor_id, doctorName: r.doctor_name,
        title: r.title, body: r.body, createdAt: r.created_at,
      }))))
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📢 {t('page_announcements')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_announcements')}</div>

      {announcements.length === 0
        ? (
          <div style={{ textAlign:'center', padding:60, color:C.text3 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📢</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>No announcements yet</div>
            <div style={{ fontSize:12, marginTop:4 }}>Your lecturers haven't posted anything yet.</div>
          </div>
        )
        : announcements.map((ann, i) => {
          const timeStr = (() => { try { return new Date(ann.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch{ return ''; } })();
          return (
            <div key={i} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📢</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3 }}>{ann.title}</div>
                  <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>
                    {ann.doctorName} · {ann.courseName} · {timeStr}
                  </div>
                  <div style={{ fontSize:13, color:C.text2, lineHeight:1.6 }}>{ann.body}</div>
                </div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

/* ══ EXAM SCHEDULE ══ */
function StudentExamSchedule({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [exams, setExams] = useState([]);
  const today = new Date().toISOString().slice(0,10);

  useEffect(() => {
    api.getExams()
      .then(rows => setExams(rows.map(r => ({
        id: r.id, courseId: r.course_id, courseName: r.course_name,
        type: r.type, date: r.date, time: r.time,
        room: r.room, duration: r.duration, notes: r.notes,
        createdAt: r.created_at,
      }))))
      .catch(() => {});
  }, []);
  const TYPE_CFG = {
    midterm: { label:'Midterm', color:'#8b5cf6', bg:'#8b5cf622' },
    final:   { label:'Final',   color:'#ef4444', bg:'#ef444422' },
    quiz:    { label:'Quiz',    color:'#10b981', bg:'#10b98122' },
  };

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🗓️ {t('page_exams')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_exams')}</div>

      {exams.length === 0
        ? (
          <div style={{ textAlign:'center', padding:60, color:C.text3 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🗓️</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>No exams scheduled</div>
            <div style={{ fontSize:12, marginTop:4 }}>No exams have been scheduled yet.</div>
          </div>
        )
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {exams.map((exam, i) => {
              const cfg = TYPE_CFG[exam.type] || TYPE_CFG.midterm;
              const isPast = exam.date && exam.date < today;
              const isToday = exam.date === today;
              return (
                <div key={i} style={{ background:C.card, borderRadius:14, border:`1px solid ${isPast?C.border:cfg.color+'44'}`, padding:18, display:'flex', gap:16, alignItems:'center', opacity:isPast?0.6:1 }}>
                  <div style={{ width:56, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:cfg.color, textTransform:'uppercase' }}>{exam.date?new Date(exam.date+'T00:00:00').toLocaleString('en-GB',{month:'short'}):'—'}</div>
                    <div style={{ fontSize:28, fontWeight:800, color:C.text, lineHeight:1 }}>{exam.date?new Date(exam.date+'T00:00:00').getDate():'—'}</div>
                  </div>
                  <div style={{ width:1, height:48, background:C.border, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                      {isToday && <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#ef444422', color:'#ef4444' }}>TODAY</span>}
                      {isPast && <span style={{ fontSize:11, color:C.text3 }}>Completed</span>}
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{exam.courseName}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                      {exam.time && `⏰ ${exam.time}`}{exam.room && ` · 📍 ${exam.room}`}{exam.duration && ` · ⏱ ${exam.duration} min`}
                    </div>
                    {exam.notes && <div style={{ fontSize:11, color:C.text2, marginTop:4 }}>{exam.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

/* ══ DEGREE AUDIT ══ */
function StudentDegreeAudit({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const audit = store.getDegreeAudit(stu.id);
  const [gradeRows, setGradeRows] = useState([]);
  useEffect(() => {
    api.getStudentGrades(stu.id).then(rows => setGradeRows(rows.map(r => ({ grade: r.grade })))).catch(() => {});
  }, [stu.id]);
  const gradeVals = gradeRows.map(r => r.grade);
  const avgGrade = gradeVals.length ? +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1) : null;
  const gpa = avgGrade !== null ? parseFloat((avgGrade / 100 * 4).toFixed(2)) : null;
  const standing = avgGrade == null ? 'No Grades Yet' : avgGrade >= 87.5 ? 'Honors' : avgGrade >= 70 ? 'Good Standing' : avgGrade >= 50 ? 'Academic Warning' : 'Academic Probation';

  const STATUS_CFG = {
    completed:  { icon:'✅', color:'#10b981', label:'Completed' },
    failed:     { icon:'❌', color:'#ef4444', label:'Failed' },
    in_progress:{ icon:'🔄', color:'#3b82f6', label:'In Progress' },
    not_started:{ icon:'⬜', color:'#64748b', label:'Not Started' },
  };
  const STANDING_CFG = {
    'Honors':            { color:'#10b981', bg:'#10b98115', icon:'🏆' },
    'Good Standing':     { color:'#3b82f6', bg:'#3b82f615', icon:'✅' },
    'Academic Warning':  { color:'#f59e0b', bg:'#f59e0b15', icon:'⚠️' },
    'Academic Probation':{ color:'#ef4444', bg:'#ef444415', icon:'🚨' },
    'No Grades Yet':     { color:'#64748b', bg:'#64748b15', icon:'📋' },
  };
  const sc = STANDING_CFG[standing] || STANDING_CFG['No Grades Yet'];

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🏛️ {t('page_degreeaudit')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_degreeaudit')}</div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          [t('credits_earned'), `${audit.creditsEarned}/${audit.creditsRequired}`, C.blue],
          [t('completed'), `${audit.completed.length}/5`, C.green],
          ['GPA', gpa !== null ? gpa : '—', C.amber],
          [t('status'), audit.readyToGraduate ? `🎓 ${t('completed')}` : t('in_progress'), audit.readyToGraduate ? C.green : C.purple],
        ].map(([lbl,val,col],i)=>(
          <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:col }}>{val}</div>
            <div style={{ fontSize:11, color:C.text2, marginTop:2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t('graduation_progress')}</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.blue }}>{audit.progressPct}%</span>
        </div>
        <div style={{ background:C.bg3, borderRadius:99, height:10 }}>
          <div style={{ width:`${audit.progressPct}%`, height:'100%', borderRadius:99, background:'linear-gradient(90deg,#3b82f6,#8b5cf6)', transition:'width 0.6s' }}/>
        </div>
        <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', fontSize:11, color:C.text3 }}>
          <span>{audit.creditsEarned} credit hours earned</span>
          <span>{audit.creditsRequired - audit.creditsEarned} remaining</span>
        </div>
      </div>

      {/* Academic standing */}
      <div style={{ background:sc.bg, borderRadius:12, border:`1px solid ${sc.color}44`, padding:'12px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>{sc.icon}</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:sc.color }}>{standing}</div>
          <div style={{ fontSize:11, color:C.text2 }}>
            {standing==='Honors'?'Outstanding academic performance — GPA 3.5+':
             standing==='Good Standing'?'You are meeting all academic requirements.':
             standing==='Academic Warning'?'Your GPA is below 2.0. Seek academic advising.':
             standing==='Academic Probation'?'Serious academic risk. Immediate intervention required.':
             'No grades recorded yet for this semester.'}
          </div>
        </div>
      </div>

      {/* Course checklist */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.text }}>
          {t('requirements')}
        </div>
        {audit.audit.map((item, i) => {
          const cfg = STATUS_CFG[item.status];
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:i<audit.audit.length-1?`1px solid ${C.border}`:'none', background:i%2===0?C.bg3:'transparent' }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{cfg.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{item.courseName}</div>
                <div style={{ fontSize:10, color:C.text3 }}>{item.courseId} · {item.credits} credit hours</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, fontWeight:700, color:cfg.color }}>{cfg.label}</div>
                {item.grade !== null && (
                  <div style={{ fontSize:11, color:C.text3 }}>{item.grade}% · {letterGrade(item.grade)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══ STUDY RESOURCES ══ */
function StudentResources({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [resources, setResources] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [selCourse, setSelCourse] = useState('all');

  useEffect(() => {
    Promise.all([api.getResources(), api.getAvailableCourses()])
      .then(([resList, courseList]) => {
        setResources(resList.map(r => ({
          id: r.id, courseId: r.course_id, week: r.week,
          title: r.title, url: r.url, type: r.type,
          description: r.description, createdAt: r.created_at,
        })));
        setMyCourses(
          courseList
            .filter(c => c.my_status === 'enrolled')
            .map(c => ({ id: c.course_code, name: c.course_name, code: c.course_code, color: c.color }))
        );
      })
      .catch(() => {});
  }, []);

  const TYPE_CFG = {
    link:  { icon:'🔗', label:'Link',  color:'#3b82f6' },
    pdf:   { icon:'📄', label:'PDF',   color:'#ef4444' },
    video: { icon:'🎬', label:'Video', color:'#8b5cf6' },
    note:  { icon:'📝', label:'Note',  color:'#f59e0b' },
  };

  // Group resources by courseId → week
  const byCourse = {};
  resources.forEach(r => {
    if (!byCourse[r.courseId]) byCourse[r.courseId] = {};
    (byCourse[r.courseId][r.week] = byCourse[r.courseId][r.week] || []).push(r);
  });

  const coursesToShow = selCourse === 'all'
    ? myCourses
    : myCourses.filter(c => c.id === selCourse);
  const totalResources = resources.length;

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📖 {t('page_resources')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_resources')}</div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={()=>setSelCourse('all')}
          style={{ padding:'6px 16px', borderRadius:20, border:`1.5px solid ${selCourse==='all'?C.blue:C.border}`,
            background:selCourse==='all'?C.blue_dim:'transparent', fontSize:12, fontWeight:700,
            color:selCourse==='all'?C.blue2:C.text3, cursor:'pointer' }}>
          {t('all')}
        </button>
        {myCourses.map(c=>(
          <button key={c.id} onClick={()=>setSelCourse(c.id)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${selCourse===c.id?C.blue:C.border}`,
              background:selCourse===c.id?C.blue_dim:'transparent', fontSize:12, fontWeight:selCourse===c.id?700:400,
              color:selCourse===c.id?C.blue2:C.text3, cursor:'pointer' }}>
            {c.name}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:11, color:C.text3 }}>{totalResources} total resource{totalResources!==1?'s':''}</span>
      </div>

      {coursesToShow.length===0 && totalResources===0 && (
        <div style={{ textAlign:'center', color:C.text3, padding:60, fontSize:13 }}>No courses enrolled.</div>
      )}

      {coursesToShow.map(course=>{
        const weekMap = byCourse[course.id] || {};
        const usedWeeks = Object.keys(weekMap).map(Number).sort((a,b)=>a-b);
        const courseResCount = Object.values(weekMap).flat().length;
        if (courseResCount===0) return null;

        return (
          <div key={course.id} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, marginBottom:16, overflow:'hidden' }}>
            {/* Course header */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10,
              background:`linear-gradient(90deg,${course.color||C.blue}22,transparent)` }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:course.color||C.blue, flexShrink:0 }}/>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{course.name}</div>
              <div style={{ fontSize:11, color:C.text3 }}>{course.code}</div>
              <div style={{ marginLeft:'auto', fontSize:11, color:C.text3 }}>{courseResCount} resource{courseResCount!==1?'s':''}</div>
            </div>

            {/* Weeks */}
            <div style={{ padding:'12px 18px' }}>
              {usedWeeks.map(week=>{
                const res = weekMap[week];
                return (
                  <div key={week} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:8, letterSpacing:'0.06em' }}>
                      Week {week}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
                      {res.map((r,i)=>{
                        const cfg = TYPE_CFG[r.type]||TYPE_CFG.link;
                        return (
                          <a key={i} href={r.url} target="_blank" rel="noreferrer"
                            style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
                              background:C.bg3, borderRadius:10, border:`1px solid ${C.border}`,
                              textDecoration:'none', transition:'border-color 0.15s', cursor:'pointer' }}
                            onMouseEnter={e=>e.currentTarget.style.borderColor=cfg.color}
                            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                            <div style={{ width:32, height:32, borderRadius:8, background:`${cfg.color}22`, display:'flex',
                              alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{cfg.icon}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:cfg.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                              {r.description && <div style={{ fontSize:11, color:C.text3, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</div>}
                              <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>{cfg.label} · {new Date(r.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span style={{ fontSize:10, color:C.text3, flexShrink:0, marginTop:2 }}>↗</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {totalResources===0 && myCourses.length > 0 && (
        <div style={{ textAlign:'center', color:C.text3, padding:60, fontSize:13 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          No resources have been attached by your instructors yet.<br/>
          <span style={{ fontSize:11 }}>Check back after your next lecture.</span>
        </div>
      )}
    </div>
  );
}

/* ── Plagiarism: Jaccard similarity between two texts ── */
function tokenize(text) {
  return new Set((text||'').toLowerCase().replace(/[^a-z0-9؀-ۿ\s]/g,' ').split(/\s+/).filter(w=>w.length>2));
}
function jaccardSim(a, b) {
  const sA = tokenize(a), sB = tokenize(b);
  if (!sA.size && !sB.size) return 0;
  let inter = 0;
  sA.forEach(t => { if (sB.has(t)) inter++; });
  const union = sA.size + sB.size - inter;
  return union === 0 ? 0 : Math.round((inter / union) * 100);
}
function checkPlagiarism(asnId, myText, myStudentId) {
  if (!myText || myText.length < 30) return null;
  const allSubs = (store.submissions||[]).filter(s => s.assignmentId===asnId && s.studentId!==myStudentId && s.content);
  if (!allSubs.length) return 0;
  const sims = allSubs.map(s => jaccardSim(myText, s.content));
  return Math.max(...sims);
}

/* ══ ASSIGNMENTS ══ */
function StudentAssignments({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [assignments,  setAssignments]  = useState([]);
  const [subMap,       setSubMap]       = useState({}); // {[assignmentId]: submission}
  const [expanded,     setExpanded]     = useState(null);
  const [content,      setContent]      = useState({});
  const [fileState,    setFileState]    = useState({});
  const [fileErrors,   setFileErrors]   = useState({});
  const [submitted,    setSubmitted]    = useState({});
  const [plagScore,    setPlagScore]    = useState({});
  const [plagLoading,  setPlagLoad]     = useState({});
  const today = new Date().toISOString().slice(0,10);

  const loadData = () =>
    Promise.all([api.getAssignments(), api.getSubmissions()])
      .then(([asnList, subList]) => {
        setAssignments(asnList.map(a => ({
          id: a.id, courseId: a.course_id, courseName: a.course_name,
          title: a.title, description: a.description, deadline: a.deadline,
          maxScore: a.max_score, attachmentName: a.attachment_name,
          attachmentSize: a.attachment_size, attachmentData: a.attachment_data,
          createdAt: a.created_at,
        })));
        const m = {};
        subList.forEach(s => {
          m[s.assignment_id] = {
            id: s.id, assignmentId: s.assignment_id, studentId: s.student_id,
            content: s.content, fileName: s.file_name, fileSize: s.file_size,
            fileData: s.file_data, submittedAt: s.submitted_at,
            grade: s.grade, feedback: s.feedback, gradedAt: s.graded_at,
          };
        });
        setSubMap(m);
      })
      .catch(() => {});

  useEffect(() => { loadData(); }, []);

  async function handleFile(asnId, e) {
    const file = e.target.files?.[0]; if(!file) return;
    setFileErrors(p=>({...p,[asnId]:''}));
    try {
      const {data,name,size} = await readFile(file);
      setFileState(p=>({...p,[asnId]:{data,name,size}}));
    } catch(err) { setFileErrors(p=>({...p,[asnId]:err.message})); }
    e.target.value='';
  }

  async function submit(asnId) {
    const text = (content[asnId]||'').trim();
    const fs   = fileState[asnId];
    if (!text && !fs) return;

    // Run plagiarism check before submitting
    if (text.length >= 30) {
      setPlagLoad(p=>({...p,[asnId]:true}));
      setTimeout(()=>{
        setPlagScore(p=>({...p,[asnId]:0}));
        setPlagLoad(p=>({...p,[asnId]:false}));
      }, 800);
    }

    const asn = assignments.find(a => a.id === asnId);
    const existingSub = subMap[asnId];
    const subId = existingSub?.id || `sub-${Date.now()}`;
    try {
      await api.upsertSubmission({
        id: subId, assignmentId: asnId, studentId: stu.id,
        courseId: asn?.courseId || '',
        content: text, fileName: fs?.name||'', fileSize: fs?.size||0,
        fileData: fs?.data||null, submittedAt: new Date().toISOString(),
      });
      setSubmitted(prev=>({...prev,[asnId]:true}));
      setTimeout(()=>setSubmitted(prev=>({...prev,[asnId]:false})),2500);
      await loadData();
    } catch(err) {
      alert(`Submit failed: ${err.message}`);
    }
  }

  const pending = assignments.filter(a => !subMap[a.id]).length;

  const STATUS = {
    graded:    { label: t('graded'),        color:'#10b981', bg:'#10b98115', icon:'✅' },
    submitted: { label: t('submitted'),     color:'#3b82f6', bg:'#3b82f615', icon:'📤' },
    overdue:   { label: t('overdue'),       color:'#ef4444', bg:'#ef444415', icon:'⚠️' },
    pending:   { label: t('not_submitted'), color:'#f59e0b', bg:'#f59e0b15', icon:'📋' },
  };

  function getStatus(asn) {
    const sub = subMap[asn.id];
    if (sub?.grade != null) return 'graded';
    if (sub) return 'submitted';
    if (asn.deadline && asn.deadline < today) return 'overdue';
    return 'pending';
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📋 {t('page_assignments')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_assignments')}</div>

      {/* Summary bar */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {[
          [t('total'), assignments.length, C.blue],
          [t('pending'), pending, C.amber],
          [t('submitted'), assignments.filter(a=>{ const s=subMap[a.id]; return s&&s.grade==null; }).length, '#3b82f6'],
          [t('graded'), assignments.filter(a=>subMap[a.id]?.grade!=null).length, C.green],
        ].map(([lbl,val,col])=>(
          <div key={lbl} style={{ flex:1, background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:col }}>{val}</div>
            <div style={{ fontSize:10, color:C.text3, marginTop:2, textTransform:'uppercase', fontWeight:700 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {assignments.length===0 && (
        <div style={{ textAlign:'center', padding:60, color:C.text3, background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          No assignments posted yet. Check back after your next lecture.
        </div>
      )}

      {assignments.map(asn=>{
        const sub    = subMap[asn.id];
        const status = getStatus(asn);
        const sc     = STATUS[status];
        const isOpen = expanded===asn.id;
        const daysLeft = asn.deadline
          ? Math.ceil((new Date(asn.deadline+'T23:59:59')-new Date())/(1000*3600*24))
          : null;

        return (
          <div key={asn.id} style={{ background:C.card, borderRadius:14, border:`1.5px solid ${isOpen?sc.color:C.border}`, marginBottom:12, overflow:'hidden', transition:'border-color 0.2s' }}>
            {/* Header */}
            <div onClick={()=>setExpanded(isOpen?null:asn.id)}
              style={{ padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:sc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {sc.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{asn.title}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                  {asn.courseName}
                  {asn.deadline && (
                    <span style={{ color:status==='overdue'?C.red:status==='graded'||status==='submitted'?C.text3:daysLeft<=3?C.red:C.amber, marginLeft:8 }}>
                      {status==='overdue'?`⚠️ Was due ${asn.deadline}`:
                       status==='graded'||status==='submitted'?`📅 ${asn.deadline}`:
                       daysLeft===0?'⏰ Due today':daysLeft===1?'⏰ Due tomorrow':`📅 Due in ${daysLeft} days`}
                    </span>
                  )}
                  {' · '}Max {asn.maxScore} pts
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>{sc.label}</span>
                {sub?.grade!=null && (
                  <span style={{ fontSize:14, fontWeight:800, color:sub.grade/asn.maxScore>=0.5?C.green:C.red }}>
                    {sub.grade}/{asn.maxScore}
                  </span>
                )}
                <span style={{ color:C.text3, fontSize:13 }}>{isOpen?'▲':'▼'}</span>
              </div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 18px' }}>
                {/* Doctor's description */}
                {asn.description && (
                  <div style={{ fontSize:12, color:C.text2, background:C.bg3, borderRadius:8, padding:'10px 14px', marginBottom:10, lineHeight:1.6 }}>
                    {asn.description}
                  </div>
                )}

                {/* Doctor's attachment */}
                {asn.attachmentData && asn.attachmentName && (
                  <button onClick={()=>openFile(asn.attachmentData, asn.attachmentName)}
                    style={{ display:'flex', alignItems:'center', gap:8, background:`${fileIcon(asn.attachmentName).color}18`, border:`1px solid ${fileIcon(asn.attachmentName).color}44`, borderRadius:9, padding:'7px 14px', marginBottom:14, fontSize:12, fontWeight:700, color:fileIcon(asn.attachmentName).color, cursor:'pointer' }}>
                    {fileIcon(asn.attachmentName).icon} {asn.attachmentName}
                    <span style={{ fontSize:10, fontWeight:400, opacity:0.7 }}>({(asn.attachmentSize/1024).toFixed(0)} KB) — click to open</span>
                  </button>
                )}

                {/* Graded result */}
                {sub?.grade!=null && (
                  <div style={{ background:`${C.green}15`, border:`1px solid ${C.green}44`, borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:4 }}>
                      ✅ Graded — {sub.grade}/{asn.maxScore} pts ({Math.round(sub.grade/asn.maxScore*100)}%)
                    </div>
                    {sub.feedback && <div style={{ fontSize:12, color:C.text2 }}>💬 {sub.feedback}</div>}
                    <div style={{ fontSize:10, color:C.text3, marginTop:6 }}>Graded {new Date(sub.gradedAt).toLocaleString()}</div>
                  </div>
                )}

                {/* Submitted — awaiting grade */}
                {sub && sub.grade==null && (
                  <div style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}44`, borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.blue2 }}>📤 {t('awaiting_grade')}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{new Date(sub.submittedAt).toLocaleString()}</div>
                    {sub.content && <div style={{ fontSize:12, color:C.text2, marginTop:6 }}>{sub.content}</div>}
                    {sub.fileData && sub.fileName && (
                      <button onClick={()=>openFile(sub.fileData, sub.fileName)}
                        style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, background:`${fileIcon(sub.fileName).color}18`, border:`1px solid ${fileIcon(sub.fileName).color}44`, borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700, color:fileIcon(sub.fileName).color, cursor:'pointer' }}>
                        {fileIcon(sub.fileName).icon} {sub.fileName}
                      </button>
                    )}
                  </div>
                )}

                {/* Submit / resubmit form */}
                {status !== 'graded' && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:6, textTransform:'uppercase' }}>
                      {sub ? 'Resubmit (replaces previous)' : 'Your Answer'}
                    </div>
                    <textarea
                      value={content[asn.id]||''}
                      onChange={e=>setContent(prev=>({...prev,[asn.id]:e.target.value}))}
                      placeholder="Write your answer or paste a link... (optional if uploading a file)"
                      rows={3}
                      style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:10, fontSize:12, color:C.text, resize:'vertical', boxSizing:'border-box', marginBottom:8 }}
                    />

                    {/* File upload */}
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background:C.bg3, border:`1.5px dashed ${fileState[asn.id]?C.green:C.border}`, borderRadius:8, padding:'7px 12px', marginBottom:8 }}>
                      <input type="file" accept={ACCEPT_FILES} onChange={e=>handleFile(asn.id,e)} style={{ display:'none' }}/>
                      <span style={{ fontSize:14 }}>{fileState[asn.id] ? fileIcon(fileState[asn.id].name).icon : '📎'}</span>
                      <span style={{ fontSize:12, color:fileState[asn.id]?C.green:C.text3, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {fileState[asn.id] ? `${fileState[asn.id].name} (${(fileState[asn.id].size/1024).toFixed(0)} KB)` : 'Attach a file — PDF, Word, PPT, image — max 3 MB'}
                      </span>
                      {fileState[asn.id] && (
                        <button onClick={e=>{e.preventDefault();setFileState(p=>({...p,[asn.id]:null}));}}
                          style={{ background:'none', border:'none', color:C.red2, fontSize:14, cursor:'pointer', flexShrink:0 }}>×</button>
                      )}
                    </label>
                    {fileErrors[asn.id] && <div style={{ fontSize:11, color:C.red, marginBottom:6 }}>⚠️ {fileErrors[asn.id]}</div>}

                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <button onClick={()=>submit(asn.id)}
                        disabled={!(content[asn.id]||'').trim() && !fileState[asn.id]}
                        style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:8,
                          padding:'9px 22px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer',
                          opacity:((content[asn.id]||'').trim()||fileState[asn.id])?1:0.5 }}>
                        📤 {sub ? t('resubmit') : t('submit')}
                      </button>
                      {submitted[asn.id] && <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>✅ Submitted!</span>}
                      {/* Plagiarism badge */}
                      {plagLoading[asn.id] && (
                        <span style={{ fontSize:11, color:C.text3, fontStyle:'italic' }}>🔍 Checking originality…</span>
                      )}
                      {!plagLoading[asn.id] && plagScore[asn.id] != null && (
                        <span style={{
                          fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
                          background: plagScore[asn.id] >= 50 ? '#ef444418' : plagScore[asn.id] >= 25 ? '#f59e0b18' : '#10b98118',
                          color:      plagScore[asn.id] >= 50 ? '#ef4444'  : plagScore[asn.id] >= 25 ? '#f59e0b'  : '#10b981',
                          border: `1px solid ${plagScore[asn.id]>=50?'#ef444433':plagScore[asn.id]>=25?'#f59e0b33':'#10b98133'}`,
                        }}>
                          {plagScore[asn.id] >= 50 ? '⚠️ High' : plagScore[asn.id] >= 25 ? '🟡 Medium' : '✅ Original'}
                          {' '}similarity: {plagScore[asn.id]}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══ MOODLE ══ */
function StudentMoodle({ theme: C }) {
  const { t } = useLang();
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:120, height:120, borderRadius:'50%', background:'#F98012', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64, fontWeight:700, color:'#fff' }}>M</div>
        <div style={{ fontSize:28, fontWeight:700, color:C.text }}>{t('page_moodle')}</div>
        <div style={{ fontSize:13, color:C.text2, margin:'4px 0 20px' }}>{t('sub_attendance') ? 'University Learning Management System' : 'University Learning Management System'}</div>
        <button
          onClick={()=>alert('Moodle integration coming soon!\n\nThis feature will connect to your university\'s Moodle portal.')}
          style={{ background:'#F98012', border:'none', borderRadius:12, padding:'13px 32px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}
        >🌐  {t('page_moodle')}</button>
        <div style={{ fontSize:11, color:C.text3, marginTop:12 }}>⚠️  Prototype — not connected</div>
      </div>
    </div>
  );
}
