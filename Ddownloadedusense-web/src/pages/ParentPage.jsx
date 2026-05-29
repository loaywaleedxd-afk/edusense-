import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import AnimatedPage from '../components/AnimatedPage';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import store from '../dataStore';          // kept for store.emotionDist / store.trendData (demo charts)
import { EMOTION_ICONS } from '../theme';
import { get, api, getToken } from '../api.js';
import { pushToast } from '../components/NotificationToast';

const NAV = [
  {id:'overview',    icon:'📊', label:'Overview'},
  {id:'grades',      icon:'📝', label:'Grades'},
  {id:'attendance',  icon:'✅', label:'Attendance'},
  {id:'exams',       icon:'🗓️', label:'Exam Schedule'},
  {id:'alerts',      icon:'🔔', label:'Academic Alerts'},
  {id:'performance', icon:'📈', label:'Performance'},
  {id:'emotions',    icon:'😊', label:'Emotions'},
  {id:'schedule',    icon:'📅', label:'Schedule'},
  { section: 'New Features' },
  {id:'riskstatus',  icon:'🚨', label:'Child Risk Status'},
];

const PAGE_TITLES = {
  overview:'Child Overview', grades:'Grades', attendance:'Attendance',
  exams:'Exam Schedule', alerts:'Academic Alerts',
  performance:'Performance', emotions:'Emotions', schedule:'Schedule',
  riskstatus:'Child Risk Status',
};

function letterGrade(g){if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';}
function gradeColor(g,C){return g>=75?C.green:g>=50?C.amber:C.red;}

// ── GPA helpers ────────────────────────────────────────────────────────────
function gradeToGPA(g){if(g>=90)return 4.0;if(g>=85)return 3.7;if(g>=80)return 3.3;if(g>=75)return 3.0;if(g>=70)return 2.7;if(g>=65)return 2.3;if(g>=60)return 2.0;if(g>=55)return 1.7;if(g>=50)return 1.0;return 0.0;}
function calcGPAFrom(gradeVals){if(!gradeVals.length)return null;return+(gradeVals.reduce((a,b)=>a+gradeToGPA(b),0)/gradeVals.length).toFixed(2);}
function academicStanding(gpa){if(gpa===null)return'No Grades Yet';if(gpa>=3.5)return'Honors';if(gpa>=2.0)return'Good Standing';if(gpa>=1.0)return'Academic Warning';return'Academic Probation';}

export default function ParentPage({ theme: C, user, isDark, onToggleMode, onLogout, branding }) {
  const [page, setPage] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isRTL, t } = useLang();

  // ── Multi-child support ──────────────────────────────────────────────────
  const linkedIds = user.linkedStudentIds || [];
  const [linkedStudents,  setLinkedStudents]  = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    const ids = linkedIds.length > 0
      ? linkedIds
      : [user.studentId || user.student_id || ''].filter(Boolean);  // never use numeric DB user.id

    if (!ids.length) {
      // No IDs at all — stop spinner immediately and show "not linked" message
      setLoadingStudents(false);
      return;
    }

    setLoadingStudents(true);
    Promise.all(ids.map(id => api.getStudent(id).catch(() => null)))
      .then(results => {
        const students = results.filter(Boolean).map(s => ({
          id:             s.student_id,
          name:           s.name,
          email:          s.email || '',
          dept:           s.department || '',
          year:           s.year || 1,
          photo:          s.photo_path || null,
          emoji:          '👤',
          color:          '#8b5cf6',
          attendanceRate: s.attendance_rate || 75,
          gpa:            s.gpa || 0,
          engagement:     s.engagement || 70,
          attentionScore: s.attention_score || 70,
        }));
        setLinkedStudents(students);
        setLoadingStudents(false);
      })
      .catch(() => setLoadingStudents(false));
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedIdx, setSelectedIdx] = useState(0);
  const child = linkedStudents[selectedIdx] || linkedStudents[0];

  // ── Real-time WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !/^\d+$/.test(String(user.id))) return;
    const BASE_WS = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const ws = new WebSocket(`${BASE_WS}/ws/notifications/${user.id}?token=${encodeURIComponent(getToken() || '')}`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connected') return;
        pushToast({ title: msg.title, message: msg.message, color: msg.color || '#8b5cf6' });
      } catch {}
    };
    ws.onerror = () => {};
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, 30000);
    return () => { clearInterval(ping); ws.close(); };
  }, [user?.id]);

  const PARENT_PAGE_KEYS = {
    overview:'overview', grades:'page_grades', attendance:'page_attendance',
    exams:'page_exams', alerts:'alerts', performance:'page_performance',
    emotions:'page_emotions', schedule:'page_schedule', riskstatus:'child_risk',
  };
  const parentPageTitle = PARENT_PAGE_KEYS[page] ? t(PARENT_PAGE_KEYS[page]) : (PAGE_TITLES[page] || page);

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden', flexDirection: isRTL ? 'row-reverse' : 'row'}}>
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={setPage} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} branding={branding}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={parentPageTitle} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout} onMenuOpen={() => setMenuOpen(true)}/>
        {/* Read-only banner + child selector */}
        <div style={{background:'rgba(139,92,246,0.08)',borderBottom:`1px solid rgba(139,92,246,0.2)`,padding:'6px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0,flexWrap:'wrap'}}>
          <span style={{fontSize:13}}>👁️</span>
          <span style={{fontSize:11,color:'#a78bfa',fontWeight:600}}>
            Parent View — Read Only
          </span>
          {linkedStudents.length > 1 && (
            <>
              <span style={{color:'#a78bfa',fontSize:11}}>·</span>
              <span style={{fontSize:11,color:'#a78bfa'}}>Viewing:</span>
              <select
                value={selectedIdx}
                onChange={e => setSelectedIdx(Number(e.target.value))}
                style={{
                  background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)',
                  borderRadius:6, color:'#c4b5fd', fontSize:12, padding:'2px 8px', cursor:'pointer',
                }}
              >
                {linkedStudents.map((s, i) => (
                  <option key={s.id} value={i}>{s.name}</option>
                ))}
              </select>
            </>
          )}
          {linkedStudents.length <= 1 && child && (
            <span style={{fontSize:11,color:'#a78bfa'}}>· Monitoring {child?.name?.split(' ')[0]}'s academic progress</span>
          )}
        </div>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          {loadingStudents ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:12,color:C.text3}}>
              <div style={{fontSize:28}}>⏳</div>
              <div style={{fontSize:14}}>Loading student data…</div>
            </div>
          ) : !child ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:12,color:C.text3,textAlign:'center',padding:40}}>
              <div style={{fontSize:48}}>👨‍👩‍👧</div>
              <div style={{fontSize:16,fontWeight:700,color:C.text}}>No students linked to your account</div>
              <div style={{fontSize:13,color:C.text2,maxWidth:360,lineHeight:1.6}}>
                Ask your system administrator to link your child's student ID to your parent account.
              </div>
            </div>
          ) : (
            <AnimatedPage pageKey={page + (child?.id || '')}>
              {page==='overview'    && <ParentOverview    theme={C} child={child}/>}
              {page==='grades'      && <ParentGrades      theme={C} child={child}/>}
              {page==='attendance'  && <ParentAttendance  theme={C} child={child}/>}
              {page==='exams'       && <ParentExams       theme={C} child={child}/>}
              {page==='alerts'      && <ParentAlerts      theme={C} child={child}/>}
              {page==='performance' && <ParentPerformance theme={C} child={child}/>}
              {page==='emotions'    && <ParentEmotions    theme={C} child={child}/>}
              {page==='schedule'    && <ParentSchedule    theme={C} child={child}/>}
              {page==='riskstatus'  && <ParentChildRisk   theme={C} child={child}/>}
            </AnimatedPage>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function ParentOverview({ theme: C, child }) {
  const { t } = useLang();
  const [grades, setGrades] = useState([]);
  const [exams, setExams]   = useState([]);

  useEffect(() => {
    if (!child?.id) return;
    api.getStudentGrades(child.id).then(data => setGrades(data || [])).catch(() => {});
    api.getExams().then(data => setExams(data || [])).catch(() => {});
  }, [child?.id]);

  // Derived from grades
  const gradeVals    = grades.map(g => g.grade || 0);
  const avgG         = gradeVals.length ? +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1) : 0;
  const courseCodes  = new Set(grades.map(g => g.course_code));
  const uniqueCourses = [...new Map(grades.map(g => [g.course_code, g])).values()];
  const calcGPA      = calcGPAFrom(gradeVals);
  const standing     = academicStanding(calcGPA);

  const today        = new Date().toISOString().slice(0,10);
  const studentExams = exams.filter(e => !courseCodes.size || courseCodes.has(e.course_id));
  const upcoming     = studentExams.filter(e => (e.date||'') >= today).slice(0,3);

  const STANDING_CFG = {
    'Honors':            {color:'#10b981',bg:'#10b98115',icon:'🏆'},
    'Good Standing':     {color:'#3b82f6',bg:'#3b82f615',icon:'✅'},
    'Academic Warning':  {color:'#f59e0b',bg:'#f59e0b15',icon:'⚠️'},
    'Academic Probation':{color:'#ef4444',bg:'#ef444415',icon:'🚨'},
    'No Grades Yet':     {color:'#64748b',bg:'#64748b15',icon:'📋'},
  };
  const sc = STANDING_CFG[standing] || STANDING_CFG['No Grades Yet'];

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {/* Child profile */}
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:'16px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:20}}>
        <div style={{width:90,height:90,borderRadius:'50%',background:child.color||C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,flexShrink:0,overflow:'hidden',border:`3px solid ${child.color||C.blue}`}}>
          {child.photo
            ? <img src={child.photo} alt={child.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{display:child.photo?'none':'flex'}}>{child.emoji||'👤'}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{child.name}</div>
          <div style={{fontSize:12,color:C.text2,marginTop:2}}>{child.id} · {child.dept} · Year {child.year}</div>
          <div style={{fontSize:11,color:C.text3}}>{child.email}</div>
          {/* Standing badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:6,padding:'3px 12px',borderRadius:20,background:sc.bg,border:`1px solid ${sc.color}33`}}>
            <span style={{fontSize:13}}>{sc.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:sc.color}}>{standing}</span>
            {calcGPA!==null && <span style={{fontSize:11,color:sc.color,opacity:0.8}}>· GPA {calcGPA}</span>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['GPA',calcGPA??child.gpa,C.blue],['Attendance',`${child.attendanceRate}%`,C.green],['Avg Grade',`${avgG}%`,C.amber],['Courses',uniqueCourses.length,C.purple]].map(([l,v,col],i)=>(
            <div key={i} style={{textAlign:'center',background:C.bg3,borderRadius:10,padding:'8px 14px'}}>
              <div style={{fontSize:18,fontWeight:700,color:col}}>{v}</div>
              <div style={{fontSize:10,color:C.text3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        {/* Academic standing detail */}
        <div style={{background:sc.bg,borderRadius:14,border:`1px solid ${sc.color}44`,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',marginBottom:8}}>Academic Standing</div>
          <div style={{fontSize:18,fontWeight:700,color:sc.color,marginBottom:4}}>{sc.icon} {standing}</div>
          <div style={{fontSize:11,color:C.text2,lineHeight:1.5}}>
            {standing==='Honors'?'Outstanding! GPA 3.5+ — excellent work.':
             standing==='Good Standing'?'Meeting all academic requirements.':
             standing==='Academic Warning'?'GPA below 2.0. Academic advising recommended.':
             standing==='Academic Probation'?'Serious academic risk. Immediate action needed.':
             'No grades recorded yet this semester.'}
          </div>
        </div>

        {/* Upcoming exams */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',marginBottom:8}}>Upcoming Exams ({upcoming.length})</div>
          {upcoming.length===0
            ? <div style={{fontSize:12,color:C.text3,marginTop:8}}>No upcoming exams scheduled.</div>
            : upcoming.map((e,i)=>{
              const TYPE_COLOR={midterm:'#8b5cf6',final:'#ef4444',quiz:'#10b981'};
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:TYPE_COLOR[e.type]+'22',color:TYPE_COLOR[e.type]}}>{e.type}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text}}>{e.course_name}</div>
                    <div style={{fontSize:10,color:C.text3}}>{e.date}{e.room&&` · ${e.room}`}</div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Recent alerts — parent's own notifications */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',marginBottom:8}}>Recent Alerts</div>
          <div style={{fontSize:12,color:C.text3,marginTop:8}}>Check the Alerts tab for notifications.</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:'flex',gap:12}}>
        <StatCard theme={C} label="Attendance"  value={`${child.attendanceRate}%`}  sub="This semester"       icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Grade"   value={`${avgG||'—'}%`}             sub="All graded subjects" icon="📝" accent="blue"/>
        <StatCard theme={C} label="GPA"         value={calcGPA??'—'}               sub="Semester GPA"        icon="📈" accent="amber"/>
        <StatCard theme={C} label="Enrolled In" value={uniqueCourses.length}        sub="Active courses"      icon="📚" accent="purple"/>
      </div>
    </div>
  );
}

/* ── GRADES ── */
function ParentGrades({ theme: C, child }) {
  const { t } = useLang();
  const [grades, setGrades]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child?.id) return;
    setLoading(true);
    api.getStudentGrades(child.id)
      .then(data => { setGrades(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [child?.id]);

  if (loading) return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_grades')} — {child.name}</div>
      <div style={{textAlign:'center',paddingTop:60,color:C.text3}}>Loading grades…</div>
    </div>
  );

  if (!grades.length) return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_grades')} — {child.name}</div>
      <div style={{textAlign:'center',paddingTop:60}}>
        <div style={{fontSize:48}}>📝</div>
        <div style={{fontSize:16,fontWeight:700,color:C.text,marginTop:8}}>No grades available yet.</div>
        <div style={{fontSize:12,color:C.text3,marginTop:6}}>Grades will appear here once lecturers submit them.</div>
      </div>
    </div>
  );

  const gradeVals = grades.map(g => g.grade || 0);
  const avg       = +(gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length).toFixed(1);
  const passed    = gradeVals.filter(g=>g>=50).length;
  const highest   = Math.max(...gradeVals);
  const calcGPA   = calcGPAFrom(gradeVals);
  const standing  = academicStanding(calcGPA);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_grades')} — {child.name}</div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['Subjects Graded',grades.length,C.blue],['Average',`${avg}%`,C.amber],['Passed',passed,C.green],['Highest',`${highest}%`,C.purple]].map(([lbl,val,col],i)=>(
          <div key={i} style={{flex:1,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:col}}>{val}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:2}}>{lbl}</div>
          </div>
        ))}
        <div style={{flex:1,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 12px',textAlign:'center'}}>
          <div style={{fontSize:20,fontWeight:700,color:calcGPA>=2?C.green:C.red}}>{calcGPA??'—'}</div>
          <div style={{fontSize:11,color:C.text2,marginTop:2}}>Semester GPA</div>
          <div style={{fontSize:10,color:calcGPA>=3.5?'#10b981':calcGPA>=2?C.blue:C.red,marginTop:2,fontWeight:600}}>{standing}</div>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {grades.map((rec,i)=>{
          const g  = rec.grade || 0;
          const gc = gradeColor(g,C);
          return (
            <div key={i} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',overflow:'hidden'}}>
              <div style={{width:6,background:gc,flexShrink:0}}/>
              <div style={{flex:1,padding:'14px',display:'flex',alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{rec.course_name||rec.course_code} ({rec.course_code})</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{rec.doctor_name||'—'}</div>
                  {rec.date&&<div style={{fontSize:10,color:C.text3,marginTop:1}}>Posted: {rec.date}</div>}
                </div>
                <div style={{textAlign:'center',paddingRight:6}}>
                  <div style={{fontSize:28,fontWeight:700,color:gc}}>{g}%</div>
                  <div style={{fontSize:16,fontWeight:700,color:gc}}>{letterGrade(g)}</div>
                  <div style={{fontSize:11,color:g>=50?C.green:C.red}}>{g>=50?'✅ Pass':'❌ Fail'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ATTENDANCE ── */
function ParentAttendance({ theme: C, child }) {
  const { t } = useLang();
  const [attRecs, setAttRecs]         = useState([]);
  const [courseGrades, setCourseGrades] = useState([]);

  useEffect(() => {
    if (!child?.id) return;
    api.getStudentAttendance(child.id).then(data => setAttRecs(data || [])).catch(() => {});
    api.getStudentGrades(child.id).then(data => setCourseGrades(data || [])).catch(() => {});
  }, [child?.id]);

  const rate = child.attendanceRate || 0;

  // Unique enrolled courses derived from grade records
  const enrolledCourses = [...new Map(courseGrades.map(g => [g.course_code, g])).values()];

  // Group attendance records by course_code
  const attByCourse = {};
  for (const rec of attRecs) {
    const code = rec.course_code || rec.courseId || '';
    if (!attByCourse[code]) attByCourse[code] = [];
    attByCourse[code].push(rec);
  }

  const courseRows = enrolledCourses.map(g => {
    const recs    = attByCourse[g.course_code] || [];
    const present = recs.filter(r => r.status === 'present' || r.status === 'excused').length;
    const total   = recs.length || 0;
    const ratio   = total ? present / total : null;
    return {
      course:  `${g.course_name||g.course_code} (${g.course_code})`,
      weeks:   total ? `${present} / ${total}` : '— / —',
      time:    '—',
      method:  total > 0 ? '👤 Face Recognition' : '—',
      status:  ratio === null ? '—'
             : ratio >= 0.75 ? '✅ Good Standing'
             : ratio >= 0.5  ? '⚠️ At Risk'
             :                 '❌ Low Attendance',
    };
  });

  const recRows = attRecs.slice(0, 50).map(rec => {
    const cg = courseGrades.find(g => g.course_code === (rec.course_code || rec.courseId));
    return {
      course: cg?.course_name || rec.course_code || rec.courseId || '—',
      date:   rec.date   || '—',
      week:   rec.week   ? `Week ${rec.week}` : '—',
      time:   rec.time   || '—',
      method: rec.method || '—',
      status: rec.status === 'excused' ? '📄 Excused'
            : rec.status === 'absent'  ? '❌ Absent'
            :                           '✅ Present',
    };
  });

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('page_attendance')} — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>{t('sub_attendance')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label="Attendance Rate"  value={`${rate}%`}              sub="This semester"        icon="✅" accent="green"/>
        <StatCard theme={C} label="Courses Enrolled" value={enrolledCourses.length}   sub="Active enrollments"   icon="📚" accent="blue"/>
        <StatCard theme={C} label="Sessions Logged"  value={attRecs.length}           sub="Recorded by system"   icon="📊" accent="purple"/>
        <StatCard theme={C} label="Standing"         value={rate>=75?'Good':'At Risk'} sub={rate>=75?'Meeting requirement':'Below 75% threshold'} icon={rate>=75?'👍':'⚠️'} accent={rate>=75?'green':'red'}/>
      </div>

      {rate < 75 && (
        <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:12,padding:'12px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#ef4444'}}>Attendance Below Requirement</div>
            <div style={{fontSize:12,color:C.text2}}>Your child's attendance is {rate}%, below the 75% minimum. Please encourage regular attendance.</div>
          </div>
        </div>
      )}

      <Card theme={C} title="Per-Course Attendance Summary">
        <div style={{padding:'4px 12px 12px'}}>
          {courseRows.length>0
            ? <DataTable theme={C} columns={[
                {key:'course',label:'Course',width:220},{key:'weeks',label:'Sessions',width:120},
                {key:'time',label:'Time',width:80},{key:'method',label:'Method',width:140},
                {key:'status',label:'Status',width:140},
              ]} rows={courseRows}/>
            : <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>No course records yet.</div>
          }
        </div>
      </Card>

      {recRows.length>0 && (
        <Card theme={C} title={`Check-In Records (${attRecs.length})`} style={{marginTop:12}}>
          <div style={{padding:'4px 12px 12px'}}>
            <DataTable theme={C} columns={[
              {key:'course',label:'Course',width:200},{key:'date',label:'Date',width:100},
              {key:'week',label:'Week',width:80},{key:'time',label:'Time',width:80},
              {key:'method',label:'Method',width:140},{key:'status',label:'Status',width:120},
            ]} rows={recRows}/>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── EXAM SCHEDULE ── */
function ParentExams({ theme: C, child }) {
  const { t } = useLang();
  const [exams, setExams]           = useState([]);
  const [courseCodes, setCourseCodes] = useState(new Set());

  useEffect(() => {
    if (!child?.id) return;
    api.getStudentGrades(child.id)
      .then(data => setCourseCodes(new Set((data||[]).map(g => g.course_code))))
      .catch(() => {});
    api.getExams().then(data => setExams(data || [])).catch(() => {});
  }, [child?.id]);

  const today        = new Date().toISOString().slice(0,10);
  const studentExams = exams.filter(e => !courseCodes.size || courseCodes.has(e.course_id));
  const TYPE_CFG = {
    midterm:{label:'Midterm',color:'#8b5cf6',bg:'#8b5cf622'},
    final:  {label:'Final',  color:'#ef4444',bg:'#ef444422'},
    quiz:   {label:'Quiz',   color:'#10b981',bg:'#10b98122'},
  };
  const upcoming = studentExams.filter(e=>(e.date||'')>=today);
  const past     = studentExams.filter(e=>(e.date||'')<today);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('page_exams')} — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>{t('sub_exams')}</div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['Upcoming',upcoming.length,C.blue],['Past',past.length,C.text3],['Total',studentExams.length,C.green]].map(([lbl,val,col],i)=>(
          <div key={i} style={{flex:1,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:col}}>{val}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:2}}>{lbl}</div>
          </div>
        ))}
      </div>

      {studentExams.length===0
        ? <div style={{textAlign:'center',padding:60,color:C.text3}}>
            <div style={{fontSize:48,marginBottom:12}}>🗓️</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>No exams scheduled yet</div>
          </div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {studentExams.map((exam,i)=>{
              const cfg    = TYPE_CFG[exam.type]||TYPE_CFG.midterm;
              const isPast = (exam.date||'')<today;
              const isToday= exam.date===today;
              return (
                <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${isPast?C.border:cfg.color+'44'}`,padding:18,display:'flex',gap:16,alignItems:'center',opacity:isPast?0.65:1}}>
                  <div style={{width:56,textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:cfg.color}}>{exam.date?new Date(exam.date+'T00:00:00').toLocaleString('en-GB',{month:'short'}):'—'}</div>
                    <div style={{fontSize:28,fontWeight:800,color:C.text,lineHeight:1}}>{exam.date?new Date(exam.date+'T00:00:00').getDate():'—'}</div>
                  </div>
                  <div style={{width:1,height:48,background:C.border,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                      {isToday&&<span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,background:'#ef444422',color:'#ef4444'}}>TODAY</span>}
                      {isPast&&<span style={{fontSize:11,color:C.text3}}>Completed</span>}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{exam.course_name}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                      {exam.time&&`⏰ ${exam.time}`}{exam.room&&` · 📍 ${exam.room}`}{exam.duration&&` · ⏱ ${exam.duration} min`}
                    </div>
                    {exam.notes&&<div style={{fontSize:11,color:C.text2,marginTop:4}}>{exam.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

/* ── ACADEMIC ALERTS ── */
function ParentAlerts({ theme: C, child }) {
  const { t } = useLang();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.getNotifications().then(data => setNotifications(data || [])).catch(() => {});
  }, []);

  const KIND_ICON  = {attendance:'⚠️',grade:'📝',announcement:'📢',appeal:'📋',new_appeal:'📋',danger:'🚨',info:'ℹ️'};
  const KIND_COLOR = {
    attendance:  {bg:'rgba(245,158,11,0.1)', border:'#f59e0b44',text:'#f59e0b'},
    danger:      {bg:'rgba(239,68,68,0.08)', border:'#ef444444',text:'#ef4444'},
    grade:       {bg:'rgba(59,130,246,0.08)',border:'#3b82f644',text:'#3b82f6'},
    announcement:{bg:'rgba(139,92,246,0.08)',border:'#8b5cf644',text:'#8b5cf6'},
    appeal:      {bg:'rgba(16,185,129,0.08)',border:'#10b98144',text:'#10b981'},
  };

  const unread = notifications.filter(n => !(n.is_read || n.read)).length;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>{t('alerts')} — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>
        System notifications about your child's academic activity · {unread} unread
      </div>

      {notifications.length===0
        ? <div style={{textAlign:'center',padding:60,color:C.text3}}>
            <div style={{fontSize:48,marginBottom:12}}>🔔</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>No alerts yet</div>
            <div style={{fontSize:12,marginTop:4}}>Academic alerts will appear here.</div>
          </div>
        : notifications.map((a,i)=>{
          const kind   = a.type || 'info';
          const icon   = KIND_ICON[kind] || '🔔';
          const colCfg = KIND_COLOR[kind] || {bg:C.bg3,border:C.border,text:C.text2};
          const isRead = a.is_read || a.read;
          const timeStr=(()=>{try{return new Date(a.created_at||a.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return '';}})();
          return (
            <div key={i} style={{
              background:isRead?C.card:colCfg.bg,
              border:`1px solid ${isRead?C.border:colCfg.border}`,
              borderRadius:12,padding:16,marginBottom:10,
              display:'flex',gap:12,alignItems:'flex-start',
              opacity:isRead?0.7:1,
            }}>
              <span style={{fontSize:22,flexShrink:0,marginTop:2}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,flex:1}}>{a.title||a.message}</div>
                  {!isRead&&<span style={{width:8,height:8,borderRadius:'50%',background:colCfg.text,flexShrink:0}}/>}
                </div>
                <div style={{fontSize:12,color:C.text2,lineHeight:1.5,marginBottom:4}}>{a.message||a.body}</div>
                {timeStr&&<div style={{fontSize:10,color:C.text3}}>{timeStr}</div>}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

/* ── PERFORMANCE ── */
function ParentPerformance({ theme: C, child }) {
  const { t } = useLang();
  const [grades, setGrades]   = useState([]);
  const [attRecs, setAttRecs] = useState([]);

  useEffect(() => {
    if (!child?.id) return;
    api.getStudentGrades(child.id).then(data => setGrades(data || [])).catch(() => {});
    api.getStudentAttendance(child.id).then(data => setAttRecs(data || [])).catch(() => {});
  }, [child?.id]);

  // Build a map of course_code → attendance stats
  const attByCourse = {};
  for (const rec of attRecs) {
    const code = rec.course_code || '';
    if (!attByCourse[code]) attByCourse[code] = { present: 0, total: 0 };
    attByCourse[code].total++;
    if (rec.status === 'present' || rec.status === 'excused') attByCourse[code].present++;
  }

  const uniqueCourses = [...new Map(grades.map(g => [g.course_code, g])).values()];

  const rows = uniqueCourses.map(g => {
    const att     = attByCourse[g.course_code];
    const attPct  = att ? Math.round(att.present / att.total * 100) : child.attendanceRate || '—';
    const grade   = `${g.grade}% (${letterGrade(g.grade)})`;
    return {
      course:      `${g.course_name||g.course_code} (${g.course_code})`,
      attendance:  `${attPct}%`,
      engagement:  `${child.engagement||70}%`,
      attention:   `${child.attentionScore||70}%`,
      grade,
    };
  });

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_performance')} — {child.name}</div>
      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label="GPA"            value={child.gpa||'—'}              sub="Current semester" icon="📈" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement" value={`${child.engagement||70}%`}  sub="In class"         icon="🧠" accent="green"/>
        <StatCard theme={C} label="Attention"      value={`${child.attentionScore||70}%`} sub="Average"       icon="👁️" accent="purple"/>
        <StatCard theme={C} label="Attendance"     value={`${child.attendanceRate}%`}  sub="This semester"    icon="✅" accent="amber"/>
      </div>
      <Card theme={C} title="Performance per Course">
        <div style={{padding:'4px 12px 12px'}}>
          {rows.length===0
            ? <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>No grade records available yet.</div>
            : <DataTable theme={C} columns={[
                {key:'course',label:'Course',width:220},{key:'attendance',label:'Attendance',width:100},
                {key:'engagement',label:'Engagement',width:100},{key:'attention',label:'Attention',width:100},
                {key:'grade',label:'Grade',width:120},
              ]} rows={rows}/>
          }
        </div>
      </Card>
    </div>
  );
}

/* ── EMOTIONS ── */
function ParentEmotions({ theme: C, child }) {
  const { t } = useLang();
  const [emoDistLive, setEmoDistLive] = useState(null);
  const [trendSeries, setTrendSeries] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!child?.id) return;
    setLoading(true);

    const EMOTION_COLORS = {
      happy:'#10b981', neutral:'#3b82f6', surprised:'#f59e0b',
      angry:'#ef4444', sad:'#8b5cf6', fearful:'#ec4899', disgusted:'#64748b',
    };

    Promise.all([
      api.getEngagementOverview(child.id).catch(() => null),
      api.getTimeTrends(child.id).catch(() => null),
    ]).then(([emoRes, trendRes]) => {
      if (emoRes?.emotions) {
        const total = emoRes.total_records || 1;
        const dist = Object.entries(emoRes.emotions).map(([emotion, count]) => ({
          emotion, count,
          pct: Math.round(count / total * 100),
          color: EMOTION_COLORS[emotion] || '#64748b',
        }));
        if (dist.length) setEmoDistLive(dist);
      }
      if (trendRes && trendRes.length) {
        setTrendSeries({
          engagement: trendRes.map(r => Math.round((r.avg_engagement ?? 0) * 100)),
          attention:  trendRes.map(r => Math.round((r.avg_attention  ?? 0) * 100)),
          labels:     trendRes.map(r => r.date ? r.date.slice(5) : ''),
        });
      }
      setLoading(false);
    });
  }, [child?.id]);

  const ed = emoDistLive || store.emotionDist;
  const td = trendSeries  || store.trendData;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_emotions')} — {child.name}</div>

      {loading && (
        <div style={{textAlign:'center',padding:'40px 0',color:C.text3,fontSize:13}}>Loading emotion data…</div>
      )}

      {!loading && (
        <>
          {!emoDistLive && (
            <div style={{fontSize:11,color:C.text3,marginBottom:10,fontStyle:'italic'}}>
              No live emotion records available — showing demo data.
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <Card theme={C} title={`Emotion Frequency${emoDistLive ? ' (Live)' : ' — Demo'}`}>
              <div style={{padding:'4px 12px 12px'}}>
                <BarChart theme={C} data={ed.map(d=>({label:d.emotion,value:d.count,color:d.color}))} height={200}/>
              </div>
            </Card>
            <Card theme={C} title={`Emotion Distribution${emoDistLive ? ' (Live)' : ' — Demo'}`}>
              <div style={{padding:'4px 12px 12px',display:'flex',gap:12,alignItems:'center'}}>
                <DonutChart theme={C} data={ed.slice(0,5).map(d=>({label:d.emotion,value:d.count,color:d.color}))} size={150}/>
                <div>
                  {ed.slice(0,5).map((d,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{color:d.color,fontSize:12}}>●</span>
                      <span style={{fontSize:10,color:C.text2}}>{d.emotion} {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          <Card theme={C} title={`Weekly Engagement Trend${trendSeries ? ' (Live)' : ' — Demo'}`}>
            <div style={{padding:'4px 12px 12px'}}>
              <LineChart theme={C} series={[
                {label:'Engagement',data:td.engagement,color:C.blue},
                {label:'Attention', data:td.attention, color:C.green},
              ]} labels={td.labels} height={200}/>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── SCHEDULE ── */
function ParentSchedule({ theme: C, child }) {
  const { t } = useLang();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!child?.id) return;
    Promise.all([
      api.getStudentGrades(child.id).catch(() => []),
      api.getLectures().catch(() => []),
    ]).then(([gradesData, lecturesData]) => {
      const codes = new Set((gradesData||[]).map(g => g.course_code));
      const seen  = new Set();
      const list  = [];
      for (const l of (lecturesData||[])) {
        if (codes.has(l.course_code) && !seen.has(l.course_code)) {
          seen.add(l.course_code);
          list.push({
            id:         l.course_code,
            code:       l.course_code,
            name:       l.course_name,
            color:      l.color || '#3b82f6',
            room:       l.room || '—',
            time:       l.scheduled_at || '—',
            duration:   l.duration_min || 90,
            daysLabel:  l.days_label || '',
            doctorName: l.doctor_name || '—',
          });
        }
      }
      setCourses(list);
    });
  }, [child?.id]);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('page_schedule')} — {child.name}</div>
      <Card theme={C} title={`Enrolled Courses (${courses.length})`}>
        <div style={{padding:'4px 14px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {courses.length===0
            ? <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses.</div>
            : courses.map((course,i)=>(
                <div key={i} style={{background:C.bg3,borderRadius:10,display:'flex',overflow:'hidden'}}>
                  <div style={{width:5,background:course.color,flexShrink:0}}/>
                  <div style={{padding:'12px 14px',flex:1}}>
                    <div style={{fontSize:10,color:C.text3}}>{course.time} · {course.duration} min{course.daysLabel?` · ${course.daysLabel}`:''}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{course.name}</div>
                    <div style={{fontSize:10,color:C.text2}}>{course.room} · {course.code} · {course.doctorName}</div>
                  </div>
                  <div style={{padding:'12px 14px',display:'flex',alignItems:'center'}}>
                    <Badge text="Scheduled" color="amber" isDark/>
                  </div>
                </div>
              ))
          }
        </div>
      </Card>
    </div>
  );
}

/* ── CHILD RISK STATUS ── */
function ParentChildRisk({ theme: C, child }) {
  const { t } = useLang();
  const sid = child?.id || '';

  const [risk, setRisk]       = useState(null);
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    if (!sid) return;
    get(`/api/at-risk/student/${sid}`)
      .then(res => {
        if (res && res.risk_score !== undefined) {
          const det = typeof res.details === 'string'
            ? JSON.parse(res.details || '{}') : (res.details || {});
          setRisk({
            score:    res.risk_score,
            level:    res.risk_level,
            attRate:  det.attendance_rate  ?? child.attendanceRate ?? 75,
            avgGrade: det.avg_grade        ?? 85,
            negRate:  det.negative_emotion ?? 10,
            subRate:  det.submission_rate  ?? 100,
          });
          setFromAPI(true);
        }
      })
      .catch(() => {});
  }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps

  const LEVEL_META = {
    critical: { color: '#dc2626', bg: '#fef2f2', icon: '🚨', label: 'CRITICAL' },
    high:     { color: '#f97316', bg: '#fff7ed', icon: '⚠️',  label: 'HIGH' },
    medium:   { color: '#eab308', bg: '#fefce8', icon: '📊',  label: 'MEDIUM' },
    low:      { color: '#16a34a', bg: '#f0fdf4', icon: '✅',  label: 'LOW' },
  };

  if (!risk) {
    return (
      <div style={{padding:'8px 20px 20px'}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>🚨 {t('child_risk')}</div>
        <div style={{fontSize:12,color:C.text2,marginBottom:16}}>AI early-warning indicators for {child?.name}</div>
        <div style={{textAlign:'center',padding:60,color:C.text3}}>
          <div style={{fontSize:32,marginBottom:12}}>⏳</div>
          <div style={{fontSize:14,color:C.text}}>Loading risk assessment…</div>
          <div style={{fontSize:12,marginTop:6}}>Powered by the at-risk early-warning system.</div>
        </div>
      </div>
    );
  }

  const meta  = LEVEL_META[risk.level] || LEVEL_META.low;
  const fname = child?.name?.split(' ')[0] || 'Your child';

  const advice = {
    low:      `${fname} is on track. Keep up the great work!`,
    medium:   `Some areas need attention. Consider contacting ${fname}'s advisor.`,
    high:     `Important: ${fname} should meet with their academic advisor soon.`,
    critical: `🚨 Critical: Immediate action required. Contact the advisor today.`,
  }[risk.level];

  const items = [
    { label: '📅 Attendance Rate',   val: `${risk.attRate}%`,  ok: risk.attRate  >= 80 },
    { label: '📝 Average Grade',      val: `${risk.avgGrade}%`, ok: risk.avgGrade >= 70 },
    { label: '😔 Negative Emotions', val: `${risk.negRate}%`,  ok: risk.negRate  <  30 },
    { label: '📋 Submission Rate',    val: `${risk.subRate}%`,  ok: risk.subRate  >= 85 },
  ];

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>🚨 {t('child_risk')}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>
        AI early-warning indicators for {child?.name}
      </div>

      <div style={{textAlign:'right',marginBottom:12}}>
        <span style={{
          fontSize:10,fontWeight:700,borderRadius:20,padding:'3px 10px',
          background: fromAPI ? '#16a34a20' : '#f59e0b20',
          color:      fromAPI ? '#16a34a'   : '#92400e',
        }}>
          {fromAPI ? '🟢 Live from server' : '🟡 Estimated from local data'}
        </span>
      </div>

      <div style={{
        background:meta.bg, border:`2px solid ${meta.color}40`,
        borderRadius:16, padding:28, textAlign:'center', marginBottom:20, maxWidth:480,
      }}>
        <div style={{fontSize:48}}>{meta.icon}</div>
        <div style={{fontSize:32,fontWeight:900,color:meta.color,marginTop:8}}>{risk.score}/100</div>
        <div style={{fontSize:16,fontWeight:700,color:meta.color}}>{meta.label} RISK</div>
        <div style={{fontSize:12,color:'#64748b',marginTop:8,lineHeight:1.6}}>{advice}</div>
      </div>

      <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:20,maxWidth:480}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:14,letterSpacing:'0.05em'}}>
          PERFORMANCE BREAKDOWN
        </div>
        {items.map(item => (
          <div key={item.label} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'9px 12px', borderRadius:8, marginBottom:6,
            background: item.ok ? '#16a34a08' : '#dc262608',
          }}>
            <span style={{fontSize:12,color:C.text2}}>{item.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:item.ok?'#16a34a':'#dc2626'}}>
              {item.ok ? '✅' : '⚠️'} {item.val}
            </span>
          </div>
        ))}
        <div style={{marginTop:14,fontSize:11,color:C.text3,textAlign:'center'}}>
          Last checked: {new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
        </div>
      </div>

      {(risk.level === 'high' || risk.level === 'critical') && (
        <div style={{
          marginTop:16, maxWidth:480,
          background: risk.level==='critical'?'#fef2f2':'#fff7ed',
          border:`1px solid ${meta.color}44`, borderRadius:12, padding:'16px 20px',
        }}>
          <div style={{fontSize:13,fontWeight:700,color:meta.color,marginBottom:6}}>
            {meta.icon} What to do next
          </div>
          <ul style={{margin:0,padding:'0 0 0 18px',fontSize:12,color:'#374151',lineHeight:1.8}}>
            <li>Contact {fname}'s academic advisor to schedule a meeting</li>
            <li>Review {fname}'s attendance and encourage regular class attendance</li>
            <li>Check if any assignments or exams were missed</li>
            <li>Ask {fname} about any difficulties they may be experiencing</li>
          </ul>
        </div>
      )}
    </div>
  );
}
