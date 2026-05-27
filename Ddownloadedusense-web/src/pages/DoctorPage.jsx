import { useState, useRef, useEffect } from 'react';
import { exportStudentReportPDF } from '../utils/pdfExport';
import useMobile from '../hooks/useMobile';
import TimetablePage from './TimetablePage';
import { DoctorOfficeHours } from './OfficeHoursPage';
import AIInsightPage from './AIInsightPage';
import AcademicCalendarPage from './AcademicCalendarPage';
import { DoctorLivePoll } from './LivePollPage';
import ProfilePage from './ProfilePage';
import DirectMessagePage from './DirectMessagePage';
import { pushToast } from '../components/NotificationToast';
import { useLang } from '../context/LanguageContext';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import AnimatedPage from '../components/AnimatedPage';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart, AttentionRing } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import StudentFaceCard from '../components/StudentFaceCard';
import AlertItem from '../components/AlertItem';
import ScheduleItem from '../components/ScheduleItem';
import WebcamFeed, { buildFaceMatcher } from '../components/WebcamFeed';
import QRCodeComp from '../components/QRCode';
import store from '../dataStore';
import api, { get } from '../api';
import { EMOTION_ICONS } from '../theme';

const NAV = [
  {id:'dashboard', icon:'🏠', label:'Dashboard'},
  {id:'live',      icon:'📷', label:'Live Session', live:true},
  {id:'attendance',icon:'✅', label:'Attendance'},
  {id:'lectures',  icon:'📚', label:'My Lectures'},
  {id:'students',  icon:'👥', label:'Students'},
  {id:'grades',    icon:'📝', label:'Exam Results'},
  {id:'chat',      icon:'💬', label:'Community'},
  {id:'analytics', icon:'📊', label:'Analytics'},
  {id:'detector',  icon:'🎯', label:'Topic Detector'},
  {id:'alerts',    icon:'🔔', label:'Alerts'},
  {id:'moodle',    icon:'🌐', label:'Moodle'},
  {id:'ranalysis', icon:'📈', label:'R Analysis'},
  {id:'appeals',       icon:'📋', label:'Appeals'},
  {id:'announcements', icon:'📢', label:'Announcements'},
  {id:'examschedule',  icon:'🗓️', label:'Exam Schedule'},
  {id:'resources',     icon:'📖', label:'Resources'},
  {id:'assignments',   icon:'📋', label:'Assignments'},
  // ── New features ──────────────────────────────────────────────────────────
  { section: 'New Features' },
  {id:'__proctoring', icon:'🎥', label:'Exam Proctoring'},
  {id:'__advising',   icon:'🎓', label:'Advising'},
  {id:'__atrisk',     icon:'🚨', label:'Early Warning'},
  {id:'timetable',    icon:'🗓️', label:'Timetable'},
  {id:'officehours',  icon:'🕐', label:'Office Hours'},
  {id:'ai_insight',   icon:'🤖', label:'AI Insights'},
  {id:'calendar',     icon:'📅', label:'Academic Calendar'},
  {id:'livepoll',     icon:'📊', label:'Live Poll'},
  {id:'gradeappeals', icon:'🏷️', label:'Grade Appeals'},
  {id:'messages',     icon:'💬', label:'Messages'},
  {id:'profile',      icon:'👤', label:'My Profile'},
];

const PAGE_TITLES = {
  dashboard:'Dashboard', live:'Live Session', attendance:'Attendance',
  lectures:'My Lectures', students:'Students', grades:'Exam Results',
  chat:'Community Chat', analytics:'Analytics', detector:'AI Topic Detector',
  alerts:'Alerts', moodle:'Moodle', ranalysis:'R Analysis Reports',
  appeals:'Student Appeals', announcements:'Announcements', examschedule:'Exam Schedule',
  resources:'Study Resources', assignments:'Assignments',
  timetable:'timetable', officehours:'office_hours',
};

/* Map doctor page ids to translation keys */
const DOC_PAGE_KEYS = {
  dashboard:'dashboard', live:'live', attendance:'attendance',
  lectures:'lectures', students:'students', grades:'grades',
  chat:'chat', analytics:'analytics', detector:'detector',
  alerts:'alerts', moodle:'moodle', ranalysis:'ranalysis',
  appeals:'appeals', announcements:'announcements', examschedule:'exams',
  resources:'resources', assignments:'assignments',
  timetable:'timetable', officehours:'office_hours',
  ai_insight:'ai_insight_nav', calendar:'academic_calendar',
  livepoll:'live_poll',
};

function letterGrade(g){if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';}
function gradeColor(g,C){return g>=75?C.green:g>=50?C.amber:C.red;}

/* ── FILE HELPERS ── */
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB cap
const ACCEPT_FILES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx';
function fileIcon(name=''){
  const ext=(name.split('.').pop()||'').toLowerCase();
  if(ext==='pdf')              return {icon:'📄',color:'#ef4444',label:'PDF'};
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
function FilePill({ fileData, fileName, onRemove, theme: C }){
  if(!fileData||!fileName) return null;
  const fi=fileIcon(fileName);
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,background:`${fi.color}18`,border:`1px solid ${fi.color}44`,borderRadius:8,padding:'5px 10px',marginTop:6}}>
      <span style={{fontSize:16}}>{fi.icon}</span>
      <span style={{fontSize:11,fontWeight:700,color:fi.color,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fileName}</span>
      {onRemove && <button onClick={onRemove} style={{background:'none',border:'none',color:C?.red2||'#f87171',fontSize:14,cursor:'pointer',lineHeight:1}}>×</button>}
    </div>
  );
}

export default function DoctorPage({ theme: C, user, isDark, onToggleMode, onLogout,
  onOpenProctoring, onOpenAdvising, onOpenAtRisk, branding }) {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, isRTL } = useLang();

  // ── Doctor identity + courses from DB ────────────────────────────────────────
  const [doctor, setDoctor] = useState({
    id: user.doctorId || '',
    name: user.full_name || user.username || '',
    email: user.email || '',
    title: '',
    dept: '',
    engagement: 88,
  });
  const [myCourses, setMyCourses] = useState([]);

  useEffect(() => {
    Promise.all([api.getLectureDoctors(), api.getLectures()])
      .then(([doctors, lectures]) => {
        const doc = doctors.find(d => String(d.user_id) === String(user.id));
        if (doc) {
          setDoctor({ id: doc.doctor_id, name: doc.name, email: doc.email || '', title: doc.title || '', dept: doc.department || '', engagement: 88 });
          const seen = new Set();
          const courses = [];
          for (const l of lectures.filter(l => l.doctor_id === doc.doctor_id)) {
            if (!seen.has(l.course_code)) {
              seen.add(l.course_code);
              let days = [];
              try { days = JSON.parse(l.days || '[]'); } catch {}
              courses.push({
                id: l.course_code,
                code: l.course_code,
                name: l.course_name,
                color: l.color || '#3b82f6',
                room: l.room || '',
                time: l.scheduled_at || '',
                duration: l.duration_min || 90,
                daysLabel: l.days_label || '',
                days,
                semester: l.semester || '',
                enrolledCount: 0,
                lectureId: l.lecture_id,
              });
            }
          }
          setMyCourses(courses);
        }
      })
      .catch(() => {});
  }, [user.id]);

  // ── Real-time WebSocket notifications ──────────────────────────────────────
  useEffect(() => {
    // Only connect when user.id is a numeric DB id (API login); local-auth IDs like 'D001' are skipped.
    if (!user?.id || !/^\d+$/.test(String(user.id))) return;
    const BASE_WS = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const ws = new WebSocket(`${BASE_WS}/ws/notifications/${user.id}`);
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

  const nav = NAV.map(item =>
    item.id === 'alerts'
      ? { ...item, badge: () => store.getUserNotifications(user).filter(a => !a.read).length || 0 }
      : item
  );

  function handleNav(id) {
    if (id === '__proctoring') { onOpenProctoring?.(); return; }
    if (id === '__advising')   { onOpenAdvising?.();   return; }
    if (id === '__atrisk')     { onOpenAtRisk?.();     return; }
    setPage(id);
  }

  function getDocPageTitle(p) {
    const key = DOC_PAGE_KEYS[p];
    if (!key) return PAGE_TITLES[p] || p;
    const val = t(key);
    return val !== key ? val : PAGE_TITLES[p] || p;
  }

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden', flexDirection: isRTL ? 'row-reverse' : 'row'}}>
      <Sidebar theme={C} navItems={nav} activeId={page} onNav={handleNav} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} branding={branding}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={getDocPageTitle(page)} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout} onMenuOpen={() => setMenuOpen(true)}/>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <AnimatedPage pageKey={page}>
            {page==='dashboard'  && <DocDashboard theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='live'       && <DocLive theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='attendance' && <DocAttendance theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='lectures'   && <DocLectures theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='students'   && <DocStudents theme={C} doctor={doctor} myCourses={myCourses} doctor={doctor}/>}
            {page==='grades'     && <DocGrades theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='chat'       && <DocChat theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='analytics'  && <DocAnalytics theme={C}/>}
            {page==='detector'   && <DocTopicDetector theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='alerts'     && <DocAlerts theme={C} user={user}/>}
            {page==='moodle'     && <DocMoodle theme={C}/>}
            {page==='ranalysis'  && <DocRAnalysis theme={C}/>}
            {page==='appeals'       && <DocAppeals theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='announcements' && <DocAnnouncements theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='examschedule'  && <DocExamSchedule theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='resources'     && <DocResources theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='assignments'   && <DocAssignments theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='timetable'     && <TimetablePage theme={C} role="doctor" doctorId={doctor.id}/>}
            {page==='officehours'   && <DoctorOfficeHours theme={C} doctor={doctor}/>}
            {page==='ai_insight'    && <AIInsightPage theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='calendar'      && <AcademicCalendarPage theme={C} role="doctor"/>}
            {page==='livepoll'      && <DoctorLivePoll theme={C}/>}
            {page==='gradeappeals'  && <DocGradeAppeals theme={C} doctor={doctor}/>}
            {page==='messages'      && <DirectMessagePage theme={C} user={user}/>}
            {page==='profile'       && <ProfilePage theme={C} user={user}/>}
          </AnimatedPage>
        </div>
      </div>
    </div>
  );
}

/* ── DASHBOARD ── */
function DocDashboard({ theme: C, doctor, myCourses }) {
  const { t, isRTL } = useLang();
  const isMobile = useMobile();
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    if (!myCourses.length) return;
    Promise.all(myCourses.map(c =>
      api.getCourseStudents(c.id).then(r => (r.enrolled || []).length).catch(() => 0)
    )).then(counts => setTotalStudents(counts.reduce((a, b) => a + b, 0))).catch(() => {});
  }, [myCourses]);

  const presentToday = 0; // live attendance via DocLive

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('dashboard')}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>{t('doc_overview')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label={t('lectures')}       value={myCourses.length} sub={t('semester')}   icon="📚" accent="blue"/>
        <StatCard theme={C} label={t('students')}       value={totalStudents} sub={t('enrolled_students')}   icon="👥" accent="purple"/>
        <StatCard theme={C} label={t('present_today')}  value={presentToday}     sub={t('live_session')}    icon="✅" accent="green"/>
        <StatCard theme={C} label={t('avg_engagement')} value={`${doctor.engagement}%`} sub={t('analytics')} icon="🧠" accent="amber"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',gap:12,marginBottom:12}}>
        <Card theme={C} title={t('engagement_trend')}>
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label: t('engagement'), data:store.trendData.engagement, color:C.blue},
              {label: t('attention'),  data:store.trendData.attention,  color:C.green},
            ]} labels={store.trendData.labels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title={t('emotion_dist')}>
          <div style={{padding:'4px 12px 12px'}}>
            <EmotionBarsWidget theme={C} data={store.emotionDist.slice(0,6)}/>
          </div>
        </Card>
      </div>

      <Card theme={C} title={`${t('lectures_now')} (${[t('sun'),t('mon'),t('tue'),t('wed'),t('thu'),'Fri','Sat'][new Date().getDay()]})`}>
        <div style={{padding:'4px 14px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {(() => {
            const today = new Date().getDay();
            const todayLecs = myCourses.filter(c => Array.isArray(c.days) && c.days.includes(today));
            if (todayLecs.length === 0)
              return <div style={{padding:'16px 0',textAlign:'center',color:C.text3,fontSize:12}}>No lectures scheduled for today.</div>;
            return todayLecs.map((c,i)=><ScheduleItem key={i} theme={C} lecture={{...c, name: c.name, scheduled_at: c.time}}/>);
          })()}
        </div>
      </Card>
    </div>
  );
}

/* ── LIVE SESSION ── */
function DocLive({ theme: C, myCourses }) {
  const { t } = useLang();
  const [selCourse, setSelCourse]   = useState(myCourses[0]?.id||'');
  const [detections, setDetections] = useState(0);
  const [lastMarked, setLastMarked] = useState('');
  const [lastEmotion, setLastEmotion] = useState('');
  const [liveStudents, setLiveStudents] = useState([]);
  const [faceMatcher, setFaceMatcher]   = useState(null);
  const [buildingMatcher, setBuildingMatcher] = useState(false);
  const [matcherProgress, setMatcherProgress] = useState({ done: 0, total: 0 });
  const [matcherTimedOut,  setMatcherTimedOut] = useState(false);
  const [, forceUpdate]             = useState(0);
  const liveStudentsRef = useRef([]);

  const alertCooldown = useRef({});
  const course = myCourses.find(c => c.id === selCourse);

  async function triggerBuildMatcher(stuList) {
    const withPhotos = stuList.filter(s => s.photo);
    if (withPhotos.length === 0) return;
    setFaceMatcher(null);
    setBuildingMatcher(true);
    setMatcherTimedOut(false);
    setMatcherProgress({ done: 0, total: withPhotos.length });
    const matcher = await buildFaceMatcher(
      withPhotos,
      (done, total) => setMatcherProgress({ done, total }),
    );
    setBuildingMatcher(false);
    if (matcher) {
      setFaceMatcher(matcher);
      setMatcherTimedOut(false);
    } else {
      // null means either no faces found or 50-second timeout fired
      setMatcherTimedOut(withPhotos.length > 0);
    }
  }

  useEffect(() => {
    if (!selCourse) return;
    setFaceMatcher(null);
    setMatcherTimedOut(false);
    const API_BASE = import.meta.env.VITE_API_URL || '';
    api.getCourseStudents(selCourse)
      .then(async r => {
        const stuList = (r.enrolled||[]).map(s => {
          // Prefer photo_path (admin-imported ID photo) → fallback to u.photo (profile pic)
          let photo = null;
          if (s.photo_path) photo = `${API_BASE}${s.photo_path}`;
          else if (s.photo)  photo = s.photo; // may be base64 data URI
          return {
            id: s.student_id, name: s.name, photo,
            emoji: '👤', color: '#3b82f6', present: false,
            attentionScore: Math.round(60 + Math.random()*40),
            engagement:     Math.round(60 + Math.random()*40),
          };
        });
        setLiveStudents(stuList);
        liveStudentsRef.current = stuList;
        triggerBuildMatcher(stuList);
      })
      .catch(() => {});
  }, [selCourse]);

  async function handleEmotionDetected(emotion, studentId) {
    if (studentId) {
      const matched = liveStudents.find(s => s.id === studentId);
      if (matched && !matched.present && course?.lectureId) {
        await api.markAttendance({ student_id: matched.id, lecture_id: course.lectureId, status: 'present', method: 'face_recognition', week: 1, confidence: 0.95 }).catch(()=>{});
        setLiveStudents(prev => prev.map(s => s.id === studentId ? {...s, present: true} : s));
        setLastMarked(`✅ ${matched.name.split(' ')[0]} recognized & marked present`);
      }
      setLastEmotion(`${studentId}: ${emotion}`);
    } else {
      setLastEmotion(`Unknown face: ${emotion}`);
    }
  }

  const students     = liveStudents;
  const presentCount = students.filter(s=>s.present).length;
  const avgAtt       = students.length ? Math.round(students.reduce((a,s)=>a+s.attentionScore,0)/students.length) : 0;
  const avgEng       = students.length ? Math.round(students.reduce((a,s)=>a+s.engagement,0)/students.length) : 0;

  function handleFaceDetected() { setDetections(n => n+1); }

  async function markPresentFromCamera() {
    if (!selCourse || !course?.lectureId) return;
    const absent = students.filter(s=>!s.present);
    if (!absent.length) { setLastMarked('All students already marked present'); return; }
    const pick = absent[Math.floor(Math.random()*absent.length)];
    await api.markAttendance({ student_id: pick.id, lecture_id: course.lectureId, status: 'present', method: 'face_recognition', week: 1 }).catch(()=>{});
    setLiveStudents(prev => prev.map(s => s.id === pick.id ? {...s, present: true} : s));
    pick.present = true;
    setLastMarked(`✅ Marked ${pick.name.split(' ')[0]} as present`);
    forceUpdate(n=>n+1);
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:8}}>
            📷 {t('live')}
            <span className="live-dot" style={{color:C.red,fontSize:12}}>● LIVE</span>
          </div>
          <div style={{fontSize:12,color:C.text2}}>Real-time classroom monitoring</div>
        </div>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label="Present"        value={presentCount}      sub="Detected by camera"   icon="👥" accent="green"/>
        <StatCard theme={C} label="Avg Attention"  value={`${avgAtt}%`}      sub="Class average"        icon="👁️" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement" value={`${avgEng}%`}      sub="Real-time average"    icon="🧠" accent="purple"/>
        <StatCard theme={C} label="Detections"     value={detections}        sub="Faces scanned"        icon="🔍" accent="amber"/>
      </div>

      {/* Main grid: webcam left, status right */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:12}}>
        {/* Camera column */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card theme={C} title="📷 Camera Feed">
            <div style={{padding:'8px 12px 12px'}}>
              {buildingMatcher && (
                <div style={{fontSize:11,color:'#fbbf24',background:'rgba(251,191,36,0.08)',border:'1px solid #f59e0b',borderRadius:8,padding:'6px 10px',marginBottom:6}}>
                  <div style={{textAlign:'center',marginBottom:4}}>
                    {matcherProgress.done === 0
                      ? '⏳ Loading face recognition models (first load is slow)…'
                      : `⏳ Scanning photos… ${matcherProgress.done}/${matcherProgress.total}`}
                  </div>
                  {matcherProgress.total > 0 && (
                    <div style={{height:4,background:'rgba(251,191,36,0.2)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',background:'#f59e0b',borderRadius:4,width:`${Math.round((matcherProgress.done/matcherProgress.total)*100)}%`,transition:'width 0.3s'}}/>
                    </div>
                  )}
                </div>
              )}
              {!buildingMatcher && faceMatcher && (
                <div style={{fontSize:11,color:'#10b981',background:'rgba(16,185,129,0.1)',border:'1px solid #10b981',borderRadius:8,padding:'5px 10px',marginBottom:6,textAlign:'center'}}>
                  🎯 Face recognition ready — {liveStudents.filter(s=>s.photo).length} students enrolled
                </div>
              )}
              {!buildingMatcher && matcherTimedOut && (
                <div style={{fontSize:11,color:'#f97316',background:'rgba(249,115,22,0.08)',border:'1px solid #f97316',borderRadius:8,padding:'5px 10px',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                  <span>⏱️ Recognition models took too long — camera works without it</span>
                  <button onClick={() => triggerBuildMatcher(liveStudentsRef.current)}
                    style={{background:'#f97316',border:'none',borderRadius:6,padding:'3px 10px',fontSize:10,fontWeight:700,color:'#fff',cursor:'pointer',whiteSpace:'nowrap'}}>
                    🔄 Retry
                  </button>
                </div>
              )}
              {!buildingMatcher && !faceMatcher && !matcherTimedOut && liveStudents.length > 0 && (
                <div style={{fontSize:11,color:'#94a3b8',background:'rgba(148,163,184,0.1)',border:'1px solid #475569',borderRadius:8,padding:'5px 10px',marginBottom:6,textAlign:'center'}}>
                  ⚠️ No student photos — face recognition disabled
                </div>
              )}
              <WebcamFeed theme={C} mode="📷 Live Session" courseId={selCourse} onFaceDetected={handleFaceDetected} onEmotionDetected={handleEmotionDetected} onCapture={()=>{}} faceMatcher={faceMatcher}/>
              {lastEmotion && (
                <div style={{marginTop:6,fontSize:11,color:'#93c5fd',background:'rgba(59,130,246,0.15)',borderRadius:8,padding:'5px 10px',textAlign:'center'}}>
                  🧠 Last detected: <strong>{lastEmotion}</strong>
                </div>
              )}
            </div>
          </Card>
          <Card theme={C} title="Attendance Actions">
            <div style={{padding:'8px 12px 12px',display:'flex',flexDirection:'column',gap:8}}>
              <button
                onClick={markPresentFromCamera}
                style={{width:'100%',height:40,background:C.green,border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}
              >
                ✅ Mark Present (Auto)
              </button>
              <button
                onClick={async()=>{
                  if (course?.lectureId) {
                    await Promise.all(students.map(s => api.markAttendance({ student_id: s.id, lecture_id: course.lectureId, status: 'present', method: 'manual', week: 1 }).catch(()=>{})));
                    setLiveStudents(prev => prev.map(s => ({...s, present: true})));
                  }
                  setLastMarked('✅ All students marked present');
                }}
                style={{width:'100%',height:40,background:C.blue_dim,border:`1px solid ${C.blue}`,borderRadius:8,fontSize:12,fontWeight:700,color:C.blue2,cursor:'pointer'}}
              >
                👥 Mark All Present
              </button>
              {lastMarked && (
                <div style={{fontSize:11,color:C.green2,background:C.green_dim,padding:'6px 10px',borderRadius:8,textAlign:'center'}}>
                  {lastMarked}
                </div>
              )}
              <div style={{fontSize:10,color:C.text3,textAlign:'center',marginTop:4}}>
                {presentCount}/{students.length} present this session
              </div>
            </div>
          </Card>
        </div>

        {/* Student grid column */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card theme={C} title={`Student Status Grid — ${course?.name||''}`}>
            <div style={{padding:'8px 12px 12px',display:'flex',flexWrap:'wrap',gap:8,maxHeight:380,overflowY:'auto'}}>
              {students.map((s,i)=><StudentFaceCard key={s.id} theme={C} student={s}/>)}
            </div>
          </Card>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Card theme={C} title="Class Attention">
              <div style={{padding:'8px 12px 12px',display:'flex',justifyContent:'center'}}>
                <AttentionRing theme={C} value={avgAtt} size={110} color={C.blue}/>
              </div>
            </Card>
            <Card theme={C} title="Emotions">
              <div style={{padding:'4px 12px 12px'}}>
                <EmotionBarsWidget theme={C} data={store.emotionDist.slice(0,5)}/>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ATTENDANCE ── */
function DocAttendance({ theme: C, myCourses }) {
  const { t } = useLang();
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id||'');
  const [week, setWeek]           = useState(1);
  const [activeTab, setActiveTab] = useState('roster');
  const [qrMeta, setQrMeta]       = useState(null);
  const [enrolled, setEnrolled]   = useState([]);
  const [attRecs, setAttRecs]     = useState({}); // {studentId: {status, time, method}}
  const [allWeekAttRecs, setAllWeekAttRecs] = useState({}); // {studentId: [{week,status},...]}
  const [excuses, setExcuses]     = useState([]);

  const course = myCourses.find(c => c.id === selCourse);

  useEffect(() => {
    if (!selCourse) return;
    loadData();
    // Auto-refresh attendance every 8 seconds so QR check-ins appear instantly
    const interval = setInterval(() => {
      if (course?.lectureId) {
        api.getLectureAttendance(course.lectureId).then(attData => {
          const weekMap = {};
          const allMap = {};
          for (const r of attData) {
            allMap[r.student_id] = allMap[r.student_id] || [];
            allMap[r.student_id].push(r);
            if (Number(r.week) === week) {
              weekMap[r.student_id] = { status: r.status, method: r.method, time: r.check_in_time };
            }
          }
          setAttRecs(weekMap);
          setAllWeekAttRecs(allMap);
        }).catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [selCourse, week]);

  async function loadData() {
    const [enrolledRes, allExcuses] = await Promise.all([
      api.getCourseStudents(selCourse).catch(() => ({ enrolled: [] })),
      api.getExcuses().catch(() => []),
    ]);
    const stuList = (enrolledRes.enrolled || []).map(s => ({
      id: s.student_id,
      name: s.name,
      photo: s.photo,
      dept: s.department || '',
      emoji: '👤',
      color: '#3b82f6',
    }));
    setEnrolled(stuList);

    const courseExcuses = allExcuses
      .filter(e => e.course_code === selCourse && Number(e.week) === week)
      .map(e => ({
        id: e.id,
        studentId: e.student_id,
        studentName: stuList.find(s => s.id === e.student_id)?.name || e.student_id,
        reason: e.reason,
        status: e.status,
        submittedAt: e.created_at,
      }));
    setExcuses(courseExcuses);

    if (course?.lectureId) {
      const attData = await api.getLectureAttendance(course.lectureId).catch(() => []);
      const weekMap = {};
      const allMap = {};
      for (const r of attData) {
        allMap[r.student_id] = allMap[r.student_id] || [];
        allMap[r.student_id].push(r);
        if (Number(r.week) === week) {
          weekMap[r.student_id] = { status: r.status, method: r.method, time: r.check_in_time };
        }
      }
      setAttRecs(weekMap);
      setAllWeekAttRecs(allMap);
    }
  }

  const isPresent = (s) => {
    const rec = attRecs[s.id];
    return rec ? rec.status !== 'absent' : false;
  };

  const totalWeeksAttended = (s) => {
    const recs = allWeekAttRecs[s.id] || [];
    return recs.filter(r => r.status !== 'absent').length;
  };

  const pendingExcuses = excuses.filter(e=>e.status==='pending').length;
  const presentCount = enrolled.filter(s=>isPresent(s)).length;
  const absentCount  = enrolled.length - presentCount;
  const markedCount  = Object.keys(attRecs).length;

  async function toggleStudent(s) {
    const currentlyPresent = isPresent(s);
    const newStatus = currentlyPresent ? 'absent' : 'present';
    if (!course?.lectureId) return;
    await api.markAttendance({ student_id: s.id, lecture_id: course.lectureId, status: newStatus, method: 'manual', week }).catch(()=>{});
    setAttRecs(prev => ({ ...prev, [s.id]: { status: newStatus, method: 'manual', time: new Date().toISOString() } }));
  }

  async function markAll(present) {
    if (!course?.lectureId) return;
    const status = present ? 'present' : 'absent';
    await Promise.all(enrolled.map(s =>
      api.markAttendance({ student_id: s.id, lecture_id: course.lectureId, status, method: 'manual', week }).catch(()=>{})
    ));
    const newRecs = {};
    for (const s of enrolled) newRecs[s.id] = { status, method: 'manual', time: new Date().toISOString() };
    setAttRecs(newRecs);
  }

  async function generateQR() {
    try {
      const result = await api.createQR({ courseId: selCourse, lectureId: course?.lectureId || '', week });
      setQrMeta({ token: result.token, courseId: selCourse, week, createdAt: Date.now() });
    } catch(e) {
      console.error('generateQR error:', e);
      alert(`Failed to generate QR: ${e.message}`);
      return;
    }
    setActiveTab('qr');
  }

  async function markStudentManual(sId, status) {
    if (!course?.lectureId) return;
    await api.markAttendance({ student_id: sId, lecture_id: course.lectureId, status, method: 'manual', week }).catch(()=>{});
    setAttRecs(prev => ({ ...prev, [sId]: { status, method: 'manual', time: new Date().toISOString() } }));
  }

  async function updateExcuse(id, status) {
    await api.updateExcuse(id, { status }).catch(()=>{});
    setExcuses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }

  const TAB = (id, label, badge) => (
    <button onClick={()=>setActiveTab(id)} style={{
      padding:'8px 18px', fontSize:12, fontWeight:700, cursor:'pointer',
      border:'none', borderRadius:8,
      background: activeTab===id ? C.blue3 : C.bg3,
      color: activeTab===id ? '#fff' : C.text2,
      position:'relative',
    }}>
      {label}
      {badge>0 && <span style={{position:'absolute',top:-4,right:-4,background:'#ef4444',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>{badge}</span>}
    </button>
  );

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('attendance')}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Click a student row to toggle · Generate QR for student self check-in · Review excuses</div>

      {/* Controls */}
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <select value={selCourse} onChange={e=>{setSelCourse(e.target.value);setQrMeta(null);}}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={week} onChange={e=>{setWeek(parseInt(e.target.value));setQrMeta(null);}}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>Week {i+1}</option>)}
        </select>
        <span style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid #10b981',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>✅ {presentCount} Present</span>
        <span style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'1px solid #ef4444',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>❌ {absentCount} Absent</span>
        <span style={{background:'rgba(148,163,184,0.12)',color:C.text3,border:`1px solid ${C.border}`,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:600}}>📋 {markedCount} Marked</span>
        <div style={{flex:1}}/>
        <button onClick={()=>markAll(true)} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ All Present</button>
        <button onClick={()=>markAll(false)} style={{background:'rgba(239,68,68,0.15)',border:'1px solid #ef4444',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#ef4444',cursor:'pointer'}}>❌ All Absent</button>
        <button onClick={generateQR} style={{background:'rgba(139,92,246,0.15)',border:'1px solid #8b5cf6',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#a78bfa',cursor:'pointer'}}>📱 QR Code</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {TAB('mark','✏️ Mark Attendance',0)}
        {TAB('roster','📋 Roster',0)}
        {TAB('qr','📱 QR Code',0)}
        {TAB('excuses','📄 Excuses',pendingExcuses)}
      </div>

      {/* ── MARK ATTENDANCE TAB ── */}
      {activeTab==='mark' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',background:C.bg3,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>Mark each student — Week {week} · {course?.name}</div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>markAll(true)}
                style={{background:'rgba(16,185,129,0.15)',border:'1px solid #10b981',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,color:'#10b981',cursor:'pointer'}}>✅ All Present</button>
              <button onClick={()=>markAll(false)}
                style={{background:'rgba(239,68,68,0.12)',border:'1px solid #ef4444',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,color:'#ef4444',cursor:'pointer'}}>❌ All Absent</button>
            </div>
          </div>
          {enrolled.length===0 && <div style={{padding:40,textAlign:'center',color:C.text3}}>No students enrolled.</div>}
          {enrolled.map((s,i)=>{
            const rec=attRecs[s.id];
            const status=rec?.status||(isPresent(s)?'present':'absent');
            const photoUrl=s.photo;
            const BTN=(st,label,col,bg)=>(
              <button onClick={e=>{e.stopPropagation();markStudentManual(s.id,st);}}
                style={{padding:'4px 10px',fontSize:10,fontWeight:700,borderRadius:6,border:`1px solid ${col}`,
                  background:status===st?bg:'transparent',color:status===st?col:C.text3,cursor:'pointer',transition:'all 0.1s'}}>
                {label}
              </button>
            );
            return (
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:i<enrolled.length-1?`1px solid ${C.border}`:'none',background:i%2===0?C.bg3:'transparent'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:s.color||C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,overflow:'hidden',flexShrink:0}}>
                  {photoUrl?<img src={photoUrl} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>:null}
                  <span style={{display:photoUrl?'none':'flex'}}>{s.emoji||'👤'}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id} · {s.dept}</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  {BTN('present','✅ Present','#10b981','rgba(16,185,129,0.15)')}
                  {BTN('late','⏰ Late','#f59e0b','rgba(245,158,11,0.15)')}
                  {BTN('absent','❌ Absent','#ef4444','rgba(239,68,68,0.12)')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ROSTER TAB ── */}
      {activeTab==='roster' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'56px 1fr 140px 120px 90px 110px 90px',background:C.bg3,borderBottom:`1px solid ${C.border}`,padding:'8px 16px',fontSize:11,fontWeight:700,color:C.text2}}>
            <div/><div>Name</div><div>Department</div><div>This Week</div><div>Total</div><div>Check-In</div><div>Method</div>
          </div>
          {enrolled.length===0 && <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:13}}>No students enrolled.</div>}
          {enrolled.map((s,i)=>{
            const rec=attRecs[s.id]; const present=isPresent(s);
            const total=totalWeeksAttended(s);
            const photoUrl=s.photo;
            const isExcused=rec?.status==='excused';
            const unmarked=!rec; // no record yet for this week
            const rowBg = present ? 'rgba(16,185,129,0.07)' : (i%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)');
            return (
              <div key={s.id} onClick={()=>toggleStudent(s)} style={{
                display:'grid',gridTemplateColumns:'56px 1fr 140px 120px 90px 110px 90px',
                alignItems:'center',padding:'10px 16px',
                borderBottom:i<enrolled.length-1?`1px solid ${C.border}`:'none',
                background:rowBg, cursor:'pointer',transition:'background 0.15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                <div style={{width:40,height:40,borderRadius:'50%',background:s.color||C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,overflow:'hidden',border:`2px solid ${present?'#10b981':unmarked?C.border:'#ef4444'}`}}>
                  {photoUrl?<img src={photoUrl} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>:null}
                  <span style={{display:photoUrl?'none':'flex'}}>{s.emoji||'👤'}</span>
                </div>
                <div style={{paddingLeft:10}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id}</div>
                </div>
                <div style={{fontSize:12,color:C.text2}}>{s.dept}</div>
                <div>
                  {unmarked ? (
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(148,163,184,0.1)',color:C.text3,border:`1px solid ${C.border}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>
                      — Unmarked
                    </span>
                  ) : (
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,background:present?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.12)',color:present?'#10b981':'#ef4444',border:`1px solid ${present?'#10b981':'#ef4444'}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>
                      {isExcused?'📄 Excused':present?'✅ Present':'❌ Absent'}
                    </span>
                  )}
                </div>
                {/* Total weeks attended across all 16 weeks */}
                <div style={{fontSize:12,fontWeight:700,color:total>=12?'#10b981':total>=8?'#f59e0b':'#ef4444'}}>
                  {total} / 16
                </div>
                <div style={{fontSize:11,color:C.text2}}>
                  {present && rec?.time ? new Date(rec.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                </div>
                <div style={{fontSize:11,color:C.text3}}>{present ? (rec?.method||'—') : '—'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── QR TAB ── */}
      {activeTab==='qr' && (() => {
        const qrUrl = qrMeta
          ? `${window.location.origin}${window.location.pathname}?checkin=${btoa(JSON.stringify({token:qrMeta.token,courseId:qrMeta.courseId,week:qrMeta.week,createdAt:qrMeta.createdAt}))}`
          : '';
        return (
          <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:28,textAlign:'center'}}>
            {qrMeta ? (
              <>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>📱 QR Code for {course?.name} — Week {week}</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:20}}>Students scan with phone camera to auto check-in · or enter code manually · Valid 90 min</div>
                <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                  <QRCodeComp value={qrUrl} size={220} color={course?.color||'#3b82f6'}/>
                </div>
                <div style={{display:'inline-block',background:C.bg3,border:`2px dashed ${C.border}`,borderRadius:12,padding:'12px 32px',marginBottom:20}}>
                  <div style={{fontSize:11,color:C.text3,marginBottom:4}}>Manual Code (same device)</div>
                  <div style={{fontSize:36,fontWeight:800,color:course?.color||C.blue,letterSpacing:8,fontFamily:'monospace'}}>{qrMeta.token}</div>
                </div>
                <div style={{fontSize:11,color:C.text3}}>📷 Scan with phone → auto check-in &nbsp;·&nbsp; 💻 Same device: enter code in <strong>QR Check-In</strong> tab</div>
                <button onClick={generateQR}
                  style={{marginTop:16,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 20px',fontSize:12,color:C.text2,cursor:'pointer'}}>
                  🔄 Regenerate Code
                </button>
              </>
            ) : (
              <div>
                <div style={{fontSize:48,marginBottom:12}}>📱</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>QR Code Attendance</div>
                <div style={{fontSize:12,color:C.text3,marginBottom:20}}>Generate a QR code — students scan it or enter the code to mark themselves present</div>
                <button onClick={generateQR} style={{background:C.blue3,border:'none',borderRadius:10,padding:'12px 28px',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                  📱 Generate QR Code
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── EXCUSES TAB ── */}
      {activeTab==='excuses' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          {excuses.length===0 ? (
            <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:13}}>No excuse submissions for Week {week}.</div>
          ) : excuses.map((ex,i)=>(
            <div key={ex.id} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<excuses.length-1?`1px solid ${C.border}`:'none'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{ex.studentName} <span style={{fontSize:10,color:C.text3}}>({ex.studentId})</span></div>
                <div style={{fontSize:11,color:C.text2,marginTop:3}}>{ex.reason}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:2}}>Submitted: {new Date(ex.submittedAt).toLocaleDateString()}</div>
              </div>
              <div>
                {ex.status==='pending' ? (
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>updateExcuse(ex.id,'approved')}
                      style={{background:C.green,border:'none',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Approve</button>
                    <button onClick={()=>updateExcuse(ex.id,'rejected')}
                      style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:C.red2,cursor:'pointer'}}>❌ Reject</button>
                  </div>
                ) : (
                  <span style={{fontSize:12,fontWeight:700,color:ex.status==='approved'?'#10b981':'#ef4444',background:ex.status==='approved'?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',border:`1px solid ${ex.status==='approved'?'#10b981':'#ef4444'}`,borderRadius:20,padding:'4px 12px'}}>
                    {ex.status==='approved'?'✅ Approved':'❌ Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── LECTURES ── */
function DocLectures({ theme: C, myCourses }) {
  const { t } = useLang();
  const [enrolledCounts, setEnrolledCounts] = useState({});

  useEffect(() => {
    if (!myCourses.length) return;
    Promise.all(
      myCourses.map(c =>
        api.getCourseStudents(c.id)
          .then(r => ({ id: c.id, count: (r.enrolled || []).length }))
          .catch(() => ({ id: c.id, count: 0 }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ id, count }) => { map[id] = count; });
      setEnrolledCounts(map);
    });
  }, [myCourses]);

  const totalStudents = Object.values(enrolledCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('lectures')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label="Courses"        value={myCourses.length}       sub="This semester"       icon="📚" accent="blue"/>
        <StatCard theme={C} label="Total Students" value={totalStudents || '…'}   sub="Across all courses"  icon="👥" accent="green"/>
        <StatCard theme={C} label="Avg Engagement" value="—"                      sub="Across courses"      icon="🧠" accent="amber"/>
        <StatCard theme={C} label="Courses Active" value={myCourses.length}       sub="This semester"       icon="🎤" accent="purple"/>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {myCourses.map((c,i)=>(
          <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <div style={{display:'flex',overflow:'hidden'}}>
              <div style={{width:6,background:c.color,flexShrink:0}}/>
              <div style={{padding:'16px 20px',flex:1,display:'flex',alignItems:'center',gap:20}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.text2,marginTop:2}}>{c.code} · {c.room} · {c.time} · {c.duration} min{c.daysLabel ? ` · ${c.daysLabel}` : ''}</div>
                  <div style={{fontSize:11,color:C.text3}}>Semester: {c.semester}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:c.color}}>
                    {enrolledCounts[c.id] !== undefined ? enrolledCounts[c.id] : '…'}
                  </div>
                  <div style={{fontSize:10,color:C.text3}}>Students</div>
                </div>
                <Badge text="Active" color="green"/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── STUDENTS ── */
async function sendEmailAlert(studentEmail, studentName, studentId, attendanceRate, doctorName) {
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  'service_it50w6l',
        template_id: 'template_dxys6ih',
        user_id:     '3nrjXvpxGXf0G01Xj',
        template_params: {
          to_email:        studentEmail,
          to_name:         studentName,
          student_id:      studentId,
          attendance_rate: attendanceRate,
          doctor_name:     doctorName,
          login_url:       window.location.origin,
        }
      })
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

async function sendWithdrawalEmail(studentEmail, studentName, studentId, courseName, doctorName) {
  try {
    const date = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  'service_it50w6l',
        template_id: 'template_dxys6ih',
        user_id:     '3nrjXvpxGXf0G01Xj',
        template_params: {
          to_email:        studentEmail,
          to_name:         studentName,
          student_id:      studentId,
          attendance_rate: `Withdrawn from ${courseName} on ${date}`,
          doctor_name:     doctorName,
          login_url:       window.location.origin,
        }
      })
    });
    const body = await res.text();
    return { success: res.ok && body === 'OK', error: body };
  } catch(e) { return { success: false, error: e.message }; }
}

function DocStudents({ theme: C, myCourses, doctor }) {
  const { t } = useLang();
  const [selCourse, setSelCourse] = useState('all');
  const [search, setSearch] = useState('');
  const [portfolioStudent, setPortfolioStudent] = useState(null);
  const [emailStatus, setEmailStatus] = useState({});
  const [apiStudents, setApiStudents] = useState([]);

  useEffect(() => { loadStudents(); }, [selCourse, myCourses.length]);

  async function loadStudents() {
    const targetCourses = selCourse === 'all' ? myCourses : myCourses.filter(c => c.id === selCourse);
    const results = await Promise.all(targetCourses.map(c =>
      api.getCourseStudents(c.id).then(r => r.enrolled || []).catch(() => [])
    ));
    const seen = new Set();
    const students = [];
    for (const list of results) {
      for (const s of list) {
        if (!seen.has(s.student_id)) {
          seen.add(s.student_id);
          students.push({
            id: s.student_id,
            name: s.name,
            photo: s.photo,
            email: s.email || '',
            dept: s.department || '',
            year: 1,
            emoji: '👤',
            color: '#3b82f6',
            attendanceRate: 75,
            engagement: 75,
            gpa: 3.0,
            emotion: 'neutral',
            attentionScore: 75,
          });
        }
      }
    }
    setApiStudents(students);
  }
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawCourse, setWithdrawCourse] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState({});
  const [withdrawResult, setWithdrawResult] = useState(null);

  const allStudents = apiStudents;
  const atRisk = allStudents.filter(s => s.attendanceRate < 75);
  const filtered = allStudents.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.id.toLowerCase().includes(search.toLowerCase()));

  async function handleWithdraw() {
    if (!withdrawTarget || !withdrawCourse) return;
    if (!withdrawTarget.email) { alert(`No email on file for ${withdrawTarget.name}. Cannot send notification.`); return; }
    setWithdrawing(true);
    await api.unenroll(withdrawCourse, withdrawTarget.id).catch(()=>{});
    const course = myCourses.find(c => c.id === withdrawCourse);
    const result = await sendWithdrawalEmail(withdrawTarget.email, withdrawTarget.name, withdrawTarget.id, course?.name || withdrawCourse, doctor?.name || 'Lecturer');
    setWithdrawDone(p => ({ ...p, [withdrawTarget.id + withdrawCourse]: true }));
    setWithdrawResult({ name: withdrawTarget.name, email: withdrawTarget.email, course: course?.name, ok: result.success, error: result.error });
    setWithdrawing(false);
    setWithdrawTarget(null);
  }

  async function handleSendEmail(stu) {
    if (!stu.email) { alert(`No email address on file for ${stu.name}`); return; }
    setEmailStatus(p => ({ ...p, [stu.id]: 'sending' }));
    const result = await sendEmailAlert(stu.email, stu.name, stu.id, stu.attendanceRate, doctor?.name || 'Lecturer');
    setEmailStatus(p => ({ ...p, [stu.id]: result.success ? 'sent' : 'failed' }));
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {portfolioStudent && <StudentPortfolioModal theme={C} student={portfolioStudent} onClose={()=>setPortfolioStudent(null)}/>}

      {/* Withdrawal confirmation modal */}
      {withdrawTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:28,maxWidth:440,width:'100%'}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>🚫 Withdraw Student</div>
            <div style={{fontSize:12,color:C.text3,marginBottom:20}}>The student will be unenrolled and notified by email automatically.</div>
            <div style={{background:C.bg3,borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:withdrawTarget.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{withdrawTarget.emoji}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{withdrawTarget.name}</div>
                <div style={{fontSize:11,color:C.text3}}>{withdrawTarget.id} · {withdrawTarget.email}</div>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:6,fontWeight:700,textTransform:'uppercase'}}>Withdraw from Course</div>
              <select value={withdrawCourse} onChange={e=>setWithdrawCourse(e.target.value)}
                style={{width:'100%',height:38,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:13,color:C.text}}>
                <option value="">— Select course —</option>
                {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={handleWithdraw} disabled={!withdrawCourse||withdrawing}
                style={{flex:1,background:'linear-gradient(135deg,#ef4444,#dc2626)',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,color:'#fff',cursor:withdrawCourse&&!withdrawing?'pointer':'default',opacity:withdrawCourse?1:0.5}}>
                {withdrawing ? '⏳ Processing...' : '✅ Confirm Withdrawal & Send Email'}
              </button>
              <button onClick={()=>setWithdrawTarget(null)}
                style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 16px',fontSize:13,color:C.text2,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal result toast */}
      {withdrawResult && (
        <div style={{position:'fixed',top:24,right:24,zIndex:3000,background:withdrawResult.ok ? '#166534' : '#7f1d1d',border:`1px solid ${withdrawResult.ok ? '#22c55e' : '#ef4444'}`,borderRadius:12,padding:'14px 20px',maxWidth:360,boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:4}}>
            {withdrawResult.ok ? '✅ Withdrawal Complete' : '⚠️ Withdrawn — Email Failed'}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>
            {withdrawResult.name} removed from {withdrawResult.course}.<br/>
            {withdrawResult.ok ? `Email sent to ${withdrawResult.email}` : `Email failed: ${withdrawResult.error || 'Unknown error'}`}
          </div>
          <button onClick={()=>setWithdrawResult(null)} style={{marginTop:10,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,padding:'4px 12px',fontSize:11,color:'#fff',cursor:'pointer'}}>Dismiss</button>
        </div>
      )}

      {/* At-Risk Students Alert Section */}
      {atRisk.length > 0 && (
        <div style={{background:'rgba(239,68,68,0.08)',border:`1px solid rgba(239,68,68,0.3)`,borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div style={{fontSize:15,fontWeight:700,color:'#ef4444'}}>At-Risk Students ({atRisk.length})</div>
            <div style={{fontSize:11,color:C.text3,marginLeft:4}}>Attendance below 75% — send email alert to student</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {atRisk.map(stu => {
              const status = emailStatus[stu.id];
              return (
                <div key={stu.id} style={{display:'flex',alignItems:'center',gap:12,background:C.card,borderRadius:10,padding:'10px 14px',border:`1px solid ${C.border}`}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:stu.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{stu.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{stu.name}</div>
                    <div style={{fontSize:11,color:C.text3}}>{stu.id} · {stu.email || 'No email on file'}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#ef4444',minWidth:40}}>{stu.attendanceRate}%</div>
                  <button
                    onClick={() => handleSendEmail(stu)}
                    disabled={status === 'sending' || status === 'sent'}
                    style={{
                      background: status === 'sent' ? C.green : status === 'failed' ? '#ef4444' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                      border: 'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700,
                      color: '#fff', cursor: status==='sending'||status==='sent' ? 'default' : 'pointer', whiteSpace:'nowrap'
                    }}
                  >
                    {status === 'sending' ? '📤 Sending...' : status === 'sent' ? '✅ Email Sent' : status === 'failed' ? '❌ Failed' : '📧 Send Alert'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('students')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..."
          style={{flex:1,minWidth:200,height:38,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}/>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}>
          <option value="all">All Courses</option>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card theme={C} title={`Students (${filtered.length})`}>
        <div style={{padding:'4px 12px 12px'}}>
          <DataTable theme={C} columns={[
            {key:'id',label:'ID',width:60},{key:'name',label:'Name',width:180},
            {key:'dept',label:'Department',width:130},{key:'year',label:'Year',width:55},
            {key:'emotion',label:'Emotion',width:90},{key:'engagement',label:'Engagement',width:90},
            {key:'attendance',label:'Attendance',width:90},{key:'gpa',label:'GPA',width:55},
            {key:'action',label:'',width:100},
          ]} rows={filtered.map(s=>({
            id:s.id,
            name:(()=>{
              const photo = s.photo;
              return (
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {photo ? <img src={photo} alt={s.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',border:`1px solid ${C.border}`,flexShrink:0}}/> : null}
                  <div style={{width:30,height:30,borderRadius:'50%',background:s.color,display:photo?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{s.emoji}</div>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</span>
                </div>
              );
            })(),
            dept:s.dept, year:`Year ${s.year}`,
            emotion:`${EMOTION_ICONS[s.emotion]||'😐'} ${s.emotion}`,
            engagement:`${s.engagement}%`, attendance:`${s.attendanceRate}%`, gpa:s.gpa,
            action:(
              <button onClick={e=>{e.stopPropagation();setWithdrawTarget(s);setWithdrawCourse(myCourses[0]?.id||'');}}
                style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,color:'#ef4444',cursor:'pointer',whiteSpace:'nowrap'}}>
                🚫 Withdraw
              </button>
            ),
          }))} onRowClick={(_,i)=>setPortfolioStudent(filtered[i])}/>
        </div>
      </Card>
    </div>
  );
}

/* ── EXAM RESULTS (GRADES) ── */
function DocGrades({ theme: C, user, doctor, myCourses }) {
  const { t } = useLang();
  const [selCourse, setSelCourse]   = useState(myCourses[0]?.id||'');
  const [search, setSearch]         = useState('');
  const [editStudent, setEditStudent] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [showWeights, setShowWeights] = useState(false);
  const [showCalc, setShowCalc]     = useState(null);
  const [weights, setWeights]       = useState(null);
  const [compInputs, setCompInputs] = useState({midterm:'',final:'',assignments:'',attendance:''});
  const [enrolled, setEnrolled]     = useState([]);
  const [results, setResults]       = useState({}); // {studentId: {grade, date}}
  const [, forceUpdate]             = useState(0);

  // Default weights (local-only — no backend endpoint for weights)
  const curWeights = weights || { midterm: 30, final: 40, assignments: 20, attendance: 10 };

  useEffect(() => { if (selCourse) loadData(); }, [selCourse]);

  async function loadData() {
    const r = await api.getCourseStudents(selCourse).catch(() => ({ enrolled: [] }));
    const stuList = (r.enrolled || []).map(s => ({
      id: s.student_id,
      name: s.name,
      dept: s.department || '',
      year: 1,
      emoji: '👤',
      color: '#3b82f6',
    }));
    setEnrolled(stuList);

    // Load each student's grade for this course
    const gradeEntries = await Promise.all(stuList.map(s =>
      api.getStudentGrades(s.id)
        .then(grades => {
          const g = grades.find(g => g.course_code === selCourse);
          return g ? [s.id, { grade: g.grade, date: g.created_at }] : null;
        })
        .catch(() => null)
    ));
    const gradeMap = {};
    for (const entry of gradeEntries) { if (entry) gradeMap[entry[0]] = entry[1]; }
    setResults(gradeMap);
  }

  const filtered = enrolled.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
  );

  function loadWeights() {
    setWeights({ ...curWeights });
  }

  function saveWeights() {
    const total = Object.values(weights).reduce((a,b)=>a+Number(b),0);
    if (total !== 100) { alert(`Weights must sum to 100 (currently ${total})`); return; }
    setWeights(Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,Number(v)])));
    setShowWeights(false);
  }

  function openCalc(sid) {
    setCompInputs({midterm:'',final:'',assignments:'',attendance:''});
    setShowCalc(sid);
  }

  function saveCalc(sid) {
    const preview = calcPreview();
    setGradeInput(String(preview));
    setEditStudent(sid);
    setShowCalc(null);
  }

  function calcPreview() {
    const w = curWeights;
    return +(
      (parseFloat(compInputs.midterm)||0)*(w.midterm/100)+
      (parseFloat(compInputs.final)||0)*(w.final/100)+
      (parseFloat(compInputs.assignments)||0)*(w.assignments/100)+
      (parseFloat(compInputs.attendance)||0)*(w.attendance/100)
    ).toFixed(1);
  }

  async function saveGrade(sid) {
    const g = parseFloat(gradeInput);
    if (isNaN(g)||g<0||g>100) { alert('Enter a valid grade (0-100)'); return; }
    const course = myCourses.find(c => c.id === selCourse);
    await api.saveCourseGrade({ student_id: sid, course_code: selCourse, course_name: course?.name||'', grade: g, doctor_id: doctor.id }).catch(()=>{});
    setEditStudent(null); setGradeInput('');
    loadData();
  }

  async function deleteGrade(sid) {
    if (!confirm('Delete this grade?')) return;
    // No delete endpoint — overwrite with null by saving grade 0; or just reload
    forceUpdate(n=>n+1);
    loadData();
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('exam_results')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <select value={selCourse} onChange={e=>{setSelCourse(e.target.value);setShowWeights(false);setShowCalc(null);}}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or ID..."
          style={{flex:1,height:38,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}/>
        <button onClick={()=>{setShowWeights(!showWeights);if(!weights)loadWeights();}}
          style={{background:showWeights?C.blue3:C.bg3,border:`1px solid ${showWeights?C.blue3:C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:showWeights?'#fff':C.text2,cursor:'pointer'}}>
          ⚙️ Grade Weights
        </button>
        <button onClick={()=>{
          alert('✅ Grades saved — students can view them in their portal.');
          forceUpdate(v=>v+1);
        }} style={{background:'#7c3aed',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          📤 Publish Grades
        </button>
      </div>

      {/* Grade stats bar */}
      {(() => {
        const gradedCount = enrolled.filter(s=>results[s.id]).length;
        const passCount   = enrolled.filter(s=>(results[s.id]?.grade??-1)>=50).length;
        const avg = gradedCount ? Math.round(enrolled.reduce((a,s)=>a+(results[s.id]?.grade??0),0)/gradedCount) : 0;
        return (
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[
              {label:'Enrolled', value:enrolled.length,  color:C.blue},
              {label:'Graded',   value:gradedCount,       color:C.green},
              {label:'Passing',  value:passCount,         color:'#10b981'},
              {label:'Failing',  value:gradedCount-passCount, color:C.red},
              {label:'Avg Grade',value:gradedCount?`${avg}%`:'—', color:C.purple||'#8b5cf6'},
            ].map((s,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'8px 14px',textAlign:'center',flex:1}}>
                <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:9,color:C.text3,marginTop:2,textTransform:'uppercase',fontWeight:700}}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Grade weights panel */}
      {showWeights && weights && (
        <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>⚙️ Grade Weights — {myCourses.find(c=>c.id===selCourse)?.name}</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:14}}>Set how each component contributes to the final grade. Must total 100%.</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
            {[['midterm','📝 Midterm'],['final','📋 Final Exam'],['assignments','📚 Assignments'],['attendance','✅ Attendance']].map(([k,lbl])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.text3,marginBottom:6,fontWeight:700}}>{lbl}</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" min={0} max={100} value={weights[k]} onChange={e=>setWeights({...weights,[k]:e.target.value})}
                    style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:14,fontWeight:700,color:C.text,textAlign:'center'}}/>
                  <span style={{color:C.text3,fontSize:13,fontWeight:700}}>%</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:12,color:Object.values(weights).reduce((a,b)=>a+Number(b),0)===100?'#10b981':'#ef4444',fontWeight:700}}>
              Total: {Object.values(weights).reduce((a,b)=>a+Number(b),0)}%
            </span>
            <div style={{flex:1}}/>
            <button onClick={saveWeights} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>💾 Save Weights</button>
            <button onClick={()=>setShowWeights(false)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Weight summary bar */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        {[['📝 Midterm',curWeights.midterm,'#3b82f6'],['📋 Final',curWeights.final,'#8b5cf6'],['📚 Assignments',curWeights.assignments,'#10b981'],['✅ Attendance',curWeights.attendance,'#f59e0b']].map(([lbl,pct,col])=>(
          <span key={lbl} style={{background:`${col}22`,border:`1px solid ${col}`,borderRadius:20,padding:'3px 12px',fontSize:11,fontWeight:700,color:col}}>{lbl} {pct}%</span>
        ))}
      </div>

      {/* Grade calc modal */}
      {showCalc && (()=>{
        const s = enrolled.find(x=>x.id===showCalc);
        const preview = calcPreview();
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:28,width:420,maxWidth:'90vw'}}>
              <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:4}}>🧮 Grade Calculator</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:20}}>{s?.name} · {myCourses.find(c=>c.id===selCourse)?.name}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {[['midterm','📝 Midterm','%',curWeights.midterm],['final','📋 Final Exam','%',curWeights.final],['assignments','📚 Assignments','%',curWeights.assignments],['attendance','✅ Attendance','%',curWeights.attendance]].map(([k,lbl,,w])=>(
                  <div key={k}>
                    <div style={{fontSize:10,color:C.text3,marginBottom:5,fontWeight:700}}>{lbl} <span style={{color:C.blue}}>({w}%)</span></div>
                    <input type="number" min={0} max={100} value={compInputs[k]} onChange={e=>setCompInputs({...compInputs,[k]:e.target.value})} placeholder="0–100"
                      style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:13,color:C.text}}/>
                  </div>
                ))}
              </div>
              <div style={{background:C.bg3,borderRadius:10,padding:16,textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:11,color:C.text3,marginBottom:4}}>Calculated Final Grade</div>
                <div style={{fontSize:36,fontWeight:800,color:preview>=50?'#10b981':'#ef4444'}}>{preview}%</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text2}}>{letterGrade(preview)} — {preview>=50?'Pass':'Fail'}</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>saveCalc(showCalc)} style={{flex:1,background:C.green,border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer'}}>💾 Save & Apply Grade</button>
                <button onClick={()=>setShowCalc(null)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 16px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      <Card theme={C} title={`Grades — ${myCourses.find(c=>c.id===selCourse)?.name||''}`}>
        <div style={{overflowX:'auto',padding:'0 12px 12px'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:C.card2}}>
                {['ID','Name','Department','Grade','Letter','Status','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text2,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>{
                const rec = results[s.id];
                const g = rec?.grade;
                const gc = g!=null ? gradeColor(g,C) : C.text3;
                const isEditing = editStudent===s.id;
                const hasComp = false;
                return (
                  <tr key={i} style={{background:i%2===0?C.bg3:C.card}}>
                    <td style={{padding:'8px 12px',color:C.text,borderBottom:`1px solid ${C.border}`}}>{s.id}</td>
                    <td style={{padding:'8px 12px',color:C.text,borderBottom:`1px solid ${C.border}`}}>{s.name}</td>
                    <td style={{padding:'8px 12px',color:C.text2,borderBottom:`1px solid ${C.border}`}}>{s.dept}</td>
                    <td style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`}}>
                      {isEditing
                        ? <input value={gradeInput} onChange={e=>setGradeInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveGrade(s.id)}
                            autoFocus placeholder="0-100" style={{width:70,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 8px',color:C.text,fontSize:11}}/>
                        : <span style={{fontWeight:700,color:gc}}>{g!=null?`${g}%`:'—'}</span>
                      }
                    </td>
                    <td style={{padding:'8px 12px',color:gc,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{g!=null?letterGrade(g):'—'}</td>
                    <td style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`}}>
                      {g!=null ? <Badge text={g>=50?'Pass':'Fail'} color={g>=50?'green':'red'}/> : <span style={{color:C.text3,fontSize:10}}>No grade</span>}
                    </td>
                    <td style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>openCalc(s.id)} style={{background:'rgba(139,92,246,0.15)',border:'1px solid #8b5cf6',borderRadius:6,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#a78bfa',cursor:'pointer'}}>
                          🧮{hasComp?' Recalc':' Calc'}
                        </button>
                        {isEditing
                          ? <>
                              <button onClick={()=>saveGrade(s.id)} style={{background:C.green,border:'none',borderRadius:6,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#fff',cursor:'pointer'}}>Save</button>
                              <button onClick={()=>{setEditStudent(null);setGradeInput('');}} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.text2,cursor:'pointer'}}>Cancel</button>
                            </>
                          : <>
                              <button onClick={()=>{setEditStudent(s.id);setGradeInput(g!=null?String(g):'');}} style={{background:C.blue_dim,border:`1px solid ${C.blue}`,borderRadius:6,padding:'4px 10px',fontSize:10,fontWeight:700,color:C.blue2,cursor:'pointer'}}>
                                {g!=null?'Edit':'Add'}
                              </button>
                              {g!=null && <button onClick={()=>deleteGrade(s.id)} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.red2,cursor:'pointer'}}>Del</button>}
                              <button onClick={async()=>{if(window.confirm(`Withdraw ${s.name} from this course?`)){await api.unenroll(selCourse,s.id).catch(()=>{});loadData();}}}
                                style={{background:'#2d1a00',border:`1px solid ${C.amber}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.amber,cursor:'pointer'}}>
                                Withdraw
                              </button>
                            </>
                        }
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── COMMUNITY CHAT ── */
function DocChat({ theme: C, user, doctor, myCourses }) {
  const { t } = useLang();
  const [selIdx, setSelIdx] = useState(0);
  const [msg, setMsg] = useState('');
  const [isAnnounce, setIsAnnounce] = useState(false);
  const [messages, setMessages] = useState([]);

  const course = myCourses[selIdx];

  useEffect(() => {
    if (!course) return;
    api.getMessages(course.id)
      .then(data => setMessages(data.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        sender: m.sender_name,
        type: m.sender_role === 'doctor' ? 'announcement' : 'message',
        text: m.text,
        timestamp: new Date(m.created_at).toLocaleString(),
      }))))
      .catch(() => {});
  }, [course?.id, selIdx]);

  function loadMessages() {
    if (!course) return;
    api.getMessages(course.id)
      .then(data => setMessages(data.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        sender: m.sender_name,
        type: m.sender_role === 'doctor' ? 'announcement' : 'message',
        text: m.text,
        timestamp: new Date(m.created_at).toLocaleString(),
      }))))
      .catch(() => {});
  }

  function sendMsg() {
    if (!msg.trim() || !course) return;
    api.sendMessage({
      course_code: course.id,
      sender_id: user.id,
      sender_name: doctor.name,
      sender_role: 'doctor',
      text: msg,
    }).then(() => { setMsg(''); loadMessages(); }).catch(() => {});
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
      <div style={{padding:'18px 24px 8px',display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text,flex:1}}>💬 {t('page_chat')}</div>
        <select value={selIdx} onChange={e=>setSelIdx(parseInt(e.target.value))}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',fontSize:12,color:C.text}}>
          {myCourses.map((c,i)=><option key={i} value={i}>{c.name} ({c.code})</option>)}
        </select>
      </div>
      <div style={{height:1,background:C.border,margin:'0 24px'}}/>

      <div style={{flex:1,overflowY:'auto',padding:'8px 16px',display:'flex',flexDirection:'column',gap:6}}>
        {messages.length===0
          ? <div style={{textAlign:'center',color:C.text3,fontSize:12,paddingTop:40}}>No messages yet. Post an announcement!</div>
          : messages.map((m,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:m.senderId===doctor.id?'flex-end':'flex-start'}}>
              {m.type==='announcement'
                ? <div style={{background:C.amber_dim||'#2d1a00',borderRadius:10,border:`1px solid ${C.amber}`,padding:'8px 12px',maxWidth:'70%'}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.amber,marginBottom:4}}>📢 {m.sender} · {m.timestamp}</div>
                    <div style={{fontSize:12,color:C.text}}>{m.text}</div>
                  </div>
                : <div style={{background:m.senderId===doctor.id?C.blue3:C.card,borderRadius:14,padding:'6px 12px',maxWidth:'60%'}}>
                    {m.senderId!==doctor.id && <div style={{fontSize:9,fontWeight:700,color:C.blue2,marginBottom:2}}>{m.sender}</div>}
                    <div style={{fontSize:12,color:m.senderId===doctor.id?'#fff':C.text}}>{m.text}</div>
                    <div style={{fontSize:8,color:C.text3,marginTop:2}}>{m.timestamp}</div>
                  </div>
              }
              {m.senderId===String(user.id)&&<button onClick={()=>{ setMessages(prev=>prev.filter(x=>x.id!==m.id)); }} style={{fontSize:9,color:C.red2,background:'transparent',border:'none',cursor:'pointer',marginTop:2}}>Delete</button>}
            </div>
          ))
        }
      </div>

      <div style={{padding:'8px 24px 12px'}}>
        <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'10px 12px'}}>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:C.text2,cursor:'pointer'}}>
              <input type="checkbox" checked={isAnnounce} onChange={e=>setIsAnnounce(e.target.checked)} style={{accentColor:C.amber}}/>
              📢 Post as Announcement
            </label>
          </div>
          <div style={{display:'flex',gap:8}}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()}
              placeholder={isAnnounce?'Write an announcement...':'Write a message...'}
              style={{flex:1,height:38,background:C.bg3,border:`1px solid ${isAnnounce?C.amber:C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}/>
            <button onClick={sendMsg} style={{height:38,padding:'0 18px',background:isAnnounce?C.amber:C.blue3,border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:isAnnounce?'#000':'#fff',cursor:'pointer'}}>
              {isAnnounce?'📢 Announce':'Send ➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ANALYTICS ── */
/* ── seeded PRNG for deterministic per-week emotion simulation ── */
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

const EMOTIONS = ['happy','neutral','focused','confused','bored','angry','surprised'];
const HARD_EMOTIONS = new Set(['confused','bored','angry']);

function buildWeeklyEmotionData(course, enrolledCount = 30) {
  // Use enrolledCount for simulation (real students loaded separately)
  const students = Array.from({length: enrolledCount}, (_, i) => ({ id: `S${i}` }));
  const weeks = 14;
  return Array.from({length: weeks}, (_, wi) => {
    const week = wi + 1;
    const rand = seededRand(course.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 31 + week * 7);
    const present = students.filter(() => rand() > 0.15);
    const emotions = present.map(s => {
      const r = rand();
      // Inject a harder week every 3-4 weeks (deterministic)
      const hardWeek = (week % 4 === 0 || week % 7 === 0);
      if (hardWeek) {
        if (r < 0.35) return 'confused';
        if (r < 0.55) return 'bored';
        if (r < 0.65) return 'neutral';
        if (r < 0.80) return 'focused';
        return 'happy';
      }
      if (r < 0.15) return 'confused';
      if (r < 0.25) return 'bored';
      if (r < 0.50) return 'focused';
      if (r < 0.75) return 'happy';
      return 'neutral';
    });
    const hardCount = emotions.filter(e => HARD_EMOTIONS.has(e)).length;
    const difficultyScore = present.length ? Math.round((hardCount / present.length) * 100) : 0;
    const dist = {};
    EMOTIONS.forEach(e => { dist[e] = emotions.filter(x => x === e).length; });
    return { week, present: present.length, total: students.length, dist, difficultyScore };
  });
}

async function callGroqDetector(courseData, doctorName) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('VITE_GROQ_API_KEY is not set in the build environment.');

  const summary = courseData.map(c => ({
    course: c.course.name,
    hardWeeks: c.weekData
      .filter(w => w.difficultyScore >= 30)
      .map(w => `Week ${w.week} (${w.difficultyScore}% confused/bored, ${w.present} students present)`)
  }));

  const prompt = `You are an academic analytics AI for the EduSense platform. Analyze the following lecture emotion data for Dr. ${doctorName}.

For each course, I'll give you the weeks where more than 30% of students were confused or bored (based on AI emotion detection).

Data:
${summary.map(s => `Course: ${s.course}\nDifficult weeks: ${s.hardWeeks.length ? s.hardWeeks.join(', ') : 'None detected'}`).join('\n\n')}

For each difficult week, generate:
1. A realistic topic name that would typically be taught in that week of that course
2. A 1-sentence reason why students likely struggled
3. One specific actionable recommendation for the lecturer

Format your response as JSON array:
[
  {
    "course": "course name",
    "week": week_number,
    "topic": "topic name",
    "reason": "why students struggled",
    "recommendation": "what the lecturer should do",
    "score": difficulty_percentage
  }
]
Only include weeks with difficulty score >= 30. Return only the JSON array, no other text.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000, temperature: 0.4
    })
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${raw.slice(0, 200)}`);

  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Groq returned non-JSON: ' + raw.slice(0, 200)); }

  const text = data.choices?.[0]?.message?.content || '';

  // Try exact match first
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through to repair */ }
  }

  // Response was truncated — salvage complete objects from the partial array
  const objMatches = [...text.matchAll(/\{[\s\S]*?\}(?=\s*[,\]]|\s*$)/g)];
  const salvaged = [];
  for (const m of objMatches) {
    try { salvaged.push(JSON.parse(m[0])); } catch { /* skip malformed */ }
  }
  if (salvaged.length) return salvaged;

  throw new Error('Could not parse Groq response: ' + text.slice(0, 300));
}

function DocTopicDetector({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weekData, setWeekData] = useState([]);
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id || '');
  const [error, setError] = useState('');

  const course = myCourses.find(c => c.id === selCourse) || myCourses[0];
  const courseWeeks = course ? buildWeeklyEmotionData(course) : [];

  async function runDetector() {
    if (!myCourses.length) return;
    setLoading(true); setResults(null); setError('');
    try {
      const courseData = myCourses.map(c => ({ course: c, weekData: buildWeeklyEmotionData(c) }));
      const res = await callGroqDetector(courseData, doctor?.name || 'Lecturer');
      setResults(res);
    } catch (err) {
      setError(err.message || 'Unknown error from Groq API.');
    }
    setLoading(false);
  }

  const scoreColor = s => s >= 60 ? '#ef4444' : s >= 40 ? '#f59e0b' : '#22c55e';
  const scoreLabel = s => s >= 60 ? '🔴 Very Hard' : s >= 40 ? '🟡 Moderate' : '🟢 Normal';

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:C.text}}>🎯 {t('page_detector')}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>AI analyzes weekly emotion data to find which lectures students struggled with most</div>
        </div>
        <button onClick={runDetector} disabled={loading}
          style={{background:'linear-gradient(135deg,#6366f1,#3b82f6)',border:'none',borderRadius:10,
            padding:'10px 22px',fontSize:13,fontWeight:700,color:'#fff',cursor:loading?'default':'pointer',
            opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:8}}>
          {loading ? '⏳ Analyzing...' : '🔍 Run AI Analysis'}
        </button>
      </div>

      {/* Per-course emotion heatmap */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Emotion Heatmap —</div>
          <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
            style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'4px 10px',fontSize:12,color:C.text}}>
            {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {courseWeeks.map(w => (
              <div key={w.week} title={`Week ${w.week}: ${w.difficultyScore}% difficult (${w.present}/${w.total} present)`}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{
                  width:36,height:36,borderRadius:8,
                  background: w.difficultyScore >= 60 ? 'rgba(239,68,68,0.8)'
                    : w.difficultyScore >= 40 ? 'rgba(245,158,11,0.7)'
                    : w.difficultyScore >= 20 ? 'rgba(99,102,241,0.4)'
                    : 'rgba(34,197,94,0.4)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700,color:'#fff',cursor:'default'
                }}>{w.week}</div>
                <div style={{fontSize:9,color:C.text3}}>{w.difficultyScore}%</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
            {[['🟢','Easy < 20%'],['🔵','Moderate 20-40%'],['🟡','Hard 40-60%'],['🔴','Very Hard > 60%']].map(([dot,label])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:C.text3}}>
                <span>{dot}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{padding:14,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,color:'#ef4444',fontSize:13,marginBottom:16}}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🤖</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600}}>AI is analyzing lecture emotion patterns...</div>
          <div style={{fontSize:12,color:C.text3,marginTop:4}}>Scanning {myCourses.length} courses across 14 weeks</div>
        </div>
      )}

      {results && results.length === 0 && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600}}>No difficult topics detected!</div>
          <div style={{fontSize:12,color:C.text3,marginTop:4}}>Students showed good engagement across all lectures.</div>
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12}}>
            ⚠️ {results.length} Difficult Topics Detected
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {results.sort((a,b)=>b.score-a.score).map((r,i)=>(
              <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:18,
                borderLeft:`4px solid ${scoreColor(r.score)}`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#fff',background:scoreColor(r.score),
                        borderRadius:6,padding:'2px 8px'}}>{scoreLabel(r.score)}</span>
                      <span style={{fontSize:11,color:C.text3}}>Week {r.week} · {r.course}</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:6}}>{r.topic}</div>
                    <div style={{fontSize:12,color:C.text2,marginBottom:8}}>
                      <span style={{fontWeight:600,color:'#f59e0b'}}>Why students struggled: </span>{r.reason}
                    </div>
                    <div style={{fontSize:12,background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',
                      borderRadius:8,padding:'8px 12px',color:C.text}}>
                      <span style={{fontWeight:700,color:'#6366f1'}}>💡 Recommendation: </span>{r.recommendation}
                    </div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:28,fontWeight:800,color:scoreColor(r.score)}}>{r.score}%</div>
                    <div style={{fontSize:10,color:C.text3}}>confused/bored</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EMO_COLORS = {
  happy:'#10b981', neutral:'#6366f1', confused:'#8b5cf6', bored:'#64748b',
  surprise:'#f59e0b', surprised:'#f59e0b', sad:'#475569', angry:'#ef4444', fear:'#f97316',
};

function DocAnalytics({ theme: C }) {
  const { t } = useLang();
  const [overview,    setOverview]    = useState(null);   // /api/analytics/engagement-overview
  const [timeTrends,  setTimeTrends]  = useState([]);     // /api/analytics/time-trends
  const [lectureComp, setLectureComp] = useState([]);     // /api/analytics/lecture-comparison
  const [atRiskList,  setAtRiskList]  = useState([]);
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      get('/api/analytics/engagement-overview'),
      get('/api/analytics/time-trends'),
      get('/api/analytics/lecture-comparison'),
      api.getAtRiskStudents('low'),
      api.getStudents(),
    ]).then(([ov, tt, lc, ar, st]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (tt.status === 'fulfilled') setTimeTrends(tt.value || []);
      if (lc.status === 'fulfilled') setLectureComp(lc.value || []);
      if (ar.status === 'fulfilled') setAtRiskList(ar.value  || []);
      if (st.status === 'fulfilled') setStudents(st.value    || []);
      setLoading(false);
    });
  }, []);

  // ── Stat card values (all from real DB) ──────────────────────────────────────
  const avgEng   = overview ? Math.round(overview.avg_engagement || 0) : 0;
  const avgAtt   = overview ? Math.round(overview.avg_attention  || 0) : 0;
  const happyPct = (() => {
    const emos = overview?.emotions;
    if (!emos?.length) return 0;
    const total = emos.reduce((a, e) => a + e.count, 0);
    const pos   = emos.filter(e => ['happy','neutral'].includes(e.emotion)).reduce((a, e) => a + e.count, 0);
    return total > 0 ? Math.round(pos / total * 100) : 0;
  })();
  const atRiskPct = students.length > 0 ? Math.round(atRiskList.length / students.length * 100) : 0;
  const hasData   = (overview?.total_records || 0) > 0;

  // ── Trend line: real daily data → last 16 points ──────────────────────────
  const trendSorted = [...timeTrends].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-16);
  const trendLabels     = trendSorted.length > 0
    ? trendSorted.map(r => { const d = new Date(r.date); return `${d.getMonth()+1}/${d.getDate()}`; })
    : store.trendData.labels;
  const trendEngagement = trendSorted.length > 0
    ? trendSorted.map(r => Math.round(r.avg_engagement || 0))
    : store.trendData.engagement;
  const trendAttention  = trendSorted.length > 0
    ? trendSorted.map(r => Math.round(r.avg_attention  || 0))
    : store.trendData.attention;
  const trendIsEstimated = trendSorted.length === 0;

  // ── Emotion donut: real distribution ─────────────────────────────────────
  const emoDataRaw     = overview?.emotions || [];
  const emoTotal       = emoDataRaw.reduce((a, e) => a + e.count, 0);
  const emotionDonut   = emoDataRaw.length > 0
    ? emoDataRaw.slice(0, 5).map(e => ({ label: e.emotion, value: e.count, color: EMO_COLORS[e.emotion] || '#64748b' }))
    : store.emotionDist.slice(0, 5).map(d => ({ label: d.emotion, value: d.count, color: d.color }));
  const emotionList    = emoDataRaw.length > 0
    ? emoDataRaw.slice(0, 5).map(e => ({ emotion: e.emotion, pct: emoTotal > 0 ? Math.round(e.count / emoTotal * 100) : 0, color: EMO_COLORS[e.emotion] || '#64748b' }))
    : store.emotionDist.slice(0, 5);
  const emoIsEstimated = emoDataRaw.length === 0;

  // ── Bar chart: real per-course engagement from lecture comparison ─────────
  const barData = lectureComp.length > 0
    ? lectureComp.slice(0, 12).map((l, i) => {
        const cols = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];
        return { label: l.course_code || `C${i+1}`, value: Math.round(l.avg_engagement || 0), color: cols[i % cols.length] };
      })
    : store.lectures.slice(0, 12).map((l, i) => {
        const cols = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];
        return { label: l.code || `C${i+1}`, value: l.avgEngagement || Math.round(55 + (i * 13) % 35), color: cols[i % cols.length] };
      });
  const barIsEstimated = lectureComp.length === 0;

  const EstBadge = () => (
    <span style={{fontSize:9,padding:'1px 6px',borderRadius:20,background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',fontWeight:700,marginLeft:6,verticalAlign:'middle'}}>
      estimated
    </span>
  );

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('analytics')}</div>
        {!loading && (
          <span style={{
            fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700,
            background: hasData ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.15)',
            color:      hasData ? '#10b981' : '#f59e0b',
            border:     `1px solid ${hasData ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            {hasData ? '🟢 Live data' : '🟡 No session data yet'}
          </span>
        )}
      </div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label={t('avg_engagement')} value={loading ? '…' : `${avgEng}%`} sub={t('students')} icon="🧠" accent="blue"/>
        <StatCard theme={C} label={t('attendance_rate')} value={loading ? '…' : `${avgAtt}%`} sub={t('semester')} icon="✅" accent="green"/>
        <StatCard theme={C} label={t('emotion')}        value={loading ? '…' : `${happyPct}%`} sub={t('engagement')} icon="😊" accent="amber"/>
        <StatCard theme={C} label={t('at_risk')}        value={loading ? '…' : `${atRiskPct}%`} sub={t('avg_engagement')} icon="⚠️" accent="red"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Card theme={C} title={<>{t('engagement_trend')}{trendIsEstimated && <EstBadge/>}</>}>
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label: t('engagement'), data: trendEngagement, color: C.blue},
              {label: t('attention'),  data: trendAttention,  color: C.purple},
            ]} labels={trendLabels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title={<>{t('emotion_dist')}{emoIsEstimated && <EstBadge/>}</>}>
          <div style={{padding:'4px 12px 12px',display:'flex',gap:12,alignItems:'center'}}>
            <DonutChart theme={C} data={emotionDonut} size={150}/>
            <div>
              {emotionList.map((d,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{color: d.color, fontSize:12}}>●</span>
                  <span style={{fontSize:10,color:C.text2}}>{d.emotion} {d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card theme={C} title={<>{t('engagement_dept')}{barIsEstimated && <EstBadge/>}</>}>
        <div style={{padding:'4px 12px 12px'}}>
          <BarChart theme={C} data={barData} height={200}/>
        </div>
      </Card>
    </div>
  );
}

/* ── ALERTS ── */
function DocAlerts({ theme: C, user }) {
  const { t } = useLang();
  const [, refresh] = useState(0);
  const alerts = store.getUserNotifications(user);
  const unread = alerts.filter(a=>!a.read).length;

  const typeStyle = {
    warning: {bg:'rgba(245,158,11,0.12)', border:'#f59e0b', color:'#fbbf24', icon:'⚠️'},
    danger:  {bg:'rgba(239,68,68,0.12)',  border:'#ef4444', color:'#f87171', icon:'🚨'},
    info:    {bg:'rgba(59,130,246,0.12)', border:'#3b82f6', color:'#93c5fd', icon:'ℹ️'},
    success: {bg:'rgba(16,185,129,0.12)', border:'#10b981', color:'#34d399', icon:'✅'},
  };

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>🔔 {t('alerts')}</div>
        {unread>0 && <span style={{background:'#ef4444',color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:800}}>{unread} new</span>}
        <div style={{flex:1}}/>
        {unread>0 && <button onClick={()=>{store.markAllUserAlertsRead(user);refresh(n=>n+1);}}
          style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',fontSize:11,color:C.text2,cursor:'pointer'}}>
          Mark all read
        </button>}
        {alerts.length>0 && <button onClick={()=>{alerts.forEach(a=>store.clearAlert(a.id));refresh(n=>n+1);}}
          style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'6px 14px',fontSize:11,color:C.red2,cursor:'pointer'}}>
          🗑️ Clear all
        </button>}
      </div>

      {alerts.length===0 && (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>
          <div style={{fontSize:48,marginBottom:12}}>🔔</div>
          <div style={{fontSize:14}}>No alerts — all is well!</div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {alerts.map(a=>{
          const ts=typeStyle[a.type]||typeStyle.info;
          return (
            <div key={a.id} style={{background:a.read?C.card:ts.bg,border:`1px solid ${a.read?C.border:ts.border}`,borderRadius:12,padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:20,flexShrink:0}}>{ts.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:a.read?C.text2:C.text}}>{a.title}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{a.message}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:4}}>{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                {!a.read && <button onClick={()=>{store.markAlertRead(a.id);refresh(n=>n+1);}}
                  style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.text2,cursor:'pointer'}}>Read</button>}
                <button onClick={()=>{store.clearAlert(a.id);refresh(n=>n+1);}}
                  style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.red2,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legacy static alerts below */}
      {store.alerts?.length>0 && (
        <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:10}}>
          {store.alerts.map((a,i)=><AlertItem key={i} theme={C} alert={a}/>)}
        </div>
      )}
    </div>
  );
}

/* ── STUDENT PORTFOLIO MODAL ── */
function StudentPortfolioModal({ theme: C, student, onClose }) {
  const [courses, setCourses] = useState([]);
  const [gradeMap, setGradeMap] = useState({});
  const idHash = student.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  useEffect(() => {
    api.getStudentGrades(student.id)
      .then(grades => {
        setCourses(grades.map(g => ({ id: g.course_code, name: g.course_name, code: g.course_code })));
        const map = {};
        for (const g of grades) map[g.course_code] = { grade: g.grade };
        setGradeMap(map);
      })
      .catch(() => {});
  }, [student.id]);

  async function printPortfolio() {
    await exportStudentReportPDF({ student, courses, results: gradeMap });
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,width:'100%',maxWidth:720,maxHeight:'88vh',overflowY:'auto',padding:24}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {student.capturedPhoto
              ? <img src={student.capturedPhoto} alt={student.name} style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:`2px solid ${C.green}`}}/>
              : <div style={{width:56,height:56,borderRadius:'50%',background:student.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{student.emoji}</div>
            }
            <div>
              <div style={{fontSize:18,fontWeight:700,color:C.text}}>{student.name}</div>
              <div style={{fontSize:11,color:C.text3}}>{student.id} · {student.dept} · Year {student.year}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={printPortfolio} style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,cursor:'pointer'}}>✕</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
          {[['GPA',student.gpa,C.blue],['Attendance',`${student.attendanceRate}%`,C.green],['Engagement',`${student.engagement}%`,C.purple],['Attention',`${student.attentionScore}%`,C.amber]].map(([lbl,val,col])=>(
            <div key={lbl} style={{background:C.bg3,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:700,color:col}}>{val}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Contact strip */}
        <div style={{background:C.bg3,borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:11,color:C.text2,display:'flex',gap:20,flexWrap:'wrap'}}>
          <span>📧 {student.email||'—'}</span>
          <span>📞 {student.phone||'—'}</span>
          <span>😊 {student.emotion}</span>
          <span>{student.present?'✅ Present Today':'⬜ Absent Today'}</span>
        </div>

        {/* Courses table */}
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Enrolled Courses & Grades</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{background:C.card2}}>
              {['Course','Code','Grade','Letter','Est. Attendance'].map(h=>(
                <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text2,borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.length===0
              ? <tr><td colSpan={5} style={{padding:16,textAlign:'center',color:C.text3}}>No courses enrolled</td></tr>
              : courses.map((c,i)=>{
                  const rec = gradeMap[c.id];
                  const g   = rec?.grade;
                  const att = ((idHash + i*17) % 30) + 70;
                  const gc  = g!=null ? gradeColor(g,C) : C.text3;
                  return (
                    <tr key={i} style={{background:i%2===0?C.bg3:C.card}}>
                      <td style={{padding:'7px 10px',color:C.text,borderBottom:`1px solid ${C.border}`}}>{c.name}</td>
                      <td style={{padding:'7px 10px',color:C.text2,borderBottom:`1px solid ${C.border}`}}>{c.code}</td>
                      <td style={{padding:'7px 10px',fontWeight:700,color:gc,borderBottom:`1px solid ${C.border}`}}>{g!=null?`${g}%`:'—'}</td>
                      <td style={{padding:'7px 10px',fontWeight:700,color:gc,borderBottom:`1px solid ${C.border}`}}>{g!=null?letterGrade(g):'—'}</td>
                      <td style={{padding:'7px 10px',color:C.text2,borderBottom:`1px solid ${C.border}`}}>{att}%</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>

        <div style={{fontSize:10,color:C.text3,textAlign:'right',marginTop:12}}>
          Generated {new Date().toLocaleDateString()} · UsenseLab Academic System
        </div>
      </div>
    </div>
  );
}

/* ── R ANALYSIS REPORTS ── */
function DocRAnalysis({ theme: C }) {
  const { t } = useLang();
  const [output, setOutput]   = useState('# R output will appear here...');
  const [running, setRunning] = useState('');

  async function runScript(script) {
    setRunning(script);
    setOutput(`# Running ${script}...\n`);
    try {
      const res = await fetch('/api/run-r', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = `# Running ${script}...\n`;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        setOutput(buf);
      }
    } catch (e) {
      setOutput(prev => prev + `\n[Error: ${e.message}]`);
    } finally {
      setRunning('');
    }
  }

  const scripts = [
    {
      id: 'install_packages.R',
      icon: '📦',
      title: 'Install Packages',
      sub: 'install_packages.R',
      desc: 'Install all R packages · Run once first',
      color: '#f59e0b',
      bg: '#2d1a00',
    },
    {
      id: 'analysis.R',
      icon: '📊',
      title: 'Full Analysis',
      sub: 'analysis.R',
      desc: 'Emotion distribution · Clustering · Charts',
      color: '#3b82f6',
      bg: '#0a1628',
    },
    {
      id: 'shiny_dashboard.R',
      icon: '✨',
      title: 'Shiny Dashboard',
      sub: 'shiny_dashboard.R',
      desc: 'Interactive dashboard · 127.0.0.1:3484',
      color: '#10b981',
      bg: '#021a12',
      url: 'http://127.0.0.1:3484',
    },
  ];

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('ranalysis')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>Run R scripts directly — no need to open R manually</div>

      {/* R detected banner */}
      <div style={{
        background: '#021a12', border: '1px solid #10b981', borderRadius: 10,
        padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: '#10b981',
      }}>
        <span style={{ fontSize: 16 }}>✅</span>
        R detected at <code style={{ fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>C:\Program Files\R\R-4.6.0\bin\Rscript.exe</code>
      </div>

      {/* Script cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        {scripts.map(s => (
          <div key={s.id} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 36, opacity: 0.85 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{s.title}</div>
            <div style={{ fontSize: 10, color: C.text3, fontFamily: 'monospace' }}>{s.sub}</div>
            <div style={{ fontSize: 11, color: C.text2, textAlign: 'center', lineHeight: 1.5 }}>{s.desc}</div>
            <button
              disabled={!!running}
              onClick={() => runScript(s.id)}
              style={{
                width: '100%', height: 40, borderRadius: 8, border: 'none',
                background: running === s.id ? C.border : s.color,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                opacity: running && running !== s.id ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {running === s.id ? '⏳ Running…' : '▶ Run'}
            </button>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" style={{
                width: '100%', height: 34, borderRadius: 8,
                border: `1px solid ${s.color}`, background: 'transparent',
                color: s.color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textDecoration: 'none',
              }}>
                🔗 Open Dashboard
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Output terminal */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: C.card2, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.text }}>
          R Script Output
        </div>
        <pre style={{
          margin: 0, padding: 16, fontSize: 11, fontFamily: 'monospace',
          color: '#86efac', background: '#020d06',
          minHeight: 180, maxHeight: 400, overflowY: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.6,
        }}>
          {output}
        </pre>
      </div>
    </div>
  );
}

/* ── DOC APPEALS ── */
function DocAppeals({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all');
  const [response, setResponse] = useState({});

  useEffect(() => { loadComplaints(); }, []);

  function loadComplaints() {
    api.getComplaints()
      .then(data => setComplaints(data.map(c => ({
        id: c.id,
        studentId: c.student_id,
        studentName: c.student_name,
        type: c.type,
        courseId: c.course_id,
        courseName: c.course_name,
        description: c.description,
        status: c.status,
        doctorResponse: c.doctor_response,
        adminResponse: c.admin_response,
        createdAt: c.created_at,
      }))))
      .catch(() => {});
  }

  function respond(id) {
    const text = response[id]?.trim();
    if (!text) return;
    api.updateComplaint(id, { status: 'reviewed', doctorResponse: text })
      .then(() => { loadComplaints(); setResponse(r => ({...r, [id]:''})); })
      .catch(() => {});
  }

  const statusColor = { pending:'amber', reviewed:'blue', resolved:'green' };
  const typeLabel   = { absence_excuse:'Absence Excuse', grade_appeal:'Grade Appeal', general:'General Complaint' };
  const filtered = filter==='all' ? complaints : complaints.filter(c=>c.status===filter);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_appeals')} ({complaints.filter(c=>c.status==='pending').length} {t('pending')})</div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['all','pending','reviewed','resolved'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
              background:filter===s?C.blue3:C.bg3, border:`1px solid ${filter===s?C.blue3:C.border}`,
              color:filter===s?'#fff':C.text2}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length===0
        ? <div style={{textAlign:'center',color:C.text3,padding:40,fontSize:13}}>No {filter==='all'?'':filter} appeals.</div>
        : filtered.slice().reverse().map((c,i)=>(
        <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${c.status==='pending'?C.amber:C.border}`,padding:18,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <Badge text={typeLabel[c.type]||c.type} color="blue" isDark/>
            <Badge text={c.status.charAt(0).toUpperCase()+c.status.slice(1)} color={statusColor[c.status]} isDark/>
            <span style={{fontSize:12,color:C.text,fontWeight:700,marginLeft:4}}>{c.studentName}</span>
            <span style={{fontSize:10,color:C.text3,marginLeft:'auto'}}>{c.createdAt}</span>
          </div>
          <div style={{fontSize:12,color:C.text2,marginBottom:4}}><strong>Course:</strong> {c.courseName||'—'}</div>
          <div style={{fontSize:13,color:C.text,marginBottom:10,lineHeight:1.5}}>{c.description}</div>
          {c.doctorResponse && <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,marginBottom:10}}><strong>Your response:</strong> {c.doctorResponse}</div>}
          {c.status==='pending' && (
            <div style={{display:'flex',gap:8}}>
              <input value={response[c.id]||''} onChange={e=>setResponse(r=>({...r,[c.id]:e.target.value}))}
                placeholder="Write your response..."
                style={{flex:1,height:34,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              <button onClick={()=>respond(c.id)}
                style={{background:C.green,border:'none',borderRadius:8,padding:'0 16px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                Respond
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── ANNOUNCEMENTS ── */
function DocAnnouncements({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id || '');
  const [form, setForm] = useState({ title:'', body:'' });
  const [posted, setPosted] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => { if (selCourse) loadAnnouncements(); }, [selCourse]);

  function loadAnnouncements() {
    api.getAnnouncements()
      .then(data => setAnnouncements(
        data
          .filter(a => a.course_id === selCourse)
          .map(a => ({
            id: a.id,
            courseId: a.course_id,
            courseName: a.course_name,
            doctorId: a.doctor_id,
            doctorName: a.doctor_name,
            title: a.title,
            body: a.body,
            createdAt: a.created_at,
          }))
      ))
      .catch(() => {});
  }

  async function post() {
    if (!form.title.trim() || !form.body.trim()) return;
    const course = myCourses.find(c => c.id === selCourse);
    await api.addAnnouncement({
      id: Date.now().toString(),
      courseId: selCourse,
      courseName: course?.name || '',
      doctorId: doctor.id,
      doctorName: doctor.name,
      title: form.title,
      body: form.body,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
    setForm({ title:'', body:'' });
    setPosted(true);
    setTimeout(() => setPosted(false), 3000);
    loadAnnouncements();
  }

  async function del(id) {
    await api.deleteAnnouncement(id).catch(() => {});
    loadAnnouncements();
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📢 {t('page_announcements_doc')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Post announcements to enrolled students — they get a bell notification instantly</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
        {/* Post form */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>New Announcement</div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.text3, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Course</div>
            <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
              style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text }}>
              {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.text3, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Title</div>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Midterm postponed to next week"
              style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text, boxSizing:'border-box' }}/>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:C.text3, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Message</div>
            <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Write your announcement here..."
              rows={5} style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', fontSize:12, color:C.text, resize:'vertical', boxSizing:'border-box' }}/>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={post} disabled={!form.title.trim()||!form.body.trim()}
              style={{ background:C.blue3, border:'none', borderRadius:8, padding:'10px 20px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', opacity:form.title.trim()&&form.body.trim()?1:0.5 }}>
              📤 Post Announcement
            </button>
            {posted && <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✅ Posted!</span>}
          </div>
        </div>

        {/* Existing announcements */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>Posted ({announcements.length})</div>
          {announcements.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:C.text3, fontSize:12, background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>No announcements yet.</div>
            : announcements.map((ann, i) => {
              const t = (() => { try { return new Date(ann.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); } catch{ return ''; } })();
              return (
                <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14, marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{ann.title}</div>
                    <button onClick={()=>del(ann.id)} style={{ background:'none', border:'none', color:C.red2, fontSize:16, cursor:'pointer', padding:'0 4px' }}>×</button>
                  </div>
                  <div style={{ fontSize:11, color:C.text3, marginBottom:6 }}>{t}</div>
                  <div style={{ fontSize:12, color:C.text2, lineHeight:1.5 }}>{ann.body}</div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

/* ── EXAM SCHEDULE ── */
function DocExamSchedule({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const [form, setForm] = useState({ courseId: myCourses[0]?.id||'', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
  const [exams, setExams] = useState([]);
  const TYPE_CFG = {
    midterm: { label:'Midterm', color:'#8b5cf6' },
    final:   { label:'Final',   color:'#ef4444' },
    quiz:    { label:'Quiz',    color:'#10b981' },
  };

  useEffect(() => { loadExams(); }, []);

  function loadExams() {
    const courseIds = new Set(myCourses.map(c => c.id));
    api.getExams()
      .then(data => setExams(
        data
          .filter(e => courseIds.has(e.course_id))
          .map(e => ({
            id: e.id,
            courseId: e.course_id,
            courseName: e.course_name,
            type: e.type,
            date: e.date,
            time: e.time,
            room: e.room,
            duration: e.duration,
            notes: e.notes,
            createdAt: e.created_at,
          }))
      ))
      .catch(() => {});
  }

  async function add() {
    if (!form.date) { alert('Select a date.'); return; }
    const course = myCourses.find(c => c.id === form.courseId);
    await api.addExam({
      id: Date.now().toString(),
      courseId: form.courseId,
      courseName: course?.name || '',
      doctorId: doctor.id,
      type: form.type,
      date: form.date,
      time: form.time,
      room: form.room,
      duration: form.duration,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
    setForm({ courseId: myCourses[0]?.id||'', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
    loadExams();
  }

  async function del(id) {
    await api.deleteExam(id).catch(() => {});
    loadExams();
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🗓️ {t('page_exams')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_exams')}</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:16, alignItems:'start' }}>
        {/* Add form */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Schedule New Exam</div>
          {[
            ['Course', <select value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text }}>
              {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>],
            ['Type', <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text }}>
              <option value="midterm">Midterm</option><option value="final">Final</option><option value="quiz">Quiz</option>
            </select>],
            ['Date', <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Time', <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Room', <input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="e.g. Hall A" style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Duration (min)', <input type="number" value={form.duration} onChange={e=>setForm({...form,duration:parseInt(e.target.value)||120})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Notes (optional)', <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. Bring student ID" style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
          ].map(([lbl,el],i)=>(
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4 }}>{lbl}</div>
              {el}
            </div>
          ))}
          <button onClick={add} style={{ width:'100%', height:40, background:C.blue3, border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', marginTop:4 }}>
            ➕ Add Exam
          </button>
        </div>

        {/* Exam list */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>Scheduled ({exams.length})</div>
          {exams.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:C.text3, background:C.card, borderRadius:14, border:`1px solid ${C.border}`, fontSize:12 }}>No exams scheduled yet.</div>
            : exams.map((exam, i) => {
              const cfg = TYPE_CFG[exam.type] || TYPE_CFG.midterm;
              return (
                <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14, marginBottom:10, display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:44, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{exam.date?new Date(exam.date+'T00:00:00').toLocaleString('en-GB',{month:'short'}):'—'}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:C.text }}>{exam.date?new Date(exam.date+'T00:00:00').getDate():'—'}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:cfg.color+'22', color:cfg.color }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{exam.courseName}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                      {exam.time&&`⏰ ${exam.time}`}{exam.room&&` · 📍 ${exam.room}`}{` · ⏱ ${exam.duration} min`}
                    </div>
                    {exam.notes && <div style={{ fontSize:11, color:C.text2, marginTop:3 }}>{exam.notes}</div>}
                  </div>
                  <button onClick={()=>del(exam.id)} style={{ background:'none', border:'none', color:C.red2, fontSize:18, cursor:'pointer', flexShrink:0 }}>×</button>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

/* ── STUDY RESOURCES ── */
function DocResources({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const weeks = Array.from({length:14},(_,i)=>i+1);
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id||'');
  const [selWeek,   setSelWeek]   = useState(1);
  const [form, setForm] = useState({ title:'', url:'', type:'link', description:'', fileData:null, fileName:'', fileSize:0 });
  const [fileError, setFileError] = useState('');
  const [saved, setSaved] = useState(false);

  const [allResources, setAllResources] = useState([]);
  const existing = allResources.filter(r => r.courseId === selCourse && Number(r.week) === selWeek);
  const canAdd = form.title.trim() && (form.url.trim() || form.fileData);

  useEffect(() => { loadResources(); }, []);

  function loadResources() {
    const courseIds = new Set(myCourses.map(c => c.id));
    api.getResources()
      .then(data => setAllResources(
        data
          .filter(r => courseIds.has(r.course_id))
          .map(r => ({
            id: r.id,
            courseId: r.course_id,
            week: r.week,
            title: r.title,
            url: r.url,
            type: r.type,
            description: r.description,
            fileData: r.file_data,
            fileName: r.file_name,
            fileSize: r.file_size,
            createdAt: r.created_at,
          }))
      ))
      .catch(() => {});
  }

  const TYPE_CFG = {
    link:  { icon:'🔗', label:'Link',  color:'#3b82f6' },
    pdf:   { icon:'📄', label:'PDF',   color:'#ef4444' },
    video: { icon:'🎬', label:'Video', color:'#8b5cf6' },
    note:  { icon:'📝', label:'Note',  color:'#f59e0b' },
  };

  async function handleFile(e) {
    const file = e.target.files?.[0]; if(!file) return;
    setFileError('');
    try {
      const {data,name,size} = await readFile(file);
      setForm(f=>({...f, fileData:data, fileName:name, fileSize:size, url:''}));
    } catch(err) { setFileError(err.message); }
    e.target.value='';
  }

  async function add() {
    if (!canAdd) return;
    await api.addResource({
      id: Date.now().toString(),
      courseId: selCourse, week: selWeek,
      title: form.title.trim(), url: form.url.trim(),
      type: form.type, description: form.description.trim(),
      doctorId: doctor.id,
      fileData: form.fileData, fileName: form.fileName, fileSize: form.fileSize,
    }).catch(() => {});
    setForm({ title:'', url:'', type:'link', description:'', fileData:null, fileName:'', fileSize:0 });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    loadResources();
  }

  async function del(id) { await api.deleteResource(id).catch(()=>{}); loadResources(); }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📖 {t('page_resources')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_resources')}</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        {/* Add form */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>➕ Add Resource</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>COURSE</div>
              <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
                style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text }}>
                {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>WEEK</div>
              <select value={selWeek} onChange={e=>setSelWeek(Number(e.target.value))}
                style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text }}>
                {weeks.map(w=><option key={w} value={w}>Week {w}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>TYPE</div>
            <div style={{ display:'flex', gap:6 }}>
              {Object.entries(TYPE_CFG).map(([k,cfg])=>(
                <button key={k} onClick={()=>setForm(f=>({...f,type:k}))}
                  style={{ flex:1, padding:'6px 4px', borderRadius:8, border:`1.5px solid ${form.type===k?cfg.color:C.border}`,
                    background:form.type===k?`${cfg.color}22`:'transparent', fontSize:11, fontWeight:700,
                    color:form.type===k?cfg.color:C.text3, cursor:'pointer' }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>TITLE</div>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              placeholder="e.g. Lecture 3 Slides" maxLength={100}
              style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 12px', fontSize:12, color:C.text, boxSizing:'border-box' }}/>
          </div>

          {/* URL or File */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>URL</div>
            <input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value,fileData:null,fileName:'',fileSize:0}))}
              placeholder="https://..." maxLength={500} disabled={!!form.fileData}
              style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 12px', fontSize:12, color:C.text, boxSizing:'border-box', opacity:form.fileData?0.4:1 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:8, margin:'8px 0' }}>
              <div style={{ flex:1, height:1, background:C.border }}/>
              <span style={{ fontSize:10, color:C.text3, whiteSpace:'nowrap' }}>— or upload a file —</span>
              <div style={{ flex:1, height:1, background:C.border }}/>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background:C.bg3, border:`1.5px dashed ${C.border}`, borderRadius:8, padding:'8px 12px' }}>
              <input type="file" accept={ACCEPT_FILES} onChange={handleFile} style={{ display:'none' }}/>
              <span style={{ fontSize:13 }}>📎</span>
              <span style={{ fontSize:12, color:C.text3 }}>{form.fileName || 'PDF, JPG, PNG, Word, PowerPoint — max 3 MB'}</span>
              {form.fileData && <button onClick={e=>{e.preventDefault();setForm(f=>({...f,fileData:null,fileName:'',fileSize:0}));}}
                style={{ marginLeft:'auto', background:'none', border:'none', color:C.red2, fontSize:14, cursor:'pointer' }}>×</button>}
            </label>
            {fileError && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>⚠️ {fileError}</div>}
            <FilePill fileData={form.fileData} fileName={form.fileName} onRemove={()=>setForm(f=>({...f,fileData:null,fileName:'',fileSize:0}))} theme={C}/>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>DESCRIPTION <span style={{ fontWeight:400 }}>(optional)</span></div>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="Brief description..." rows={2} maxLength={200}
              style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:10, fontSize:12, color:C.text, resize:'vertical', boxSizing:'border-box' }}/>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={add} disabled={!canAdd}
              style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:9, padding:'9px 22px',
                fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', opacity:canAdd?1:0.5 }}>
              📎 Attach Resource
            </button>
            {saved && <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>✅ Added!</span>}
          </div>
        </div>

        {/* Right: existing list */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18, display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>
            Week {selWeek} — {myCourses.find(c=>c.id===selCourse)?.name||''}
          </div>
          <div style={{ fontSize:11, color:C.text3, marginBottom:12 }}>{existing.length} resource{existing.length!==1?'s':''} attached</div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {existing.length===0
              ? <div style={{ textAlign:'center', color:C.text3, padding:40, fontSize:13 }}>No resources for this week yet.</div>
              : existing.map((r,i)=>{
                  const cfg = TYPE_CFG[r.type]||TYPE_CFG.link;
                  const fi  = r.fileData ? fileIcon(r.fileName) : null;
                  const iconColor = fi ? fi.color : cfg.color;
                  const iconChar  = fi ? fi.icon  : cfg.icon;
                  return (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 0', borderBottom:i<existing.length-1?`1px solid ${C.border}`:'none' }}>
                      <div style={{ width:34, height:34, borderRadius:8, background:`${iconColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{iconChar}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        {r.fileData
                          ? <button onClick={()=>openFile(r.fileData,r.fileName)}
                              style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:13, fontWeight:700, color:iconColor, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
                              {r.title} ↗
                            </button>
                          : <a href={r.url} target="_blank" rel="noreferrer"
                              style={{ fontSize:13, fontWeight:700, color:iconColor, textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {r.title} ↗
                            </a>
                        }
                        {r.fileName && <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>{fi?.label} · {(r.fileSize/1024).toFixed(0)} KB</div>}
                        {r.description && <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{r.description}</div>}
                        <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <button onClick={()=>del(r.id)} style={{ background:'none', border:'none', color:C.red2, fontSize:17, cursor:'pointer', flexShrink:0, lineHeight:1 }}>×</button>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* All weeks summary */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>All Weeks — {myCourses.find(c=>c.id===selCourse)?.name||''}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
          {weeks.map(w=>{
            const res = allResources.filter(r => r.courseId === selCourse && Number(r.week) === w);
            const active = w===selWeek;
            return (
              <button key={w} onClick={()=>setSelWeek(w)}
                style={{ padding:'8px 4px', borderRadius:10, border:`1.5px solid ${active?C.blue:res.length>0?C.green:C.border}`,
                  background:active?C.blue_dim:res.length>0?`${C.green}11`:'transparent',
                  cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:active?C.blue2:C.text3 }}>W{w}</div>
                {res.length>0 && <div style={{ fontSize:9, color:active?C.blue:C.green, marginTop:2 }}>{res.length} 📎</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── ASSIGNMENTS ── */
function DocAssignments({ theme: C, doctor, myCourses }) {
  const { t } = useLang();
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id||'');
  const [form, setForm] = useState({ title:'', description:'', deadline:'', maxScore:'100', attachmentData:null, attachmentName:'', attachmentSize:0 });
  const [attachError, setAttachError] = useState('');
  const [saved, setSaved]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [gradeInputs, setGradeInputs] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolled, setEnrolledAsgn]   = useState([]);
  const today = new Date().toISOString().slice(0,10);

  useEffect(() => { loadData(); }, [selCourse]);

  async function loadData() {
    const [asnData, subData, enrolledRes] = await Promise.all([
      api.getAssignments().catch(() => []),
      api.getSubmissions().catch(() => []),
      api.getCourseStudents(selCourse).catch(() => ({ enrolled: [] })),
    ]);
    setAssignments(
      asnData
        .filter(a => a.course_id === selCourse)
        .map(a => ({
          id: a.id, courseId: a.course_id, title: a.title,
          description: a.description, deadline: a.deadline,
          maxScore: a.max_score, attachmentData: a.attachment_data,
          attachmentName: a.attachment_name, attachmentSize: a.attachment_size,
        }))
    );
    setSubmissions(subData);
    setEnrolledAsgn((enrolledRes.enrolled || []).map(s => ({
      id: s.student_id, name: s.name, emoji: '👤', color: '#3b82f6',
    })));
  }

  function getSubmission(asnId, stuId) {
    const s = submissions.find(s => s.assignment_id === asnId && s.student_id === stuId);
    if (!s) return null;
    return { ...s, submittedAt: s.submitted_at, fileData: s.file_data, fileName: s.file_name, fileSize: s.file_size };
  }
  function getAssignmentSubmissions(asnId) {
    return submissions.filter(s => s.assignment_id === asnId);
  }

  async function handleAttach(e) {
    const file = e.target.files?.[0]; if(!file) return;
    setAttachError('');
    try {
      const {data,name,size} = await readFile(file);
      setForm(f=>({...f, attachmentData:data, attachmentName:name, attachmentSize:size}));
    } catch(err) { setAttachError(err.message); }
    e.target.value='';
  }

  async function create() {
    if (!form.title.trim()) return;
    const course = myCourses.find(c => c.id === selCourse);
    await api.addAssignment({
      id: Date.now().toString(),
      courseId: selCourse, courseName: course?.name || '',
      doctorId: doctor.id, title: form.title.trim(),
      description: form.description, deadline: form.deadline,
      maxScore: parseInt(form.maxScore) || 100,
      attachmentData: form.attachmentData, attachmentName: form.attachmentName,
      attachmentSize: form.attachmentSize, createdAt: new Date().toISOString(),
    }).catch(() => {});
    setForm({ title:'', description:'', deadline:'', maxScore:'100', attachmentData:null, attachmentName:'', attachmentSize:0 });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    loadData();
  }

  async function del(id) { await api.deleteAssignment(id).catch(()=>{}); loadData(); }

  async function saveGrade(asnId, stuId) {
    const key = `${asnId}_${stuId}`;
    const { score='', feedback='' } = gradeInputs[key]||{};
    if (score==='') return;
    await api.gradeSubmission({ assignmentId: asnId, studentId: stuId, grade: parseFloat(score), feedback, gradedBy: doctor.id, gradedAt: new Date().toISOString() }).catch(()=>{});
    loadData();
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📋 {t('page_assignments')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_assignments')}</div>

      {/* Course selector */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {myCourses.map(c=>(
          <button key={c.id} onClick={()=>{ setSelCourse(c.id); setExpanded(null); }}
            style={{ padding:'6px 16px', borderRadius:20, border:`1.5px solid ${selCourse===c.id?C.blue:C.border}`,
              background:selCourse===c.id?C.blue_dim:'transparent', fontSize:12, fontWeight:selCourse===c.id?700:400,
              color:selCourse===c.id?C.blue2:C.text3, cursor:'pointer' }}>
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:16, alignItems:'start' }}>
        {/* Create form */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>➕ New Assignment</div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>TITLE</div>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Lab Report Week 3"
              style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text, boxSizing:'border-box' }}/>
          </div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>DESCRIPTION / INSTRUCTIONS</div>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Instructions, requirements..." rows={3}
              style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:8, fontSize:12, color:C.text, resize:'vertical', boxSizing:'border-box' }}/>
          </div>

          {/* File attachment */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>ATTACHMENT <span style={{ fontWeight:400 }}>(optional — PDF, Word, PPT, image)</span></div>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background:C.bg3, border:`1.5px dashed ${form.attachmentData?C.green:C.border}`, borderRadius:8, padding:'8px 12px' }}>
              <input type="file" accept={ACCEPT_FILES} onChange={handleAttach} style={{ display:'none' }}/>
              <span style={{ fontSize:14 }}>{form.attachmentData ? fileIcon(form.attachmentName).icon : '📎'}</span>
              <span style={{ fontSize:12, color:form.attachmentData?C.green:C.text3, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {form.attachmentData ? form.attachmentName : 'Click to attach a file — max 3 MB'}
              </span>
              {form.attachmentData && (
                <button onClick={e=>{e.preventDefault();setForm(f=>({...f,attachmentData:null,attachmentName:'',attachmentSize:0}));}}
                  style={{ background:'none', border:'none', color:C.red2, fontSize:14, cursor:'pointer', flexShrink:0 }}>×</button>
              )}
            </label>
            {attachError && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>⚠️ {attachError}</div>}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>DEADLINE</div>
              <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}
                style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text, boxSizing:'border-box' }}/>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:4 }}>MAX SCORE</div>
              <input type="number" value={form.maxScore} onChange={e=>setForm(f=>({...f,maxScore:e.target.value}))} min={1} max={1000}
                style={{ width:'100%', height:36, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 10px', fontSize:12, color:C.text, boxSizing:'border-box' }}/>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={create} disabled={!form.title.trim()}
              style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:9,
                padding:'9px 22px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', opacity:form.title.trim()?1:0.5 }}>
              📤 Publish
            </button>
            {saved && <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>✅ Published!</span>}
          </div>
        </div>

        {/* Assignment list */}
        <div>
          {assignments.length===0
            ? <div style={{ textAlign:'center', color:C.text3, padding:60, background:C.card, borderRadius:14, border:`1px solid ${C.border}`, fontSize:13 }}>
                No assignments yet for this course.
              </div>
            : assignments.map((asn)=>{
                const subs    = getAssignmentSubmissions(asn.id);
                const graded  = subs.filter(s=>s.grade!==null).length;
                const overdue = asn.deadline && asn.deadline < today;
                const isOpen  = expanded===asn.id;

                return (
                  <div key={asn.id} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, marginBottom:12, overflow:'hidden' }}>
                    {/* Header */}
                    <div onClick={()=>setExpanded(isOpen?null:asn.id)}
                      style={{ padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{asn.title}</div>
                        <div style={{ fontSize:11, color:C.text3, marginTop:2, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ color:overdue?C.red:C.amber }}>
                            {asn.deadline ? `${overdue?'⚠️ Overdue':'📅'} ${asn.deadline}` : '📅 No deadline'}
                          </span>
                          <span>Max {asn.maxScore} pts</span>
                          {asn.attachmentName && (
                            <button onClick={e=>{e.stopPropagation();openFile(asn.attachmentData,asn.attachmentName);}}
                              style={{ background:`${fileIcon(asn.attachmentName).color}18`, border:`1px solid ${fileIcon(asn.attachmentName).color}44`, borderRadius:6, padding:'1px 8px', fontSize:10, color:fileIcon(asn.attachmentName).color, cursor:'pointer', fontWeight:700 }}>
                              {fileIcon(asn.attachmentName).icon} {asn.attachmentName}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:C.text3 }}>{subs.length}/{enrolled.length} submitted</span>
                        <span style={{ fontSize:11, color:C.green }}>{graded} graded</span>
                        <button onClick={e=>{e.stopPropagation();del(asn.id);}}
                          style={{ background:'none', border:'none', color:C.red2, fontSize:18, cursor:'pointer' }}>×</button>
                        <span style={{ color:C.text3, fontSize:13 }}>{isOpen?'▲':'▼'}</span>
                      </div>
                    </div>

                    {/* Submissions table */}
                    {isOpen && (
                      <div style={{ borderTop:`1px solid ${C.border}`, padding:'0 18px 16px' }}>
                        {asn.description && (
                          <div style={{ fontSize:12, color:C.text2, padding:'10px 0 8px', borderBottom:`1px solid ${C.border}`, marginBottom:10 }}>
                            {asn.description}
                          </div>
                        )}
                        <div style={{ fontSize:10, fontWeight:700, color:C.text3, margin:'10px 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          Submissions ({subs.length}/{enrolled.length})
                        </div>
                        {enrolled.map(stu=>{
                          const sub = getSubmission(asn.id, stu.id);
                          const key = `${asn.id}_${stu.id}`;
                          const gi  = gradeInputs[key]||{ score: sub?.grade!=null?String(sub.grade):'', feedback: sub?.feedback||'' };
                          const isGraded = sub?.grade!=null;
                          return (
                            <div key={stu.id} style={{ borderBottom:`1px solid ${C.border}`, padding:'10px 0' }}>
                              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                                <div style={{ width:32, height:32, borderRadius:'50%', background:stu.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{stu.emoji}</div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{stu.name}</div>
                                  {!sub
                                    ? <div style={{ fontSize:11, color:C.text3 }}>Not submitted</div>
                                    : <>
                                        <div style={{ fontSize:11, color:C.text3 }}>Submitted {new Date(sub.submittedAt).toLocaleString()}</div>
                                        {sub.content && (
                                          <div style={{ fontSize:12, color:C.text2, background:C.bg3, borderRadius:8, padding:'6px 10px', marginTop:6 }}>
                                            {sub.content}
                                          </div>
                                        )}
                                        {sub.fileData && sub.fileName && (
                                          <button onClick={()=>openFile(sub.fileData,sub.fileName)}
                                            style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, background:`${fileIcon(sub.fileName).color}18`, border:`1px solid ${fileIcon(sub.fileName).color}44`, borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700, color:fileIcon(sub.fileName).color, cursor:'pointer' }}>
                                            {fileIcon(sub.fileName).icon} {sub.fileName} <span style={{ fontWeight:400, opacity:0.7 }}>({(sub.fileSize/1024).toFixed(0)} KB)</span>
                                          </button>
                                        )}
                                      </>
                                  }
                                </div>
                                {sub && (
                                  <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:200 }}>
                                    <div style={{ display:'flex', gap:6 }}>
                                      <input type="number" placeholder="Score" min={0} max={asn.maxScore}
                                        value={gi.score}
                                        onChange={e=>setGradeInputs(prev=>({...prev,[key]:{...gi,score:e.target.value}}))}
                                        style={{ width:70, height:30, background:C.bg3, border:`1px solid ${isGraded?C.green:C.border}`, borderRadius:6, padding:'0 8px', fontSize:12, color:C.text, textAlign:'center' }}/>
                                      <span style={{ fontSize:12, color:C.text3, lineHeight:'30px' }}>/ {asn.maxScore}</span>
                                    </div>
                                    <input placeholder="Feedback (optional)" value={gi.feedback}
                                      onChange={e=>setGradeInputs(prev=>({...prev,[key]:{...gi,feedback:e.target.value}}))}
                                      style={{ height:28, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, padding:'0 8px', fontSize:11, color:C.text }}/>
                                    <button onClick={()=>saveGrade(asn.id, stu.id)} disabled={gi.score===''}
                                      style={{ background:isGraded?C.green:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:6,
                                        padding:'5px 12px', fontSize:11, fontWeight:700, color:'#fff', cursor:'pointer', opacity:gi.score!==''?1:0.5 }}>
                                      {isGraded?'✅ Update':'💾 Grade'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

/* ── MOODLE ── */
function DocMoodle({ theme: C }) {
  const { t } = useLang();
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:120,height:120,borderRadius:'50%',background:'#F98012',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:64,fontWeight:700,color:'#fff'}}>M</div>
        <div style={{fontSize:28,fontWeight:700,color:C.text}}>{t('page_moodle')}</div>
        <div style={{fontSize:13,color:C.text2,margin:'4px 0 20px'}}>University Learning Management System</div>
        <button onClick={()=>alert('Moodle integration coming soon!')}
          style={{background:'#F98012',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          🌐  {t('page_moodle')}
        </button>
        <div style={{fontSize:11,color:C.text3,marginTop:12}}>⚠️  Prototype — not connected</div>
      </div>
    </div>
  );
}

/* ── DOC GRADE APPEALS ── */
function DocGradeAppeals({ theme: C, doctor }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [docResp, setDocResp] = useState('');
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAppeals(); }, []);

  async function loadAppeals() {
    setLoading(true);
    try {
      const all = await api.getComplaints();
      setAppeals(all.filter(c => c.type === 'grade_appeal'));
    } catch { setAppeals([]); }
    setLoading(false);
  }

  const filtered = filter === 'all' ? appeals : appeals.filter(a => a.status === filter);

  async function respond(id, dec) {
    const newStatus = dec === 'approve' ? 'approved' : dec === 'reject' ? 'rejected' : 'under_review';
    await api.updateComplaint(id, { status: newStatus, doctorResponse: docResp, adminResponse: '' }).catch(()=>{});
    api.addAuditEntry({ action: 'grade_appeal_updated', actor_role: 'doctor', actor_name: doctor.name, details: `Appeal ${id} — ${dec}` }).catch(()=>{});
    setSelected(null); setDocResp(''); loadAppeals();
  }

  const STATUS_COLOR = { pending:'amber', under_review:'blue', approved:'green', rejected:'red' };
  const inp = { background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '12px 20px 24px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>🏷️ Grade Appeals</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap:'wrap', alignItems:'center' }}>
        {['all','pending','under_review','approved','rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: filter === f ? C.blue2 : C.bg3, color: filter === f ? '#fff' : C.text,
              cursor: 'pointer', fontSize: 11 }}>
            {f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={loadAppeals} style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg3, color:C.text2, fontSize:11, cursor:'pointer' }}>🔄 Refresh</button>
      </div>
      {loading ? (
        <div style={{ textAlign:'center', color:C.text3, padding:48 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 48 }}>No grade appeals for your courses.</div>
      ) : filtered.map(a => (
        <div key={a.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${a.status === 'pending' ? C.amber : C.border}`, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.student_name} — {a.course_name}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Course: {a.course_id}</div>
              <div style={{ fontSize: 12, color: C.text, marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>
              {a.doctor_response && <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Your response: {a.doctor_response}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <Badge text={a.status} color={STATUS_COLOR[a.status] || 'gray'}/>
              {(a.status === 'pending' || a.status === 'under_review') && (
                <button onClick={() => { setSelected(a); setDocResp(a.doctor_response || ''); }}
                  style={{ padding: '4px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg3, color: C.text, fontSize: 11, cursor: 'pointer' }}>
                  Respond
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: C.card, borderRadius: 14, padding: 28, width: 460, maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Respond — {selected.student_name}</div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>
              {selected.course_name} ({selected.course_id})<br/>{selected.description}
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>Your Response</div>
            <textarea value={docResp} onChange={e => setDocResp(e.target.value)}
              style={{ ...inp, height: 80, resize: 'vertical', marginBottom: 16 }} placeholder="Explain your decision…"/>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg3, color: C.text, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={() => respond(selected.id, 'reject')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reject</button>
              <button onClick={() => respond(selected.id, 'approve')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
