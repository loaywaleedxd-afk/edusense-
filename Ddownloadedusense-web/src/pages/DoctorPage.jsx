import { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { BarChart, LineChart, DonutChart, AttentionRing } from '../components/Charts';
import EmotionBarsWidget from '../components/EmotionBars';
import StudentFaceCard from '../components/StudentFaceCard';
import AlertItem from '../components/AlertItem';
import ScheduleItem from '../components/ScheduleItem';
import WebcamFeed from '../components/WebcamFeed';
import QRCodeComp from '../components/QRCode';
import store from '../dataStore';
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
  {id:'alerts',    icon:'🔔', label:'Alerts', badge:()=>store.getAlerts(true).length||0},
  {id:'moodle',    icon:'🌐', label:'Moodle'},
  {id:'ranalysis', icon:'📈', label:'R Analysis'},
];

const PAGE_TITLES = {
  dashboard:'Dashboard', live:'Live Session', attendance:'Attendance',
  lectures:'My Lectures', students:'Students', grades:'Exam Results',
  chat:'Community Chat', analytics:'Analytics', alerts:'Alerts', moodle:'Moodle',
  ranalysis:'R Analysis Reports',
};

function letterGrade(g){if(g>=90)return'A+';if(g>=85)return'A';if(g>=80)return'B+';if(g>=75)return'B';if(g>=70)return'C+';if(g>=65)return'C';if(g>=60)return'D+';if(g>=50)return'D';return'F';}
function gradeColor(g,C){return g>=75?C.green:g>=50?C.amber:C.red;}

export default function DoctorPage({ theme: C, user, isDark, onToggleMode, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const doctor = store.getDoctor(user.doctorId||'') || store.doctors[0];
  const myCourses = store.getDoctorCourses(doctor.id);

  return (
    <div style={{display:'flex',height:'100%',background:C.bg,overflow:'hidden'}}>
      <Sidebar theme={C} navItems={NAV} activeId={page} onNav={setPage}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <Topbar theme={C} user={user} pageTitle={PAGE_TITLES[page]||page} isDark={isDark} onToggleMode={onToggleMode} onLogout={onLogout}/>
        <div className="content-scroll" style={{flex:1,overflowY:'auto',background:C.bg}}>
          <div className="animate-in" key={page}>
            {page==='dashboard'  && <DocDashboard theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='live'       && <DocLive theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='attendance' && <DocAttendance theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='lectures'   && <DocLectures theme={C} doctor={doctor} myCourses={myCourses}/>}
            {page==='students'   && <DocStudents theme={C} doctor={doctor} myCourses={myCourses} doctor={doctor}/>}
            {page==='grades'     && <DocGrades theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='chat'       && <DocChat theme={C} user={user} doctor={doctor} myCourses={myCourses}/>}
            {page==='analytics'  && <DocAnalytics theme={C}/>}
            {page==='alerts'     && <DocAlerts theme={C}/>}
            {page==='moodle'     && <DocMoodle theme={C}/>}
            {page==='ranalysis'  && <DocRAnalysis theme={C}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── DASHBOARD ── */
function DocDashboard({ theme: C, doctor, myCourses }) {
  const enrolled = myCourses.flatMap(c=>store.getEnrolledStudents(c.id));
  const uniqueStudents = [...new Map(enrolled.map(s=>[s.id,s])).values()];
  const presentToday = uniqueStudents.filter(s=>s.present).length;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Dashboard</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Your teaching overview</div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="My Courses"    value={myCourses.length} sub="This semester"   icon="📚" accent="blue"/>
        <StatCard theme={C} label="My Students"   value={uniqueStudents.length} sub="Enrolled"   icon="👥" accent="purple"/>
        <StatCard theme={C} label="Present Today" value={presentToday}     sub="In sessions"    icon="✅" accent="green"/>
        <StatCard theme={C} label="Avg Engagement"value={`${doctor.engagement}%`} sub="Across all courses" icon="🧠" accent="amber"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:12}}>
        <Card theme={C} title="Engagement Trend">
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label:'Engagement',data:store.trendData.engagement,color:C.blue},
              {label:'Attention', data:store.trendData.attention, color:C.green},
            ]} labels={store.trendData.labels} height={200}/>
          </div>
        </Card>
        <Card theme={C} title="Emotion Distribution">
          <div style={{padding:'4px 12px 12px'}}>
            <EmotionBarsWidget theme={C} data={store.emotionDist.slice(0,6)}/>
          </div>
        </Card>
      </div>

      <Card theme={C} title="My Lectures Today">
        <div style={{padding:'4px 14px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {store.lectures.slice(0,3).map((lec,i)=><ScheduleItem key={i} theme={C} lecture={lec}/>)}
        </div>
      </Card>
    </div>
  );
}

/* ── LIVE SESSION ── */
function DocLive({ theme: C, myCourses }) {
  const [selCourse, setSelCourse]   = useState(myCourses[0]?.id||'');
  const [detections, setDetections] = useState(0);
  const [lastMarked, setLastMarked] = useState('');
  const [lastEmotion, setLastEmotion] = useState('');
  const [, forceUpdate]             = useState(0);

  const alertCooldown = useRef({});

  async function handleEmotionDetected(emotion, studentId, allFaces) {
    const students = selCourse ? store.getEnrolledStudents(selCourse) : [];
    if (studentId) {
      const matched = students.find(s => s.id === studentId);
      if (matched && !matched.present) {
        store.markAttendance(selCourse, matched.id, 0.95, 'face_recognition');
        matched.present = true;
        setLastMarked(`✅ ${matched.name.split(' ')[0]} recognized & marked present`);
        forceUpdate(n => n + 1);
      }
      setLastEmotion(`${studentId}: ${emotion}`);

      // Fire alert if emotion signals disengagement (once per 5 min per student)
      const lowEmotions = ['bored','confused','sad','angry','fearful','fear'];
      if (lowEmotions.includes(emotion) && matched) {
        const now = Date.now();
        const last = alertCooldown.current[matched.id] || 0;
        if (now - last > 5 * 60 * 1000) {
          alertCooldown.current[matched.id] = now;
          const course = store.getCourse(selCourse);
          store.addAlert({
            type: 'warning',
            title: `Low Engagement — ${matched.name}`,
            message: `Detected "${emotion}" during ${course?.name||selCourse}. Consider checking on this student.`,
            studentId: matched.id,
            courseId: selCourse,
          });
          forceUpdate(n => n + 1);
        }
      }
    } else {
      setLastEmotion(`Unknown face: ${emotion}`);
    }
  }

  const students    = selCourse ? store.getEnrolledStudents(selCourse) : store.students.slice(0,12);
  const presentCount = students.filter(s=>s.present).length;
  const avgAtt      = students.length ? Math.round(students.reduce((a,s)=>a+s.attentionScore,0)/students.length) : 0;
  const avgEng      = students.length ? Math.round(students.reduce((a,s)=>a+s.engagement,0)/students.length) : 0;

  function handleFaceDetected() {
    setDetections(n => n+1);
  }

  function markPresentFromCamera() {
    if (!selCourse) return;
    const absent = students.filter(s=>!s.present);
    if (!absent.length) { setLastMarked('All students already marked present'); return; }
    const pick = absent[Math.floor(Math.random()*absent.length)];
    store.markAttendance(selCourse, pick.id, 0.95, 'face_recognition');
    pick.present = true;
    setLastMarked(`✅ Marked ${pick.name.split(' ')[0]} as present`);
    forceUpdate(n=>n+1);
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:8}}>
            📷 Live Session
            <span className="live-dot" style={{color:C.red,fontSize:12}}>● LIVE</span>
          </div>
          <div style={{fontSize:12,color:C.text2}}>Real-time classroom monitoring</div>
        </div>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
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
              <WebcamFeed theme={C} mode="📷 Live Session" courseId={selCourse} onFaceDetected={handleFaceDetected} onEmotionDetected={handleEmotionDetected} onCapture={()=>{}}/>
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
                onClick={()=>{
                  students.forEach(s=>{ store.markAttendance(selCourse,s.id,1.0,'manual'); s.present=true; });
                  setLastMarked('✅ All students marked present'); forceUpdate(n=>n+1);
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
          <Card theme={C} title={`Student Status Grid — ${store.getCourse(selCourse)?.name||''}`}>
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
  const [selCourse, setSelCourse] = useState(myCourses[0]?.id||'');
  const [week, setWeek]           = useState(1);
  const [tick, setTick]           = useState(0);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'qr' | 'excuses'
  const [qrToken, setQrToken]     = useState(null);
  const refresh = () => setTick(n=>n+1);

  const course   = store.getCourse(selCourse);
  const enrolled = selCourse ? store.getEnrolledStudents(selCourse) : [];
  const attRecs  = selCourse ? store.getAttendance(selCourse, week) : {};
  const excuses  = store.getExcuses(selCourse).filter(e=>e.week===week);
  const pendingExcuses = excuses.filter(e=>e.status==='pending').length;

  const presentCount = enrolled.filter(s=>attRecs[s.id]).length;
  const absentCount  = enrolled.length - presentCount;

  function toggleStudent(s) {
    if (attRecs[s.id]) {
      store.markAttendance(selCourse, s.id, 0, 'manual', week, true);
    } else {
      store.markAttendance(selCourse, s.id, 1.0, 'manual', week);
    }
    refresh();
  }

  function markAll(present) {
    enrolled.forEach(s => store.markAttendance(selCourse, s.id, present ? 1.0 : 0, 'manual', week, !present));
    refresh();
  }

  function generateQR() {
    const token = store.createQRSession(selCourse, week);
    setQrToken(token);
    setActiveTab('qr');
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
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Attendance Management</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Click a student row to toggle · Generate QR for student self check-in · Review excuses</div>

      {/* Controls */}
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <select value={selCourse} onChange={e=>{setSelCourse(e.target.value);setQrToken(null);}}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={week} onChange={e=>{setWeek(parseInt(e.target.value));setQrToken(null);}}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.text}}>
          {Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>Week {i+1}</option>)}
        </select>
        <span style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid #10b981',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>✅ {presentCount} Present</span>
        <span style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'1px solid #ef4444',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>❌ {absentCount} Absent</span>
        <div style={{flex:1}}/>
        <button onClick={()=>markAll(true)} style={{background:C.green,border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ All Present</button>
        <button onClick={()=>markAll(false)} style={{background:'rgba(239,68,68,0.15)',border:'1px solid #ef4444',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#ef4444',cursor:'pointer'}}>❌ All Absent</button>
        <button onClick={generateQR} style={{background:'rgba(139,92,246,0.15)',border:'1px solid #8b5cf6',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#a78bfa',cursor:'pointer'}}>📱 QR Code</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {TAB('roster','📋 Student Roster',0)}
        {TAB('qr','📱 QR Check-In',0)}
        {TAB('excuses','📄 Excuses',pendingExcuses)}
      </div>

      {/* ── ROSTER TAB ── */}
      {activeTab==='roster' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'56px 1fr 160px 120px 110px 110px',background:C.bg3,borderBottom:`1px solid ${C.border}`,padding:'8px 16px',fontSize:11,fontWeight:700,color:C.text2}}>
            <div/><div>Name</div><div>Department</div><div>Status</div><div>Check-In</div><div>Method</div>
          </div>
          {enrolled.length===0 && <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:13}}>No students enrolled.</div>}
          {enrolled.map((s,i)=>{
            const rec=attRecs[s.id]; const present=!!rec;
            const photoUrl=s.capturedPhoto||store.getPhotoUrl(s);
            const isExcused=rec?.status==='excused';
            return (
              <div key={s.id} onClick={()=>toggleStudent(s)} style={{
                display:'grid',gridTemplateColumns:'56px 1fr 160px 120px 110px 110px',
                alignItems:'center',padding:'10px 16px',
                borderBottom:i<enrolled.length-1?`1px solid ${C.border}`:'none',
                background:present?'rgba(16,185,129,0.07)':(i%2===0?'transparent':'rgba(255,255,255,0.02)'),
                cursor:'pointer',transition:'background 0.15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.background=present?'rgba(16,185,129,0.07)':(i%2===0?'transparent':'rgba(255,255,255,0.02)')}>
                <div style={{width:40,height:40,borderRadius:'50%',background:s.color||C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,overflow:'hidden',border:`2px solid ${present?'#10b981':'#475569'}`}}>
                  {photoUrl?<img src={photoUrl} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>:null}
                  <span style={{display:photoUrl?'none':'flex'}}>{s.emoji||'👤'}</span>
                </div>
                <div style={{paddingLeft:10}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:C.text3}}>{s.id}</div>
                </div>
                <div style={{fontSize:12,color:C.text2}}>{s.dept}</div>
                <div>
                  <span style={{display:'inline-flex',alignItems:'center',gap:5,background:present?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.12)',color:present?'#10b981':'#ef4444',border:`1px solid ${present?'#10b981':'#ef4444'}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>
                    {isExcused?'📄 Excused':present?'✅ Present':'❌ Absent'}
                  </span>
                </div>
                <div style={{fontSize:11,color:C.text2}}>{rec?.time||'—'}</div>
                <div style={{fontSize:11,color:C.text3}}>{rec?.method||'—'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── QR TAB ── */}
      {activeTab==='qr' && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:28,textAlign:'center'}}>
          {qrToken ? (
            <>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>📱 QR Code for {course?.name} — Week {week}</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:20}}>Students scan this or enter the code in their app · Valid for 90 minutes</div>
              <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                <QRCodeComp value={`EDUSENSE:${qrToken}:${selCourse}:W${week}`} size={220} color={course?.color||'#3b82f6'}/>
              </div>
              <div style={{display:'inline-block',background:C.bg3,border:`2px dashed ${C.border}`,borderRadius:12,padding:'12px 32px',marginBottom:20}}>
                <div style={{fontSize:11,color:C.text3,marginBottom:4}}>Session Code</div>
                <div style={{fontSize:36,fontWeight:800,color:course?.color||C.blue,letterSpacing:8,fontFamily:'monospace'}}>{qrToken}</div>
              </div>
              <div style={{fontSize:11,color:C.text3}}>Students go to <strong>My Attendance</strong> → <strong>QR Check-In</strong> and enter this code</div>
              <button onClick={()=>{const t=store.createQRSession(selCourse,week);setQrToken(t);}}
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
      )}

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
                    <button onClick={()=>{store.updateExcuse(ex.id,'approved',doctor?.id);refresh();}}
                      style={{background:C.green,border:'none',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>✅ Approve</button>
                    <button onClick={()=>{store.updateExcuse(ex.id,'rejected',doctor?.id);refresh();}}
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
  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>My Lectures</div>

      {(() => {
        const totalStudents = myCourses.reduce((a,c)=>a+c.enrolledCount,0);
        const allEnrolled = myCourses.flatMap(c=>store.getEnrolledStudents(c.id));
        const avgEng = allEnrolled.length ? Math.round(allEnrolled.reduce((a,s)=>a+s.engagement,0)/allEnrolled.length) : 0;
        return (
      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="Courses"        value={myCourses.length}   sub="This semester"    icon="📚" accent="blue"/>
        <StatCard theme={C} label="Total Students" value={totalStudents}       sub="Across all courses" icon="👥" accent="green"/>
        <StatCard theme={C} label="Avg Engagement" value={`${avgEng}%`}       sub="Across courses"   icon="🧠" accent="amber"/>
        <StatCard theme={C} label="Courses Active" value={store.lectures.filter(l=>l.status==='active').length} sub="Currently running" icon="🎤" accent="purple"/>
      </div>
        );
      })()}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {myCourses.map((c,i)=>(
          <div key={i} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <div style={{display:'flex',overflow:'hidden'}}>
              <div style={{width:6,background:c.color,flexShrink:0}}/>
              <div style={{padding:'16px 20px',flex:1,display:'flex',alignItems:'center',gap:20}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.text2,marginTop:2}}>{c.code} · {c.room} · {c.time} · {c.duration} min</div>
                  <div style={{fontSize:11,color:C.text3}}>Semester: {c.semester}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:c.color}}>{c.enrolledCount}</div>
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
async function sendSMSAlert(phone, studentName, attendanceRate, doctorName) {
  const msg = `EduSense Alert: ${studentName} has a low attendance rate of ${attendanceRate}%. Please contact them immediately. — ${doctorName}`;
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: msg, key: 'textbelt' })
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Network error' };
  }
}

function DocStudents({ theme: C, myCourses, doctor }) {
  const [selCourse, setSelCourse] = useState('all');
  const [search, setSearch] = useState('');
  const [portfolioStudent, setPortfolioStudent] = useState(null);
  const [smsStatus, setSmsStatus] = useState({});

  const allStudents = selCourse==='all'
    ? [...new Map(myCourses.flatMap(c=>store.getEnrolledStudents(c.id)).map(s=>[s.id,s])).values()]
    : store.getEnrolledStudents(selCourse);

  const atRisk = allStudents.filter(s => s.attendanceRate < 75);
  const filtered = allStudents.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.id.toLowerCase().includes(search.toLowerCase()));

  async function handleSendSMS(stu) {
    if (!stu.phone) { alert(`No phone number on file for ${stu.name}`); return; }
    setSmsStatus(p => ({ ...p, [stu.id]: 'sending' }));
    const result = await sendSMSAlert(stu.phone, stu.name, stu.attendanceRate, doctor?.name || 'Lecturer');
    setSmsStatus(p => ({ ...p, [stu.id]: result.success ? 'sent' : 'failed' }));
  }

  return (
    <div style={{padding:'8px 20px 20px'}}>
      {portfolioStudent && <StudentPortfolioModal theme={C} student={portfolioStudent} onClose={()=>setPortfolioStudent(null)}/>}

      {/* At-Risk Students Alert Section */}
      {atRisk.length > 0 && (
        <div style={{background:'rgba(239,68,68,0.08)',border:`1px solid rgba(239,68,68,0.3)`,borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div style={{fontSize:15,fontWeight:700,color:'#ef4444'}}>At-Risk Students ({atRisk.length})</div>
            <div style={{fontSize:11,color:C.text3,marginLeft:4}}>Attendance below 75% — send SMS alert to their registered phone</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {atRisk.map(stu => {
              const status = smsStatus[stu.id];
              return (
                <div key={stu.id} style={{display:'flex',alignItems:'center',gap:12,background:C.card,borderRadius:10,padding:'10px 14px',border:`1px solid ${C.border}`}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:stu.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{stu.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{stu.name}</div>
                    <div style={{fontSize:11,color:C.text3}}>{stu.id} · {stu.phone || 'No phone on file'}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#ef4444',minWidth:40}}>{stu.attendanceRate}%</div>
                  <button
                    onClick={() => handleSendSMS(stu)}
                    disabled={status === 'sending' || status === 'sent'}
                    style={{
                      background: status === 'sent' ? C.green : status === 'failed' ? C.red_dim : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                      border: 'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700,
                      color: '#fff', cursor: status==='sending'||status==='sent' ? 'default' : 'pointer', whiteSpace:'nowrap'
                    }}
                  >
                    {status === 'sending' ? '📤 Sending...' : status === 'sent' ? '✅ SMS Sent' : status === 'failed' ? '❌ Failed' : '📱 Send SMS'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Students</div>

      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..."
          style={{flex:1,minWidth:200,height:38,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}/>
        <select value={selCourse} onChange={e=>setSelCourse(e.target.value)}
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'0 12px',fontSize:12,color:C.text}}>
          <option value="all">All Courses</option>
          {myCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card theme={C} title={`Students (${filtered.length}) — click a row to view portfolio`}>
        <div style={{padding:'4px 12px 12px'}}>
          <DataTable theme={C} columns={[
            {key:'id',label:'ID',width:60},{key:'name',label:'Name',width:200},
            {key:'dept',label:'Department',width:140},{key:'year',label:'Year',width:60},
            {key:'emotion',label:'Emotion',width:100},{key:'engagement',label:'Engagement',width:100},
            {key:'attendance',label:'Attendance',width:100},{key:'gpa',label:'GPA',width:60},
          ]} rows={filtered.map(s=>({
            id:s.id,
            name:(()=>{
              const photo = s.capturedPhoto || store.getPhotoUrl(s);
              return (
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
              );
            })(),
            dept:s.dept,year:`Year ${s.year}`,
            emotion:`${EMOTION_ICONS[s.emotion]||'😐'} ${s.emotion}`,
            engagement:`${s.engagement}%`,attendance:`${s.attendanceRate}%`,gpa:s.gpa,
          }))} onRowClick={(_,i)=>setPortfolioStudent(filtered[i])}/>
        </div>
      </Card>
    </div>
  );
}

/* ── EXAM RESULTS (GRADES) ── */
function DocGrades({ theme: C, user, doctor, myCourses }) {
  const [selCourse, setSelCourse]   = useState(myCourses[0]?.id||'');
  const [search, setSearch]         = useState('');
  const [editStudent, setEditStudent] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [showWeights, setShowWeights] = useState(false);
  const [showCalc, setShowCalc]     = useState(null); // studentId
  const [weights, setWeights]       = useState(null);
  const [compInputs, setCompInputs] = useState({midterm:'',final:'',assignments:'',attendance:''});
  const [, forceUpdate]             = useState(0);

  const enrolled = selCourse ? store.getEnrolledStudents(selCourse) : [];
  const filtered = enrolled.filter(s=>
    s.name.toLowerCase().includes(search.toLowerCase())||s.id.toLowerCase().includes(search.toLowerCase())
  );
  const results = selCourse ? store.getCourseResults(selCourse) : {};

  function loadWeights() {
    const w = store.getGradeWeights(selCourse);
    setWeights({...w});
  }

  function saveWeights() {
    const total = Object.values(weights).reduce((a,b)=>a+Number(b),0);
    if(total!==100){alert(`Weights must sum to 100 (currently ${total})`);return;}
    store.setGradeWeights(selCourse, Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,Number(v)])));
    setShowWeights(false); forceUpdate(n=>n+1);
  }

  function openCalc(sid) {
    const comp = store.getGradeComponents(sid, selCourse) || {midterm:'',final:'',assignments:'',attendance:''};
    setCompInputs({midterm:comp.midterm??'',final:comp.final??'',assignments:comp.assignments??'',attendance:comp.attendance??''});
    setShowCalc(sid);
  }

  function saveCalc(sid) {
    const c = {
      midterm:   parseFloat(compInputs.midterm)||0,
      final:     parseFloat(compInputs.final)||0,
      assignments: parseFloat(compInputs.assignments)||0,
      attendance:  parseFloat(compInputs.attendance)||0,
    };
    store.setGradeComponents(sid, selCourse, c);
    setShowCalc(null); forceUpdate(n=>n+1);
  }

  function calcPreview() {
    const w = store.getGradeWeights(selCourse);
    return +(
      (parseFloat(compInputs.midterm)||0)*(w.midterm/100)+
      (parseFloat(compInputs.final)||0)*(w.final/100)+
      (parseFloat(compInputs.assignments)||0)*(w.assignments/100)+
      (parseFloat(compInputs.attendance)||0)*(w.attendance/100)
    ).toFixed(1);
  }

  function saveGrade(sid) {
    const g = parseFloat(gradeInput);
    if(isNaN(g)||g<0||g>100) { alert('Enter a valid grade (0-100)'); return; }
    store.addExamResult(sid, selCourse, g, doctor.id);
    setEditStudent(null); setGradeInput(''); forceUpdate(n=>n+1);
  }

  function deleteGrade(sid) {
    if(confirm('Delete this grade?')) { store.deleteExamResult(sid, selCourse); forceUpdate(n=>n+1); }
  }

  const curWeights = store.getGradeWeights(selCourse);

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Exam Results</div>

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
      </div>

      {/* Grade weights panel */}
      {showWeights && weights && (
        <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>⚙️ Grade Weights — {store.getCourse(selCourse)?.name}</div>
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
              <div style={{fontSize:12,color:C.text3,marginBottom:20}}>{s?.name} · {store.getCourse(selCourse)?.name}</div>
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

      <Card theme={C} title={`Grades — ${store.getCourse(selCourse)?.name||''}`}>
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
                const hasComp = !!store.getGradeComponents(s.id, selCourse);
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
                              <button onClick={()=>{if(window.confirm(`Withdraw ${s.name} from this course?`)){store.unenrollStudent(selCourse,s.id);forceUpdate(n=>n+1);}}}
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
  const [selIdx, setSelIdx] = useState(0);
  const [msg, setMsg] = useState('');
  const [isAnnounce, setIsAnnounce] = useState(false);
  const [, forceUpdate] = useState(0);

  const course = myCourses[selIdx];
  const messages = course ? store.getMessages(course.id) : [];

  function sendMsg() {
    if(!msg.trim()||!course) return;
    store.postMessage(course.id, doctor.name, doctor.id, 'doctor', msg, isAnnounce?'announcement':'message');
    setMsg(''); forceUpdate(n=>n+1);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
      <div style={{padding:'18px 24px 8px',display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text,flex:1}}>💬 Community Chat</div>
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
              {m.senderId===doctor.id&&<button onClick={()=>{store.deleteMessage(course.id,m.id);forceUpdate(n=>n+1);}} style={{fontSize:9,color:C.red2,background:'transparent',border:'none',cursor:'pointer',marginTop:2}}>Delete</button>}
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
function DocAnalytics({ theme: C }) {
  const avgEng = store.students.length ? Math.round(store.students.reduce((a,s)=>a+s.engagement,0)/store.students.length) : 0;
  const avgAtt = store.students.length ? Math.round(store.students.reduce((a,s)=>a+s.attendanceRate,0)/store.students.length) : 0;
  const happyPct = store.students.length ? Math.round(store.students.filter(s=>['happy','neutral'].includes(s.emotion)).length/store.students.length*100) : 0;
  const atRisk = store.students.length ? Math.round(store.students.filter(s=>s.engagement<40).length/store.students.length*100) : 0;

  return (
    <div style={{padding:'8px 20px 20px'}}>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:12}}>Analytics</div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <StatCard theme={C} label="Avg Engagement" value={`${avgEng}%`} sub="Across all students" icon="🧠" accent="blue"/>
        <StatCard theme={C} label="Avg Attendance" value={`${avgAtt}%`} sub="This semester"       icon="✅" accent="green"/>
        <StatCard theme={C} label="Happy Students" value={`${happyPct}%`} sub="Positive emotions" icon="😊" accent="amber"/>
        <StatCard theme={C} label="At Risk"        value={`${atRisk}%`}  sub="Engagement &lt; 40%" icon="⚠️" accent="red"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Card theme={C} title="Weekly Engagement Trend">
          <div style={{padding:'4px 12px 12px'}}>
            <LineChart theme={C} series={[
              {label:'Engagement',data:store.trendData.engagement,color:C.blue},
              {label:'Attention', data:store.trendData.attention, color:C.purple},
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

      <Card theme={C} title="Engagement by Course">
        <div style={{padding:'4px 12px 12px'}}>
          <BarChart theme={C} data={store.lectures.map(l=>({label:l.code,value:l.avgEngagement,color:l.color}))} height={200}/>
        </div>
      </Card>
    </div>
  );
}

/* ── ALERTS ── */
function DocAlerts({ theme: C }) {
  const [, refresh] = useState(0);
  const alerts = store.getAlerts();
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
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>🔔 Alerts</div>
        {unread>0 && <span style={{background:'#ef4444',color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:800}}>{unread} new</span>}
        <div style={{flex:1}}/>
        {unread>0 && <button onClick={()=>{store.markAllAlertsRead();refresh(n=>n+1);}}
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
  const courses = store.getStudentCourses(student.id);
  const idHash  = student.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);

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
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>R Analysis Reports</div>
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

/* ── MOODLE ── */
function DocMoodle({ theme: C }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:120,height:120,borderRadius:'50%',background:'#F98012',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:64,fontWeight:700,color:'#fff'}}>M</div>
        <div style={{fontSize:28,fontWeight:700,color:C.text}}>Moodle</div>
        <div style={{fontSize:13,color:C.text2,margin:'4px 0 20px'}}>University Learning Management System</div>
        <button onClick={()=>alert('Moodle integration coming soon!')}
          style={{background:'#F98012',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          🌐  Open Moodle
        </button>
        <div style={{fontSize:11,color:C.text3,marginTop:12}}>⚠️  Prototype — not connected</div>
      </div>
    </div>
  );
}
