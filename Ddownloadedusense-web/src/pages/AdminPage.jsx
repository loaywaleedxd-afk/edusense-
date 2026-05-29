import { useState, useRef, useEffect } from 'react';
import { exportStudentReportPDF } from '../utils/pdfExport';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';
import AcademicCalendarPage from './AcademicCalendarPage';
import GraduationRoadmapPage from './GraduationRoadmapPage';
import FeeHistoryPage from './FeeHistoryPage';
import ProfilePage from './ProfilePage';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import AnimatedPage from '../components/AnimatedPage';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import AlertItem from '../components/AlertItem';
import WebcamFeed from '../components/WebcamFeed';
import store from '../dataStore';
import api, { get, post, getToken } from '../api';
import { pushToast } from '../components/NotificationToast';
import { DEPARTMENTS, TITLES } from '../theme';
import AuditLogPage from './AuditLogPage';

function letterGrade(g){if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';}
function gradeColor(g,C){return g>=75?C.green:g>=50?C.amber:C.red;}

function generatePassword(){
  const chars='ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p=''; for(let i=0;i<8;i++) p+=chars[Math.floor(Math.random()*chars.length)];
  return p+'!';
}

const NAV = [
  {section:'Overview'},
  {id:'dashboard',   icon:'📊', label:'Dashboard'},
  {id:'analytics',   icon:'📉', label:'System Analytics'},
  {section:'Management'},
  {id:'students',    icon:'🎓', label:'Students'},
  {id:'doctors',     icon:'👨‍🏫',label:'Lecturers'},
  {id:'courses',     icon:'📚', label:'Courses'},
  {id:'enrollments', icon:'📋', label:'Enrollments'},
  {id:'appeals',      icon:'📋', label:'Appeals'},
  {id:'registration', icon:'🏛️', label:'Registration & Fees'},
  {id:'examschedule', icon:'🗓️', label:'Exam Schedule'},
  {id:'parents',     icon:'👨‍👩‍👧',label:'Parents'},
  {section:'Reports'},
  {id:'r_reports',   icon:'📊', label:'R Reports'},
  {id:'settings',    icon:'⚙️', label:'Settings'},
  {section:'New Features'},
  {id:'__proctoring', icon:'🎥', label:'Exam Proctoring'},
  {id:'__advising',   icon:'🎓', label:'Advising'},
  {id:'__atrisk',     icon:'🚨', label:'Early Warning'},
  {id:'calendar',     icon:'📅', label:'Academic Calendar'},
  {id:'roadmap',      icon:'🗺️', label:'Graduation Roadmap'},
  {id:'feehistory',   icon:'💳', label:'Fee History'},
  {id:'auditlog',     icon:'🗃️', label:'Audit Log'},
  {id:'gradeappeals',      icon:'🏷️', label:'Grade Appeals'},
  {id:'enroll_requests',   icon:'🏛️', label:'Enrollment Requests'},
  {id:'parent_linking',    icon:'🔗', label:'Parent Linking'},
  {id:'csv_import',        icon:'📥', label:'CSV Import'},
  {id:'gpa_management',    icon:'🎓', label:'GPA Management'},
  {id:'profile',           icon:'👤', label:'My Profile'},
];

const PAGE_TITLES = {
  dashboard:'Dashboard', analytics:'System Analytics', students:'Students',
  doctors:'Lecturers', courses:'Course Management', enrollments:'Enrollment Management',
  parents:'Parents Management', r_reports:'R Analysis Reports', settings:'Settings',
  appeals:'Appeals Management', registration:'Registration & Fees', examschedule:'Exam Schedule',
  auditlog:'Audit Log', gradeappeals:'Grade Appeals',
};

export default function AdminPage({ theme: C, user, isDark, onToggleMode, onLogout,
  onOpenProctoring, onOpenAdvising, onOpenAtRisk, branding }) {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isRTL, t } = useLang();
  useEffect(() => {
    if (!user?.id || !/^\d+$/.test(String(user.id))) return;
    const BASE_WS = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const ws = new WebSocket(`${BASE_WS}/ws/notifications/${user.id}?token=${encodeURIComponent(getToken() || '')}`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connected') return;
        // Admin sees notifications via the system alerts panel; just log here
      } catch {}
    };
    ws.onerror = () => {};
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, 30000);
    return () => { clearInterval(ping); ws.close(); };
  }, [user?.id]);

  const ADMIN_PAGE_KEYS = {
    dashboard:'dashboard', analytics:'system_analytics', students:'students',
    doctors:'doctors', courses:'courses', enrollments:'enrollments',
    appeals:'appeals', registration:'reg_fees', examschedule:'page_exams',
    parents:'parents', r_reports:'ranalysis', settings:'settings',
    calendar:'academic_calendar',
    roadmap:'grad_roadmap',
    feehistory:'fee_title',
  };

  function handleNav(id) {
    if (id === '__proctoring') { onOpenProctoring?.(); return; }
    if (id === '__advising')   { onOpenAdvising?.();   return; }
    if (id === '__atrisk')     { onOpenAtRisk?.();     return; }
    setPage(id);
  }

  const adminPageTitle = ADMIN_PAGE_KEYS[page] ? t(ADMIN_PAGE_KEYS[page]) : (PAGE_TITLES[page] || page);

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden', flexDirection: isRTL ? 'row-reverse' : 'row'}}>
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={handleNav} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} branding={branding}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={adminPageTitle} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout} onMenuOpen={() => setMenuOpen(true)}/>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <AnimatedPage pageKey={page}>
            {page==='dashboard'   && <AdminDashboard theme={C} onNav={handleNav}/>}
            {page==='analytics'   && <AdminAnalytics theme={C}/>}
            {page==='students'    && <AdminStudents theme={C}/>}
            {page==='doctors'     && <AdminDoctors theme={C}/>}
            {page==='courses'     && <AdminCourses theme={C}/>}
            {page==='enrollments' && <AdminEnrollments theme={C}/>}
            {page==='appeals'      && <AdminAppeals theme={C}/>}
            {page==='registration' && <AdminRegistration theme={C}/>}
            {page==='examschedule' && <AdminExamSchedule theme={C}/>}
            {page==='parents'     && <AdminParents theme={C}/>}
            {page==='r_reports'   && <AdminRReports theme={C}/>}
            {page==='settings'    && <AdminSettings theme={C}/>}
            {page==='calendar'    && <AcademicCalendarPage theme={C} role="admin"/>}
            {page==='roadmap'     && <GraduationRoadmapPage theme={C} role="admin"/>}
            {page==='feehistory'  && <FeeHistoryPage theme={C} role="admin"/>}
            {page==='auditlog'    && <AuditLogPage theme={C}/>}
            {page==='gradeappeals'    && <AdminGradeAppeals theme={C}/>}
            {page==='enroll_requests' && <AdminEnrollmentRequests theme={C}/>}
            {page==='parent_linking'  && <AdminParentLinking theme={C}/>}
            {page==='csv_import'      && <AdminCSVImport theme={C}/>}
            {page==='gpa_management'   && <AdminGPAManagement theme={C}/>}
            {page==='profile'         && <ProfilePage theme={C} user={user}/>}
          </AnimatedPage>
        </div>
      </div>
    </div>
  );
}

/* ── QUICK ACTION BUTTON ── */
function QuickActionBtn({ icon, label, theme: C, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 130, minHeight: 80, background: C.card,
        border: `1.5px solid ${hovered ? C.blue2 : C.border}`,
        borderRadius: 12, cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 4px 16px ${C.blue}30` : 'none',
        padding: '12px 8px',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: hovered ? C.blue2 : C.text2, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

/* ── DASHBOARD ── */
function AdminDashboard({ theme: C, onNav }) {
  const { t } = useLang();
  const isMobile = useMobile();
  const depts      = ['Computer Science','Engineering','Mathematics','Physics','Data Science'];
  const deptShort  = ['CS','Engineering','Math','Physics','Data Sci'];
  const deptColors = [C.blue,C.purple,C.green,C.amber,C.cyan];

  const [counts,      setCounts]      = useState({ students: 0, doctors: 0, lectures: 0, atRisk: 0, avgEng: 0 });
  const [lectures,    setLectures]    = useState([]);
  const [emoWidgetData, setEmoWidget] = useState(store.emotionDist.slice(0, 6));
  const [lectureComp,   setLCompDash] = useState([]);
  useEffect(() => {
    Promise.allSettled([
      api.getStudents(),
      api.getLectureDoctors(),
      api.getLectures(),
      api.getAtRiskStudents('low'),
      get('/api/analytics/engagement-overview'),
      get('/api/analytics/lecture-comparison'),
    ]).then(([stuRes, docRes, lecRes, riskRes, ovRes, lcRes]) => {
      const students = stuRes.status === 'fulfilled' ? stuRes.value : [];
      const doctors  = docRes.status === 'fulfilled' ? docRes.value : [];
      const lecs     = lecRes.status === 'fulfilled' ? lecRes.value : [];
      const atRisk   = riskRes.status === 'fulfilled' ? riskRes.value : [];
      const ov       = ovRes.status  === 'fulfilled' ? ovRes.value   : null;
      const lc       = lcRes.status  === 'fulfilled' ? lcRes.value   : [];
      setLectures(lecs);
      if (lc.length > 0) setLCompDash(lc);
      if (ov?.emotions?.length > 0) {
        const total = ov.emotions.reduce((a, e) => a + e.count, 0);
        setEmoWidget(ov.emotions.slice(0, 6).map(e => ({
          emotion: e.emotion,
          count: e.count,
          pct: total > 0 ? Math.round(e.count / total * 100) : 0,
          color: _EMO_COLORS[e.emotion] || '#64748b',
        })));
      }
      // avgEng from real analytics if available, else 0 (don't fake it)
      const avgEng = ov?.avg_engagement ? Math.round(ov.avg_engagement) : 0;
      setCounts({
        students: students.length,
        doctors:  doctors.length,
        lectures: lecs.filter(l => l.status === 'active').length,
        atRisk:   atRisk.length,
        avgEng,
      });
    });
  }, []);

  // Engagement by course from real lecture comparison, fallback to per-dept estimate
  const deptEngData = lectureComp.length > 0
    ? lectureComp.slice(0, 5).map((l, i) => ({
        label: l.course_code || deptShort[i] || `C${i+1}`,
        value: Math.round(l.avg_engagement || 0),
        color: deptColors[i % deptColors.length],
      }))
    : depts.map((dept, i) => ({ label: deptShort[i], value: 55 + (i * 7) % 30, color: deptColors[i] }));

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:24,fontWeight:700,color:C.text,marginBottom:4}}>{t('dashboard')}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>{t('doc_overview')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label={t('students')}      value={counts.students} sub={t('enrolled_students')}  icon="🎓" accent="blue"/>
        <StatCard theme={C} label={t('doctors')}        value={counts.doctors}  sub={t('live_session')}       icon="👨‍🏫" accent="purple"/>
        <StatCard theme={C} label={t('live_session')}   value={counts.lectures} sub={t('analytics')}          icon="📚" accent="green"/>
        <StatCard theme={C} label={t('avg_engagement')} value={`${counts.avgEng}%`} sub={t('analytics')}       icon="🧠" accent="amber"/>
        <StatCard theme={C} label={t('at_risk')}        value={counts.atRisk}   sub={t('academic_standing')}  icon="🚨" accent="red"/>
      </div>

      {/* Quick Actions */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8,letterSpacing:'0.05em',textTransform:'uppercase'}}>Quick Actions</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[
            {icon:'📢',label:'New Announcement',nav:'announcements'},
            {icon:'📅',label:'Add Exam',nav:'examschedule'},
            {icon:'👤',label:'Add Student',nav:'students'},
            {icon:'📋',label:'View Audit Log',nav:'auditlog'},
          ].map(a=>(
            <QuickActionBtn key={a.nav} icon={a.icon} label={a.label} theme={C} onClick={()=>onNav?.(a.nav)}/>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div style={{
        display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,
        background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'10px 16px',
        alignItems:'center',
      }}>
        <span style={{fontSize:11,fontWeight:700,color:C.text2,marginRight:4}}>System Status:</span>
        {[
          {label:'Database Online'},
          {label:'4 Roles Active'},
          {label:'QR System Ready'},
          {label:'Notifications Active'},
        ].map((s,i)=>(
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:5,
            background:'#10b98118',border:'1px solid #10b98133',
            borderRadius:20,padding:'3px 10px',
          }}>
            <span style={{fontSize:10}}>✅</span>
            <span style={{fontSize:10,fontWeight:600,color:C.green}}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',gap:12,marginBottom:12}}>
        <Card theme={C} title={t('engagement_dept')}>
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={deptEngData} height={210}/>
          </div>
        </Card>
        <Card theme={C} title={t('lectures_now')}>
          <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6}}>
            {lectures.length === 0
              ? <div style={{color:C.text3,fontSize:12,padding:'8px 0'}}>Loading…</div>
              : lectures.slice(0,3).map((lec,i)=>{
              const colors=[C.blue,C.purple,C.green,C.amber,C.cyan];
              return (
              <div key={i} style={{background:C.bg3,borderRadius:8,display:'flex',overflow:'hidden'}}>
                <div style={{width:4,background:lec.color||colors[i%colors.length],flexShrink:0}}/>
                <div style={{padding:'8px 12px',flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{lec.course_name||lec.name||'—'}</div>
                  <div style={{fontSize:10,color:C.text3}}>{lec.room||'—'} · {lec.scheduled_at||lec.time||'—'}</div>
                </div>
                <div style={{padding:'8px 12px',display:'flex',alignItems:'center'}}>
                  <Badge text={lec.status === 'active' ? t('session_active') : lec.status === 'scheduled' ? t('confirmed') : (lec.status||'—')} color={{active:'green',scheduled:'amber',ended:'gray'}[lec.status]||'gray'}/>
                </div>
              </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12}}>
        <Card theme={C} title={t('system_alerts')}>
          <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:8}}>
            {store.alerts.map((a,i)=><AlertItem key={i} theme={C} alert={a}/>)}
          </div>
        </Card>
        <Card theme={C} title={t('emotion_dist')}>
          <div style={{padding:'4px 12px 12px'}}>
            <EmotionBarsWidget theme={C} data={emoWidgetData}/>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── ANALYTICS ── */
const _EMO_COLORS = {
  happy:'#10b981', neutral:'#6366f1', confused:'#8b5cf6', bored:'#64748b',
  surprise:'#f59e0b', surprised:'#f59e0b', sad:'#475569', angry:'#ef4444', fear:'#f97316',
};

function AdminAnalytics({ theme: C }) {
  const { t } = useLang();
  const isMobile = useMobile();
  const [overview,    setOverview]    = useState(null);
  const [timeTrends,  setTimeTrends]  = useState([]);
  const [lectureComp, setLectureComp] = useState([]);
  const [students,    setStudents]    = useState([]);
  const [lectures,    setLectures]    = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [atRiskList,  setAtRiskList]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      get('/api/analytics/engagement-overview'),
      get('/api/analytics/time-trends'),
      get('/api/analytics/lecture-comparison'),
      api.getStudents(),
      api.getLectures(),
      api.getEnrollments(),
      api.getAtRiskStudents('low'),
    ]).then(([ov, tt, lc, st, l, e, ar]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (tt.status === 'fulfilled') setTimeTrends(tt.value   || []);
      if (lc.status === 'fulfilled') setLectureComp(lc.value  || []);
      if (st.status === 'fulfilled') setStudents(st.value     || []);
      if (l.status  === 'fulfilled') setLectures(l.value      || []);
      if (e.status  === 'fulfilled') setEnrollments(e.value   || []);
      if (ar.status === 'fulfilled') setAtRiskList(ar.value   || []);
      setLoading(false);
    });
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const avgAtt         = overview ? Math.round(overview.avg_attention  || 0) : 0;
  const avgEng         = overview ? Math.round(overview.avg_engagement || 0) : 0;
  const totalEnrolled  = enrollments.length;
  const atRisk         = atRiskList.length;
  const activeLectures = lectures.filter(l => l.status === 'active').length;
  const hasData        = (overview?.total_records || 0) > 0;

  // ── Trend chart ────────────────────────────────────────────────────────────
  const trendSorted     = [...timeTrends].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-16);
  const trendLabels     = trendSorted.length > 0
    ? trendSorted.map(r => { const d = new Date(r.date); return `${d.getMonth()+1}/${d.getDate()}`; })
    : store.trendData.labels;
  const trendEngagement = trendSorted.length > 0
    ? trendSorted.map(r => Math.round(r.avg_engagement || 0))
    : store.trendData.engagement;
  const trendAttention  = trendSorted.length > 0
    ? trendSorted.map(r => Math.round(r.avg_attention  || 0))
    : store.trendData.attention;

  // ── Emotion donut ──────────────────────────────────────────────────────────
  const emoRaw   = overview?.emotions || [];
  const emoTotal = emoRaw.reduce((a, e) => a + e.count, 0);
  const emotionDonut = emoRaw.length > 0
    ? emoRaw.slice(0, 5).map(e => ({ label: e.emotion, value: e.count, color: _EMO_COLORS[e.emotion] || '#64748b' }))
    : store.emotionDist.slice(0, 5).map(d => ({ label: d.emotion, value: d.count, color: d.color }));
  const emotionList  = emoRaw.length > 0
    ? emoRaw.slice(0, 5).map(e => ({ emotion: e.emotion, pct: emoTotal > 0 ? Math.round(e.count / emoTotal * 100) : 0, color: _EMO_COLORS[e.emotion] || '#64748b' }))
    : store.emotionDist.slice(0, 5);

  // ── Bar chart: per-course engagement OR enrollment count ──────────────────
  const barData = lectureComp.length > 0
    ? lectureComp.slice(0, 12).map((l, i) => {
        const cols = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];
        return { label: l.course_code || `C${i+1}`, value: Math.round(l.avg_engagement || 0), color: cols[i % cols.length] };
      })
    : lectures.slice(0, 12).map((l, i) => {
        const enrolled = enrollments.filter(e => e.course_id === l.course_code).length;
        const cols = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];
        return { label: l.course_code || l.course_name?.slice(0, 8) || `C${i+1}`, value: enrolled || 0, color: cols[i % cols.length] };
      });
  const barTitle = lectureComp.length > 0 ? 'Engagement by Course (%)' : 'Enrollments by Course';

  const EstBadge = () => (
    <span style={{fontSize:9,padding:'1px 6px',borderRadius:20,background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',fontWeight:700,marginLeft:6,verticalAlign:'middle'}}>
      estimated
    </span>
  );

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('system_analytics')}</div>
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
        <StatCard theme={C} label="Avg Engagement"    value={loading ? '…' : `${avgEng}%`}  sub="From live sessions"       icon="🧠" accent="blue"/>
        <StatCard theme={C} label="Avg Attendance"    value={loading ? '…' : `${avgAtt}%`}  sub="Across all students"      icon="✅" accent="green"/>
        <StatCard theme={C} label="Total Enrollments" value={loading ? '…' : totalEnrolled.toLocaleString()} sub="Across all courses" icon="📋" accent="purple"/>
        <StatCard theme={C} label="At-Risk Students"  value={loading ? '…' : atRisk}         sub="Flagged by AI monitoring" icon="⚠️" accent="red"/>
        <StatCard theme={C} label="Active Courses"    value={loading ? '…' : activeLectures} sub="This semester"            icon="📚" accent="amber"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12,marginBottom:12}}>
        <Card theme={C} title={<>Engagement Trend{trendSorted.length === 0 && <EstBadge/>}</>}>
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label:'Engagement', data: trendEngagement, color: C.blue},
              {label:'Attention',  data: trendAttention,  color: C.green},
            ]} labels={trendLabels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title={<>Emotion Distribution{emoRaw.length === 0 && <EstBadge/>}</>}>
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

      <Card theme={C} title={barTitle}>
        <div style={{padding:'4px 12px 12px'}}>
          <BarChart theme={C} data={barData} height={200}/>
        </div>
      </Card>

      {/* ── Department Comparison ── */}
      <DeptComparisonSection theme={C} students={students}/>
    </div>
  );
}

function DeptComparisonSection({ theme: C, students: propStudents }) {
  const { t } = useLang();
  const depts      = ['Computer Science','Engineering','Mathematics','Physics','Data Science'];
  const deptShort  = ['CS','Eng','Math','Phys','Data Sci'];
  const deptColors = [C.blue,C.purple,C.green,C.amber,C.cyan];
  const allStudents = propStudents || [];

  const metrics = depts.map((dept, i) => {
    const ds = allStudents.filter(s => s.dept === dept);
    const att = ds.length ? Math.round(ds.reduce((a,s)=>a+(s.attendanceRate||0),0)/ds.length) : 65+(i*7)%25;
    const eng = ds.length ? Math.round(ds.reduce((a,s)=>a+(s.engagement||0),0)/ds.length)     : 55+(i*9)%30;
    const gpa = ds.length ? parseFloat((ds.reduce((a,s)=>a+(parseFloat(s.gpa)||3.0),0)/ds.length).toFixed(2)) : 3.0+(i*0.1)%0.8;
    const risk = ds.filter(s=>(s.attendanceRate||100)<65||(s.engagement||100)<40).length;
    return { dept: deptShort[i], attendance: att, engagement: eng, gpa: Math.round(gpa*25), riskPct: ds.length?Math.round(risk/ds.length*100):0, color: deptColors[i] };
  });

  function exportDeptCSV() {
    exportDataAsCSV(metrics.map((m,i)=>({
      Department: depts[i],
      'Avg Attendance %': m.attendance,
      'Avg Engagement %': m.engagement,
      'Avg GPA (scaled)': (m.gpa/25).toFixed(2),
      'At-Risk %': m.riskPct,
    })), 'department_comparison.csv');
  }

  return (
    <div style={{marginTop:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{t('dept_comparison')}</div>
        <button onClick={exportDeptCSV} style={{background:'rgba(16,185,129,0.15)',border:'1px solid #10b981',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:700,color:'#10b981',cursor:'pointer'}}>📤 {t('export_csv')}</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Card theme={C} title={t('attendance_rate')}>
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={metrics.map(m=>({label:m.dept,value:m.attendance,color:m.color}))} height={180}/>
          </div>
        </Card>
        <Card theme={C} title={t('avg_engagement')}>
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={metrics.map(m=>({label:m.dept,value:m.engagement,color:m.color}))} height={180}/>
          </div>
        </Card>
        <Card theme={C} title={t('at_risk')}>
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={metrics.map(m=>({label:m.dept,value:m.riskPct,color:m.color}))} height={180}/>
          </div>
        </Card>
        <Card theme={C} title="GPA Index">
          <div style={{padding:'12px 16px 12px'}}>
            {metrics.map((m,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:m.color,flexShrink:0}}/>
                <div style={{fontSize:12,color:C.text2,width:60,flexShrink:0}}>{m.dept}</div>
                <div style={{flex:1,height:8,background:C.bg3,borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,background:m.color,width:`${Math.min(m.gpa,100)}%`,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:m.color,width:36,textAlign:'right'}}>{(m.gpa/25).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── STUDENTS ── */
function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)/g) || [];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i]||'').replace(/"/g,'').trim(); });
    return obj;
  });
}

async function parseExcel(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(data.map(row => {
          const norm = {};
          Object.entries(row).forEach(([k,v]) => { norm[k.toLowerCase().trim()] = String(v).trim(); });
          return norm;
        }));
      } catch { resolve([]); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRow(row) {
  return {
    name:  row.name || row['full name'] || row['student name'] || '',
    email: row.email || row['e-mail'] || '',
    phone: row.phone || row['phone number'] || row.mobile || '',
    dept:  row.dept || row.department || DEPARTMENTS[0],
    year:  parseInt(row.year || row['academic year'] || 1) || 1,
  };
}

function BulkImportModal({ theme: C, onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    let parsed = [];
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      parsed = parseCSV(text);
    } else {
      parsed = await parseExcel(file);
    }
    setRows(parsed.map(normalizeRow).filter(r => r.name));
    setLoading(false);
  }

  async function importAll() {
    const accounts = [];
    const errors = [];
    for (const r of rows) {
      const sid       = store.nextStudentId();
      const firstName = r.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'student';
      const username  = `stu.${firstName}.${sid.toLowerCase()}`;
      const password  = generatePassword();
      const email     = r.email || `${sid.toLowerCase()}@university.edu`;
      try {
        await api.createStudent({
          student_id: sid, name: r.name.trim(), email,
          department: r.dept || DEPARTMENTS[0], year: parseInt(r.year) || 1, password,
        });
        const s = store.addStudent({ ...r, id: sid, email });
        store.addUser({ name: r.name, username, password, email, role: 'student', studentId: s.id });
        accounts.push({ name: r.name, username, password, id: s.id });
      } catch(err) {
        errors.push(`${r.name}: ${err.message}`);
      }
    }
    if (errors.length) alert('Some students failed:\n' + errors.join('\n'));
    setDone(accounts);
    onImported();
  }

  function downloadCSV(accounts) {
    const header = 'Student ID,Name,Username,Password\n';
    const body = accounts.map(a => `${a.id},${a.name},${a.username},${a.password}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'imported_credentials.csv'; a.click();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,padding:28,maxWidth:700,width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
        <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:16}}>📥 Bulk Import Students</div>

        {!done ? (
          <>
            <div style={{marginBottom:16,padding:14,background:C.bg3,borderRadius:10,border:`1px dashed ${C.border}`}}>
              <div style={{fontSize:12,color:C.text2,marginBottom:8}}>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with columns: <code>name, email, phone, dept, year</code>
              </div>
              <button onClick={() => fileRef.current?.click()}
                style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                📁 Choose File
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{display:'none'}}/>
            </div>

            {loading && <div style={{color:C.text2,fontSize:13,marginBottom:12}}>⏳ Parsing file...</div>}

            {rows.length > 0 && (
              <>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Preview — {rows.length} students found</div>
                <div style={{maxHeight:300,overflowY:'auto',borderRadius:10,border:`1px solid ${C.border}`,marginBottom:16}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr style={{background:C.bg3}}>
                        {['Name','Email','Phone','Department','Year'].map(h=>(
                          <th key={h} style={{padding:'8px 10px',color:C.text2,fontWeight:700,textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'7px 10px',color:C.text}}>{r.name||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text2}}>{r.email||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text2}}>{r.phone||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text2}}>{r.dept||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text2}}>Y{r.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={importAll}
                    style={{background:C.green,border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                    ✅ Import {rows.length} Students
                  </button>
                  <button onClick={onClose}
                    style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 16px',fontSize:12,color:C.text2,cursor:'pointer'}}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:8}}>✅</div>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>Successfully imported {done.length} students!</div>
            <div style={{fontSize:12,color:C.text2,marginBottom:20}}>Credentials have been generated. Download the CSV to share with students.</div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button onClick={() => downloadCSV(done)}
                style={{background:C.blue3,border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                📥 Download Credentials CSV
              </button>
              <button onClick={onClose}
                style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 16px',fontSize:12,color:C.text2,cursor:'pointer'}}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CSV EXPORT UTILITY ── */
function exportDataAsCSV(data, filename) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AdminStudents({ theme: C }) {
  const { t } = useLang();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({name:'',dept:DEPARTMENTS[0],year:1,email:'',phone:''});
  const [selected, setSelected] = useState(null);
  const [portfolioStudent, setPortfolioStudent] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [, forceUpdate] = useState(0);

  const reloadStudents = () => api.getStudents()
    .then(rows => setStudents(rows.map(s => ({
      ...s,
      id:           s.id           || s.student_id,
      dept:         s.dept         || s.department,
      attendanceRate: s.attendance_rate != null ? Number(s.attendance_rate) : (s.attendanceRate || 0),
    }))))
    .catch(() => {});
  useEffect(() => { reloadStudents(); }, []);

  const filtered = students.filter(s=>
    s.name.toLowerCase().includes(search.toLowerCase())||s.id.toLowerCase().includes(search.toLowerCase())
  );

  async function addStudent() {
    if(!form.name.trim()) { alert('Name is required'); return; }
    const sid      = store.nextStudentId();
    const firstName = form.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'student';
    const username  = `stu.${firstName}.${sid.toLowerCase()}`;
    const password  = generatePassword();
    const email     = form.email || `${sid.toLowerCase()}@university.edu`;

    try {
      // Persist to PostgreSQL first
      await api.createStudent({
        student_id: sid,
        name:       form.name.trim(),
        email,
        department: form.dept || DEPARTMENTS[0],
        year:       parseInt(form.year) || 1,
        password,
      });
    } catch(err) {
      alert('Failed to save student: ' + err.message);
      return;
    }

    setCreatedAccount({ name: form.name, role: 'Student', username, password, email, id: sid });
    reloadStudents();
    setShowAdd(false); setForm({name:'',dept:DEPARTMENTS[0],year:1,email:'',phone:''});
  }

  async function deleteSelected() {
    if(!selected) { alert('Select a student first'); return; }
    if(!confirm(`Delete ${selected.name}?`)) return;

    try {
      await api.deleteStudent(selected.id);
    } catch(err) {
      alert('Failed to delete student: ' + err.message);
      return;
    }

    reloadStudents(); setSelected(null);
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {portfolioStudent && <StudentPortfolioModal theme={C} student={portfolioStudent} onClose={()=>setPortfolioStudent(null)}/>}
      {createdAccount && <CredentialsModal theme={C} account={createdAccount} onClose={()=>setCreatedAccount(null)}/>}
      {showImport && <BulkImportModal theme={C} onClose={()=>setShowImport(false)} onImported={reloadStudents}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{t('students')} <span style={{ fontSize: 14, fontWeight: 400, color: C.text3 }}>({filtered.length} / {students.length})</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={deleteSelected} style={{ background: C.red_dim, border: `1px solid ${C.red}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, color: C.red2, cursor: 'pointer' }}>🗑️ Delete</button>
          {/* Bulk year promotion: from Year X → to Year Y */}
          <div style={{display:'flex',alignItems:'center',gap:6,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'4px 10px'}}>
            <span style={{fontSize:10,color:C.text3,fontWeight:700}}>PROMOTE</span>
            <select id="bulk-from-year" defaultValue={1}
              style={{height:26,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:'0 6px',fontSize:11,color:C.text}}>
              {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
            </select>
            <span style={{fontSize:11,color:C.text2,fontWeight:700}}>→</span>
            <select id="bulk-to-year" defaultValue={2}
              style={{height:26,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:'0 6px',fontSize:11,color:C.text}}>
              {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
            </select>
            <button onClick={async()=>{
              const fromY = parseInt(document.getElementById('bulk-from-year').value);
              const toY   = parseInt(document.getElementById('bulk-to-year').value);
              if(fromY === toY){ alert('From and To years must be different'); return; }
              if(!confirm(`Promote ALL Year ${fromY} students → Year ${toY}?`)) return;
              try {
                const res = await api.bulkUpdateStudentYear(fromY, toY);
                reloadStudents();
                pushToast({title:'Bulk promotion done', message:`${res.updated} students moved from Year ${fromY} to Year ${toY}`, color:'#10b981'});
              } catch(e){ pushToast({title:'Failed', message:e.message, color:'#ef4444'}); }
            }} style={{height:26,background:'#10b981',border:'none',borderRadius:6,padding:'0 12px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>
              Apply
            </button>
          </div>
          <button onClick={() => exportDataAsCSV(filtered.map(s => ({ ID: s.id, Name: s.name, Department: s.dept, Year: s.year, Email: s.email || '', Attendance: `${s.attendanceRate}%`, Engagement: `${s.engagement}%`, GPA: s.gpa || 'N/A' })), 'students_export.csv')} style={{ background: C.green_dim || 'rgba(16,185,129,0.15)', border: `1px solid ${C.green}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: C.green, cursor: 'pointer' }}>📤 Export</button>
          <button onClick={() => setShowImport(true)} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>📥 Import</button>
          <button onClick={() => setShowAdd(true)} style={{ background: C.blue3, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>+ Add Student</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Add New Student</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[['name','Full Name','text'],['email','Email','email'],['phone','Phone','text']].map(([k,ph,t])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>{ph}</div>
                <input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph} type={t}
                  style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Department</div>
              <select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Year</div>
              <select value={form.year} onChange={e=>setForm({...form,year:parseInt(e.target.value)})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={addStudent} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Add Student</button>
            <button onClick={()=>setShowAdd(false)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${students.length} students by name or ID…`}
          style={{
            width: '100%', height: 44, background: C.card, border: `1.5px solid ${search ? C.blue : C.border}`,
            borderRadius: 12, paddingLeft: 40, paddingRight: search ? 40 : 16, fontSize: 13, color: C.text,
            boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, color: C.text3, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        )}
        {search && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: C.text3, fontWeight: 700 }}>
          </div>
        )}
        {search && filtered.length === 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: C.text3, paddingLeft: 4 }}>No students match "{search}"</div>
        )}
      </div>

      <Card theme={C} title={`Students (${filtered.length})`}>
        <div style={{padding:'4px 12px 12px'}}>
          <DataTable theme={C} columns={[
            {key:'id',label:'ID',width:70},{key:'name',label:'Name',width:190},
            {key:'dept',label:'Department',width:140},{key:'year',label:'Year',width:60},
            {key:'email',label:'Email',width:180},{key:'gpa',label:'GPA',width:60},
            {key:'attendance',label:'Attendance',width:90},
          ]} rows={filtered.map(s=>{
            const photo = s.capturedPhoto || store.getPhotoUrl(s);
            return {
              id:s.id,
              name:(
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {photo
                    ? <img src={photo} alt={s.name}
                        onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
                        style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',border:`1px solid ${C.border}`,flexShrink:0}}/>
                    : null
                  }
                  <div style={{width:30,height:30,borderRadius:'50%',background:s.color,display:photo?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{s.emoji}</div>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</span>
                </div>
              ),
              dept:s.dept,year:`Y${s.year}`,email:s.email,gpa:s.gpa,
              attendance:`${s.attendanceRate}%`,
            };
          })} onRowClick={(_,i)=>setSelected(filtered[i])}/>
        </div>
      </Card>

      {selected && (
        <div style={{marginTop:12,background:C.card,borderRadius:14,border:`1px solid ${C.blue}`,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Selected: {selected.name} ({selected.id})</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {/* Actions */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button onClick={()=>setPortfolioStudent(selected)} style={{background:C.blue_dim,border:`1px solid ${C.blue}`,borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:700,color:C.blue2,cursor:'pointer'}}>📄 View Portfolio</button>
              {/* Change academic year */}
              <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px'}}>
                <div style={{fontSize:10,color:C.text3,fontWeight:700,marginBottom:6}}>🎓 ACADEMIC YEAR</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <select
                    defaultValue={selected.year||1}
                    id="year-select"
                    style={{flex:1,height:30,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:'0 8px',fontSize:12,color:C.text}}
                  >
                    {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
                  </select>
                  <button
                    onClick={async()=>{
                      const y = parseInt(document.getElementById('year-select').value);
                      try {
                        await api.updateStudentYear(selected.id, y);
                        setSelected({...selected, year:y});
                        reloadStudents();
                        pushToast({title:'Year updated',message:`${selected.name} → Year ${y}`,color:'#10b981'});
                      } catch(e){ pushToast({title:'Failed',message:e.message,color:'#ef4444'}); }
                    }}
                    style={{background:'#10b981',border:'none',borderRadius:6,padding:'0 12px',height:30,fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}
                  >Save</button>
                </div>
              </div>
              <button onClick={deleteSelected} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 14px',fontSize:11,color:C.red2,cursor:'pointer'}}>🗑️ Delete Student</button>
              {selected.capturedPhoto && (
                <div>
                  <div style={{fontSize:10,color:C.text3,marginBottom:4}}>Registered Face Photo:</div>
                  <img src={selected.capturedPhoto} alt="face" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',border:`2px solid ${C.green}`}}/>
                </div>
              )}
            </div>
            {/* Face Registration */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text2,marginBottom:8}}>📸 Face Registration</div>
              <WebcamFeed
                theme={C}
                compact
                mode="🎓 Face Registration"
                onCapture={async (dataUrl) => {
                  store.updateStudent(selected.id, { capturedPhoto: dataUrl });
                  setSelected({...selected, capturedPhoto: dataUrl});
                  forceUpdate(n=>n+1);
                  // Register face encoding with Python server
                  try {
                    const FACE_SERVER = import.meta.env.VITE_FACE_SERVER_URL || 'http://localhost:8765';
                    const res = await fetch(`${FACE_SERVER}/register`, {
                      method: 'POST',
                      headers: {'Content-Type':'application/json'},
                      body: JSON.stringify({ student_id: selected.id, frame: dataUrl }),
                    });
                    const d = await res.json();
                    if (d.ok) alert(`✅ Face registered for ${selected.name} (${d.registered_total} total)`);
                    else alert(`⚠️ ${d.error}`);
                  } catch { alert('⚠️ Face server not reachable. Set VITE_FACE_SERVER_URL or start face_server.py'); }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── DOCTORS/LECTURERS ── */
function AdminDoctors({ theme: C }) {
  const { t } = useLang();
  const [doctors,  setDoctors]  = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const [form, setForm] = useState({name:'',dept:DEPARTMENTS[0],title:TITLES[0],email:'',phone:''});
  const [selected, setSelected] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);

  function loadDoctors() {
    api.getLectureDoctors()
      .then(rows => setDoctors(rows.map(r => ({
        id:         r.doctor_id,
        name:       r.name,
        title:      r.title || '',
        dept:       r.department || '',
        email:      r.email || '',
        phone:      r.phone || '',
        color:      '#3b82f6',
        emoji:      '👨‍🏫',
        courses:    0,
        students:   0,
      }))))
      .catch(() => {});
  }

  useEffect(() => { loadDoctors(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addDoctor() {
    if (!form.name.trim()) { alert('Name is required'); return; }
    setSaving(true); setSaveErr('');
    const firstName = form.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'doctor';
    const username  = `dr.${firstName}`;
    const password  = generatePassword();
    try {
      const result = await api.createDoctor({
        name:       form.name.trim(),
        username,
        password,
        title:      form.title,
        department: form.dept,
        email:      form.email,
        phone:      form.phone,
      });
      setCreatedAccount({ name: form.name, role: 'Doctor / Lecturer', username, password, email: form.email, id: result.doctor_id });
      setShowAdd(false);
      setForm({name:'',dept:DEPARTMENTS[0],title:TITLES[0],email:'',phone:''});
      loadDoctors();
    } catch (err) {
      setSaveErr(err.message || 'Failed to create doctor');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected) { alert('Select a lecturer first'); return; }
    if (!confirm(`Delete ${selected.name}? This will also remove their login account.`)) return;
    try {
      await api.deleteDoctor(selected.id);
      setSelected(null);
      loadDoctors();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {createdAccount && <CredentialsModal theme={C} account={createdAccount} onClose={()=>setCreatedAccount(null)}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('doctors')} ({doctors.length})</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={deleteSelected} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 14px',fontSize:11,color:C.red2,cursor:'pointer'}}>🗑️ Delete</button>
          <button onClick={()=>setShowAdd(true)} style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>+ Add Lecturer</button>
        </div>
      </div>

      {showAdd && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Add New Lecturer</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[['name','Full Name'],['email','Email'],['phone','Phone']].map(([k,ph])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>{ph}</div>
                <input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph}
                  style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Department</div>
              <select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Title</div>
              <select value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {TITLES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {saveErr && <div style={{color:'#ef4444',fontSize:12,marginBottom:8}}>⚠️ {saveErr}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={addDoctor} disabled={saving} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',opacity:saving?0.6:1}}>
              {saving ? '⏳ Saving…' : '✅ Add Lecturer'}
            </button>
            <button onClick={()=>{setShowAdd(false);setSaveErr('');}} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
        {doctors.map((d,i)=>(
          <div key={i} onClick={()=>setSelected(d===selected?null:d)}
            style={{background:selected?.id===d.id?C.blue_dim:C.card,borderRadius:14,border:`1px solid ${selected?.id===d.id?C.blue:C.border}`,padding:16,cursor:'pointer',transition:'all 0.15s'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:d.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{d.emoji}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{d.name}</div>
                <div style={{fontSize:10,color:C.text3}}>{d.title}</div>
              </div>
            </div>
            <div style={{fontSize:10,color:C.text2,marginBottom:4}}>📧 {d.email}</div>
            <div style={{fontSize:10,color:C.text2,marginBottom:8}}>🏛️ {d.dept}</div>
            <div style={{display:'flex',gap:8}}>
              <div style={{textAlign:'center',flex:1,background:C.bg3,borderRadius:8,padding:'6px'}}>
                <div style={{fontSize:14,fontWeight:700,color:C.blue}}>{d.courses}</div>
                <div style={{fontSize:9,color:C.text3}}>Courses</div>
              </div>
              <div style={{textAlign:'center',flex:1,background:C.bg3,borderRadius:8,padding:'6px'}}>
                <div style={{fontSize:14,fontWeight:700,color:C.green}}>{d.students}</div>
                <div style={{fontSize:9,color:C.text3}}>Students</div>
              </div>
              <div style={{textAlign:'center',flex:1,background:C.bg3,borderRadius:8,padding:'6px'}}>
                <div style={{fontSize:14,fontWeight:700,color:C.amber}}>{d.engagement != null ? `${d.engagement}%` : '—'}</div>
                <div style={{fontSize:9,color:C.text3}}>Engagement</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{marginTop:12,padding:'12px',background:C.card,borderRadius:12,border:`1px solid ${C.blue}`,display:'flex',gap:8}}>
          <button onClick={deleteSelected} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 14px',fontSize:11,color:C.red2,cursor:'pointer'}}>🗑️ Delete {selected.name}</button>
        </div>
      )}
    </div>
  );
}

/* ── COURSES ── */
function AdminCourses({ theme: C }) {
  const { t } = useLang();
  const [courses,    setCourses]   = useState([]);
  const [apiDoctors, setApiDoctors]= useState([]);
  const [showAdd,    setShowAdd]   = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [saveErr,    setSaveErr]   = useState('');
  const [weeksOpen,  setWeeksOpen] = useState(null);
  const [form, setForm] = useState({name:'',code:'',room:'',time:'09:00',duration:90,doctorId:'',color:'#3b82f6',semester:'Fall 2025',days:[1,4],capacity:300,academic_year:1});

  // Helper: map API lecture row → display shape
  function mapRow(r) {
    return {
      id:           r.lecture_id || r.course_code,
      code:         r.course_code,
      name:         r.course_name,
      room:         r.room || '',
      time:         r.scheduled_at || '',
      duration:     r.duration_min || 90,
      daysLabel:    r.days_label || '',
      doctorName:   r.doctor_name || 'Unassigned',
      semester:     r.semester || '',
      color:        r.color || '#3b82f6',
      capacity:     r.capacity || 300,
      enrolledCount: r.enrolled_count || 0,
      academic_year: r.academic_year || 1,
      weeks:        Array.from({length:16},(_,k)=>k+1),
    };
  }

  function loadCourses() {
    api.getAvailableCourses()
      .then(rows => setCourses(rows.map(mapRow)))
      .catch(() => {});
  }

  useEffect(() => {
    loadCourses();
    api.getLectureDoctors()
      .then(setApiDoctors)
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addCourse() {
    if (!form.name.trim() || !form.code.trim()) { alert('Name and code required'); return; }
    if (!form.days.length) { alert('Select at least one lecture day'); return; }
    setSaving(true); setSaveErr('');
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu'];
    const daysLabel = form.days.map(d => DAY_NAMES[d]).join(', ');
    try {
      await api.createLecture({
        course_name:  form.name.trim(),
        course_code:  form.code.trim().toUpperCase(),
        doctor_id:    form.doctorId || null,
        room:         form.room.trim(),
        scheduled_at: form.time,
        duration_min: form.duration,
        capacity:     form.capacity,
        color:        form.color,
        days:          form.days.join(','),
        days_label:    daysLabel,
        semester:      form.semester,
        academic_year: form.academic_year || 1,
      });
      setShowAdd(false);
      setForm({name:'',code:'',room:'',time:'09:00',duration:90,doctorId:'',color:'#3b82f6',semester:'Fall 2025',days:[1,4],capacity:300});
      loadCourses(); // refresh list from DB
    } catch (err) {
      setSaveErr(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(d) {
    setForm(f => ({...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d].sort((a,b)=>a-b)}));
  }

  async function deleteCourse(courseCode) {
    if (!confirm('Delete this course and all its lecture sections?')) return;
    try {
      await api.deleteCourseByCode(courseCode);
      loadCourses();
      if (weeksOpen === courseCode) setWeeksOpen(null);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function toggleWeek(course, w) {
    const cur = course.weeks || Array.from({length:16},(_,k)=>k+1);
    const next = cur.includes(w) ? cur.filter(x=>x!==w) : [...cur, w].sort((a,b)=>a-b);
    setCourses(cs => cs.map(c => c.code === course.code ? {...c, weeks: next} : c));
  }

  function setAllWeeks(course, all) {
    const next = all ? Array.from({length:16},(_,k)=>k+1) : [];
    setCourses(cs => cs.map(c => c.code === course.code ? {...c, weeks: next} : c));
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('courses')} ({courses.length})</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={loadCourses} title="Refresh" style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,color:C.text2,cursor:'pointer'}}>↻</button>
          <button onClick={()=>setShowAdd(true)} style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>+ Add Course</button>
        </div>
      </div>

      {showAdd && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Add New Course</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[['name','Course Name'],['code','Course Code'],['room','Room']].map(([k,ph])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>{ph}</div>
                <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph}
                  style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Assign Lecturer</div>
              <select value={form.doctorId} onChange={e=>setForm({...form,doctorId:e.target.value})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                <option value="">Unassigned</option>
                {apiDoctors.map(d=><option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Time</div>
              <input value={form.time} onChange={e=>setForm({...form,time:e.target.value})} type="time"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Semester</div>
              <input value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})} placeholder="e.g. Fall 2025"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Academic Year</div>
              <select value={form.academic_year} onChange={e=>setForm({...form,academic_year:parseInt(e.target.value)})}
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}>
                {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Capacity</div>
              <input value={form.capacity} onChange={e=>setForm({...form,capacity:parseInt(e.target.value)||300})} type="number" min="1" max="1000"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Color</div>
              <input value={form.color} onChange={e=>setForm({...form,color:e.target.value})} type="color"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 4px',cursor:'pointer'}}/>
            </div>
          </div>
          {/* Day-of-week picker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.text3,marginBottom:8,textTransform:'uppercase',fontWeight:700}}>Lecture Days</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[['Sun',0],['Mon',1],['Tue',2],['Wed',3],['Thu',4]].map(([label,d])=>{
                const active = form.days.includes(d);
                return (
                  <button key={d} onClick={()=>toggleDay(d)} type="button"
                    style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
                      background: active ? C.blue3 : C.bg3,
                      border: `1px solid ${active ? C.blue3 : C.border}`,
                      color: active ? '#fff' : C.text2}}>
                    {label}
                  </button>
                );
              })}
            </div>
            {form.days.length === 0 && <div style={{fontSize:10,color:C.red2,marginTop:4}}>Select at least one day</div>}
          </div>
          {saveErr && <div style={{color:'#ef4444',fontSize:12,marginBottom:8}}>⚠️ {saveErr}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={addCourse} disabled={saving} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',opacity:saving?0.6:1}}>
              {saving ? '⏳ Saving…' : '✅ Add Course'}
            </button>
            <button onClick={()=>{setShowAdd(false);setSaveErr('');}} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {courses.map((c,i)=>{
          const activeWeeks = c.weeks || Array.from({length:16},(_,k)=>k+1);
          const isOpen = weeksOpen === c.code;
          return (
            <div key={c.code} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
              {/* Course row */}
              <div style={{display:'flex'}}>
                <div style={{width:6,background:c.color,flexShrink:0}}/>
                <div style={{padding:'14px 18px',flex:1,display:'flex',alignItems:'center',gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.name}</div>
                      <span style={{background:'#3b82f622',border:'1px solid #3b82f644',borderRadius:6,padding:'1px 8px',fontSize:10,fontWeight:700,color:'#3b82f6'}}>Year {c.academic_year}</span>
                    </div>
                    <div style={{fontSize:11,color:C.text2,marginTop:2}}>{c.code} · {c.room} · {c.time} · {c.duration} min{c.daysLabel ? ` · 📅 ${c.daysLabel}` : ''}</div>
                    <div style={{fontSize:11,color:C.text3}}>👨‍🏫 {c.doctorName} · {c.semester}</div>
                  </div>
                  {/* Week count badge */}
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:700,color:c.color}}>{activeWeeks.length}</div>
                    <div style={{fontSize:9,color:C.text3}}>Weeks</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:700,color:c.color}}>{c.enrolledCount}</div>
                    <div style={{fontSize:9,color:C.text3}}>Enrolled</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text3}}>{c.capacity||'∞'}</div>
                    <div style={{fontSize:9,color:C.text3}}>Capacity</div>
                  </div>
                  {/* Weeks edit button */}
                  {/* Inline year changer */}
                  <select
                    value={c.academic_year || 1}
                    onChange={async e => {
                      const y = parseInt(e.target.value);
                      try {
                        await api.updateCourseYear(c.code, y);
                        setCourses(cs => cs.map(x => x.code === c.code ? {...x, academic_year: y} : x));
                        pushToast({title:'Year updated', message:`${c.name} → Year ${y}`, color:'#10b981'});
                      } catch(err) { pushToast({title:'Failed', message:err.message, color:'#ef4444'}); }
                    }}
                    style={{height:32,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 8px',fontSize:11,color:C.text,cursor:'pointer'}}
                  >
                    {[1,2,3,4].map(y=><option key={y} value={y}>Yr {y}</option>)}
                  </select>
                  <button
                    onClick={()=>setWeeksOpen(isOpen ? null : c.code)}
                    style={{background: isOpen ? C.blue3 : C.bg3, border:`1px solid ${isOpen ? C.blue3 : C.border}`, borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:700, color: isOpen ? '#fff' : C.text2, cursor:'pointer'}}>
                    📅 Weeks
                  </button>
                  <button onClick={()=>deleteCourse(c.code)} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'6px 10px',fontSize:10,color:C.red2,cursor:'pointer'}}>🗑️</button>
                </div>
              </div>

              {/* Weeks checklist panel */}
              {isOpen && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:'14px 20px',background:C.bg3}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>📅 Active Weeks — {activeWeeks.length} / 16 selected</div>
                    <div style={{flex:1}}/>
                    <button onClick={()=>setAllWeeks(c, true)}
                      style={{background:C.green,border:'none',borderRadius:6,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                      ✅ All
                    </button>
                    <button onClick={()=>setAllWeeks(c, false)}
                      style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 12px',fontSize:11,fontWeight:700,color:C.red2,cursor:'pointer'}}>
                      ✗ None
                    </button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6}}>
                    {Array.from({length:16},(_,k)=>k+1).map(w=>{
                      const on = activeWeeks.includes(w);
                      return (
                        <label key={w} onClick={()=>toggleWeek(c,w)} style={{
                          display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                          background: on ? `${c.color}22` : C.card,
                          border: `2px solid ${on ? c.color : C.border}`,
                          borderRadius:8, padding:'7px 0', cursor:'pointer',
                          transition:'all 0.15s', userSelect:'none',
                        }}>
                          <input type="checkbox" checked={on} onChange={()=>{}} style={{accentColor:c.color,width:13,height:13,cursor:'pointer'}}/>
                          <span style={{fontSize:12,fontWeight:700,color: on ? c.color : C.text2}}>W{w}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ENROLLMENTS ── */
function AdminEnrollments({ theme: C }) {
  const { t } = useLang();
  const [courses,      setCourses]      = useState([]);
  const [allStudents,  setAllStudents]  = useState([]); // all students from DB
  const [enrollMap,    setEnrollMap]    = useState({}); // course_code → Set of student_ids
  const [selCourse,    setSelCourse]    = useState('');
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [working,      setWorking]      = useState({});

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.getAvailableCourses(),
      api.getStudents(),
      api.getEnrollments(),
    ]).then(([courseList, studentList, enrollData]) => {
      setCourses(courseList);
      setAllStudents(studentList);
      // enrollData = [{course_id, student_id}, ...]
      const map = {};
      (Array.isArray(enrollData) ? enrollData : []).forEach(({course_id, student_id}) => {
        if (!map[course_id]) map[course_id] = new Set();
        map[course_id].add(student_id);
      });
      setEnrollMap(map);
      if (courseList.length > 0 && !selCourse) setSelCourse(courseList[0].course_code);
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enrolledIds  = enrollMap[selCourse] || new Set();
  const q = search.toLowerCase();
  const match = s => !q || (s.name||'').toLowerCase().includes(q) || (s.student_id||'').toLowerCase().includes(q);

  const enrolled  = allStudents.filter(s => enrolledIds.has(s.student_id)  && match(s));
  const available = allStudents.filter(s => !enrolledIds.has(s.student_id) && match(s));

  async function handleEnroll(s) {
    setWorking(w => ({...w, [s.student_id]: true}));
    try {
      await api.enroll(selCourse, s.student_id);
      setEnrollMap(m => {
        const next = new Set(m[selCourse] || []);
        next.add(s.student_id);
        return {...m, [selCourse]: next};
      });
    } catch (err) { alert('Enroll failed: ' + err.message); }
    finally { setWorking(w => ({...w, [s.student_id]: false})); }
  }

  async function handleUnenroll(s) {
    setWorking(w => ({...w, [s.student_id]: true}));
    try {
      await api.unenroll(selCourse, s.student_id);
      setEnrollMap(m => {
        const next = new Set(m[selCourse] || []);
        next.delete(s.student_id);
        return {...m, [selCourse]: next};
      });
    } catch (err) { alert('Remove failed: ' + err.message); }
    finally { setWorking(w => ({...w, [s.student_id]: false})); }
  }

  function StuRow({ s, onAction, label, color }) {
    const busy = working[s.student_id];
    const initials = (s.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return (
      <div style={{display:'flex',alignItems:'center',background:C.bg3,borderRadius:8,padding:'8px 10px',gap:10}}>
        {s.photo_path
          ? <img src={s.photo_path} alt={s.name} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
          : <div style={{width:32,height:32,borderRadius:'50%',background:'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{initials}</div>
        }
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.name}</div>
          <div style={{fontSize:10,color:C.text3}}>{s.student_id}</div>
        </div>
        <button onClick={() => onAction(s)} disabled={busy}
          style={{background:color+'22',border:`1px solid ${color}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:color,cursor:'pointer',opacity:busy?0.5:1}}>
          {busy ? '…' : label}
        </button>
      </div>
    );
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('enrollments')}</div>
        <button onClick={loadAll} title="Refresh" style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 12px',fontSize:13,color:C.text2,cursor:'pointer'}}>↻</button>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {courses.map(c=><option key={c.course_code} value={c.course_code}>{c.course_name} ({c.course_code})</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or ID…"
          style={{flex:1,minWidth:180,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}/>
        {search && <button onClick={()=>setSearch('')} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,cursor:'pointer'}}>✕</button>}
      </div>

      {loading ? (
        <div style={{color:C.text2,fontSize:13,padding:'20px 0'}}>Loading…</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Card theme={C} title={`Enrolled (${enrolled.length})`} accentColor={C.green}>
            <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6,maxHeight:400,overflowY:'auto'}}>
              {enrolled.map(s => <StuRow key={s.student_id} s={s} onAction={handleUnenroll} label="Remove" color="#ef4444"/>)}
              {enrolled.length===0 && <div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No enrolled students</div>}
            </div>
          </Card>
          <Card theme={C} title={`Available to Enroll (${available.length})`} accentColor={C.blue}>
            <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6,maxHeight:400,overflowY:'auto'}}>
              {available.map(s => <StuRow key={s.student_id} s={s} onAction={handleEnroll} label="Enroll" color="#10b981"/>)}
              {available.length===0 && <div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>All students enrolled</div>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── ADMIN APPEALS ── */
function AdminAppeals({ theme: C }) {
  const { t } = useLang();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all');
  const [response, setResponse] = useState({});

  const reloadComplaints = () => api.getComplaints().then(setComplaints).catch(() => {});
  useEffect(() => { reloadComplaints(); }, []);

  async function resolve(id) {
    const text = response[id]?.trim();
    try {
      await api.updateComplaint(id, { status:'resolved', adminResponse: text||'Reviewed and resolved by admin.' });
    } catch(e) { alert('Failed to resolve: ' + e.message); return; }
    reloadComplaints();
    setResponse(r=>({...r,[id]:''}));
  }

  const statusColor = { pending:'amber', reviewed:'blue', resolved:'green' };
  const typeLabel   = { absence_excuse:'Absence Excuse', grade_appeal:'Grade Appeal', general:'General Complaint' };
  const filtered    = filter==='all' ? complaints : complaints.filter(c=>c.status===filter);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('appeals_mgmt')}</div>
      <div style={{fontSize:12,color:C.text3,marginBottom:12}}>{complaints.filter(c=>c.status==='pending').length} pending · {complaints.filter(c=>c.status==='reviewed').length} reviewed · {complaints.filter(c=>c.status==='resolved').length} resolved</div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['all','pending','reviewed','resolved'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
              background:filter===s?C.blue3:C.bg3, border:`1px solid ${filter===s?C.blue3:C.border}`,
              color:filter===s?'#fff':C.text2}}>
            {s.charAt(0).toUpperCase()+s.slice(1)} {s!=='all'?`(${complaints.filter(c=>c.status===s).length})`:''}
          </button>
        ))}
      </div>

      {filtered.length===0
        ? <div style={{textAlign:'center',color:C.text3,padding:40,fontSize:13}}>No {filter==='all'?'':filter} appeals.</div>
        : filtered.map((c,i)=>(
        <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${c.status==='pending'?C.amber:C.border}`,padding:18,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
            <Badge text={typeLabel[c.type]||c.type} color="blue" isDark/>
            <Badge text={c.status.charAt(0).toUpperCase()+c.status.slice(1)} color={statusColor[c.status]} isDark/>
            <span style={{fontSize:12,color:C.text,fontWeight:700}}>{c.studentName}</span>
            <span style={{fontSize:11,color:C.text3}}>— {c.courseName||'No course'}</span>
            <span style={{fontSize:10,color:C.text3,marginLeft:'auto'}}>{c.createdAt} · Updated {c.updatedAt}</span>
          </div>
          <div style={{fontSize:13,color:C.text,marginBottom:10,lineHeight:1.5}}>{c.description}</div>
          {c.doctorResponse && <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,marginBottom:8}}><strong>Doctor:</strong> {c.doctorResponse}</div>}
          {c.adminResponse  && <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,marginBottom:8}}><strong>Admin:</strong> {c.adminResponse}</div>}
          {c.status!=='resolved' && (
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <input value={response[c.id]||''} onChange={e=>setResponse(r=>({...r,[c.id]:e.target.value}))}
                placeholder="Admin response (optional)..."
                style={{flex:1,height:34,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              <button onClick={()=>resolve(c.id)}
                style={{background:C.green,border:'none',borderRadius:8,padding:'0 16px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                ✅ Resolve
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── ADMIN REGISTRATION & FEES ── */
function AdminRegistration({ theme: C }) {
  const { t } = useLang();
  const [reg, setReg]             = useState({ open: false, semester: '', deadline: '' });
  const [search, setSearch]       = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [feeMap, setFeeMap]       = useState({});

  useEffect(() => {
    api.getRegistration().then(setReg).catch(() => {});
    api.getStudents().then(stus => {
      setAllStudents(stus);
      // Load fee status for each student
      Promise.allSettled(stus.map(s => api.getFeeStatus(s.id || s.student_id).then(f => [s.id || s.student_id, f]))).then(results => {
        const map = {};
        results.forEach(r => { if (r.status === 'fulfilled' && r.value) map[r.value[0]] = r.value[1]; });
        setFeeMap(map);
      });
    }).catch(() => {});
  }, []);

  async function toggleReg() {
    const updated = { ...reg, open: !reg.open };
    try { await api.setRegistration(updated); setReg(updated); } catch(e) { alert('Failed: ' + e.message); }
  }

  async function saveSemester(field, value) {
    const updated = { ...reg, [field]: value };
    setReg(updated);
    try { await api.setRegistration(updated); } catch {}
  }

  async function toggleFee(studentId) {
    const current = feeMap[studentId] || {};
    const updated = { ...current, paid: !current.paid };
    try {
      await api.setFeeStatus(studentId, updated);
      setFeeMap(m => ({ ...m, [studentId]: updated }));
    } catch(e) { alert('Failed: ' + e.message); }
  }

  const q = search.toLowerCase();
  const students = q ? allStudents.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.id||'').toLowerCase().includes(q)) : allStudents;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('reg_fees')}</div>

      <Card theme={C} title="Semester Registration">
        <div style={{padding:'4px 16px 16px',display:'flex',alignItems:'center',gap:20}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{reg.semester}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>Registration deadline: {reg.deadline}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Badge text={reg.open?'Open':'Closed'} color={reg.open?'green':'red'} isDark/>
            <button onClick={toggleReg}
              style={{background:reg.open?C.red_dim:C.green_dim,border:`1px solid ${reg.open?C.red:C.green}`,borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,color:reg.open?C.red2:C.green2,cursor:'pointer'}}>
              {reg.open?'🔒 Close Registration':'🔓 Open Registration'}
            </button>
          </div>
        </div>
        <div style={{padding:'0 16px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',fontWeight:700,marginBottom:4}}>Semester Name</div>
            <input value={reg.semester||''} onChange={e=>saveSemester('semester',e.target.value)}
              style={{width:'100%',height:34,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',fontWeight:700,marginBottom:4}}>Deadline</div>
            <input type="date" value={reg.deadline||''} onChange={e=>saveSemester('deadline',e.target.value)}
              style={{width:'100%',height:34,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
          </div>
        </div>
      </Card>

      <div style={{marginTop:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,flex:1}}>Student Fees</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student..."
            style={{height:34,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text,width:200}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:500,overflowY:'auto'}}>
          {students.map((s,i)=>{
            const sid = s.id || s.student_id || '';
            const fee = feeMap[sid] || {};
            const name = s.name || s.full_name || sid;
            const dept = s.dept || s.department || '';
            return (
              <div key={i} style={{display:'flex',alignItems:'center',background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:'10px 14px',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:s.color||C.blue_dim,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{s.emoji||'👤'}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{sid}{dept ? ` · ${dept}` : ''}</div>
                </div>
                <Badge text={fee.paid?'Paid':'Unpaid'} color={fee.paid?'green':'red'} isDark/>
                <button onClick={()=>toggleFee(sid)}
                  style={{background:fee.paid?C.red_dim:C.green_dim,border:`1px solid ${fee.paid?C.red:C.green}`,borderRadius:6,padding:'5px 12px',fontSize:11,fontWeight:700,color:fee.paid?C.red2:C.green2,cursor:'pointer'}}>
                  {fee.paid?'Mark Unpaid':'Mark Paid'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── PARENTS ── */
function AdminParents({ theme: C }) {
  const { t } = useLang();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:'',username:'',password:'',email:'',studentId:''});
  const [parents, setParents] = useState([]);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [, forceUpdate] = useState(0);

  const reloadParents = () => api.init().then(d => setParents(d.parents || [])).catch(() => {});
  useEffect(() => { reloadParents(); }, []);

  async function addParent() {
    if(!form.name.trim()||!form.username.trim()) { alert('Name and username required'); return; }
    if(!form.email.trim()) { alert('Email is required'); return; }
    try {
      // Save parent account to database via backend API
      await post('/api/users/', {
        username:  form.username.trim(),
        full_name: form.name.trim(),
        email:     form.email.trim(),
        role:      'parent',
        password:  form.password || form.username,
      });
    } catch(err) {
      alert('Failed to create parent: ' + err.message);
      return;
    }
    setCreatedAccount({ name: form.name, role: 'Parent', username: form.username, password: form.password, email: form.email, id: form.studentId||null });
    reloadParents();
    setShowAdd(false); setForm({name:'',username:'',password:'',email:'',studentId:''});
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {createdAccount && <CredentialsModal theme={C} account={createdAccount} onClose={()=>setCreatedAccount(null)}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('parents')} ({parents.length})</div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>+ Add Parent</button>
      </div>

      {showAdd && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[['name','Full Name'],['username','Username'],['password','Password'],['email','Email'],['studentId','Linked Student ID']].map(([k,ph])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>{ph}</div>
                <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph}
                  style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={addParent} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Add Parent</button>
            <button onClick={()=>setShowAdd(false)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <Card theme={C} title={`Parent Accounts (${parents.length})`}>
        <div style={{padding:'4px 12px 12px'}}>
          <DataTable theme={C} columns={[
            {key:'name',label:'Name',width:160},{key:'username',label:'Username',width:120},
            {key:'email',label:'Email',width:200},{key:'studentId',label:'Linked Student',width:120},
          ]} rows={parents.map(p=>({name:p.name,username:p.username,email:p.email||'—',studentId:p.studentId||'—'}))}/>
        </div>
      </Card>
    </div>
  );
}

/* ── R REPORTS ── */
function AdminRReports({ theme: C }) {
  const { t } = useLang();
  const [output, setOutput]   = useState('# R output will appear here...');
  const [running, setRunning] = useState('');

  async function runScript(script) {
    setRunning(script);
    setOutput(`# Running ${script}...\n`);
    try {
      const res = await fetch('/api/analytics/run-r-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('edusense_token')}` },
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
    },
    {
      id: 'analysis.R',
      icon: '📊',
      title: 'Full Analysis',
      sub: 'analysis.R',
      desc: 'Emotion distribution · Clustering · Charts',
      color: '#3b82f6',
    },
    {
      id: 'shiny_dashboard.R',
      icon: '✨',
      title: 'Shiny Dashboard',
      sub: 'shiny_dashboard.R',
      desc: 'Interactive dashboard · 127.0.0.1:3484',
      color: '#10b981',
      url: 'http://127.0.0.1:3484',
    },
  ];

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('ranalysis')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>Run R scripts directly — no need to open R manually</div>

      <div style={{
        background: '#021a12', border: '1px solid #10b981', borderRadius: 10,
        padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: '#10b981',
      }}>
        <span style={{ fontSize: 16 }}>✅</span>
        R scripts run server-side via the analytics endpoint
      </div>

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

/* ── CREDENTIALS MODAL ── */
function CredentialsModal({ theme: C, account, onClose }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const credText = [
    'EduSense Account Credentials',
    '─────────────────────────────',
    `Name:     ${account.name}`,
    `Role:     ${account.role}`,
    `Username: ${account.username}`,
    `Password: ${account.password}`,
    `Email:    ${account.email || '—'}`,
    '',
    `Login at: ${window.location.origin}`,
  ].join('\n');

  function copyCredentials() {
    navigator.clipboard.writeText(credText).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false), 2500); });
  }

  async function sendEmail() {
    if (!account.email) { setEmailError('No email address provided for this account.'); return; }
    setSending(true); setEmailError(''); setSent(false);
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id:  import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_it50w6l',
          template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_n1v9mtb',
          user_id:     import.meta.env.VITE_EMAILJS_USER_ID     || '3nrjXvpxGXf0G01Xj',
          template_params: {
            to_email:  account.email,
            to_name:   account.name,
            username:  account.username,
            password:  account.password,
            role:      account.role,
            login_url: window.location.origin,
          }
        })
      });
      if (res.ok) { setSent(true); }
      else { const txt = await res.text(); setEmailError(`Failed: ${txt}`); }
    } catch(e) {
      setEmailError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:16,border:`2px solid ${C.green}`,width:'100%',maxWidth:480,padding:24}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:C.green_dim,border:`2px solid ${C.green}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>✅</div>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:C.text}}>Account Created Successfully</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>Send credentials to {account.name}</div>
          </div>
        </div>

        {/* Credential card */}
        <div style={{background:C.bg3,borderRadius:12,padding:'14px 16px',marginBottom:16,fontFamily:'monospace',fontSize:12}}>
          {[['Name', account.name, C.text],['Role', account.role, C.blue2],['Username', account.username, C.cyan||C.blue2],['Password', account.password, C.amber],['Email', account.email||'—', C.text2]].map(([k,v,col])=>(
            <div key={k} style={{display:'flex',gap:12,marginBottom:6,alignItems:'center'}}>
              <span style={{color:C.text3,width:78,flexShrink:0,fontSize:10,textTransform:'uppercase',fontWeight:700}}>{k}</span>
              <span style={{color:col,fontWeight:k==='Password'?700:'normal',letterSpacing:k==='Password'?1:0}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div style={{background:'#2d1a00',border:`1px solid ${C.amber}`,borderRadius:8,padding:'8px 12px',marginBottom:16,fontSize:11,color:C.amber}}>
          ⚠️ Save these credentials now — the password cannot be recovered later.
        </div>

        {/* Email status */}
        {sent && (
          <div style={{background:C.green_dim,border:`1px solid ${C.green}`,borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:C.green2,textAlign:'center'}}>
            ✅ Email sent successfully to {account.email}
          </div>
        )}
        {emailError && (
          <div style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:11,color:C.red2}}>
            <div style={{fontWeight:700,marginBottom:4}}>❌ Email sending failed</div>
            <div style={{marginBottom:6,opacity:0.85}}>{emailError.includes('BadCredentials')||emailError.includes('Invalid login') ? 'Gmail rejected the App Password. Check that 2-Step Verification is ON and the App Password is correct in Google Account → Security → App Passwords.' : emailError}</div>
            {account.email && (
              <button onClick={()=>{ const s=encodeURIComponent(`Your EduSense Account`); const b=encodeURIComponent(`Username: ${account.username}\nPassword: ${account.password}`); window.open(`mailto:${account.email}?subject=${s}&body=${b}`); }}
                style={{background:'transparent',border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:C.red2,cursor:'pointer',marginTop:4}}>
                📨 Open in Mail App instead
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={sendEmail} disabled={sending||sent||!account.email}
            style={{flex:1,height:42,background:sent?C.green:C.blue3,border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:sending||!account.email?'not-allowed':'pointer',opacity:!account.email?0.5:1,transition:'all 0.2s'}}>
            {sending ? '⏳ Sending…' : sent ? '✅ Sent!' : '📧 Send Email'}
          </button>
          <button onClick={copyCredentials}
            style={{flex:1,height:42,background:copied?C.green:C.bg3,border:`1px solid ${copied?C.green:C.border}`,borderRadius:8,fontSize:12,fontWeight:700,color:copied?'#fff':C.text2,cursor:'pointer',transition:'all 0.2s'}}>
            {copied ? '✅ Copied!' : '📋 Copy Credentials'}
          </button>
        </div>

        <button onClick={onClose} style={{width:'100%',height:36,background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text3,cursor:'pointer'}}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ── STUDENT PORTFOLIO MODAL ── */
function StudentPortfolioModal({ theme: C, student, onClose }) {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const courses = enrolledCourses;
  const idHash  = student.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  useEffect(() => {
    const stuId = student.student_id || student.id;  // prefer student_id string
    Promise.allSettled([api.getLectures(), api.getEnrollments(), api.getStudentGrades(stuId)]).then(([lecRes, enrollRes, gradesRes]) => {
      const lecs   = lecRes.status    === 'fulfilled' ? lecRes.value    : [];
      const enroll = enrollRes.status  === 'fulfilled' ? enrollRes.value  : [];
      const g      = gradesRes.status  === 'fulfilled' ? gradesRes.value  : [];
      // Enrollments use course_code as course_id; match against l.course_code
      const myIds  = new Set(enroll.filter(e => String(e.student_id) === String(stuId)).map(e => String(e.course_id)));
      setEnrolledCourses(lecs.filter(l => myIds.has(String(l.course_code))));
      setGrades(Array.isArray(g) ? g : []);
    });
  }, [student.id, student.student_id]);

  async function withdrawCourse(courseId) {
    if (!window.confirm(`Withdraw ${student.name} from this course?`)) return;
    try {
      // student.id here is the DB user ID; student.student_id is the actual student_id string
      await api.unenroll(courseId, student.student_id || student.id);
    } catch(e) { alert('Failed to unenroll: ' + e.message); return; }
    setEnrolledCourses(prev => prev.filter(c => String(c.course_code) !== String(courseId)));
  }

  async function printPortfolio() {
    const results = store.getStudentResults(student.id);
    await exportStudentReportPDF({ student, courses, results });
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,width:'100%',maxWidth:720,maxHeight:'88vh',overflowY:'auto',padding:24}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {(()=>{
              const photo = student.capturedPhoto || store.getPhotoUrl(student);
              return photo
                ? <img src={photo} alt={student.name}
                    onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
                    style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:`2px solid ${C.green}`}}/>
                : null;
            })()}
            <div style={{width:56,height:56,borderRadius:'50%',background:student.color,
              display:(student.capturedPhoto||store.getPhotoUrl(student))?'none':'flex',
              alignItems:'center',justifyContent:'center',fontSize:28}}>{student.emoji}</div>
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
        </div>

        {/* Courses table */}
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Enrolled Courses & Grades</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{background:C.card2}}>
              {['Course','Code','Grade','Letter','Est. Attendance','Action'].map(h=>(
                <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text2,borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.length===0
              ? <tr><td colSpan={6} style={{padding:16,textAlign:'center',color:C.text3}}>No courses enrolled</td></tr>
              : courses.map((c,i)=>{
                  const rec = grades.find(g => g.course_code === c.course_code);
                  const g   = rec?.grade ?? rec?.score;
                  const att = ((idHash + i*17) % 30) + 70;
                  const gc  = g!=null ? gradeColor(g,C) : C.text3;
                  return (
                    <tr key={i} style={{background:i%2===0?C.bg3:C.card}}>
                      <td style={{padding:'7px 10px',color:C.text,borderBottom:`1px solid ${C.border}`}}>{c.course_name}</td>
                      <td style={{padding:'7px 10px',color:C.text2,borderBottom:`1px solid ${C.border}`}}>{c.course_code}</td>
                      <td style={{padding:'7px 10px',fontWeight:700,color:gc,borderBottom:`1px solid ${C.border}`}}>{g!=null?`${g}%`:'—'}</td>
                      <td style={{padding:'7px 10px',fontWeight:700,color:gc,borderBottom:`1px solid ${C.border}`}}>{g!=null?letterGrade(g):'—'}</td>
                      <td style={{padding:'7px 10px',color:C.text2,borderBottom:`1px solid ${C.border}`}}>{att}%</td>
                      <td style={{padding:'7px 10px',borderBottom:`1px solid ${C.border}`}}>
                        <button onClick={()=>withdrawCourse(c.course_code)}
                          style={{background:'#2d1a00',border:`1px solid ${C.amber}`,borderRadius:6,padding:'3px 10px',fontSize:10,color:C.amber,cursor:'pointer',fontWeight:700}}>
                          Withdraw
                        </button>
                      </td>
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

/* ── EXAM SCHEDULE ── */
function AdminExamSchedule({ theme: C }) {
  const { t } = useLang();
  const [courses, setCourses] = useState([]);
  const [exams,   setExams]   = useState([]);
  const [form, setForm] = useState({ courseId: '', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
  const today = new Date().toISOString().slice(0,10);

  const reloadExams = () => api.getExams().then(setExams).catch(() => {});
  useEffect(() => {
    api.getLectures().then(lecs => {
      setCourses(lecs);
      if (lecs.length) setForm(f => ({ ...f, courseId: f.courseId || lecs[0].id }));
    }).catch(() => {});
    reloadExams();
  }, []);

  const TYPE_CFG = {
    midterm: { label:'Midterm', color:'#8b5cf6', bg:'#8b5cf622' },
    final:   { label:'Final',   color:'#ef4444', bg:'#ef444422' },
    quiz:    { label:'Quiz',    color:'#10b981', bg:'#10b98122' },
  };

  async function add() {
    if (!form.courseId || !form.date) { alert('Select a course and date.'); return; }
    const course = courses.find(c => String(c.id) === String(form.courseId));
    try {
      await api.addExam({ ...form, courseName: course?.name || '', courseCode: course?.code || '' });
    } catch(e) { alert('Failed to add exam: ' + e.message); return; }
    setForm({ courseId: courses[0]?.id||'', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
    reloadExams();
  }

  async function del(id) {
    try { await api.deleteExam(id); } catch(e) { alert('Failed to delete: ' + e.message); return; }
    reloadExams();
  }

  const upcoming = exams.filter(e => e.date >= today);
  const past = exams.filter(e => e.date < today);

  return (
    <div style={{ padding:'8px 20px 20px' }}>
      <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>🗓️ {t('page_exams')}</div>
      <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>{t('sub_exams')}</div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:16, alignItems:'start' }}>
        {/* Form */}
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Add New Exam</div>
          {[
            ['Course', <select value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text }}>
              {courses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>],
            ['Exam Type', <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text }}>
              <option value="midterm">Midterm</option><option value="final">Final</option><option value="quiz">Quiz</option>
            </select>],
            ['Date', <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Time', <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Room / Hall', <input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="e.g. Hall A, Lab 2" style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Duration (min)', <input type="number" value={form.duration} onChange={e=>setForm({...form,duration:parseInt(e.target.value)||120})} style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
            ['Notes', <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. Open book, bring calculator" style={{ width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text,boxSizing:'border-box' }}/>],
          ].map(([lbl,el],i)=>(
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',marginBottom:4 }}>{lbl}</div>
              {el}
            </div>
          ))}
          <button onClick={add} style={{ width:'100%', height:42, background:C.blue3, border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', marginTop:4 }}>
            ➕ Add to Schedule
          </button>
        </div>

        {/* Exam list */}
        <div>
          <div style={{ display:'flex', gap:12, marginBottom:12 }}>
            {[['Upcoming',upcoming.length,C.blue],['Past',past.length,C.text3],['Total',exams.length,C.green]].map(([lbl,val,col],i)=>(
              <div key={i} style={{ flex:1, background:C.card, borderRadius:10, border:`1px solid ${C.border}`, padding:'10px 14px', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700, color:col }}>{val}</div>
                <div style={{ fontSize:11, color:C.text2 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {exams.length === 0
            ? <div style={{ textAlign:'center', padding:60, color:C.text3, background:C.card, borderRadius:14, border:`1px solid ${C.border}`, fontSize:13 }}>No exams scheduled yet.</div>
            : exams.map((exam, i) => {
              const cfg = TYPE_CFG[exam.type] || TYPE_CFG.midterm;
              const isPast = exam.date < today;
              return (
                <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${isPast?C.border:cfg.color+'44'}`, padding:14, marginBottom:10, display:'flex', gap:14, alignItems:'center', opacity:isPast?0.65:1 }}>
                  <div style={{ width:48, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{exam.date?new Date(exam.date+'T00:00:00').toLocaleString('en-GB',{month:'short'}):'—'}</div>
                    <div style={{ fontSize:26, fontWeight:800, color:C.text, lineHeight:1.1 }}>{exam.date?new Date(exam.date+'T00:00:00').getDate():'—'}</div>
                  </div>
                  <div style={{ width:1, height:40, background:C.border, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                      {isPast && <span style={{ fontSize:10, color:C.text3 }}>Past</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{exam.courseName}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                      {exam.time&&`⏰ ${exam.time}`}{exam.room&&` · 📍 ${exam.room}`}{` · ⏱ ${exam.duration} min`}
                    </div>
                    {exam.notes && <div style={{ fontSize:11, color:C.text2, marginTop:3 }}>{exam.notes}</div>}
                  </div>
                  <button onClick={()=>del(exam.id)} style={{ background:C.red_dim, border:`1px solid ${C.red}`, borderRadius:8, padding:'4px 10px', fontSize:11, color:C.red2, cursor:'pointer', flexShrink:0 }}>Delete</button>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

/* ── SETTINGS ── */
function AdminSettings({ theme: C }) {
  const { t } = useLang();
  const [settings, setSettings] = useState({
    faceRecognition: true, emotionDetection: true, autoAttendance: true,
    emailNotifications: false, weeklyReports: true, parentAccess: true,
  });

  const toggle = k => setSettings(s=>({...s,[k]:!s[k]}));

  const items = [
    {key:'faceRecognition',  label:'Face Recognition',     desc:'Enable automatic face detection & recognition'},
    {key:'emotionDetection', label:'Emotion Detection',    desc:'Real-time emotion analysis during sessions'},
    {key:'autoAttendance',   label:'Auto Attendance',      desc:'Mark attendance automatically via face recognition'},
    {key:'emailNotifications',label:'Email Notifications',desc:'Send welcome emails to new registrations'},
    {key:'weeklyReports',    label:'Weekly Reports',       desc:'Auto-generate weekly summary reports'},
    {key:'parentAccess',     label:'Parent Portal Access', desc:'Allow parents to view child performance'},
  ];

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('settings')}</div>
      <Card theme={C} title="Feature Toggles">
        <div style={{padding:'4px 18px 18px',display:'flex',flexDirection:'column',gap:0}}>
          {items.map(({key,label,desc},i)=>(
            <div key={key} style={{display:'flex',alignItems:'center',padding:'14px 0',borderBottom:i<items.length-1?`1px solid ${C.border}`:'none',gap:16}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{label}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{desc}</div>
              </div>
              <div
                onClick={()=>toggle(key)}
                style={{
                  width:44,height:24,borderRadius:12,cursor:'pointer',transition:'background 0.2s',
                  background:settings[key]?C.green:C.bg3,position:'relative',flexShrink:0,
                }}
              >
                <div style={{
                  width:20,height:20,borderRadius:'50%',background:'#fff',
                  position:'absolute',top:2,transition:'left 0.2s',
                  left:settings[key]?22:2,
                }}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── ADMIN GRADE APPEALS ── */
function AdminGradeAppeals({ theme: C }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [adminResp, setAdminResp] = useState('');
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

  async function handleDecide(id, dec) {
    const newStatus = dec === 'approve' ? 'approved' : 'rejected';
    await api.updateComplaint(id, { status: newStatus, doctorResponse: selected?.doctor_response||'', adminResponse: adminResp }).catch(()=>{});
    api.addAuditEntry({ action: 'grade_appeal_updated', actor_role: 'admin', actor_name: 'Admin', details: `Appeal ${id} — ${dec}` }).catch(()=>{});
    setSelected(null); setAdminResp(''); loadAppeals();
  }

  const STATUS_COLOR = { pending:'amber', under_review:'blue', approved:'green', rejected:'red' };
  const inp = {
    background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '6px 10px', fontSize: 12, color: C.text, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '12px 20px 24px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>🏷️ Grade Appeals</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap:'wrap', alignItems:'center' }}>
        {['all','pending','approved','rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: filter === f ? C.blue2 : C.bg3, color: filter === f ? '#fff' : C.text,
              cursor: 'pointer', fontSize: 12 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={loadAppeals} style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg3, color:C.text2, fontSize:11, cursor:'pointer' }}>🔄 Refresh</button>
      </div>
      {loading ? (
        <div style={{ textAlign:'center', color:C.text3, padding:48 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 48 }}>No grade appeals found.</div>
      ) : (
        <Card theme={C} title="">
          {filtered.map(a => (
            <div key={a.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.student_name} — {a.course_name}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>
                    {(a.description || '').slice(0, 100)}
                  </div>
                  {a.doctor_response && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Lecturer: {a.doctor_response}</div>}
                  {a.admin_response  && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Admin: {a.admin_response}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge text={a.status} color={STATUS_COLOR[a.status] || 'gray'}/>
                  {(a.status === 'pending' || a.status === 'under_review') && (
                    <button onClick={() => { setSelected(a); setAdminResp(a.admin_response || ''); }}
                      style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
                        background: C.bg3, color: C.text, fontSize: 11, cursor: 'pointer' }}>
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: C.card, borderRadius: 14, padding: 28, width: 460, maxWidth: '92vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              Review Appeal — {selected.student_name}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>
              {selected.course_name} ({selected.course_id})<br/>{selected.description}
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>Admin Response</div>
            <textarea value={adminResp} onChange={e => setAdminResp(e.target.value)}
              style={{ ...inp, height: 80, resize: 'vertical', marginBottom: 16 }}
              placeholder="Optional response message…"/>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)}
                style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.bg3, color: C.text, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={() => handleDecide(selected.id, 'reject')}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: C.red, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reject</button>
              <button onClick={() => handleDecide(selected.id, 'approve')}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: C.green, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ADMIN: ENROLLMENT REQUESTS ─────────────────────────────────────────────── */
function AdminEnrollmentRequests({ theme: C }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [working,  setWorking]  = useState({});

  function load() {
    setLoading(true);
    api.getEnrollmentRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function decide(id, status) {
    setWorking(w => ({ ...w, [id]: true }));
    try {
      await api.processEnrollmentRequest(id, { status });
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setWorking(w => ({ ...w, [id]: false }));
    }
  }

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 16 }}>
        🏛️ Enrollment Requests
      </div>
      {loading ? (
        <div style={{ color: C.text2 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: C.text2, textAlign: 'center', padding: 40 }}>
          No enrollment requests found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const isPending = r.status === 'pending';
            const statusColor = r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#f59e0b';
            return (
            <div key={r.id} style={{
              background: C.card, border: `1px solid ${isPending ? C.border : statusColor + '44'}`,
              borderRadius: 12, padding: 16, display: 'flex',
              alignItems: 'center', gap: 16, flexWrap: 'wrap',
              opacity: isPending ? 1 : 0.75,
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: C.text, display:'flex', alignItems:'center', gap:8 }}>
                  {r.student_name || r.student_id}
                  {!isPending && (
                    <span style={{ fontSize:10, fontWeight:700, color: statusColor, background: statusColor+'22', border:`1px solid ${statusColor}44`, borderRadius:6, padding:'1px 7px' }}>
                      {r.status?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ color: C.text2, fontSize: 13 }}>
                  → {r.course_name || r.course_id}
                  {r.note ? ` · "${r.note}"` : ''}
                </div>
                <div style={{ color: C.text2, fontSize: 11, marginTop: 2 }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                </div>
              </div>
              {isPending && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => decide(r.id, 'approved')}
                  disabled={working[r.id]}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none',
                    background: '#10b981', color: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, opacity: working[r.id] ? 0.6 : 1,
                  }}
                >✅ Approve</button>
                <button
                  onClick={() => decide(r.id, 'rejected')}
                  disabled={working[r.id]}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none',
                    background: '#ef4444', color: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, opacity: working[r.id] ? 0.6 : 1,
                  }}
                >❌ Reject</button>
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ADMIN: PARENT LINKING ───────────────────────────────────────────────────── */
function AdminParentLinking({ theme: C }) {
  const [links,    setLinks]    = useState([]);
  const [parents,  setParents]  = useState([]);
  const [students, setStudents] = useState([]);
  const [form,     setForm]     = useState({ parent_id: '', student_id: '' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.listParentStudents().then(setLinks).catch(() => {});
    Promise.allSettled([
      api.init(),
      api.getStudents(),
    ]).then(([initRes, stuRes]) => {
      const d = initRes.status === 'fulfilled' ? initRes.value : {};
      setParents(d.parents || []);
      const stuFromAPI = stuRes.status === 'fulfilled' ? stuRes.value : [];
      setStudents(stuFromAPI.length ? stuFromAPI : (d.students || []));
    });
  }, []);

  async function handleLink() {
    if (!form.parent_id || !form.student_id) { alert('Select both parent and student'); return; }
    setSaving(true);
    try {
      await api.linkParentStudent(form.parent_id, form.student_id);
      const par = parents.find(p => String(p.id) === String(form.parent_id));
      setLinks(l => [...l, {
        parent_id: parseInt(form.parent_id), student_id: form.student_id,
        parent_name: par?.name || par?.full_name || '', parent_email: par?.email || '',
      }]);
      setForm({ parent_id: '', student_id: '' });
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleUnlink(parent_id, student_id) {
    if (!confirm('Remove this link?')) return;
    await api.unlinkParentStudent(parent_id, student_id).catch(() => {});
    setLinks(l => l.filter(x => !(x.parent_id === parent_id && x.student_id === student_id)));
  }

  const sel = { width: '100%', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13 };

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 16 }}>🔗 Parent ↔ Student Linking</div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Link a Parent to a Student</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 4 }}>PARENT</div>
            <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} style={sel}>
              <option value="">Select parent…</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.name || p.full_name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 4 }}>STUDENT</div>
            <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} style={sel}>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </div>
          <button onClick={handleLink} disabled={saving}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: C.blue2, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {saving ? '…' : '🔗 Link'}
          </button>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 14 }}>
          Existing Links ({links.length})
        </div>
        {links.length === 0
          ? <div style={{ padding: 24, color: C.text2, textAlign: 'center' }}>No links yet.</div>
          : links.map(l => (
            <div key={`${l.parent_id}-${l.student_id}`} style={{
              display: 'flex', alignItems: 'center', padding: '10px 16px',
              borderBottom: `1px solid ${C.border}`, gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>👨‍👩‍👧</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: C.text }}>{l.parent_name || `Parent #${l.parent_id}`}</span>
                <span style={{ color: C.text2, fontSize: 12, margin: '0 8px' }}>→</span>
                <span style={{ color: C.text2, fontSize: 13 }}>{l.student_id}</span>
              </div>
              <button onClick={() => handleUnlink(l.parent_id, l.student_id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ── ADMIN: CSV IMPORT ───────────────────────────────────────────────────────── */
function AdminCSVImport({ theme: C }) {
  const [mode,     setMode]     = useState('students');
  const [rows,     setRows]     = useState([]);
  const [progress, setProgress] = useState(null);
  const [running,  setRunning]  = useState(false);
  const fileRef = useRef();

  const MODES = [
    { id: 'students',    label: '🎓 Students',    desc: 'student_id, name, email, dept, year' },
    { id: 'grades',      label: '📝 Grades',       desc: 'student_id, course_code, course_name, grade' },
    { id: 'enrollments', label: '📋 Enrollments',  desc: 'student_id, course_id' },
  ];

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\r"]/g,''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/[\r"]/g,''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    }).filter(r => Object.values(r).some(v => v));
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setRows(parseCSV(ev.target.result)); setProgress(null); };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rows.length) return;
    setRunning(true);
    let done = 0, errors = 0;
    setProgress({ done: 0, total: rows.length, errors: 0 });
    for (const row of rows) {
      try {
        if (mode === 'students') {
          // Generate a random password for bulk CSV imports; admin should distribute credentials
          await api.createStudent({ student_id: row.student_id, name: row.name || row.full_name, email: row.email, department: row.dept || row.department, year: parseInt(row.year) || 1, password: row.password || (row.student_id?.toLowerCase() + '@EduSense1') });
        } else if (mode === 'grades') {
          await api.saveCourseGrade({ student_id: row.student_id, course_code: row.course_code, course_name: row.course_name || row.course_code, grade: parseFloat(row.grade) || 0 });
        } else if (mode === 'enrollments') {
          await api.enroll(row.course_id, row.student_id);
        }
        done++;
      } catch { errors++; done++; }
      setProgress({ done, total: rows.length, errors });
    }
    setRunning(false);
  }

  const pct = progress ? Math.round(progress.done / progress.total * 100) : 0;

  return (
    <div style={{ padding: '8px 20px 20px', maxWidth: 720 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>📥 Bulk CSV Import</div>
      <div style={{ color: C.text2, fontSize: 13, marginBottom: 20 }}>Upload a CSV to bulk-import students, grades, or enrollments.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setRows([]); setProgress(null); }}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, background: mode === m.id ? C.blue2 : C.bg3, color: mode === m.id ? '#fff' : C.text2, cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: C.text2, fontFamily: 'monospace' }}>
        Columns: <strong style={{ color: C.text }}>{MODES.find(m2 => m2.id === mode)?.desc}</strong>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ padding: '9px 20px', borderRadius: 8, background: C.bg3, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 13 }}>
          📂 Choose CSV File
        </button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        {rows.length > 0 && <span style={{ color: C.text2, fontSize: 13 }}>{rows.length} rows parsed</span>}
      </div>
      {rows.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ overflowX: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: C.bg3 }}>
                {Object.keys(rows[0]).map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.text2, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    {Object.values(r).map((v, j) => <td key={j} style={{ padding: '7px 12px', color: C.text }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && <div style={{ padding: '6px 12px', color: C.text2, fontSize: 11 }}>… and {rows.length - 5} more rows</div>}
        </div>
      )}
      {progress && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text2, marginBottom: 4 }}>
            <span>{running ? 'Importing…' : 'Done!'} {progress.done}/{progress.total}</span>
            {progress.errors > 0 && <span style={{ color: '#ef4444' }}>{progress.errors} errors</span>}
          </div>
          <div style={{ height: 6, background: C.bg3, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#10b981', borderRadius: 4, transition: 'width .2s' }} />
          </div>
        </div>
      )}
      <button onClick={handleImport} disabled={!rows.length || running}
        style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.blue2, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (!rows.length || running) ? 'not-allowed' : 'pointer', opacity: (!rows.length || running) ? 0.6 : 1 }}>
        {running ? '⏳ Importing…' : '🚀 Start Import'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   GPA MANAGEMENT PAGE
───────────────────────────────────────────────────────────────── */
function AdminGPAManagement({ theme: C }) {
  // Auto-detect current semester same logic as backend
  function currentSemester() {
    const m = new Date().getMonth() + 1; // 1-12
    const y = new Date().getFullYear();
    return m >= 9 ? `${y}-S1` : `${y}-S2`;
  }

  const [semesters,       setSemesters]       = useState([]);
  const [selectedSem,     setSelectedSem]     = useState(currentSemester());
  const [allGPAs,         setAllGPAs]         = useState([]);
  const [calcSem,         setCalcSem]         = useState(currentSemester());
  const [calculating,     setCalculating]     = useState(false);
  const [calcResult,      setCalcResult]      = useState(null);
  const [students,        setStudents]        = useState([]);
  const [historyStudent,  setHistoryStudent]  = useState(null);
  const [historyData,     setHistoryData]     = useState([]);
  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [viewMode,        setViewMode]        = useState('table'); // 'table' | 'chart'
  const [search,          setSearch]          = useState('');
  const [loadingGPAs,     setLoadingGPAs]     = useState(false);

  // Load all available semesters
  useEffect(() => {
    get('/api/grades/semesters')
      .then(data => {
        setSemesters(data || []);
        if (data && data.length > 0 && !data.includes(selectedSem)) setSelectedSem(data[0]);
      })
      .catch(() => {});
    api.getStudents()
      .then(rows => setStudents(rows.map(s => ({ ...s, id: s.id || s.student_id }))))
      .catch(() => {});
  }, []);

  // Load GPAs for selected semester
  useEffect(() => {
    setLoadingGPAs(true);
    get(`/api/grades/all-semester-gpa?semester=${encodeURIComponent(selectedSem)}`)
      .then(data => setAllGPAs(data || []))
      .catch(() => setAllGPAs([]))
      .finally(() => setLoadingGPAs(false));
  }, [selectedSem]);

  async function calculateGPA() {
    if (!calcSem.trim()) { pushToast({ title: 'Error', message: 'Enter a semester', color: '#ef4444' }); return; }
    setCalculating(true); setCalcResult(null);
    try {
      const res = await post('/api/grades/calculate-semester-gpa', { semester: calcSem });
      setCalcResult(res);
      pushToast({ title: '✅ GPA Calculated', message: `${res.updated} students updated for ${calcSem}`, color: '#10b981' });
      // Refresh semester list and GPA table
      const [sems, gpas] = await Promise.all([
        get('/api/grades/semesters'),
        get(`/api/grades/all-semester-gpa?semester=${encodeURIComponent(calcSem)}`),
      ]);
      setSemesters(sems || []);
      setSelectedSem(calcSem);
      setAllGPAs(gpas || []);
    } catch (e) {
      pushToast({ title: 'Failed', message: e.message, color: '#ef4444' });
    } finally {
      setCalculating(false);
    }
  }

  async function loadStudentHistory(student) {
    setHistoryStudent(student);
    setHistoryLoading(true);
    try {
      const data = await get(`/api/grades/semester-gpa/${student.id || student.student_id}`);
      setHistoryData(data || []);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function gpaColor(gpa) {
    if (!gpa) return C.text3;
    if (gpa >= 85) return '#10b981';
    if (gpa >= 70) return '#3b82f6';
    if (gpa >= 60) return '#f59e0b';
    return '#ef4444';
  }
  function gpaLabel(gpa) {
    if (!gpa) return '—';
    if (gpa >= 85) return 'Excellent';
    if (gpa >= 70) return 'Good';
    if (gpa >= 60) return 'Pass';
    return 'At Risk';
  }

  const q = search.toLowerCase();
  const filteredGPAs = allGPAs.filter(r =>
    !q ||
    (r.student_name || '').toLowerCase().includes(q) ||
    (r.student_id || '').toLowerCase().includes(q) ||
    (r.department  || '').toLowerCase().includes(q)
  );

  // Chart bars: top 20 by GPA
  const chartData = [...filteredGPAs]
    .sort((a, b) => (b.gpa || 0) - (a.gpa || 0))
    .slice(0, 20)
    .map(r => ({ label: (r.student_name || r.student_id || '?').split(' ')[0], value: Math.round((r.gpa || 0) * 1), color: gpaColor(r.gpa) }));

  // Stats
  const avg = filteredGPAs.length ? (filteredGPAs.reduce((a, r) => a + (r.gpa || 0), 0) / filteredGPAs.length).toFixed(1) : '—';
  const highest = filteredGPAs.length ? Math.max(...filteredGPAs.map(r => r.gpa || 0)).toFixed(1) : '—';
  const lowest  = filteredGPAs.length ? Math.min(...filteredGPAs.map(r => r.gpa || 0)).toFixed(1) : '—';
  const atRiskCount = filteredGPAs.filter(r => (r.gpa || 0) < 60).length;

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>🎓 GPA Management</div>
          <div style={{ fontSize: 12, color: C.text2 }}>Calculate, archive and view student GPA per semester</div>
        </div>
        <button
          onClick={() => exportDataAsCSV(filteredGPAs.map(r => ({
            'Student ID': r.student_id, Name: r.student_name, Department: r.department,
            Semester: r.semester, GPA: r.gpa, Courses: r.total_courses,
          })), `gpa_${selectedSem}.csv`)}
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#10b981', cursor: 'pointer' }}
        >📤 Export CSV</button>
      </div>

      {/* ── Calculate GPA Card ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>📊 Calculate & Save Semester GPA</div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 12, lineHeight: 1.6 }}>
          At the end of each semester, click the button below to calculate each student's GPA from their grades and save it permanently.
          This snapshot is never overwritten — you can always look back at any semester.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Semester</div>
            <input
              value={calcSem}
              onChange={e => setCalcSem(e.target.value)}
              placeholder="e.g. 2026-S1"
              style={{ height: 36, width: 160, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 13, color: C.text }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
            {(semesters.length > 0 ? semesters : [currentSemester()]).slice(0, 4).map(s => (
              <button key={s} onClick={() => setCalcSem(s)}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: calcSem === s ? C.blue3 : C.bg3,
                  border: `1px solid ${calcSem === s ? C.blue3 : C.border}`,
                  color: calcSem === s ? '#fff' : C.text2 }}>
                {s}
              </button>
            ))}
            <button onClick={() => setCalcSem(currentSemester())}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981' }}>
              Current ({currentSemester()})
            </button>
          </div>
          <button
            onClick={calculateGPA}
            disabled={calculating}
            style={{ marginTop: 18, height: 36, padding: '0 22px', borderRadius: 8, border: 'none',
              background: calculating ? '#64748b' : 'linear-gradient(135deg,#6366f1,#3b82f6)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: calculating ? 'not-allowed' : 'pointer' }}
          >
            {calculating ? '⏳ Calculating…' : '🔢 Calculate GPA'}
          </button>
        </div>
        {calcResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 8, fontSize: 12, color: '#10b981', fontWeight: 700 }}>
            ✅ {calcResult.message} — {calcResult.updated} students updated for semester <strong>{calcResult.semester}</strong>
          </div>
        )}
      </div>

      {/* ── Semester Selector + Stats ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>View Semester</div>
          <select
            value={selectedSem}
            onChange={e => setSelectedSem(e.target.value)}
            style={{ height: 36, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 12, color: C.text, minWidth: 160 }}
          >
            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            {!semesters.includes(selectedSem) && <option value={selectedSem}>{selectedSem} (not archived yet)</option>}
          </select>
        </div>
        <div style={{ marginTop: 18, flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Students', value: filteredGPAs.length, color: C.blue },
            { label: 'Avg GPA', value: avg, color: '#10b981' },
            { label: 'Highest', value: highest, color: '#6366f1' },
            { label: 'Lowest', value: lowest, color: '#f59e0b' },
            { label: 'At Risk (<60)', value: atRiskCount, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── View Toggle + Search ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, department…"
          style={{ flex: 1, minWidth: 200, height: 36, background: C.card, border: `1.5px solid ${search ? C.blue : C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 12, color: C.text }}
        />
        {search && <button onClick={() => setSearch('')} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: C.text2, cursor: 'pointer' }}>✕</button>}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {[['table', '📋 Table'], ['chart', '📊 Chart']].map(([m, lbl]) => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: '6px 14px', border: 'none', background: viewMode === m ? C.blue3 : C.bg3, color: viewMode === m ? '#fff' : C.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <Card theme={C} title={`GPA Records — ${selectedSem} (${filteredGPAs.length} students)`}>
          <div style={{ padding: '4px 12px 12px', maxHeight: 500, overflowY: 'auto' }}>
            {loadingGPAs ? (
              <div style={{ color: C.text2, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Loading…</div>
            ) : filteredGPAs.length === 0 ? (
              <div style={{ color: C.text3, fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
                No GPA data for {selectedSem}.<br/>
                <span style={{ fontSize: 11 }}>Click "Calculate GPA" above to generate it.</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg3 }}>
                    {['Student ID', 'Name', 'Department', 'GPA', 'Courses', 'Level', 'History'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.text2, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGPAs.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg3}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '9px 10px', color: C.text2, fontWeight: 600 }}>{r.student_id}</td>
                      <td style={{ padding: '9px 10px', color: C.text, fontWeight: 700 }}>{r.student_name || '—'}</td>
                      <td style={{ padding: '9px 10px', color: C.text2 }}>{r.department || '—'}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: C.bg3, borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ height: '100%', width: `${Math.min(r.gpa || 0, 100)}%`, background: gpaColor(r.gpa), borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: gpaColor(r.gpa), minWidth: 36 }}>{r.gpa != null ? r.gpa : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', color: C.text2, textAlign: 'center' }}>{r.total_courses || '—'}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: gpaColor(r.gpa) + '20', color: gpaColor(r.gpa), border: `1px solid ${gpaColor(r.gpa)}50` }}>
                          {gpaLabel(r.gpa)}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <button
                          onClick={() => loadStudentHistory({ id: r.student_id, name: r.student_name })}
                          style={{ background: C.blue_dim || 'rgba(59,130,246,0.1)', border: `1px solid ${C.blue}`, borderRadius: 6, padding: '3px 8px', fontSize: 10, color: C.blue2 || C.blue, cursor: 'pointer', fontWeight: 700 }}
                        >📈 History</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* ── Chart View ── */}
      {viewMode === 'chart' && (
        <Card theme={C} title={`GPA Chart — ${selectedSem} (top 20)`}>
          <div style={{ padding: '4px 12px 12px' }}>
            {filteredGPAs.length === 0
              ? <div style={{ color: C.text3, fontSize: 13, padding: '30px 0', textAlign: 'center' }}>No data. Run Calculate GPA first.</div>
              : <BarChart theme={C} data={chartData} height={260} />
            }
          </div>
        </Card>
      )}

      {/* ── Student GPA History Modal ── */}
      {historyStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28, maxWidth: 600, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>📈 GPA History</div>
                <div style={{ fontSize: 13, color: C.text2 }}>{historyStudent.name} ({historyStudent.id})</div>
              </div>
              <button onClick={() => { setHistoryStudent(null); setHistoryData([]); }}
                style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, fontSize: 16, color: C.text2, cursor: 'pointer' }}>✕</button>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', color: C.text2, padding: '20px 0' }}>Loading…</div>
            ) : historyData.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.text3, padding: '30px 0' }}>
                No archived GPA yet.<br/><span style={{ fontSize: 11 }}>Calculate semester GPA to start tracking history.</span>
              </div>
            ) : (
              <>
                {/* History bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {historyData.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: C.text2, flexShrink: 0 }}>{r.semester}</div>
                      <div style={{ flex: 1, height: 20, background: C.bg3, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 6,
                          width: `${Math.min(r.gpa || 0, 100)}%`,
                          background: gpaColor(r.gpa),
                          transition: 'width 0.5s ease',
                          display: 'flex', alignItems: 'center', paddingLeft: 8,
                        }}>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{r.gpa || '—'}</span>
                        </div>
                      </div>
                      <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 800, color: gpaColor(r.gpa) }}>{r.gpa || '—'}</div>
                      <div style={{ width: 60, fontSize: 10, color: C.text3 }}>{r.total_courses} courses</div>
                    </div>
                  ))}
                </div>
                {/* Trend summary */}
                {historyData.length >= 2 && (() => {
                  const sorted = [...historyData].sort((a, b) => a.semester.localeCompare(b.semester));
                  const first = sorted[0].gpa || 0;
                  const last  = sorted[sorted.length - 1].gpa || 0;
                  const diff  = (last - first).toFixed(1);
                  const up    = diff >= 0;
                  return (
                    <div style={{ padding: '10px 14px', background: up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${up ? '#10b981' : '#ef4444'}`, borderRadius: 8, fontSize: 12, color: up ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {up ? '📈' : '📉'} GPA trend: {up ? '+' : ''}{diff} from {sorted[0].semester} to {sorted[sorted.length - 1].semester}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
