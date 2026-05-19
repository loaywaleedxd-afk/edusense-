import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import store from '../dataStore';
import { EMOTION_ICONS } from '../theme';
import { get } from '../api.js';

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

export default function ParentPage({ theme: C, user, isDark, onToggleMode, onLogout }) {
  const [page, setPage] = useState('overview');
  const sid   = user.studentId || user.id || '';
  const child = store.getStudent(sid) || store.students[0];

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden'}}>
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={setPage}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={PAGE_TITLES[page]||page} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout}/>
        {/* Read-only banner */}
        <div style={{background:'rgba(139,92,246,0.08)',borderBottom:`1px solid rgba(139,92,246,0.2)`,padding:'6px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <span style={{fontSize:13}}>👁️</span>
          <span style={{fontSize:11,color:'#a78bfa',fontWeight:600}}>Parent View — Read Only · Monitoring {child?.name?.split(' ')[0]}'s academic progress</span>
        </div>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <div className="animate-in" key={page}>
            {page==='overview'    && <ParentOverview    theme={C} child={child}/>}
            {page==='grades'      && <ParentGrades      theme={C} child={child}/>}
            {page==='attendance'  && <ParentAttendance  theme={C} child={child}/>}
            {page==='exams'       && <ParentExams       theme={C} child={child}/>}
            {page==='alerts'      && <ParentAlerts      theme={C} child={child}/>}
            {page==='performance' && <ParentPerformance theme={C} child={child}/>}
            {page==='emotions'    && <ParentEmotions    theme={C} child={child}/>}
            {page==='schedule'    && <ParentSchedule    theme={C} child={child}/>}
            {page==='riskstatus'  && <ParentChildRisk   theme={C} child={child}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function ParentOverview({ theme: C, child }) {
  const results   = store.getStudentResults(child.id);
  const grades    = Object.values(results).map(r=>r.grade);
  const avgG      = grades.length ? +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1) : 0;
  const courses   = store.getStudentCourses(child.id);
  const standing  = store.getAcademicStanding(child.id);
  const calcGPA   = store.calculateSemesterGPA(child.id);
  const exams     = store.getStudentExams(child.id);
  const today     = new Date().toISOString().slice(0,10);
  const upcoming  = exams.filter(e=>e.date>=today).slice(0,3);
  const alerts    = (store.systemAlerts||[]).filter(a=>a.studentId===child.id&&!a.read).slice(0,4);

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
          {(child.capturedPhoto||store.getPhotoUrl(child))
            ? <img src={child.capturedPhoto||store.getPhotoUrl(child)} alt={child.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{display:(child.capturedPhoto||store.getPhotoUrl(child))?'none':'flex'}}>{child.emoji||'👤'}</span>
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
          {[['GPA',calcGPA??child.gpa,C.blue],['Attendance',`${child.attendanceRate}%`,C.green],['Avg Grade',`${avgG}%`,C.amber],['Courses',courses.length,C.purple]].map(([l,v,col],i)=>(
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
                    <div style={{fontSize:11,fontWeight:700,color:C.text}}>{e.courseName}</div>
                    <div style={{fontSize:10,color:C.text3}}>{e.date}{e.room&&` · ${e.room}`}</div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Recent alerts */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',marginBottom:8}}>Recent Alerts ({alerts.length} unread)</div>
          {alerts.length===0
            ? <div style={{fontSize:12,color:C.text3,marginTop:8}}>No unread alerts.</div>
            : alerts.map((a,i)=>{
              const ic={attendance:'⚠️',grade:'📝',announcement:'📢',appeal:'📋',danger:'🚨'}[a.alertKind||a.type]||'🔔';
              return (
                <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'flex-start'}}>
                  <span style={{fontSize:14,flexShrink:0}}>{ic}</span>
                  <div style={{fontSize:11,color:C.text2,lineHeight:1.4}}>{a.title}</div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:'flex',gap:12}}>
        <StatCard theme={C} label="Attendance"    value={`${child.attendanceRate}%`} sub="This semester"    icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Grade"     value={`${avgG||'—'}%`}            sub="All graded subjects" icon="📝" accent="blue"/>
        <StatCard theme={C} label="Engagement"    value={`${child.engagement}%`}     sub="In-class average"   icon="🧠" accent="amber"/>
        <StatCard theme={C} label="Enrolled In"   value={courses.length}             sub="Active courses"     icon="📚" accent="purple"/>
      </div>
    </div>
  );
}

/* ── GRADES ── */
function ParentGrades({ theme: C, child }) {
  const results = store.getStudentResults(child.id);
  const entries = Object.entries(results);
  const calcGPA = store.calculateSemesterGPA(child.id);
  const standing= store.getAcademicStanding(child.id);

  if(!entries.length) return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Grades — {child.name}</div>
      <div style={{textAlign:'center',paddingTop:60}}>
        <div style={{fontSize:48}}>📝</div>
        <div style={{fontSize:16,fontWeight:700,color:C.text,marginTop:8}}>No grades available yet.</div>
        <div style={{fontSize:12,color:C.text3,marginTop:6}}>Grades will appear here once lecturers submit them.</div>
      </div>
    </div>
  );

  const grades  = entries.map(([,v])=>v.grade);
  const avg     = +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
  const passed  = grades.filter(g=>g>=50).length;
  const highest = Math.max(...grades);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Grades — {child.name}</div>

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
        {entries.map(([cid,rec])=>{
          const g=rec.grade; const gc=gradeColor(g,C);
          const course=store.getCourse(cid);
          return (
            <div key={cid} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',overflow:'hidden'}}>
              <div style={{width:6,background:gc,flexShrink:0}}/>
              <div style={{flex:1,padding:'14px',display:'flex',alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{course?.name||cid} ({cid})</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{course?.doctorName||'—'}</div>
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
  const myCourses = store.getStudentCourses(child.id);
  const attRecs   = store.getStudentAttendance(child.id);
  const rate      = child.attendanceRate || 0;
  const idHash    = child.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  const courseRows = myCourses.map((course,i)=>{
    const recorded = Object.keys(store.getStudentCourseAttendance(child.id,course.id)).length;
    const weeks = recorded>0 ? recorded : Math.max(0,Math.min(16,Math.round(rate/100*16+((idHash+i*7)%5)-2)));
    return {
      course:`${course.name} (${course.code})`,weeks:`${weeks} / 16`,time:course.time,
      method:weeks>0?'👤 Face Recognition':'—',
      status:weeks>=12?'✅ Good Standing':weeks>=8?'⚠️ At Risk':'❌ Low Attendance',
    };
  });

  const recRows = attRecs.map(rec=>({
    course:store.getCourse(rec.courseId)?.name||rec.courseId,
    date:rec.date,week:`Week ${rec.week}`,time:rec.time,
    method:rec.method,status:rec.status==='excused'?'📄 Excused':'✅ Present',
  }));

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Attendance — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Your child's attendance records this semester</div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="Attendance Rate"  value={`${rate}%`}         sub="This semester"        icon="✅" accent="green"/>
        <StatCard theme={C} label="Courses Enrolled" value={myCourses.length}    sub="Active enrollments"   icon="📚" accent="blue"/>
        <StatCard theme={C} label="Sessions Logged"  value={attRecs.length}       sub="Recorded by system"   icon="📊" accent="purple"/>
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
                {key:'course',label:'Course',width:220},{key:'weeks',label:'Weeks Attended',width:120},
                {key:'time',label:'Time',width:80},{key:'method',label:'Method',width:140},
                {key:'status',label:'Status',width:140},
              ]} rows={courseRows}/>
            : <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses yet.</div>
          }
        </div>
      </Card>

      {recRows.length>0 && (
        <Card theme={C} title={`Check-In Records (${recRows.length})`} style={{marginTop:12}}>
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
  const exams = store.getStudentExams(child.id);
  const today = new Date().toISOString().slice(0,10);
  const TYPE_CFG = {
    midterm:{label:'Midterm',color:'#8b5cf6',bg:'#8b5cf622'},
    final:  {label:'Final',  color:'#ef4444',bg:'#ef444422'},
    quiz:   {label:'Quiz',   color:'#10b981',bg:'#10b98122'},
  };

  const upcoming = exams.filter(e=>e.date>=today);
  const past     = exams.filter(e=>e.date<today);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Exam Schedule — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>All scheduled exams for your child's enrolled courses</div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['Upcoming',upcoming.length,C.blue],['Past',past.length,C.text3],['Total',exams.length,C.green]].map(([lbl,val,col],i)=>(
          <div key={i} style={{flex:1,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:col}}>{val}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:2}}>{lbl}</div>
          </div>
        ))}
      </div>

      {exams.length===0
        ? <div style={{textAlign:'center',padding:60,color:C.text3}}>
            <div style={{fontSize:48,marginBottom:12}}>🗓️</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>No exams scheduled yet</div>
          </div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {exams.map((exam,i)=>{
              const cfg=TYPE_CFG[exam.type]||TYPE_CFG.midterm;
              const isPast=exam.date<today;
              const isToday=exam.date===today;
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
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{exam.courseName}</div>
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
  const allAlerts = (store.systemAlerts||[]).filter(a=>a.studentId===child.id);
  const unread    = allAlerts.filter(a=>!a.read).length;

  const KIND_ICON = {attendance:'⚠️',grade:'📝',announcement:'📢',appeal:'📋',new_appeal:'📋',danger:'🚨',info:'ℹ️'};
  const KIND_COLOR = {
    attendance:{bg:'rgba(245,158,11,0.1)',border:'#f59e0b44',text:'#f59e0b'},
    danger:    {bg:'rgba(239,68,68,0.08)',border:'#ef444444',text:'#ef4444'},
    grade:     {bg:'rgba(59,130,246,0.08)',border:'#3b82f644',text:'#3b82f6'},
    announcement:{bg:'rgba(139,92,246,0.08)',border:'#8b5cf644',text:'#8b5cf6'},
    appeal:    {bg:'rgba(16,185,129,0.08)',border:'#10b98144',text:'#10b981'},
  };

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Academic Alerts — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>
        System notifications about your child's academic activity · {unread} unread
      </div>

      {allAlerts.length===0
        ? <div style={{textAlign:'center',padding:60,color:C.text3}}>
            <div style={{fontSize:48,marginBottom:12}}>🔔</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>No alerts yet</div>
            <div style={{fontSize:12,marginTop:4}}>Academic alerts will appear here.</div>
          </div>
        : allAlerts.map((a,i)=>{
          const icon=KIND_ICON[a.alertKind||a.type]||'🔔';
          const colCfg=KIND_COLOR[a.alertKind]||KIND_COLOR[a.type]||{bg:C.bg3,border:C.border,text:C.text2};
          const timeStr=(()=>{ try{return new Date(a.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return '';} })();
          return (
            <div key={i} style={{
              background:a.read?C.card:colCfg.bg,
              border:`1px solid ${a.read?C.border:colCfg.border}`,
              borderRadius:12,padding:16,marginBottom:10,
              display:'flex',gap:12,alignItems:'flex-start',
              opacity:a.read?0.7:1,
            }}>
              <span style={{fontSize:22,flexShrink:0,marginTop:2}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,flex:1}}>{a.title}</div>
                  {!a.read&&<span style={{width:8,height:8,borderRadius:'50%',background:colCfg.text,flexShrink:0}}/>}
                </div>
                <div style={{fontSize:12,color:C.text2,lineHeight:1.5,marginBottom:4}}>{a.message}</div>
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
  const myCourses = store.getStudentCourses(child.id);
  const results   = store.getStudentResults(child.id);
  const idHash    = child.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  const rows = myCourses.map((course,i)=>{
    const rec  = results[course.id];
    const seed = (idHash+i*17)%100;
    const att  = `${Math.min(100,Math.max(50,child.attendanceRate+((seed%20)-10)))}%`;
    const eng  = `${Math.min(100,Math.max(30,child.engagement+((seed*3+7)%30)-15))}%`;
    const atn  = `${Math.min(100,Math.max(30,child.attentionScore+((seed*7+3)%28)-14))}%`;
    const grade = rec?`${rec.grade}% (${letterGrade(rec.grade)})`:'—';
    return {course:`${course.name} (${course.code})`,attendance:att,engagement:eng,attention:atn,grade};
  });

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Performance — {child.name}</div>
      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="GPA"            value={child.gpa}              sub="Current semester"    icon="📈" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement" value={`${child.engagement}%`} sub="In class"            icon="🧠" accent="green"/>
        <StatCard theme={C} label="Attention"      value={`${child.attentionScore}%`} sub="Average"        icon="👁️" accent="purple"/>
        <StatCard theme={C} label="Attendance"     value={`${child.attendanceRate}%`} sub="This semester"  icon="✅" accent="amber"/>
      </div>
      <Card theme={C} title="Performance per Course">
        <div style={{padding:'4px 12px 12px'}}>
          {rows.length===0
            ? <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses yet.</div>
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
  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Emotions — {child.name}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Card theme={C} title="Emotion Frequency">
          <div style={{padding:'4px 12px 12px'}}>
            <BarChart theme={C} data={store.emotionDist.map(d=>({label:d.emotion,value:d.count,color:d.color}))} height={200}/>
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
      <Card theme={C} title="Weekly Engagement Trend">
        <div style={{padding:'4px 12px 12px'}}>
          <LineChart theme={C} series={[
            {label:'Engagement',data:store.trendData.engagement,color:C.blue},
            {label:'Attention', data:store.trendData.attention, color:C.green},
          ]} labels={store.trendData.labels} height={200}/>
        </div>
      </Card>
    </div>
  );
}

/* ── SCHEDULE ── */
function ParentSchedule({ theme: C, child }) {
  const myCourses = store.getStudentCourses(child.id);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Schedule — {child.name}</div>
      <Card theme={C} title={`Enrolled Courses (${myCourses.length})`}>
        <div style={{padding:'4px 14px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {myCourses.length===0
            ? <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses.</div>
            : myCourses.map((course,i)=>{
                const lec=store.lectures.find(l=>l.code===course.code)||store.lectures[i%store.lectures.length];
                return (
                  <div key={i} style={{background:C.bg3,borderRadius:10,display:'flex',overflow:'hidden'}}>
                    <div style={{width:5,background:course.color,flexShrink:0}}/>
                    <div style={{padding:'12px 14px',flex:1}}>
                      <div style={{fontSize:10,color:C.text3}}>{course.time} · {course.duration} min{course.daysLabel?` · ${course.daysLabel}`:''}</div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{course.name}</div>
                      <div style={{fontSize:10,color:C.text2}}>{course.room} · {course.code} · {course.doctorName}</div>
                    </div>
                    <div style={{padding:'12px 14px',display:'flex',alignItems:'center'}}>
                      <Badge text={lec?.status?lec.status.replace(/^\w/,c=>c.toUpperCase()):'Scheduled'} color={{active:'green',scheduled:'amber',ended:'gray'}[lec?.status]||'amber'} isDark/>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </Card>
    </div>
  );
}

/* ── CHILD RISK STATUS ── */
function ParentChildRisk({ theme: C, child }) {
  const sid = child?.id || '';

  function calcRisk() {
    const grades   = (store.grades || []).filter(g => g.studentId === sid);
    const att      = store.getStudentAttendance?.(sid) || (store.attendance || []).filter(a => a.studentId === sid);
    const emotions = (store.emotions || []).filter(e => e.studentId === sid);
    const subs     = (store.submissions || []).filter(s => s.studentId === sid);
    const assigns  = store.assignments || [];

    const totalAtt   = att.length || 1;
    const presentAtt = att.filter(a => a.status === 'present').length;
    const attRate    = Math.round(presentAtt / totalAtt * 100);
    const avgGrade   = grades.length
      ? Math.round(grades.reduce((s, g) => s + (g.grade || g.score || 0), 0) / grades.length)
      : 85;
    const negEmotions = ['sad', 'bored', 'angry', 'disgust', 'fear'];
    const negRate = emotions.length
      ? Math.round(emotions.filter(e => negEmotions.includes(e.emotion)).length / emotions.length * 100)
      : 10;
    const subRate = assigns.length
      ? Math.round(subs.length / assigns.length * 100)
      : 100;

    const attFactor   = attRate  < 50 ? 30 : attRate  < 70 ? 20 : attRate  < 80 ? 10 : 0;
    const gradeFactor = avgGrade < 50 ? 30 : avgGrade < 60 ? 20 : avgGrade < 70 ? 10 : 0;
    const emFactor    = negRate  > 70 ? 20 : negRate  > 50 ? 12 : negRate  > 30 ?  6 : 0;
    const subFactor   = subRate  < 50 ? 20 : subRate  < 70 ? 12 : subRate  < 85 ?  6 : 0;
    const score       = attFactor + gradeFactor + emFactor + subFactor;
    const level       = score >= 60 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
    return { score, level, attRate, avgGrade, negRate, subRate };
  }

  const [risk, setRisk]     = useState(() => calcRisk());
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    get(`/api/at-risk/student/${sid}`)
      .then(res => {
        if (res && res.risk_score !== undefined) {
          const det = typeof res.details === 'string'
            ? JSON.parse(res.details || '{}') : (res.details || {});
          setRisk({
            score:    res.risk_score,
            level:    res.risk_level,
            attRate:  det.attendance_rate  ?? risk.attRate,
            avgGrade: det.avg_grade        ?? risk.avgGrade,
            negRate:  det.negative_emotion ?? risk.negRate,
            subRate:  det.submission_rate  ?? risk.subRate,
          });
          setFromAPI(true);
        }
      })
      .catch(() => {});
  }, [sid]);

  const LEVEL_META = {
    critical: { color: '#dc2626', bg: '#fef2f2', icon: '🚨', label: 'CRITICAL' },
    high:     { color: '#f97316', bg: '#fff7ed', icon: '⚠️',  label: 'HIGH' },
    medium:   { color: '#eab308', bg: '#fefce8', icon: '📊',  label: 'MEDIUM' },
    low:      { color: '#16a34a', bg: '#f0fdf4', icon: '✅',  label: 'LOW' },
  };
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
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>🚨 Child Risk Status</div>
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
