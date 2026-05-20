import { useState, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';
import AcademicCalendarPage from './AcademicCalendarPage';
import GraduationRoadmapPage from './GraduationRoadmapPage';
import FeeHistoryPage from './FeeHistoryPage';
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
import { DEPARTMENTS, TITLES } from '../theme';

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
];

const PAGE_TITLES = {
  dashboard:'Dashboard', analytics:'System Analytics', students:'Students',
  doctors:'Lecturers', courses:'Course Management', enrollments:'Enrollment Management',
  parents:'Parents Management', r_reports:'R Analysis Reports', settings:'Settings',
  appeals:'Appeals Management', registration:'Registration & Fees', examschedule:'Exam Schedule',
};

export default function AdminPage({ theme: C, user, isDark, onToggleMode, onLogout,
  onOpenProctoring, onOpenAdvising, onOpenAtRisk }) {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isRTL, t } = useLang();

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
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={handleNav} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={adminPageTitle} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout} onMenuOpen={() => setMenuOpen(true)}/>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <AnimatedPage pageKey={page}>
            {page==='dashboard'   && <AdminDashboard theme={C}/>}
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
          </AnimatedPage>
        </div>
      </div>
    </div>
  );
}

/* ── DASHBOARD ── */
function AdminDashboard({ theme: C }) {
  const { t } = useLang();
  const isMobile = useMobile();
  const depts      = ['Computer Science','Engineering','Mathematics','Physics','Data Science'];
  const deptShort  = ['CS','Engineering','Math','Physics','Data Sci'];
  const deptColors = [C.blue,C.purple,C.green,C.amber,C.cyan];
  const activeLectures = store.lectures.filter(l=>l.status==='active').length;
  const avgEng = store.students.length ? Math.round(store.students.reduce((a,s)=>a+s.engagement,0)/store.students.length) : 0;

  // Compute avg engagement per dept from real student data (seeded — deterministic)
  const deptEngData = depts.map((dept, i) => {
    const deptStudents = store.students.filter(s => s.dept === dept);
    const val = deptStudents.length
      ? Math.round(deptStudents.reduce((a,s)=>a+s.engagement,0)/deptStudents.length)
      : 55 + (i * 7) % 30;
    return { label: deptShort[i], value: val, color: deptColors[i] };
  });

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:24,fontWeight:700,color:C.text,marginBottom:4}}>{t('dashboard')}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>{t('doc_overview')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label={t('students')}      value={store.students.length} sub={t('enrolled_students')}  icon="🎓" accent="blue"/>
        <StatCard theme={C} label={t('doctors')}        value={store.doctors.length}  sub={t('live_session')}       icon="👨‍🏫" accent="purple"/>
        <StatCard theme={C} label={t('live_session')}   value={activeLectures}        sub={t('analytics')}          icon="📚" accent="green"/>
        <StatCard theme={C} label={t('avg_engagement')} value={`${avgEng}%`}          sub={t('analytics')}          icon="🧠" accent="amber"/>
        <StatCard theme={C} label={t('at_risk')}        value={store.getStudentsOnProbation().length} sub={t('academic_standing')} icon="🚨" accent="red"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',gap:12,marginBottom:12}}>
        <Card theme={C} title={t('engagement_dept')}>
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={deptEngData} height={210}/>
          </div>
        </Card>
        <Card theme={C} title={t('lectures_now')}>
          <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6}}>
            {store.lectures.slice(0,3).map((lec,i)=>(
              <div key={i} style={{background:C.bg3,borderRadius:8,display:'flex',overflow:'hidden'}}>
                <div style={{width:4,background:lec.color,flexShrink:0}}/>
                <div style={{padding:'8px 12px',flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{lec.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{lec.room} · {lec.time}</div>
                </div>
                <div style={{padding:'8px 12px',display:'flex',alignItems:'center'}}>
                  <Badge text={lec.status === 'active' ? t('session_active') : lec.status === 'scheduled' ? t('confirmed') : lec.status} color={{active:'green',scheduled:'amber',ended:'gray'}[lec.status]||'gray'}/>
                </div>
              </div>
            ))}
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
            <EmotionBarsWidget theme={C} data={store.emotionDist.slice(0,6)}/>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── ANALYTICS ── */
function AdminAnalytics({ theme: C }) {
  const { t } = useLang();
  const isMobile = useMobile();
  const totalEnrolled = store.courses.reduce((a,c)=>a+(store.courseEnrollments[c.id]||[]).length,0);
  const atRisk        = store.students.filter(s=>(s.attendanceRate||100)<65||(s.engagement||100)<40).length;
  const avgAtt        = store.students.length
    ? Math.round(store.students.reduce((a,s)=>a+(s.attendanceRate||0),0)/store.students.length)
    : 0;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('system_analytics')}</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <StatCard theme={C} label="Avg Attendance"   value={`${avgAtt}%`}           sub="Across all students"   icon="✅" accent="green"/>
        <StatCard theme={C} label="Total Enrollments" value={totalEnrolled.toLocaleString()} sub="Across all courses" icon="📋" accent="blue"/>
        <StatCard theme={C} label="At-Risk Students"  value={atRisk}                 sub="Attendance<65% or Eng<40%" icon="⚠️" accent="purple"/>
        <StatCard theme={C} label="Courses Running"   value={store.courses.length}   sub="This semester"        icon="📚" accent="amber"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12,marginBottom:12}}>
        <Card theme={C} title="Engagement Trend (All Departments)">
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label:'Engagement',data:store.trendData.engagement,color:C.blue},
              {label:'Attention', data:store.trendData.attention, color:C.green},
            ]} labels={store.trendData.labels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title="Emotion Distribution">
          <div style={{padding:'4px 12px 12px',display:'flex',gap:12,alignItems:'center'}}>
            <DonutChart theme={C} data={store.emotionDist.slice(0,5).map(d=>({label:d.emotion,value:d.count,color:d.color}))} size={150}/>
            <div>
              {store.emotionDist.slice(0,5).map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{color:d.color,fontSize:12}}>●</span>
                  <span style={{fontSize:10,color:C.text2}}>{d.emotion} {d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card theme={C} title="Attendance by Course">
        <div style={{padding:'4px 12px 12px'}}>
          <BarChart theme={C} data={store.courses.map((c,i)=>{
            const enrolled = store.getEnrolledStudents(c.id);
            const val = enrolled.length ? Math.round(enrolled.reduce((a,s)=>a+s.attendanceRate,0)/enrolled.length) : 70 + (i*11)%25;
            return {label:c.code,value:val,color:c.color};
          })} height={200}/>
        </div>
      </Card>

      {/* ── Department Comparison ── */}
      <DeptComparisonSection theme={C}/>
    </div>
  );
}

function DeptComparisonSection({ theme: C }) {
  const { t } = useLang();
  const depts      = ['Computer Science','Engineering','Mathematics','Physics','Data Science'];
  const deptShort  = ['CS','Eng','Math','Phys','Data Sci'];
  const deptColors = [C.blue,C.purple,C.green,C.amber,C.cyan];

  const metrics = depts.map((dept, i) => {
    const ds = store.students.filter(s => s.dept === dept);
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

  function importAll() {
    const accounts = [];
    rows.forEach(r => {
      const s = store.addStudent(r);
      const firstName = r.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'student';
      const username = `stu.${firstName}.${s.id.toLowerCase()}`;
      const password = generatePassword();
      store.addUser({ name: r.name, username, password, email: r.email, role: 'student', studentId: s.id });
      accounts.push({ name: r.name, username, password, id: s.id });
    });
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
  const [students, setStudents] = useState(store.students);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({name:'',dept:DEPARTMENTS[0],year:1,email:'',phone:''});
  const [selected, setSelected] = useState(null);
  const [portfolioStudent, setPortfolioStudent] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [, forceUpdate] = useState(0);

  const filtered = students.filter(s=>
    s.name.toLowerCase().includes(search.toLowerCase())||s.id.toLowerCase().includes(search.toLowerCase())
  );

  function addStudent() {
    if(!form.name.trim()) { alert('Name is required'); return; }
    const s = store.addStudent(form);
    const firstName = form.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'student';
    const username = `stu.${firstName}.${s.id.toLowerCase()}`;
    const password = generatePassword();
    store.addUser({ name: form.name, username, password, email: form.email, role: 'student', studentId: s.id });
    setCreatedAccount({ name: form.name, role: 'Student', username, password, email: form.email, id: s.id });
    setStudents([...store.students]);
    setShowAdd(false); setForm({name:'',dept:DEPARTMENTS[0],year:1,email:'',phone:''});
  }

  function deleteSelected() {
    if(!selected) { alert('Select a student first'); return; }
    if(!confirm(`Delete ${selected.name}?`)) return;
    store.deleteStudent(selected.id);
    setStudents([...store.students]); setSelected(null);
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {portfolioStudent && <StudentPortfolioModal theme={C} student={portfolioStudent} onClose={()=>setPortfolioStudent(null)}/>}
      {createdAccount && <CredentialsModal theme={C} account={createdAccount} onClose={()=>setCreatedAccount(null)}/>}
      {showImport && <BulkImportModal theme={C} onClose={()=>setShowImport(false)} onImported={()=>setStudents([...store.students])}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{t('students')} <span style={{ fontSize: 14, fontWeight: 400, color: C.text3 }}>({filtered.length} / {store.students.length})</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={deleteSelected} style={{ background: C.red_dim, border: `1px solid ${C.red}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, color: C.red2, cursor: 'pointer' }}>🗑️ Delete</button>
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
          placeholder={`Search ${store.students.length} students by name or ID…`}
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
                    const res = await fetch('http://localhost:8765/register', {
                      method: 'POST',
                      headers: {'Content-Type':'application/json'},
                      body: JSON.stringify({ student_id: selected.id, frame: dataUrl }),
                    });
                    const d = await res.json();
                    if (d.ok) alert(`✅ Face registered for ${selected.name} (${d.registered_total} total)`);
                    else alert(`⚠️ ${d.error}`);
                  } catch { alert('⚠️ Python server not running — start face_server.py'); }
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
  const [doctors, setDoctors] = useState(store.doctors);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:'',dept:DEPARTMENTS[0],title:TITLES[0],email:'',phone:''});
  const [selected, setSelected] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);

  function addDoctor() {
    if(!form.name.trim()) { alert('Name is required'); return; }
    const d = store.addDoctor(form);
    setDoctors([...store.doctors]); setShowAdd(false);
    const firstName = form.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g,'') || 'doctor';
    const username = `dr.${firstName}`;
    const password = generatePassword();
    store.addUser({ name: form.name, username, password, email: form.email, role: 'doctor', doctorId: d.id });
    setCreatedAccount({ name: form.name, role: 'Doctor / Lecturer', username, password, email: form.email, id: d.id });
    setForm({name:'',dept:DEPARTMENTS[0],title:TITLES[0],email:'',phone:''});
  }

  function deleteSelected() {
    if(!selected) { alert('Select a lecturer first'); return; }
    if(!confirm(`Delete ${selected.name}?`)) return;
    store.deleteDoctor(selected.id); setDoctors([...store.doctors]); setSelected(null);
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
          <div style={{display:'flex',gap:8}}>
            <button onClick={addDoctor} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Add Lecturer</button>
            <button onClick={()=>setShowAdd(false)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
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
                <div style={{fontSize:14,fontWeight:700,color:C.amber}}>{d.engagement}%</div>
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
  const [courses, setCourses]       = useState(store.courses);
  const [showAdd, setShowAdd]       = useState(false);
  const [weeksOpen, setWeeksOpen]   = useState(null); // courseId with weeks panel open
  const [form, setForm] = useState({name:'',code:'',room:'',time:'09:00',duration:90,doctorId:'',color:'#3b82f6',semester:'Fall 2024',days:[1,4],capacity:300});

  function addCourse() {
    if(!form.name.trim()||!form.code.trim()) { alert('Name and code required'); return; }
    if(!form.days.length) { alert('Select at least one lecture day'); return; }
    store.addCourse(form); setCourses([...store.courses]); setShowAdd(false);
    setForm({name:'',code:'',room:'',time:'09:00',duration:90,doctorId:'',color:'#3b82f6',semester:'Fall 2024',days:[1,4],capacity:300});
  }

  function toggleDay(d) {
    setForm(f => ({...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d].sort((a,b)=>a-b)}));
  }

  function deleteCourse(id) {
    if(!confirm('Delete this course?')) return;
    store.deleteCourse(id); setCourses([...store.courses]);
    if (weeksOpen === id) setWeeksOpen(null);
  }

  function toggleWeek(course, w) {
    const cur = course.weeks || Array.from({length:16},(_,k)=>k+1);
    const next = cur.includes(w) ? cur.filter(x=>x!==w) : [...cur, w].sort((a,b)=>a-b);
    store.updateCourse(course.id, { weeks: next });
    setCourses([...store.courses]);
  }

  function setAllWeeks(course, all) {
    const next = all ? Array.from({length:16},(_,k)=>k+1) : [];
    store.updateCourse(course.id, { weeks: next });
    setCourses([...store.courses]);
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>{t('courses')} ({courses.length})</div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.blue3,border:'none',borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>+ Add Course</button>
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
                {store.doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Time</div>
              <input value={form.time} onChange={e=>setForm({...form,time:e.target.value})} type="time"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Color</div>
              <input value={form.color} onChange={e=>setForm({...form,color:e.target.value})} type="color"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 4px',cursor:'pointer'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.text3,marginBottom:4,textTransform:'uppercase',fontWeight:700}}>Capacity</div>
              <input value={form.capacity} onChange={e=>setForm({...form,capacity:parseInt(e.target.value)||300})} type="number" min="1" max="1000"
                style={{width:'100%',height:36,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
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
          <div style={{display:'flex',gap:8}}>
            <button onClick={addCourse} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Add Course</button>
            <button onClick={()=>setShowAdd(false)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',fontSize:12,color:C.text2,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {courses.map((c,i)=>{
          const activeWeeks = c.weeks || Array.from({length:16},(_,k)=>k+1);
          const isOpen = weeksOpen === c.id;
          return (
            <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
              {/* Course row */}
              <div style={{display:'flex'}}>
                <div style={{width:6,background:c.color,flexShrink:0}}/>
                <div style={{padding:'14px 18px',flex:1,display:'flex',alignItems:'center',gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.name}</div>
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
                    <div style={{fontSize:13,fontWeight:700,color:store.isCourseFull(c.id)?C.red:C.text3}}>{c.capacity||'∞'}</div>
                    <div style={{fontSize:9,color:C.text3}}>Capacity</div>
                  </div>
                  {/* Weeks edit button */}
                  <button
                    onClick={()=>setWeeksOpen(isOpen ? null : c.id)}
                    style={{background: isOpen ? C.blue3 : C.bg3, border:`1px solid ${isOpen ? C.blue3 : C.border}`, borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:700, color: isOpen ? '#fff' : C.text2, cursor:'pointer'}}>
                    📅 Weeks
                  </button>
                  <button onClick={()=>deleteCourse(c.id)} style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:8,padding:'6px 10px',fontSize:10,color:C.red2,cursor:'pointer'}}>🗑️</button>
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
  const [selCourse, setSelCourse] = useState(store.courses[0]?.id||'');
  const [search, setSearch]       = useState('');
  const [, forceUpdate] = useState(0);

  const q          = search.toLowerCase();
  const filterList = list => q ? list.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.id||'').toLowerCase().includes(q)) : list;

  const enrolled   = filterList(selCourse ? store.getEnrolledStudents(selCourse)   : []);
  const unenrolled = filterList(selCourse ? store.getUnenrolledStudents(selCourse) : []);
  const totalEnrolled   = selCourse ? store.getEnrolledStudents(selCourse).length   : 0;
  const totalUnenrolled = selCourse ? store.getUnenrolledStudents(selCourse).length : 0;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>{t('enrollments')}</div>

      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {store.courses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          style={{flex:1,minWidth:180,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}
        />
        {search && <button onClick={()=>setSearch('')} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text2,cursor:'pointer'}}>✕ Clear</button>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Card theme={C} title={`Enrolled (${enrolled.length}${q ? ` of ${totalEnrolled}` : ''})`} accentColor={C.green}>
          <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6,maxHeight:400,overflowY:'auto'}}>
            {enrolled.map((s,i)=>{
              const photo = s.capturedPhoto || store.getPhotoUrl(s);
              return (
              <div key={i} style={{display:'flex',alignItems:'center',background:C.bg3,borderRadius:8,padding:'8px 10px',gap:10}}>
                {photo
                  ? <img src={photo} alt={s.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
                      style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                  : null}
                <div style={{width:32,height:32,borderRadius:'50%',background:s.color,display:photo?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id}</div>
                </div>
                <button onClick={()=>{store.unenrollStudent(selCourse,s.id);forceUpdate(n=>n+1);}}
                  style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:C.red2,cursor:'pointer'}}>Remove</button>
              </div>
              );
            })}
            {enrolled.length===0&&<div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No enrolled students</div>}
          </div>
        </Card>

        <Card theme={C} title={`Available to Enroll (${unenrolled.length}${q ? ` of ${totalUnenrolled}` : ''})`} accentColor={C.blue}>
          <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6,maxHeight:400,overflowY:'auto'}}>
            {unenrolled.map((s,i)=>{
              const photo = s.capturedPhoto || store.getPhotoUrl(s);
              return (
              <div key={i} style={{display:'flex',alignItems:'center',background:C.bg3,borderRadius:8,padding:'8px 10px',gap:10}}>
                {photo
                  ? <img src={photo} alt={s.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
                      style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                  : null}
                <div style={{width:32,height:32,borderRadius:'50%',background:s.color,display:photo?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id}</div>
                </div>
                {store.isCourseFull(selCourse) || store.isOnWaitlist(selCourse,s.id)
                  ? <button onClick={()=>{store.joinWaitlist(selCourse,s.id);forceUpdate(n=>n+1);}}
                      disabled={store.isOnWaitlist(selCourse,s.id)}
                      style={{background:C.red_dim,border:`1px solid ${C.amber}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:C.amber,cursor:'pointer',opacity:store.isOnWaitlist(selCourse,s.id)?0.5:1}}>
                      {store.isOnWaitlist(selCourse,s.id)?'Waitlisted':'+ Waitlist'}
                    </button>
                  : <button onClick={()=>{store.enrollStudent(selCourse,s.id);forceUpdate(n=>n+1);}}
                      style={{background:C.green_dim,border:`1px solid ${C.green}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:C.green2,cursor:'pointer'}}>Enroll</button>
                }
              </div>
              );
            })}
            {unenrolled.length===0&&<div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>All students enrolled</div>}
          </div>
        </Card>
      </div>

      {/* Waitlist */}
      {(() => {
        const waitlist = store.getWaitlist(selCourse);
        if (!waitlist.length) return null;
        return (
          <Card theme={C} title={`Waitlist (${waitlist.length})`} accentColor={C.amber} style={{marginTop:12}}>
            <div style={{padding:'4px 12px 12px',display:'flex',flexDirection:'column',gap:6}}>
              {waitlist.map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',background:C.bg3,borderRadius:8,padding:'8px 10px',gap:10}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:C.amber,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.text3}}>{s.id}</div>
                  </div>
                  <button onClick={()=>{store.promoteFromWaitlist(selCourse);forceUpdate(n=>n+1);}}
                    style={{background:C.green_dim,border:`1px solid ${C.green}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:C.green2,cursor:'pointer'}}>
                    ↑ Promote
                  </button>
                  <button onClick={()=>{store.removeFromWaitlist(selCourse,s.id);forceUpdate(n=>n+1);}}
                    style={{background:C.red_dim,border:`1px solid ${C.red}`,borderRadius:6,padding:'4px 8px',fontSize:10,color:C.red2,cursor:'pointer'}}>
                    Remove
                  </button>
                </div>
              ))}
              <button onClick={()=>{store.promoteFromWaitlist(selCourse);forceUpdate(n=>n+1);}}
                style={{background:C.green,border:'none',borderRadius:8,padding:'8px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',marginTop:4}}>
                ↑ Promote Next Person
              </button>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

/* ── ADMIN APPEALS ── */
function AdminAppeals({ theme: C }) {
  const { t } = useLang();
  const [complaints, setComplaints] = useState(store.getAllComplaints());
  const [filter, setFilter] = useState('all');
  const [response, setResponse] = useState({});

  function resolve(id) {
    const text = response[id]?.trim();
    store.updateComplaint(id, { status:'resolved', adminResponse: text||'Reviewed and resolved by admin.' });
    setComplaints(store.getAllComplaints());
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
  const [reg, setReg] = useState(store.getRegistrationStatus());
  const [search, setSearch]   = useState('');
  const [, forceUpdate] = useState(0);

  function toggleReg() {
    store.setRegistrationStatus({ open: !reg.open });
    setReg({ ...store.getRegistrationStatus() });
  }

  function toggleFee(studentId) {
    const current = store.getStudentFeeStatus(studentId);
    store.setStudentFeeStatus(studentId, { paid: !current.paid });
    forceUpdate(n=>n+1);
  }

  const q = search.toLowerCase();
  const students = q ? store.students.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.id||'').toLowerCase().includes(q)) : store.students;

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
            <input value={reg.semester} onChange={e=>{store.setRegistrationStatus({semester:e.target.value});setReg({...store.getRegistrationStatus()});}}
              style={{width:'100%',height:34,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 10px',fontSize:12,color:C.text}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',fontWeight:700,marginBottom:4}}>Deadline</div>
            <input type="date" value={reg.deadline} onChange={e=>{store.setRegistrationStatus({deadline:e.target.value});setReg({...store.getRegistrationStatus()});}}
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
            const fee = store.getStudentFeeStatus(s.id);
            return (
              <div key={i} style={{display:'flex',alignItems:'center',background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:'10px 14px',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{s.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id} · {s.dept}</div>
                </div>
                <Badge text={fee.paid?'Paid':'Unpaid'} color={fee.paid?'green':'red'} isDark/>
                <button onClick={()=>toggleFee(s.id)}
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
  const [form, setForm] = useState({name:'',username:'',password:'demo123',email:'',studentId:''});
  const [parents, setParents] = useState(store.users.filter(u=>u.role==='parent'));
  const [createdAccount, setCreatedAccount] = useState(null);
  const [, forceUpdate] = useState(0);

  function addParent() {
    if(!form.name.trim()||!form.username.trim()) { alert('Name and username required'); return; }
    store.addUser({...form, role:'parent'});
    setCreatedAccount({ name: form.name, role: 'Parent', username: form.username, password: form.password, email: form.email, id: form.studentId||null });
    setParents(store.users.filter(u=>u.role==='parent'));
    setShowAdd(false); setForm({name:'',username:'',password:'demo123',email:'',studentId:''});
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
        R detected at <code style={{ fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>C:\Program Files\R\R-4.6.0\bin\Rscript.exe</code>
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
          service_id:  'service_it50w6l',
          template_id: 'template_n1v9mtb',
          user_id:     '3nrjXvpxGXf0G01Xj',
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
  const [enrolledCourses, setEnrolledCourses] = useState(store.getStudentCourses(student.id));
  const courses = enrolledCourses;
  const idHash  = student.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  function withdrawCourse(courseId) {
    if (!window.confirm(`Withdraw ${student.name} from this course?`)) return;
    store.unenrollStudent(courseId, student.id);
    setEnrolledCourses(store.getStudentCourses(student.id));
  }

  function printPortfolio() {
    const courseRows = courses.map((c,i) => {
      const rec = store.getCourseResults(c.id)[student.id];
      const g   = rec?.grade;
      const att = ((idHash + i*17) % 30) + 70;
      return `<tr>
        <td>${c.name}</td><td>${c.code}</td>
        <td style="font-weight:700">${g!=null?g+'%':'—'}</td>
        <td style="font-weight:700">${g!=null?letterGrade(g):'—'}</td>
        <td>${att}%</td>
      </tr>`;
    }).join('');

    const rawPhoto = student.capturedPhoto || store.getPhotoUrl(student);
    const photoSrc = rawPhoto
      ? (rawPhoto.startsWith('data:') ? rawPhoto : `${window.location.origin}${rawPhoto}`)
      : null;
    const photoHtml = photoSrc
      ? `<img src="${photoSrc}" alt="${student.name}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #1e40af;margin-right:20px;flex-shrink:0"/>`
      : `<div style="width:90px;height:90px;border-radius:50%;background:${student.color||'#1e40af'};display:flex;align-items:center;justify-content:center;font-size:40px;margin-right:20px;flex-shrink:0">${student.emoji||'🎓'}</div>`;

    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Portfolio — ${student.name}</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
  .header{display:flex;align-items:center;margin-bottom:16px}
  h1{color:#1e40af;margin:0 0 4px;font-size:22px}
  .sub{color:#64748b;font-size:13px}
  .stats{display:flex;gap:16px;margin:16px 0}
  .stat{background:#f1f5f9;border-radius:8px;padding:12px 20px;text-align:center}
  .sv{font-size:22px;font-weight:700;color:#1e40af}
  .sl{font-size:11px;color:#64748b;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#1e40af;color:#fff;padding:10px 12px;text-align:left;font-size:12px}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}
  tr:nth-child(even){background:#f8fafc}
  .footer{color:#94a3b8;font-size:11px;margin-top:24px;text-align:right}
  @media print{button{display:none}}
</style></head><body>
<div class="header">
  ${photoHtml}
  <div>
    <h1>${student.name} — Academic Portfolio</h1>
    <div class="sub">${student.id} · ${student.dept} · Year ${student.year}</div>
    <p style="margin:6px 0 0;font-size:13px;color:#475569">📧 ${student.email||'—'} &nbsp; 📞 ${student.phone||'—'}</p>
  </div>
</div>
<div class="stats">
  <div class="stat"><div class="sv">${student.gpa}</div><div class="sl">GPA</div></div>
  <div class="stat"><div class="sv">${student.attendanceRate}%</div><div class="sl">Attendance</div></div>
  <div class="stat"><div class="sv">${student.engagement}%</div><div class="sl">Engagement</div></div>
  <div class="stat"><div class="sv">${student.attentionScore}%</div><div class="sl">Attention</div></div>
</div>
<h3>Course Grades</h3>
<table>
  <thead><tr><th>Course</th><th>Code</th><th>Grade</th><th>Letter</th><th>Attendance</th></tr></thead>
  <tbody>${courseRows||'<tr><td colspan="5" style="text-align:center;color:#94a3b8">No courses enrolled</td></tr>'}</tbody>
</table>
<div class="footer">Generated ${new Date().toLocaleDateString()} · UsenseLab Academic System</div>
<script>window.onload=()=>window.print();</script>
</body></html>`);
    win.document.close();
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
                  const rec = store.getCourseResults(c.id)[student.id];
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
                      <td style={{padding:'7px 10px',borderBottom:`1px solid ${C.border}`}}>
                        <button onClick={()=>withdrawCourse(c.id)}
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
  const [form, setForm] = useState({ courseId: store.courses[0]?.id||'', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
  const [, refresh] = useState(0);
  const exams = store.getAllExams();
  const today = new Date().toISOString().slice(0,10);

  const TYPE_CFG = {
    midterm: { label:'Midterm', color:'#8b5cf6', bg:'#8b5cf622' },
    final:   { label:'Final',   color:'#ef4444', bg:'#ef444422' },
    quiz:    { label:'Quiz',    color:'#10b981', bg:'#10b98122' },
  };

  function add() {
    if (!form.courseId || !form.date) { alert('Select a course and date.'); return; }
    store.addExam(form);
    setForm({ courseId: store.courses[0]?.id||'', type:'midterm', date:'', time:'', room:'', duration:120, notes:'' });
    refresh(n => n+1);
  }

  function del(id) { store.deleteExam(id); refresh(n => n+1); }

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
              {store.courses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
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
