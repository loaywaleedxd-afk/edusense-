import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import ScheduleItem from '../components/ScheduleItem';
import WebcamFeed from '../components/WebcamFeed';
import store from '../dataStore';
import { EMOTION_ICONS } from '../theme';

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

const PAGE_TITLES = {
  dashboard:'Dashboard', attendance:'My Attendance', emotions:'My Emotions',
  schedule:'Schedule', performance:'Performance', grades:'My Grades',
  portfolio:'My Portfolio', chat:'Community Chat', moodle:'Moodle',
  appeals:'My Appeals', transcript:'Academic Transcript',
  announcements:'Announcements', exams:'Exam Schedule', degreeaudit:'Degree Audit',
  resources:'Study Resources', assignments:'Assignments',
};

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
    store.markAlertRead(id);
    setDismiss(prev => new Set([...prev, id]));
  }

  function dismissAll() {
    visible.forEach(a => store.markAlertRead(a.id));
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

export default function StudentPage({ theme: C, user, isDark, onToggleMode, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const sid = user.studentId || user.id || '';
  const stu = store.getStudent(sid) || store.students[0];
  const stuId = stu?.id || sid;

  const [lastSeen, setLastSeen] = useState(() => loadLastSeen(stuId));
  const nav = buildNav(stuId, lastSeen);

  function navigate(id) {
    setPage(id);
    if (id === 'announcements' || id === 'exams' || id === 'assignments') {
      saveLastSeen(stuId, id);
      setLastSeen(loadLastSeen(stuId));
    }
  }

  return (
    <div style={{ display:'flex', height:'100%', background:C.bg, overflow:'hidden' }}>
      <Sidebar theme={C} navItems={nav} activeId={page} onNav={navigate}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar theme={C} user={user} pageTitle={PAGE_TITLES[page]||page} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout}/>
        <div className="content-scroll" style={{ flex:1, background:C.bg, overflowY:'auto' }}>
          {/* Attendance alert banner — visible on all pages */}
          <AttendanceAlertBanner
            theme={C}
            studentId={stu?.id}
            onGoToAttendance={() => setPage('attendance')}
          />
          <div className="animate-in" key={page}>
            {page==='dashboard'  && <StudentDashboard theme={C} user={user} stu={stu} isDark={isDark}/>}
            {page==='attendance' && <StudentAttendance theme={C} stu={stu}/>}
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
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ DASHBOARD ══ */
function calcStreak(studentId) {
  const records = store.getStudentAttendance(studentId);
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
  const myCoursesEnrolled = store.getStudentCourses(stu.id);
  const streak = calcStreak(stu.id);
  const streakMsg = streak >= 10 ? 'Incredible! Keep it up! 🏆' : streak >= 5 ? 'Great consistency!' : streak >= 2 ? 'Keep going!' : 'Start your streak today!';

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      {/* Welcome header */}
      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
        <div style={{ width:90, height:90, borderRadius:'50%', background:stu.color||C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, flexShrink:0, overflow:'hidden', border:`3px solid ${stu.color||C.blue}` }}>
          {(stu.capturedPhoto||store.getPhotoUrl(stu))
            ? <img src={stu.capturedPhoto||store.getPhotoUrl(stu)} alt={stu.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{display:(stu.capturedPhoto||store.getPhotoUrl(stu))?'none':'flex'}}>{stu.emoji||'👤'}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{ fontSize:22, fontWeight:700, color:C.text }}>Welcome back, {user.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize:12, color:C.text2, marginTop:2 }}>{stu.id} · {stu.dept} · Year {stu.year}</div>
          <div style={{ fontSize:11, color:C.text3 }}>Your academic overview for this semester</div>
          {(() => {
            const standing = store.getAcademicStanding(stu.id);
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
      <div style={{ display:'flex', gap:12, marginBottom:12 }}>
        <StatCard theme={C} label="Attendance Rate"  value={`${stu.attendanceRate}%`} sub={`${Math.round(stu.attendanceRate/100*16)} of 16 lectures`} icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Engagement"   value={`${stu.engagement}%`}     sub="Above class average" icon="🧠" accent="blue"/>
        <StatCard theme={C} label="Avg Attention"    value={`${stu.attentionScore}%`}  sub="Good focus level"  icon="👁️" accent="purple"/>
        <StatCard theme={C} label="GPA"              value={stu.gpa}                  sub="Current semester"  icon="📈" accent="amber"/>
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12, marginBottom:12 }}>
        <Card theme={C} title="Engagement Trend — Last 14 Lectures">
          <div style={{ padding:'4px 12px 12px' }}>
            <LineChart theme={C} series={[
              {label:'Engagement',data:store.trendData.engagement,color:C.blue},
              {label:'Attention', data:store.trendData.attention, color:C.green},
            ]} labels={store.trendData.labels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title="Emotion Distribution">
          <div style={{ padding:'4px 12px 12px', display:'flex', gap:12, alignItems:'center' }}>
            <DonutChart theme={C} data={store.emotionDist.slice(0,5).map(d=>({label:d.emotion,value:d.count,color:d.color}))} size={160}/>
            <div>
              {store.emotionDist.slice(0,5).map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ color:d.color, fontSize:12 }}>●</span>
                  <span style={{ fontSize:10, color:C.text2 }}>{d.emotion} {d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Card theme={C} title={`Today's Schedule (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]})`}>
          <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:6 }}>
            {(() => {
              const today = new Date().getDay();
              const todayLecs = store.lectures.filter(l => l.days && l.days.includes(today));
              if (todayLecs.length === 0)
                return <div style={{ padding:'16px 0', textAlign:'center', color:C.text3, fontSize:12 }}>No lectures scheduled for today.</div>;
              return todayLecs.map((lec,i) => <ScheduleItem key={i} theme={C} lecture={lec}/>);
            })()}
          </div>
        </Card>
        <Card theme={C} title="Emotion Log Today">
          <EmotionBarsWidget theme={C} data={store.emotionDist}/>
        </Card>
      </div>
    </div>
  );
}

/* ══ ATTENDANCE ══ */
function StudentAttendance({ theme: C, stu }) {
  const myCourses  = store.getStudentCourses(stu.id);
  const attRecs    = store.getStudentAttendance(stu.id);
  const rate       = stu.attendanceRate || 0;
  const [tab, setTab]           = useState('records');
  const [qrCode, setQrCode]     = useState('');
  const [qrMsg, setQrMsg]       = useState('');
  const [excuseForm, setExcuseForm] = useState({courseId:'', week:1, reason:''});
  const [excuseSent, setExcuseSent] = useState(false);
  const [, refresh] = useState(0);

  const courseRows = myCourses.map((course) => {
    const recs     = store.getStudentCourseAttendance(stu.id, course.id);
    const recorded = Object.keys(recs).length;
    // Use real records if they exist; otherwise derive directly from overall rate (no per-course offset)
    const weeks    = recorded > 0
      ? Object.values(recs).filter(r => r.status === 'present' || r.status === 'excused').length
      : Math.round(rate / 100 * 16);
    return {
      course: `${course.name} (${course.code})`,
      weeks: `${weeks} / 16`, time: course.time,
      method: weeks > 0 ? '👤 Face Recognition' : '—',
      status: weeks >= 12 ? '✅ Good Standing' : weeks >= 8 ? '⚠️ At Risk' : '❌ Low Attendance',
    };
  });

  const recRows = attRecs.map(rec => ({
    course: store.getCourse(rec.courseId)?.name || rec.courseId,
    date: rec.date, week: `Week ${rec.week}`, time: rec.time,
    method: rec.method, status: rec.status==='excused'?'📄 Excused':'✅ Present',
  }));

  const useRecords = recRows.length > 0;

  function checkIn() {
    const code = qrCode.trim().toUpperCase();
    if(!code){setQrMsg('⚠️ Enter the code shown by your lecturer.');return;}
    const result = store.useQRToken(code, stu.id);
    if(result.ok) {
      setQrMsg(`✅ Checked in successfully for Week ${result.week}!`);
      setQrCode(''); refresh(n=>n+1);
    } else {
      setQrMsg(`❌ ${result.error}`);
    }
  }

  function submitExcuse() {
    if(!excuseForm.courseId){setQrMsg('Select a course.');return;}
    if(!excuseForm.reason.trim()){setQrMsg('Please enter a reason.');return;}
    const course = store.getCourse(excuseForm.courseId);
    store.submitExcuse({
      studentId: stu.id, studentName: stu.name,
      courseId: excuseForm.courseId, courseName: course?.name||'',
      week: excuseForm.week, reason: excuseForm.reason,
    });
    setExcuseSent(true);
    setTimeout(()=>setExcuseSent(false), 3000);
    setExcuseForm({courseId:'', week:1, reason:''});
  }

  const myExcuses = store.getStudentExcuses(stu.id);

  const TAB = (id, label) => (
    <button onClick={()=>setTab(id)} style={{padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',border:'none',borderRadius:8,background:tab===id?C.blue3:C.bg3,color:tab===id?'#fff':C.text2}}>
      {label}
    </button>
  );

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>My Attendance</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:12 }}>Track your presence · Check in with QR code · Submit excuses</div>

      <div style={{ display:'flex', gap:12, marginBottom:12 }}>
        <StatCard theme={C} label="Attendance Rate"  value={`${rate}%`}          sub="This semester"          icon="✅" accent="green"/>
        <StatCard theme={C} label="Courses Enrolled" value={myCourses.length}     sub="Active enrollments"    icon="📚" accent="blue"/>
        <StatCard theme={C} label="Sessions Logged"  value={Math.round(rate/100*16)*myCourses.length} sub={`${attRecs.length} QR/manual check-ins`} icon="📊" accent="purple"/>
        <StatCard theme={C} label="Standing"         value={rate>=75?'Good':'At Risk'} sub={rate>=75?'Continue this pace':'Attend more classes'} icon={rate>=75?'👍':'⚠️'} accent={rate>=75?'green':'red'}/>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {TAB('records','📋 Records')}
        {TAB('qr','📱 QR Check-In')}
        {TAB('excuse','📄 Submit Excuse')}
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
            <Card theme={C} title={`QR / Manual Check-ins (${recRows.length})`} style={{marginTop:12}}>
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
  // Deterministic values — seeded by student id so they're consistent across renders
  const idNum = stu.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const emoRows = Array.from({length:20},(_,i)=>{
    const emo=store.emotionDist[i%store.emotionDist.length];
    const lec=store.lectures[i%store.lectures.length];
    const seed = (idNum + i*31) % 100;
    return [
      `10:${String(5+i*3).padStart(2,'0')}`,
      `${lec.id} — ${lec.name}`,
      `${EMOTION_ICONS[emo.emotion]||'😐'} ${emo.emotion}`,
      `${60 + (seed % 35)}%`,
      `${35 + ((seed*3+7) % 55)}%`,
      `${30 + ((seed*7+13) % 58)}%`,
    ];
  });

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>My Emotion Profile</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Card theme={C} title="Emotion Frequency">
          <div style={{ padding:'4px 12px 12px' }}>
            <BarChart theme={C} data={store.emotionDist.map(d=>({label:d.emotion,value:d.count,color:d.color}))} height={200}/>
          </div>
        </Card>
        <Card theme={C} title="Engagement per Lecture">
          <div style={{ padding:'4px 12px 12px' }}>
            <BarChart theme={C} data={store.lectures.map(l=>({label:l.id,value:l.avgEngagement,color:l.color}))} height={200}/>
          </div>
        </Card>
      </div>

      <Card theme={C} title="Emotion Log (last 20 detections)">
        <div style={{ padding:'4px 12px 12px' }}>
          <DataTable theme={C} columns={[
            {key:'time',label:'Time',width:70},{key:'lecture',label:'Lecture',width:180},
            {key:'emotion',label:'Emotion',width:100},{key:'conf',label:'Confidence',width:100},
            {key:'eng',label:'Engagement',width:100},{key:'att',label:'Attention',width:100},
          ]} rows={emoRows}/>
        </div>
      </Card>
    </div>
  );
}

/* ══ SCHEDULE ══ */
function StudentSchedule({ theme: C, stu }) {
  const myCourses = store.getStudentCourses(stu.id);

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
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>My Schedule</div>
      <Card theme={C} title={`My Courses (${myCourses.length})`}>
        <div style={{ padding:'4px 14px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          {myCourses.map((course,i)=>{
            const lec = store.lectures.find(l=>l.code===course.code) || store.lectures[i%store.lectures.length];
            return (
              <div key={i} style={{ background:C.bg3, borderRadius:10, display:'flex', overflow:'hidden' }}>
                <div style={{ width:5, background:course.color, flexShrink:0 }}/>
                <div style={{ padding:'12px 14px', flex:1 }}>
                  <div style={{ fontSize:10, color:C.text3 }}>{course.time} · {course.duration} min{course.daysLabel ? ` · ${course.daysLabel}` : ''}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{course.name}</div>
                  <div style={{ fontSize:10, color:C.text2 }}>{course.room} · {course.code} · {course.doctorName}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{course.semester}</div>
                </div>
                <div style={{ padding:'12px 14px', display:'flex', alignItems:'center' }}>
                  <Badge text={lec?.status ? lec.status.replace(/^\w/,c=>c.toUpperCase()) : 'Scheduled'} color={{active:'green',scheduled:'amber',ended:'gray'}[lec?.status]||'amber'} isDark/>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ══ PERFORMANCE ══ */
function StudentPerformance({ theme: C, stu }) {
  const myCourses = store.getStudentCourses(stu.id);
  const results   = store.getStudentResults(stu.id);
  const idHash    = stu.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  const gradeEntries = Object.entries(results);
  const passed = gradeEntries.filter(([,v])=>v.grade>=50).length;

  const rows = myCourses.map((course, i) => {
    const rec = results[course.id];
    const seed = (idHash + i*17) % 100;
    const att  = `${Math.min(100, Math.max(50, stu.attendanceRate + ((seed%20)-10)))}%`;
    const eng  = `${Math.min(100, Math.max(30, stu.engagement     + ((seed*3+7)%30)-15))}%`;
    const atn  = `${Math.min(100, Math.max(30, stu.attentionScore + ((seed*7+3)%28)-14))}%`;
    const grade = rec ? `${rec.grade}% (${letterGrade(rec.grade)})` : '—';
    return { course: `${course.name} (${course.code})`, attendance: att, engagement: eng, attention: atn, grade };
  });

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>Performance Analytics</div>
      <div style={{ display:'flex', gap:12, marginBottom:12 }}>
        <StatCard theme={C} label="GPA"              value={stu.gpa||'—'}          sub="Current semester"           icon="📈" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement"   value={`${stu.engagement}%`}  sub="In-class average"           icon="🧠" accent="green"/>
        <StatCard theme={C} label="Courses Graded"   value={`${passed}/${gradeEntries.length||myCourses.length}`} sub="This semester" icon="🎯" accent="purple"/>
        <StatCard theme={C} label="Attention Score"  value={`${stu.attentionScore}%`} sub="Avg attention level"    icon="👁️" accent="amber"/>
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
  const feeStatus = store.getStudentFeeStatus(stu.id);
  if(!feeStatus.paid) return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>My Grades</div>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.red}`,padding:40,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:12}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>Grades Locked</div>
        <div style={{fontSize:13,color:C.text3}}>Your fees are unpaid. Please visit the finance office to clear your balance and unlock grade access.</div>
      </div>
    </div>
  );

  const results = store.getStudentResults(stu.id);
  const entries = Object.entries(results);

  if (!entries.length) {
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

  const grades = entries.map(([,v])=>v.grade);
  const avg = +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
  const passed = grades.filter(g=>g>=50).length;
  const highest = Math.max(...grades);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:10 }}>📝 My Exam Results</div>

      {/* Mini stats */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[['Subjects Graded',grades.length,C.blue],['Average',`${avg}%`,C.amber],['Passed',passed,C.green],['Highest',`${highest}%`,C.purple]].map(([lbl,val,col],i)=>(
          <div key={i} style={{ flex:1, background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:700, color:col }}>{val}</div>
            <div style={{ fontSize:11, color:C.text2, marginTop:2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Grade cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {entries.map(([cid,rec])=>{
          const g = rec.grade; const gc = gradeColor(g,C);
          const course = store.getCourse(cid);
          return (
            <div key={cid} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', overflow:'hidden' }}>
              <div style={{ width:6, background:gc, flexShrink:0, borderRadius:'12px 0 0 12px' }}/>
              <div style={{ flex:1, padding:'14px', display:'flex', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{course?.name||cid} ({cid})</div>
                  {rec.date && <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>Date: {rec.date}</div>}
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
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const results = store.getStudentResults(stu.id);
  const entries = Object.entries(results);
  const grades = entries.map(([,v])=>v.grade);
  const avgG = grades.length ? +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1) : 0;

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🎓 My Academic Portfolio</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Your complete academic year summary</div>

      {/* Preview card */}
      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:16, marginBottom:12 }}>
        {/* Header band */}
        <div style={{ background:C.blue3, borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:stu.color||C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0, overflow:'hidden' }}>
            {(stu.capturedPhoto||store.getPhotoUrl(stu)) ? <img src={stu.capturedPhoto||store.getPhotoUrl(stu)} alt={stu.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : null}
            <span style={{display:(stu.capturedPhoto||store.getPhotoUrl(stu))?'none':'flex'}}>{stu.emoji||'👤'}</span>
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{stu.name}</div>
            <div style={{ fontSize:12, color:'#bfdbfe' }}>{stu.id} · {stu.dept} · Year {stu.year}</div>
            <div style={{ fontSize:11, color:'#bfdbfe' }}>GPA: {stu.gpa} · {stu.email}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          {[['Attendance',`${stu.attendanceRate}%`,C.green],['Avg Grade',`${avgG}%`,C.blue],['Engagement',`${stu.engagement}%`,C.amber],['Courses Graded',grades.length,C.purple]].map(([lbl,val,col],i)=>(
            <div key={i} style={{ flex:1, background:C.bg3, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:col }}>{val}</div>
              <div style={{ fontSize:10, color:C.text2, marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Exam results preview */}
        {entries.length > 0 && (
          <>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>Exam Results</div>
            {entries.slice(0,4).map(([cid,rec])=>{
              const g=rec.grade; const gc=gradeColor(g,C);
              const course=store.getCourse(cid);
              return (
                <div key={cid} style={{ background:C.bg3, borderRadius:8, padding:'6px 12px', marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:C.text }}>{course?.name||cid}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:gc }}>{g}% {letterGrade(g)}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* PDF button */}
      <button
        onClick={() => alert('PDF generation requires the desktop Python app.\nThis web version shows a preview only.')}
        style={{
          width:'100%', height:50, background:C.blue3, border:'none', borderRadius:12,
          fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', marginBottom:8,
        }}
      >📄  Generate Portfolio PDF</button>
      <div style={{ textAlign:'center', fontSize:11, color:C.text3, marginBottom:16 }}>PDF generation available in the desktop app</div>

      {/* Face capture for profile photo */}
      <Card theme={C} title="📸 Update Profile Photo">
        <div style={{ padding:'8px 12px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, alignItems:'start' }}>
          <WebcamFeed
            theme={C}
            compact
            onCapture={dataUrl => {
              setCapturedSelfie(dataUrl);
              store.updateStudent(stu.id, { capturedPhoto: dataUrl });
            }}
          />
          <div>
            <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>
              Use your webcam to take a profile photo. This will update your face in the system for attendance recognition.
            </div>
            {capturedSelfie && (
              <div>
                <div style={{ fontSize:10, color:C.green2, marginBottom:6 }}>✅ Photo captured and saved!</div>
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
  const myCourses = store.getStudentCourses(stu.id);
  const [selIdx, setSelIdx] = useState(0);
  const [msg, setMsg] = useState('');
  const [, forceUpdate] = useState(0);

  if(!myCourses.length) {
    return (
      <div style={{ padding:'8px 20px 20px', textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:48 }}>💬</div>
        <div style={{ fontSize:14, color:C.text3, marginTop:8 }}>Not enrolled in any courses yet.</div>
      </div>
    );
  }

  const course = myCourses[selIdx];
  const messages = store.getMessages(course?.id||'');

  function sendMsg() {
    if(!msg.trim()||!course) return;
    store.postMessage(course.id, stu.name, stu.id, 'student', msg, 'message');
    setMsg('');
    forceUpdate(n=>n+1);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 64px)', padding:'0' }}>
      {/* Header */}
      <div style={{ padding:'18px 24px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text }}>💬 Community Chat</div>
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
            placeholder="Write a message..."
            style={{ flex:1, height:38, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'0 12px', fontSize:12, color:C.text }}
          />
          <button onClick={sendMsg} style={{ height:38, padding:'0 18px', background:C.blue3, border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>Send ➤</button>
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
          <button key={emoji} onClick={()=>{ store.addReaction(course.id,msg.id,emoji,myId); onReact(); }}
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
  const myCourses = store.getStudentCourses(stu.id);
  const [complaints, setComplaints] = useState(store.getStudentComplaints(stu.id));
  const [form, setForm] = useState({ type:'absence_excuse', courseId: myCourses[0]?.id||'', description:'' });
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!form.description.trim()) return;
    const course = store.getCourse(form.courseId);
    const doctorId = course?.doctorId || '';
    store.submitComplaint({
      studentId: stu.id, studentName: stu.name,
      type: form.type, courseId: form.courseId,
      courseName: course?.name||'', description: form.description,
      doctorId,
    });
    setComplaints(store.getStudentComplaints(stu.id));
    setForm({ type:'absence_excuse', courseId: myCourses[0]?.id||'', description:'' });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const statusColor = { pending: 'amber', reviewed: 'blue', resolved: 'green' };
  const typeLabel = { absence_excuse:'Absence Excuse', grade_appeal:'Grade Appeal', general:'General Complaint' };

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>My Appeals & Complaints</div>

      <Card theme={C} title="Submit New Appeal">
        <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Type</div>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                <option value="absence_excuse">Absence Excuse</option>
                <option value="grade_appeal">Grade Appeal</option>
                <option value="general">General Complaint</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Course</div>
              <select value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Description</div>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
              placeholder="Describe your appeal or excuse in detail..."
              rows={4} style={{width:'100%',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:10,fontSize:12,color:C.text,resize:'vertical',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={submit} disabled={!form.description.trim()}
              style={{background:C.blue3,border:'none',borderRadius:8,padding:'10px 24px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',opacity:form.description.trim()?1:0.5}}>
              📤 Submit
            </button>
            {submitted && <span style={{color:C.green,fontSize:12,fontWeight:700}}>✅ Submitted successfully!</span>}
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
  const myCourses = store.getStudentCourses(stu.id);
  const results   = store.getStudentResults(stu.id);
  const reg       = store.getRegistrationStatus();
  const fee       = store.getStudentFeeStatus(stu.id);
  const idHash    = stu.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  const rows = myCourses.map((course, i) => {
    const rec = results[course.id];
    const seed = (idHash + i*17) % 100;
    const att  = Math.min(100, Math.max(50, stu.attendanceRate + ((seed%20)-10)));
    const grade = rec ? rec.grade : null;
    return { course, att, grade };
  });

  const graded   = rows.filter(r=>r.grade!==null);
  const calcGPA  = store.calculateSemesterGPA(stu.id);
  const semGPA   = calcGPA !== null ? calcGPA : (stu.gpa||'—');
  const standing = store.getAcademicStanding(stu.id);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>Academic Transcript</div>
        <button onClick={()=>window.print()}
          style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          🖨️ Print / Export PDF
        </button>
      </div>

      <Card theme={C} title="Student Information">
        <div style={{padding:'4px 16px 16px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12}}>
          {[
            ['Name',      stu.name],
            ['Student ID',stu.id],
            ['Department',stu.dept],
            ['Year',      `Year ${stu.year}`],
            ['Email',     stu.email||'—'],
            ['Semester',  reg.semester],
            ['Semester GPA', semGPA],
            ['Academic Standing', standing],
            ['Reg. Status', fee.paid?'✅ Cleared':'⚠️ Fees Pending'],
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
                  {['Course','Code','Credits','Attendance','Grade','Letter','Status'].map(h=>(
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
  const announcements = store.getStudentAnnouncements(stu.id);
  const TYPE_COLOR = { blue: C.blue, purple: C.purple, green: C.green, amber: C.amber };

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📢 Announcements</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Posted by your lecturers for your enrolled courses</div>

      {announcements.length === 0
        ? (
          <div style={{ textAlign:'center', padding:60, color:C.text3 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📢</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>No announcements yet</div>
            <div style={{ fontSize:12, marginTop:4 }}>Your lecturers haven't posted anything yet.</div>
          </div>
        )
        : announcements.map((ann, i) => {
          const course = store.getCourse(ann.courseId);
          const timeStr = (() => { try { return new Date(ann.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch{ return ''; } })();
          return (
            <div key={i} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:course?.color||C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📢</div>
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
  const exams = store.getStudentExams(stu.id);
  const today = new Date().toISOString().slice(0,10);
  const TYPE_CFG = {
    midterm: { label:'Midterm', color:'#8b5cf6', bg:'#8b5cf622' },
    final:   { label:'Final',   color:'#ef4444', bg:'#ef444422' },
    quiz:    { label:'Quiz',    color:'#10b981', bg:'#10b98122' },
  };

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🗓️ Exam Schedule</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Your upcoming exams for this semester</div>

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
  const audit = store.getDegreeAudit(stu.id);
  const gpa = store.calculateSemesterGPA(stu.id);
  const standing = store.getAcademicStanding(stu.id);

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
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🏛️ Degree Audit</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Track your progress toward graduation</div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          ['Credits Earned', `${audit.creditsEarned}/${audit.creditsRequired}`, C.blue],
          ['Courses Done',   `${audit.completed.length}/5`, C.green],
          ['GPA', gpa !== null ? gpa : '—', C.amber],
          ['Status', audit.readyToGraduate ? '🎓 Ready' : 'In Progress', audit.readyToGraduate ? C.green : C.purple],
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
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Overall Progress</span>
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
          Required Courses Checklist
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
  const myCourses = store.getStudentCourses(stu.id);
  const [selCourse, setSelCourse] = useState('all');
  const weeks = Array.from({length:14},(_,i)=>i+1);

  const TYPE_CFG = {
    link:  { icon:'🔗', label:'Link',  color:'#3b82f6' },
    pdf:   { icon:'📄', label:'PDF',   color:'#ef4444' },
    video: { icon:'🎬', label:'Video', color:'#8b5cf6' },
    note:  { icon:'📝', label:'Note',  color:'#f59e0b' },
  };

  const coursesToShow = selCourse==='all' ? myCourses : myCourses.filter(c=>c.id===selCourse);

  const totalResources = myCourses.reduce((sum,c)=>{
    return sum + (store.getCourseResources(c.id)||[]).length;
  }, 0);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📖 Study Resources</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Materials attached by your instructors — links, PDFs, videos, and notes</div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={()=>setSelCourse('all')}
          style={{ padding:'6px 16px', borderRadius:20, border:`1.5px solid ${selCourse==='all'?C.blue:C.border}`,
            background:selCourse==='all'?C.blue_dim:'transparent', fontSize:12, fontWeight:700,
            color:selCourse==='all'?C.blue2:C.text3, cursor:'pointer' }}>
          All Courses
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

      {coursesToShow.length===0 && (
        <div style={{ textAlign:'center', color:C.text3, padding:60, fontSize:13 }}>No courses enrolled.</div>
      )}

      {coursesToShow.map(course=>{
        const courseResources = store.getCourseResources(course.id)||[];
        if (courseResources.length===0) return null;

        const byWeek = {};
        courseResources.forEach(r=>{ (byWeek[r.week]=byWeek[r.week]||[]).push(r); });
        const usedWeeks = Object.keys(byWeek).map(Number).sort((a,b)=>a-b);

        return (
          <div key={course.id} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, marginBottom:16, overflow:'hidden' }}>
            {/* Course header */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10,
              background:`linear-gradient(90deg,${course.color||C.blue}22,transparent)` }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:course.color||C.blue, flexShrink:0 }}/>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{course.name}</div>
              <div style={{ fontSize:11, color:C.text3 }}>{course.code}</div>
              <div style={{ marginLeft:'auto', fontSize:11, color:C.text3 }}>{courseResources.length} resource{courseResources.length!==1?'s':''}</div>
            </div>

            {/* Weeks */}
            <div style={{ padding:'12px 18px' }}>
              {usedWeeks.map(week=>{
                const res = byWeek[week];
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

      {totalResources===0 && (
        <div style={{ textAlign:'center', color:C.text3, padding:60, fontSize:13 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          No resources have been attached by your instructors yet.<br/>
          <span style={{ fontSize:11 }}>Check back after your next lecture.</span>
        </div>
      )}
    </div>
  );
}

/* ══ ASSIGNMENTS ══ */
function StudentAssignments({ theme: C, stu }) {
  const assignments = store.getStudentAssignments(stu.id);
  const [expanded,  setExpanded]  = useState(null);
  const [content,   setContent]   = useState({});
  const [submitted, setSubmitted] = useState({});
  const [, refresh] = useState(0);
  const today = new Date().toISOString().slice(0,10);

  function submit(asnId) {
    const text = (content[asnId]||'').trim();
    if (!text) return;
    store.submitAssignment(asnId, stu.id, text);
    setSubmitted(prev=>({...prev,[asnId]:true}));
    setTimeout(()=>setSubmitted(prev=>({...prev,[asnId]:false})),2500);
    refresh(n=>n+1);
  }

  const pending = assignments.filter(a=>{
    const sub = store.getSubmission(a.id, stu.id);
    return !sub;
  }).length;

  const STATUS = {
    graded:    { label:'Graded',        color:'#10b981', bg:'#10b98115', icon:'✅' },
    submitted: { label:'Submitted',     color:'#3b82f6', bg:'#3b82f615', icon:'📤' },
    overdue:   { label:'Overdue',       color:'#ef4444', bg:'#ef444415', icon:'⚠️' },
    pending:   { label:'Not Submitted', color:'#f59e0b', bg:'#f59e0b15', icon:'📋' },
  };

  function getStatus(asn) {
    const sub = store.getSubmission(asn.id, stu.id);
    if (sub?.grade != null) return 'graded';
    if (sub) return 'submitted';
    if (asn.deadline && asn.deadline < today) return 'overdue';
    return 'pending';
  }

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>📋 Assignments</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Submit your work and view grades from your instructors</div>

      {/* Summary bar */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {[
          ['Total', assignments.length, C.blue],
          ['Pending', pending, C.amber],
          ['Submitted', assignments.filter(a=>{ const s=store.getSubmission(a.id,stu.id); return s&&s.grade==null; }).length, '#3b82f6'],
          ['Graded', assignments.filter(a=>store.getSubmission(a.id,stu.id)?.grade!=null).length, C.green],
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
        const sub    = store.getSubmission(asn.id, stu.id);
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
                {asn.description && (
                  <div style={{ fontSize:12, color:C.text2, background:C.bg3, borderRadius:8, padding:'10px 14px', marginBottom:14, lineHeight:1.6 }}>
                    {asn.description}
                  </div>
                )}

                {/* If graded — show result */}
                {sub?.grade!=null && (
                  <div style={{ background:`${C.green}15`, border:`1px solid ${C.green}44`, borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:4 }}>
                      ✅ Graded — {sub.grade}/{asn.maxScore} pts ({Math.round(sub.grade/asn.maxScore*100)}%)
                    </div>
                    {sub.feedback && <div style={{ fontSize:12, color:C.text2 }}>💬 {sub.feedback}</div>}
                    <div style={{ fontSize:10, color:C.text3, marginTop:6 }}>Graded {new Date(sub.gradedAt).toLocaleString()}</div>
                  </div>
                )}

                {/* Submitted but not graded */}
                {sub && sub.grade==null && (
                  <div style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}44`, borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.blue2 }}>📤 Submitted — awaiting grade</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{new Date(sub.submittedAt).toLocaleString()}</div>
                    <div style={{ fontSize:12, color:C.text2, marginTop:8 }}>{sub.content}</div>
                  </div>
                )}

                {/* Submit / resubmit */}
                {status !== 'graded' && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:6, textTransform:'uppercase' }}>
                      {sub ? 'Resubmit (replaces previous)' : 'Your Answer'}
                    </div>
                    <textarea
                      value={content[asn.id]||''}
                      onChange={e=>setContent(prev=>({...prev,[asn.id]:e.target.value}))}
                      placeholder="Write your answer, paste a link, or describe your submission..."
                      rows={4}
                      style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:10, fontSize:12, color:C.text, resize:'vertical', boxSizing:'border-box', marginBottom:8 }}
                    />
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <button onClick={()=>submit(asn.id)} disabled={!(content[asn.id]||'').trim()}
                        style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:8,
                          padding:'9px 22px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer',
                          opacity:(content[asn.id]||'').trim()?1:0.5 }}>
                        📤 {sub?'Resubmit':'Submit'}
                      </button>
                      {submitted[asn.id] && <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>✅ Submitted!</span>}
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
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:120, height:120, borderRadius:'50%', background:'#F98012', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64, fontWeight:700, color:'#fff' }}>M</div>
        <div style={{ fontSize:28, fontWeight:700, color:C.text }}>Moodle</div>
        <div style={{ fontSize:13, color:C.text2, margin:'4px 0 20px' }}>University Learning Management System</div>
        <button
          onClick={()=>alert('Moodle integration coming soon!\n\nThis feature will connect to your university\'s Moodle portal.')}
          style={{ background:'#F98012', border:'none', borderRadius:12, padding:'13px 32px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}
        >🌐  Open Moodle</button>
        <div style={{ fontSize:11, color:C.text3, marginTop:12 }}>⚠️  Prototype — not connected</div>
      </div>
    </div>
  );
}
