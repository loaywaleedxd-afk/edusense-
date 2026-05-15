import { useState } from 'react';
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

const NAV = [
  {id:'overview',    icon:'📊', label:'Overview'},
  {id:'attendance',  icon:'✅', label:'Attendance'},
  {id:'emotions',    icon:'😊', label:'Emotions'},
  {id:'performance', icon:'📈', label:'Performance'},
  {id:'grades',      icon:'📝', label:'Child Grades'},
  {id:'schedule',    icon:'📅', label:'Schedule'},
];

const PAGE_TITLES = {
  overview:'Child Overview', attendance:'Attendance', emotions:'Emotions',
  performance:'Performance', grades:'Child Grades', schedule:'Schedule',
};

function letterGrade(g){if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';}
function gradeColor(g,C){return g>=75?C.green:g>=50?C.amber:C.red;}

export default function ParentPage({ theme: C, user, isDark, onToggleMode, onLogout }) {
  const [page, setPage] = useState('overview');

  // Resolve linked child
  const sid = user.studentId || user.id || '';
  const child = store.getStudent(sid) || store.students[0];

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden'}}>
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={setPage}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={PAGE_TITLES[page]||page} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout}/>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <div className="animate-in" key={page}>
            {page==='overview'    && <ParentOverview theme={C} child={child}/>}
            {page==='attendance'  && <ParentAttendance theme={C} child={child}/>}
            {page==='emotions'    && <ParentEmotions theme={C} child={child}/>}
            {page==='performance' && <ParentPerformance theme={C} child={child}/>}
            {page==='grades'      && <ParentGrades theme={C} child={child}/>}
            {page==='schedule'    && <ParentSchedule theme={C} child={child}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function ParentOverview({ theme: C, child }) {
  const results = store.getStudentResults(child.id);
  const grades  = Object.values(results).map(r=>r.grade);
  const avgG    = grades.length ? +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1) : 0;
  const courses = store.getStudentCourses(child.id);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Child Overview</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Monitoring your child's academic performance</div>

      {/* Child profile card */}
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:'16px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:20}}>
        <div style={{width:90,height:90,borderRadius:'50%',background:child.color||C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,flexShrink:0,overflow:'hidden'}}>
          {(child.capturedPhoto||store.getPhotoUrl(child)) ? <img src={child.capturedPhoto||store.getPhotoUrl(child)} alt={child.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : null}
          <span style={{display:(child.capturedPhoto||store.getPhotoUrl(child))?'none':'flex'}}>{child.emoji||'👤'}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{child.name}</div>
          <div style={{fontSize:12,color:C.text2,marginTop:2}}>{child.id} · {child.dept} · Year {child.year}</div>
          <div style={{fontSize:11,color:C.text3,marginTop:2}}>{child.email}</div>
          <div style={{marginTop:8}}>
            <Badge text={child.attention?.replace(/^\w/,c=>c.toUpperCase())||'Moderate'}
              color={{attentive:'green',moderate:'amber',distracted:'red',absent:'gray'}[child.attention]||'gray'}/>
          </div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {[['GPA',child.gpa,C.blue],['Attendance',`${child.attendanceRate}%`,C.green],['Engagement',`${child.engagement}%`,C.amber]].map(([l,v,col],i)=>(
            <div key={i} style={{textAlign:'center',background:C.bg3,borderRadius:10,padding:'10px 16px'}}>
              <div style={{fontSize:20,fontWeight:700,color:col}}>{v}</div>
              <div style={{fontSize:10,color:C.text3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="Attendance"    value={`${child.attendanceRate}%`} sub="This semester"    icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Grade"     value={`${avgG}%`}                sub="All subjects"     icon="📝" accent="blue"/>
        <StatCard theme={C} label="Engagement"    value={`${child.engagement}%`}    sub="In class"         icon="🧠" accent="amber"/>
        <StatCard theme={C} label="Enrolled In"   value={courses.length}            sub="Courses"          icon="📚" accent="purple"/>
      </div>

      {/* Today's emotion */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Card theme={C} title="Current Status">
          <div style={{padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <div style={{fontSize:36}}>{EMOTION_ICONS[child.emotion]||'😐'}</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>{child.emotion?.replace(/^\w/,c=>c.toUpperCase())}</div>
                <div style={{fontSize:11,color:C.text3}}>Current Emotion</div>
              </div>
            </div>
            <div style={{fontSize:12,color:C.text2}}>Attention Level</div>
            <div style={{height:8,background:C.bg3,borderRadius:4,marginTop:4,overflow:'hidden'}}>
              <div style={{width:`${child.attentionScore||50}%`,height:'100%',background:C.blue,borderRadius:4}}/>
            </div>
            <div style={{fontSize:10,color:C.text3,marginTop:4}}>{child.attentionScore||50}%</div>
          </div>
        </Card>
        <Card theme={C} title="Emotion Distribution Today">
          <div style={{padding:'4px 12px 12px'}}>
            <EmotionBarsWidget theme={C} data={store.emotionDist.slice(0,5)}/>
          </div>
        </Card>
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

  const courseRows = myCourses.map((course, i) => {
    const recorded = Object.keys(store.getStudentCourseAttendance(child.id, course.id)).length;
    const weeks = recorded > 0 ? recorded : Math.max(0, Math.min(16, Math.round(rate/100*16 + ((idHash+i*7)%5)-2)));
    return {
      course: `${course.name} (${course.code})`,
      weeks: `${weeks} / 16`,
      time: course.time,
      method: weeks > 0 ? '👤 Face Recognition' : '—',
      status: weeks >= 12 ? '✅ Good Standing' : weeks >= 8 ? '⚠️ At Risk' : '❌ Low Attendance',
    };
  });

  const recRows = attRecs.map(rec => ({
    course: store.getCourse(rec.courseId)?.name || rec.courseId,
    date: rec.date, week: `Week ${rec.week}`, time: rec.time,
    method: rec.method, status: '✅ Present',
  }));

  const useRecords = recRows.length > 0;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Attendance — {child.name}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Your child's attendance records</div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="Attendance Rate"  value={`${rate}%`}          sub="This semester"         icon="✅" accent="green"/>
        <StatCard theme={C} label="Courses Enrolled" value={myCourses.length}     sub="Active enrollments"    icon="📚" accent="blue"/>
        <StatCard theme={C} label="Sessions Logged"  value={attRecs.length}        sub="Recorded by system"    icon="📊" accent="purple"/>
        <StatCard theme={C} label="Standing"         value={rate>=75?'Good':'At Risk'} sub={rate>=75?'Good standing':'Needs improvement'} icon={rate>=75?'👍':'⚠️'} accent={rate>=75?'green':'red'}/>
      </div>

      <Card theme={C} title={useRecords ? 'Attendance Sessions' : 'Enrolled Courses — Attendance Summary'}>
        <div style={{padding:'4px 12px 12px'}}>
          {useRecords
            ? <DataTable theme={C} columns={[
                {key:'course',label:'Course',width:200},{key:'date',label:'Date',width:100},
                {key:'week',label:'Week',width:80},{key:'time',label:'Time',width:80},
                {key:'method',label:'Method',width:140},{key:'status',label:'Status',width:100},
              ]} rows={recRows}/>
            : courseRows.length > 0
              ? <DataTable theme={C} columns={[
                  {key:'course',label:'Course',width:220},{key:'weeks',label:'Weeks Attended',width:120},
                  {key:'time',label:'Time',width:80},{key:'method',label:'Method',width:140},
                  {key:'status',label:'Status',width:140},
                ]} rows={courseRows}/>
              : <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses yet.</div>
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

      <Card theme={C} title="Weekly Emotion Trend">
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

/* ── PERFORMANCE ── */
function ParentPerformance({ theme: C, child }) {
  const myCourses = store.getStudentCourses(child.id);
  const results   = store.getStudentResults(child.id);
  const idHash    = child.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const rows = myCourses.map((course, i) => {
    const rec  = results[course.id];
    const seed = (idHash + i*17) % 100;
    const att  = `${Math.min(100, Math.max(50, child.attendanceRate + ((seed%20)-10)))}%`;
    const eng  = `${Math.min(100, Math.max(30, child.engagement     + ((seed*3+7)%30)-15))}%`;
    const atn  = `${Math.min(100, Math.max(30, child.attentionScore + ((seed*7+3)%28)-14))}%`;
    const grade = rec ? `${rec.grade}% (${letterGrade(rec.grade)})` : '—';
    return { course: `${course.name} (${course.code})`, attendance: att, engagement: eng, attention: atn, grade };
  });

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Performance — {child.name}</div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="GPA"            value={child.gpa} sub="Current semester"          icon="📈" accent="blue"/>
        <StatCard theme={C} label="Avg Engagement" value={`${child.engagement}%`} sub="In class"     icon="🧠" accent="green"/>
        <StatCard theme={C} label="Attention Score"value={`${child.attentionScore}%`} sub="Average"  icon="👁️" accent="purple"/>
        <StatCard theme={C} label="Attendance"     value={`${child.attendanceRate}%`} sub="This semester" icon="✅" accent="amber"/>
      </div>

      <Card theme={C} title="Performance per Course">
        <div style={{padding:'4px 12px 12px'}}>
          {rows.length === 0
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

/* ── GRADES ── */
function ParentGrades({ theme: C, child }) {
  const results = store.getStudentResults(child.id);
  const entries = Object.entries(results);

  if(!entries.length) {
    return (
      <div style={{padding:'8px 20px 20px'}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Child Grades — {child.name}</div>
        <div style={{textAlign:'center',paddingTop:60}}>
          <div style={{fontSize:48}}>📝</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,marginTop:8}}>No grades available yet.</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>Grades will appear here once lecturers submit them.</div>
        </div>
      </div>
    );
  }

  const grades = entries.map(([,v])=>v.grade);
  const avg = +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1);
  const passed = grades.filter(g=>g>=50).length;
  const highest = Math.max(...grades);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Child Grades — {child.name}</div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['Subjects Graded',grades.length,C.blue],['Average',`${avg}%`,C.amber],['Passed',passed,C.green],['Highest',`${highest}%`,C.purple]].map(([lbl,val,col],i)=>(
          <div key={i} style={{flex:1,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:col}}>{val}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:2}}>{lbl}</div>
          </div>
        ))}
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
                  {rec.date&&<div style={{fontSize:10,color:C.text3,marginTop:2}}>Date: {rec.date}</div>}
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

/* ── SCHEDULE ── */
function ParentSchedule({ theme: C, child }) {
  const myCourses = store.getStudentCourses(child.id);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Schedule — {child.name}</div>
      <Card theme={C} title={`Enrolled Courses (${myCourses.length})`}>
        <div style={{padding:'4px 14px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {myCourses.length === 0
            ? <div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:12}}>Not enrolled in any courses.</div>
            : myCourses.map((course,i)=>{
                const lec = store.lectures.find(l=>l.code===course.code) || store.lectures[i%store.lectures.length];
                return (
                  <div key={i} style={{background:C.bg3,borderRadius:10,display:'flex',overflow:'hidden'}}>
                    <div style={{width:5,background:course.color,flexShrink:0}}/>
                    <div style={{padding:'12px 14px',flex:1}}>
                      <div style={{fontSize:10,color:C.text3}}>{course.time} · {course.duration} min</div>
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
