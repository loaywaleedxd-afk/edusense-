import { useState, useEffect, useRef, useCallback } from "react";

// ── Inline styles / design tokens ──────────────────────────
const T = {
  bg:       "#07101f",
  bg2:      "#0c1829",
  card:     "#0f1e36",
  card2:    "#162340",
  border:   "#1a2d4a",
  border2:  "#243d62",
  text:     "#f0f4ff",
  text2:    "#7a94b8",
  text3:    "#3d5475",
  blue:     "#3b82f6",
  blue2:    "#60a5fa",
  green:    "#10b981",
  green2:   "#34d399",
  purple:   "#8b5cf6",
  amber:    "#f59e0b",
  red:      "#ef4444",
  cyan:     "#06b6d4",
};

// ── Mock store reading from store.json path ─────────────────
// In production this would fetch from /api or read the file.
// Here we generate realistic demo data that mirrors store.json structure.
const DEPTS = ["CS","Engineering","Mathematics","Physics","Data Science"];
const EMOTIONS = ["happy","neutral","confused","bored","surprised","sad"];
const EMO_COLOR = { happy:"#10b981", neutral:"#6366f1", confused:"#8b5cf6",
  bored:"#64748b", surprised:"#f59e0b", sad:"#475569" };
const EMO_EMOJI = { happy:"😊", neutral:"😐", confused:"😕",
  bored:"😴", surprised:"😮", sad:"😢" };

// Data is loaded from store.json at runtime (see App() below).
// These are placeholders only until the async load completes.
let STUDENTS = [];
let DOCTORS = [];
let COURSES = [];
let ATTENDANCE = {};
let EXAM_RESULTS = {};
let ENROLLMENTS = {};



function letterGrade(g) {

  if (g>=90) return "A+"; if (g>=85) return "A"; if (g>=80) return "B+";
  if (g>=75) return "B";  if (g>=70) return "C+";if (g>=65) return "C";
  if (g>=60) return "D+"; if (g>=50) return "D"; return "F";
}

// ── CSS string injected once ────────────────────────────────
const CSS = `

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:${T.bg};color:${T.text};font-family:'DM Sans','Segoe UI',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:${T.bg};}
::-webkit-scrollbar-thumb{background:${T.border2};border-radius:3px;}
input,select,textarea{font-family:inherit;}
button{font-family:inherit;cursor:pointer;}
`;

function injectCSS() {
  if (document.getElementById("es-css")) return;
  const s = document.createElement("style");
  s.id = "es-css"; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Small reusable components ───────────────────────────────
function Card({ children, style, title }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
      padding:20, marginBottom:16, ...style }}>
      {title && <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em",
        textTransform:"uppercase", color:T.text2, marginBottom:14 }}>{title}</div>}
      {children}
    </div>
  );
}

function StatCard({ icon, value, label, sub="", accent="blue" }) {
  const colors = { blue:T.blue, green:T.green, purple:T.purple, amber:T.amber, red:T.red };
  const gradients = {
    blue:`linear-gradient(90deg,${T.blue},${T.cyan})`,
    green:`linear-gradient(90deg,${T.green},#34d399)`,
    purple:`linear-gradient(90deg,${T.purple},#ec4899)`,
    amber:`linear-gradient(90deg,${T.amber},${T.red})`,
    red:`linear-gradient(90deg,${T.red},#f97316)`,
  };
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
      padding:"20px 22px", position:"relative", overflow:"hidden",
      flex:1, transition:"transform .15s" }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:gradients[accent] || gradients.blue, borderRadius:"14px 14px 0 0" }} />
      {icon && <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>}
      <div style={{ fontSize:30, fontWeight:700, color:colors[accent]||T.blue }}>{value}</div>
      <div style={{ fontSize:11, color:T.text2, marginTop:5, fontWeight:500,
        letterSpacing:".04em", textTransform:"uppercase" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color=T.blue }) {
  return (
    <span style={{ background:color+"22", color, padding:"2px 10px",
      borderRadius:20, fontSize:10, fontWeight:600 }}>{text}</span>
  );
}

function Btn({ children, onClick, variant="primary", style, disabled }) {
  const base = { padding:"8px 18px", borderRadius:9, fontSize:13, fontWeight:600,
    border:"none", cursor:disabled?"not-allowed":"pointer", transition:"all .15s",
    opacity:disabled?0.5:1 };
  const variants = {
    primary:  { background:T.blue,  color:"#fff" },
    danger:   { background:T.red+"22", color:T.red, border:`1px solid ${T.red}` },
    ghost:    { background:"transparent", color:T.text2, border:`1px solid ${T.border2}` },
    success:  { background:T.green+"22", color:T.green, border:`1px solid ${T.green}` },
    amber:    { background:T.amber+"22", color:T.amber, border:`1px solid ${T.amber}` },
  };
  return (
    <button onClick={disabled?undefined:onClick}
      style={{ ...base, ...variants[variant], ...style }}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, style, type="text" }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{ background:T.card2, border:`1px solid ${T.border2}`, borderRadius:9,
        padding:"8px 12px", fontSize:13, color:T.text, outline:"none",
        width:"100%", ...style }}
      onFocus={e=>{ e.target.style.borderColor=T.blue; e.target.style.boxShadow=`0 0 0 3px ${T.blue}22`; }}
      onBlur={e=>{ e.target.style.borderColor=T.border2; e.target.style.boxShadow="none"; }}
    />
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:T.card2, border:`1px solid ${T.border2}`, borderRadius:9,
        padding:"8px 12px", fontSize:13, color:T.text, outline:"none", ...style }}>
      {options.map(o => (
        <option key={o.value||o} value={o.value||o}>{o.label||o}</option>
      ))}
    </select>
  );
}

function MiniBarChart({ data, height=160 }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height, padding:"0 4px" }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", gap:4, height:"100%" }}>
          <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
            <div style={{ width:"100%", height:`${(d.value/max)*100}%`,
              background:d.color||T.blue, borderRadius:"4px 4px 0 0",
              minHeight:4, transition:"height .4s ease" }} />
          </div>
          <div style={{ fontSize:9, color:T.text3, textAlign:"center",
            whiteSpace:"nowrap", overflow:"hidden", maxWidth:40 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function AttBar({ pct, color }) {
  const c = color || (pct>=75?T.green:pct>=50?T.amber:T.red);
  return (
    <div style={{ height:4, borderRadius:2, background:T.border, marginTop:4 }}>
      <div style={{ height:4, borderRadius:2, width:`${Math.min(pct,100)}%`, background:c }} />
    </div>
  );
}

function Avatar({ name, color, size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color||T.blue,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.4, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:16,
        padding:28, width:"100%", maxWidth:500, maxHeight:"85vh",
        overflowY:"auto", position:"relative" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.text }}>{title}</h2>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", color:T.text2,
              fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Sidebar({ nav, active, onNav }) {
  return (
    <div style={{ width:220, background:T.bg2, borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column", height:"100%", flexShrink:0 }}>
      <div style={{ padding:"20px 16px" }}>
        {nav.map(item => {
          if (item.section) return (
            <div key={item.section} style={{ fontSize:10, fontWeight:600, color:T.text3,
              letterSpacing:".1em", textTransform:"uppercase", padding:"12px 8px 6px",
              marginTop:8 }}>{item.section}</div>
          );
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                padding:"9px 12px", borderRadius:10, border:"none", cursor:"pointer",
                background:isActive ? T.blue+"22" : "transparent",
                color:isActive ? T.blue2 : T.text2,
                fontSize:13, fontWeight:isActive?600:400,
                marginBottom:2, transition:"all .15s", textAlign:"left" }}
              onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=T.card2; }}
              onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Topbar({ user, onLogout, pageLabel }) {
  return (
    <div style={{ height:58, background:T.bg2, borderBottom:`1px solid ${T.border}`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 24px", flexShrink:0 }}>
      <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{pageLabel}</div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{user.name}</div>
          <div style={{ fontSize:11, color:T.text2, textTransform:"capitalize" }}>{user.role}</div>
        </div>
        <Avatar name={user.name} color={T.blue} size={36} />
        <Btn onClick={onLogout} variant="ghost" style={{ fontSize:12, padding:"6px 14px" }}>
          Logout
        </Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [step, setStep] = useState("roles");
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ROLES = [
    { role:"student", emoji:"🎓", label:"Student",          desc:"View attendance & emotions",         color:T.blue,   user:"s001" },
    { role:"doctor",  emoji:"👨‍🏫", label:"Doctor / Lecturer",desc:"Manage lectures & live sessions",    color:T.purple, user:"dr.smith" },
    { role:"admin",   emoji:"🏛️", label:"Admin",            desc:"System management & reports",        color:T.green,  user:"admin" },
    { role:"parent",  emoji:"👨‍👩‍👧", label:"Parent",           desc:"Monitor child performance",          color:T.amber,  user:"parent1" },
  ];

  function handleRoleSelect(r) {
    setSelectedRole(r);
    setUsername(r.user);
    setPassword("demo123");
    setError("");
    setStep("form");
  }

  function handleLogin() {
    const u = USERS.find(u => u.username===username && u.password===password);
    if (u) onLogin(u);
    else setError("⚠  Invalid username or password");
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:step==="roles"?560:420 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:42, marginBottom:8 }}>⚡</div>
          <h1 style={{ fontSize:32, fontWeight:700, color:T.blue2, marginBottom:6 }}>EduSense</h1>
          <p style={{ fontSize:13, color:T.text3 }}>Classroom Emotion Detection & Attendance System</p>
        </div>

        {step === "roles" ? (
          <>
            <p style={{ textAlign:"center", fontSize:13, color:T.text2, marginBottom:20 }}>
              Choose your role to continue
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {ROLES.map(r => (
                <div key={r.role} onClick={() => handleRoleSelect(r)}
                  style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
                    padding:"24px 20px", cursor:"pointer", textAlign:"center",
                    transition:"all .2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=r.color;
                    e.currentTarget.style.background=T.card2; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border;
                    e.currentTarget.style.background=T.card; }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>{r.emoji}</div>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text, marginBottom:4 }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:16, padding:32 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>{selectedRole.emoji}</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:T.text }}>{selectedRole.label} Login</h2>
              <p style={{ fontSize:12, color:T.text2, marginTop:4 }}>Enter credentials to continue</p>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:T.text3,
                textTransform:"uppercase", letterSpacing:".05em",
                display:"block", marginBottom:6 }}>Username</label>
              <Input value={username} onChange={setUsername} placeholder="Enter username" />
            </div>
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:600, color:T.text3,
                textTransform:"uppercase", letterSpacing:".05em",
                display:"block", marginBottom:6 }}>Password</label>
              <Input value={password} onChange={setPassword} placeholder="Password" type="password" />
            </div>

            {error && <p style={{ color:T.red, fontSize:12, marginBottom:8 }}>{error}</p>}

            <div style={{ background:T.blue+"15", border:`1px solid ${T.blue}44`,
              borderRadius:8, padding:"8px 14px", marginBottom:16 }}>
              <span style={{ fontSize:11, color:T.blue2 }}>Demo: {selectedRole.user} / demo123</span>
            </div>

            <Btn onClick={handleLogin} style={{ width:"100%", padding:12, fontSize:14 }}>
              Sign In →
            </Btn>
            <button onClick={()=>setStep("roles")}
              style={{ width:"100%", background:"transparent", border:"none",
                color:T.text3, fontSize:12, marginTop:12, cursor:"pointer", padding:6 }}>
              ← Choose different role
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN PAGE
// ══════════════════════════════════════════════════════════════
function AdminPage({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState(STUDENTS);

  const NAV = [
    { section:"Overview" },
    { id:"dashboard",   icon:"📊", label:"Dashboard" },
    { id:"analytics",   icon:"📉", label:"Analytics" },
    { section:"Management" },
    { id:"students",    icon:"🎓", label:"Students" },
    { id:"doctors",     icon:"👨‍🏫",label:"Lecturers" },
    { id:"courses",     icon:"📚", label:"Courses" },
    { id:"enrollments", icon:"📋", label:"Enrollments" },
    { section:"Reports" },
    { id:"settings",    icon:"⚙️", label:"Settings" },
  ];

  const pageLabels = { dashboard:"Dashboard", analytics:"System Analytics",
    students:"Student Management", doctors:"Lecturer Management",
    courses:"Course Management", enrollments:"Enrollment Management",
    settings:"Settings" };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar nav={NAV} active={page} onNav={setPage} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar user={user} onLogout={onLogout} pageLabel={pageLabels[page]||page} />
        <div style={{ flex:1, overflowY:"auto", padding:24, background:T.bg }}>
          {page==="dashboard"   && <AdminDashboard />}
          {page==="analytics"   && <AdminAnalytics />}
          {page==="students"    && <AdminStudents students={students} setStudents={setStudents} />}
          {page==="doctors"     && <AdminDoctors />}
          {page==="courses"     && <AdminCourses />}
          {page==="enrollments" && <AdminEnrollments />}
          {page==="settings"    && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const present = STUDENTS.filter(s=>s.present).length;
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>System Dashboard</h1>
      <p style={{ color:T.text2, fontSize:12, marginBottom:20 }}>University-wide overview</p>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="🎓" value={STUDENTS.length} label="Total Students" sub="Enrolled" accent="blue" />
        <StatCard icon="👨‍🏫" value={DOCTORS.length}  label="Lecturers"      sub="Active faculty" accent="purple" />
        <StatCard icon="📚" value={COURSES.length}  label="Active Courses" sub="This semester"  accent="green" />
        <StatCard icon="✅" value={present}          label="Present Today"  sub={`${Math.round(present/STUDENTS.length*100)}% rate`} accent="amber" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
        <Card title="Engagement by Department">
          <MiniBarChart height={200} data={DEPTS.map((d,i)=>({
            label:d, value:55+i*6, color:[T.blue,T.purple,T.green,T.amber,T.cyan][i]
          }))} />
        </Card>
        <Card title="Emotion Distribution">
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {Object.entries(EMO_COLOR).map(([emo,col])=>{
              const cnt = STUDENTS.filter(s=>s.emotion===emo).length;
              return (
                <div key={emo} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>{EMO_EMOJI[emo]}</span>
                  <div style={{ flex:1, height:8, borderRadius:4, background:T.border }}>
                    <div style={{ height:8, borderRadius:4, background:col,
                      width:`${(cnt/STUDENTS.length)*100}%` }} />
                  </div>
                  <span style={{ fontSize:11, color:T.text2, minWidth:16 }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Weekly Attendance">
          <MiniBarChart height={160} data={[1,2,3,4,5,6,7,8].map(w=>({
            label:`W${w}`, value:100+Math.floor(Math.random()*80), color:T.green
          }))} />
        </Card>
        <Card title="GPA Distribution">
          <MiniBarChart height={160} data={["2.0-2.5","2.5-3.0","3.0-3.5","3.5-4.0"].map((r,i)=>({
            label:r, value:[8,25,35,22][i], color:T.purple
          }))} />
        </Card>
      </div>
    </>
  );
}

function AdminAnalytics() {
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>System Analytics</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card title="Emotion Frequency">
          <MiniBarChart height={200} data={Object.entries(EMO_COLOR).map(([emo,col])=>({
            label:emo, value:STUDENTS.filter(s=>s.emotion===emo).length, color:col
          }))} />
        </Card>
        <Card title="Dept Engagement">
          <MiniBarChart height={200} data={DEPTS.map((d,i)=>({
            label:d, value:55+i*7, color:[T.blue,T.purple,T.green,T.amber,T.cyan][i]
          }))} />
        </Card>
      </div>
      <Card title="Attention Score Distribution">
        <div style={{ display:"flex", gap:8 }}>
          {[["High ≥70",T.green],[`Medium 40–69`,T.amber],["Low <40",T.red]].map(([l,c])=>{
            const cnt = STUDENTS.filter(s=>
              l.startsWith("H")?s.attention_score>=70:
              l.startsWith("M")?s.attention_score>=40&&s.attention_score<70:
              s.attention_score<40).length;
            return (
              <div key={l} style={{ flex:1, background:c+"15", border:`1px solid ${c}44`,
                borderRadius:10, padding:16, textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:700, color:c }}>{cnt}</div>
                <div style={{ fontSize:11, color:T.text2, marginTop:4 }}>{l}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function AdminStudents({ students, setStudents }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name:"", email:"", dept:"CS", year:"1" });

  const filtered = students.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== "all" && s.dept !== deptFilter) return false;
    return true;
  });

  function deleteStudent(id) {
    if (window.confirm(`Delete student ${id}?`)) {
      setStudents(ss => ss.filter(s=>s.id!==id));
      setSelected(null);
    }
  }

  function addStudent() {
    if (!addForm.name) return;
    const newId = `S${String(students.length+1).padStart(3,"0")}`;
    const ns = { ...addForm, id:newId, gpa:2.5, attendance_rate:0, engagement:50,
      attention_score:50, emotion:"neutral", present:false, has_face:false,
      emoji:"🎓", color:T.blue };
    setStudents(ss => [...ss, ns]);
    setShowAdd(false);
    setAddForm({ name:"", email:"", dept:"CS", year:"1" });
  }

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Student Management</h1>
          <p style={{ color:T.text2, fontSize:12 }}>{students.length} total students</p>
        </div>
        <Btn onClick={()=>setShowAdd(true)}>+ Add Student</Btn>
      </div>

      {/* Search + filter */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <Input value={search} onChange={setSearch} placeholder="🔍 Search name or ID..."
          style={{ maxWidth:280 }} />
        <Select value={deptFilter} onChange={setDeptFilter}
          options={[{value:"all",label:"All Departments"},...DEPTS.map(d=>({value:d,label:d}))]}
          style={{ width:180 }} />
        <span style={{ fontSize:12, color:T.text2, alignSelf:"center" }}>
          Showing {filtered.length} of {students.length}
        </span>
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["ID","Name","Dept","Year","Attendance","Engagement","Emotion","Present","Actions"].map(h=>(
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left",
                    color:T.text2, fontWeight:600, fontSize:11,
                    textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={()=>setSelected(selected?.id===s.id?null:s)}
                  style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer",
                    background:selected?.id===s.id?T.blue+"15":undefined,
                    transition:"background .15s" }}
                  onMouseEnter={e=>{ if(selected?.id!==s.id) e.currentTarget.style.background=T.card2; }}
                  onMouseLeave={e=>{ if(selected?.id!==s.id) e.currentTarget.style.background="transparent"; }}>
                  <td style={{ padding:"10px 12px", color:T.text3, fontFamily:"monospace" }}>{s.id}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={s.name} color={s.color} size={28} />
                      <span style={{ color:T.text, fontWeight:500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px", color:T.text2 }}>{s.dept}</td>
                  <td style={{ padding:"10px 12px", color:T.text2 }}>Yr {s.year}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ color:s.attendance_rate>=75?T.green:s.attendance_rate>=50?T.amber:T.red }}>
                      {s.attendance_rate}%
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", color:T.text2 }}>{s.engagement}%</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ background:EMO_COLOR[s.emotion]+"22",
                      color:EMO_COLOR[s.emotion], padding:"2px 8px", borderRadius:20, fontSize:10 }}>
                      {EMO_EMOJI[s.emotion]} {s.emotion}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {s.present
                      ? <span style={{ background:T.green+"15", color:T.green2,
                          padding:"2px 8px", borderRadius:20, fontSize:10 }}>● Present</span>
                      : <span style={{ background:T.red+"15", color:"#f87171",
                          padding:"2px 8px", borderRadius:20, fontSize:10 }}>○ Absent</span>}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <Btn variant="danger" style={{ padding:"4px 10px", fontSize:11 }}
                      onClick={e=>{e.stopPropagation();deleteStudent(s.id);}}>
                      🗑 Delete
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Selected student profile */}
      {selected && (
        <Card style={{ border:`2px solid ${T.blue}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
            <Avatar name={selected.name} color={selected.color} size={60} />
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>{selected.name}</h2>
              <p style={{ fontSize:12, color:T.text2, marginTop:2 }}>
                {selected.id} · {selected.dept} · Year {selected.year} · {selected.email}
              </p>
            </div>
            <button onClick={()=>setSelected(null)}
              style={{ background:"transparent", border:`1px solid ${T.border2}`,
                color:T.text2, padding:"6px 14px", borderRadius:8,
                cursor:"pointer", fontSize:12 }}>✕ Close</button>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            {[
              ["Attendance",`${selected.attendance_rate}%`,"blue"],
              ["Engagement",`${selected.engagement}%`,"green"],
              ["Attention",`${selected.attention_score}%`,"purple"],
              ["GPA",`${selected.gpa}`,"amber"],
            ].map(([l,v,a])=>(
              <div key={l} style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`,
                borderRadius:12, padding:16, textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:700,
                  color:{blue:T.blue,green:T.green,purple:T.purple,amber:T.amber}[a] }}>{v}</div>
                <div style={{ fontSize:11, color:T.text2, marginTop:4, textTransform:"uppercase",
                  letterSpacing:".05em" }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Student Modal */}
      {showAdd && (
        <Modal title="Add New Student" onClose={()=>setShowAdd(false)}>
          {[["Full Name","name","e.g. Sara Johnson"],["Email","email","name@uni.edu"]].map(([l,k,p])=>(
            <div key={k} style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:T.text3,
                display:"block", marginBottom:6, textTransform:"uppercase" }}>{l}</label>
              <Input value={addForm[k]} onChange={v=>setAddForm(f=>({...f,[k]:v}))} placeholder={p} />
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <label style={{ fontSize:11, color:T.text3, display:"block", marginBottom:6, textTransform:"uppercase" }}>Department</label>
              <Select value={addForm.dept} onChange={v=>setAddForm(f=>({...f,dept:v}))}
                options={DEPTS} style={{ width:"100%" }} />
            </div>
            <div>
              <label style={{ fontSize:11, color:T.text3, display:"block", marginBottom:6, textTransform:"uppercase" }}>Year</label>
              <Select value={addForm.year} onChange={v=>setAddForm(f=>({...f,year:v}))}
                options={["1","2","3","4"]} style={{ width:"100%" }} />
            </div>
          </div>
          <Btn onClick={addStudent} style={{ width:"100%", padding:12 }}>✅ Register Student</Btn>
        </Modal>
      )}
    </>
  );
}

function AdminDoctors() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Lecturer Management</h1>
      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["ID","Name","Department","Title","Email","Courses","Avg Engagement"].map(h=>(
                <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:T.text2,
                  fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOCTORS.map(d=>(
              <tr key={d.id} onClick={()=>setSelected(selected?.id===d.id?null:d)}
                style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer",
                  background:selected?.id===d.id?T.blue+"15":"transparent" }}
                onMouseEnter={e=>{ if(selected?.id!==d.id) e.currentTarget.style.background=T.card2; }}
                onMouseLeave={e=>{ if(selected?.id!==d.id) e.currentTarget.style.background="transparent"; }}>
                <td style={{ padding:"10px 12px", color:T.text3, fontFamily:"monospace" }}>{d.id}</td>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Avatar name={d.name} color={d.color} size={28} />
                    <span style={{ color:T.text, fontWeight:500 }}>{d.name}</span>
                  </div>
                </td>
                <td style={{ padding:"10px 12px", color:T.text2 }}>{d.dept}</td>
                <td style={{ padding:"10px 12px", color:T.text2 }}>{d.title}</td>
                <td style={{ padding:"10px 12px", color:T.text2 }}>{d.email}</td>
                <td style={{ padding:"10px 12px", color:T.text2 }}>{d.courses}</td>
                <td style={{ padding:"10px 12px" }}>
                  <span style={{ color:d.engagement>=75?T.green:T.amber }}>{d.engagement}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function AdminCourses() {
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Course Management</h1>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📚" value={COURSES.length} label="Total Courses" sub="This semester" accent="blue" />
        <StatCard icon="👨‍🏫" value={DOCTORS.length} label="Lecturers" sub="Active" accent="purple" />
        <StatCard icon="🎓" value={STUDENTS.length} label="Students" sub="Enrolled" accent="green" />
        <StatCard icon="📅" value="Fall 2024" label="Semester" sub="16 Weeks" accent="amber" />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {COURSES.map(c => {
          const enrolled = (ENROLLMENTS[c.id]||[]).length;
          const doc = DOCTORS.find(d=>d.id===c.doctor_id);
          return (
            <div key={c.id} style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"16px 20px", display:"flex",
              alignItems:"center", gap:16 }}>
              <div style={{ width:6, height:60, borderRadius:3, background:c.color, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:T.text }}>📚 {c.name}</span>
                  <Badge text={c.code} color={c.color} />
                </div>
                <div style={{ display:"flex", gap:16, fontSize:11, color:T.text2, flexWrap:"wrap" }}>
                  <span>👨‍🏫 {doc?.name||"Not assigned"}</span>
                  <span>🚪 {c.room}</span>
                  <span>⏰ {c.time}</span>
                  <span style={{ color:T.green2 }}>👥 {enrolled} students</span>
                  <span style={{ color:T.blue2 }}>📅 {c.weeks.length} weeks</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AdminEnrollments() {
  const [courseId, setCourseId] = useState(COURSES[0]?.id||"");
  const [search, setSearch] = useState("");

  const enrolled    = (ENROLLMENTS[courseId]||[]).map(id=>STUDENTS.find(s=>s.id===id)).filter(Boolean);
  const notEnrolled = STUDENTS.filter(s=>!(ENROLLMENTS[courseId]||[]).includes(s.id));

  const fEnrolled    = enrolled.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.id.includes(search));
  const fNotEnrolled = notEnrolled.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.id.includes(search));

  function enroll(sid) {
    if (!ENROLLMENTS[courseId]) ENROLLMENTS[courseId]=[];
    ENROLLMENTS[courseId].push(sid);
    setCourseId(courseId); // force re-render
  }
  function unenroll(sid) {
    ENROLLMENTS[courseId] = (ENROLLMENTS[courseId]||[]).filter(id=>id!==sid);
    setCourseId(courseId);
  }

  function StudentRow({ s, action, actionLabel, actionVariant }) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        background:T.card2, borderRadius:10, padding:"10px 14px", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name={s.name} color={s.color} size={32} />
          <div>
            <div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div>
            <div style={{ fontSize:11, color:T.text2 }}>{s.id} · {s.dept}</div>
          </div>
        </div>
        <Btn variant={actionVariant} style={{ padding:"4px 12px", fontSize:11 }}
          onClick={()=>action(s.id)}>{actionLabel}</Btn>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Enrollment Management</h1>
      <p style={{ color:T.text2, fontSize:12, marginBottom:16 }}>Manage student enrollments per course</p>

      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <Select value={courseId} onChange={setCourseId}
          options={COURSES.map(c=>({value:c.id, label:`${c.code} — ${c.name}`}))}
          style={{ width:280 }} />
        <Input value={search} onChange={setSearch}
          placeholder="🔍 Search student..." style={{ maxWidth:220 }} />
        <span style={{ fontSize:12, color:T.text2 }}>
          {fEnrolled.length} enrolled · {fNotEnrolled.length} not enrolled
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title={`📋 Not Enrolled (${fNotEnrolled.length})`}>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {fNotEnrolled.length===0
              ? <p style={{ color:T.text3, fontSize:12, textAlign:"center", padding:20 }}>All students enrolled!</p>
              : fNotEnrolled.map(s=>(
                <StudentRow key={s.id} s={s} action={enroll} actionLabel="Enroll" actionVariant="primary" />
              ))}
          </div>
        </Card>
        <Card title={`✅ Enrolled (${fEnrolled.length})`}>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {fEnrolled.length===0
              ? <p style={{ color:T.text3, fontSize:12, textAlign:"center", padding:20 }}>No students enrolled</p>
              : fEnrolled.map(s=>(
                <StudentRow key={s.id} s={s} action={unenroll} actionLabel="Remove" actionVariant="danger" />
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function AdminSettings() {
  const [toggles, setToggles] = useState({
    faceDetection:true, autoAttendance:true, saveFace:true, alertUnknown:false,
    realtimeEmotion:true, lowEngAlert:true, storeHistory:true,
  });
  function toggle(k) { setToggles(t=>({...t,[k]:!t[k]})); }
  function ToggleRow({ label, k }) {
    return (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:13, color:T.text }}>{label}</span>
        <div onClick={()=>toggle(k)}
          style={{ width:44, height:24, borderRadius:12, cursor:"pointer",
            background:toggles[k]?T.blue:T.border, transition:"background .2s",
            position:"relative" }}>
          <div style={{ position:"absolute", top:2,
            left:toggles[k]?"calc(100% - 22px)":2,
            width:20, height:20, borderRadius:"50%", background:"#fff",
            transition:"left .2s" }} />
        </div>
      </div>
    );
  }
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>System Settings</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Face Recognition">
          <ToggleRow label="Enable face detection"  k="faceDetection" />
          <ToggleRow label="Auto-mark attendance"   k="autoAttendance" />
          <ToggleRow label="Save face encodings"    k="saveFace" />
          <ToggleRow label="Alert on unknown face"  k="alertUnknown" />
        </Card>
        <Card title="Emotion Analysis">
          <ToggleRow label="Real-time emotion detection" k="realtimeEmotion" />
          <ToggleRow label="Low-engagement alerts"       k="lowEngAlert" />
          <ToggleRow label="Store emotion history"       k="storeHistory" />
        </Card>
      </div>
      <Card title="Data Source">
        <div style={{ background:T.blue+"15", border:`1px solid ${T.blue}44`,
          borderRadius:10, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.blue2, marginBottom:4 }}>
            store.json Path
          </div>
          <code style={{ fontSize:12, color:T.text2, fontFamily:"monospace" }}>
            D:/download/portal/emotion_system/gui/store.json
          </code>
        </div>
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// DOCTOR PAGE
// ══════════════════════════════════════════════════════════════
function DoctorPage({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const doctor = DOCTORS.find(d=>d.id===user.doctor_id) || DOCTORS[0];
  const myCourses = COURSES.filter(c=>c.doctor_id===doctor.id);

  const NAV = [
    { id:"dashboard",  icon:"🏠", label:"Dashboard" },
    { id:"students",   icon:"🎓", label:"My Students" },
    { id:"attendance", icon:"✅", label:"Attendance" },
    { id:"grades",     icon:"📝", label:"Exam Results" },
    { id:"chat",       icon:"💬", label:"Community" },
    { id:"analytics",  icon:"📊", label:"Analytics" },
  ];
  const labels = { dashboard:"Dashboard", students:"My Students",
    attendance:"Attendance", grades:"Exam Results",
    chat:"Community Chat", analytics:"Analytics" };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar nav={NAV} active={page} onNav={setPage} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar user={user} onLogout={onLogout} pageLabel={labels[page]||page} />
        <div style={{ flex:1, overflowY:"auto", padding:24, background:T.bg }}>
          {page==="dashboard"  && <DoctorDashboard doctor={doctor} myCourses={myCourses} />}
          {page==="students"   && <DoctorStudents myCourses={myCourses} />}
          {page==="attendance" && <DoctorAttendance myCourses={myCourses} />}
          {page==="grades"     && <DoctorGrades myCourses={myCourses} />}
          {page==="chat"       && <DoctorChat myCourses={myCourses} />}
          {page==="analytics"  && <DoctorAnalytics myCourses={myCourses} />}
        </div>
      </div>
    </div>
  );
}

function DoctorDashboard({ doctor, myCourses }) {
  const myStudentIds = new Set(myCourses.flatMap(c=>ENROLLMENTS[c.id]||[]));
  const myStudents = STUDENTS.filter(s=>myStudentIds.has(s.id));
  const present = myStudents.filter(s=>s.present).length;
  const avgEng = myStudents.length ? Math.round(myStudents.reduce((a,s)=>a+s.engagement,0)/myStudents.length) : 0;

  return (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
        <Avatar name={doctor.name} color={doctor.color} size={56} />
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Welcome, {doctor.name}</h1>
          <p style={{ color:T.text2, fontSize:12 }}>{doctor.title} · {doctor.dept}</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📚" value={myCourses.length}   label="My Courses"     sub="Active"          accent="blue" />
        <StatCard icon="🎓" value={myStudentIds.size}  label="Total Students" sub="Across courses"   accent="purple" />
        <StatCard icon="✅" value={present}             label="Present Now"    sub={`${Math.round(present/Math.max(myStudentIds.size,1)*100)}%`} accent="green" />
        <StatCard icon="🧠" value={`${avgEng}%`}       label="Avg Engagement" sub="All students"     accent="amber" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card title="My Courses">
          {myCourses.map(c=>{
            const enrolled = (ENROLLMENTS[c.id]||[]).length;
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center",
                background:T.card2, borderRadius:10, padding:"12px 14px",
                marginBottom:8, gap:12 }}>
                <div style={{ width:4, height:44, borderRadius:2, background:c.color }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:T.text2 }}>
                    {c.code} · {c.room} · {c.time} · {enrolled} students
                  </div>
                </div>
                <Badge text="Active" color={T.green} />
              </div>
            );
          })}
        </Card>
        <Card title="Emotion Snapshot">
          {Object.entries(EMO_COLOR).slice(0,5).map(([emo,col])=>{
            const cnt = myStudents.filter(s=>s.emotion===emo).length;
            if (!cnt) return null;
            return (
              <div key={emo} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span>{EMO_EMOJI[emo]}</span>
                <div style={{ flex:1, height:6, borderRadius:3, background:T.border }}>
                  <div style={{ height:6, borderRadius:3, background:col,
                    width:`${(cnt/myStudents.length)*100}%` }} />
                </div>
                <span style={{ fontSize:11, color:T.text2, minWidth:20 }}>{cnt}</span>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}

function DoctorStudents({ myCourses }) {
  const [courseId, setCourseId] = useState(myCourses[0]?.id||"");
  const [search, setSearch] = useState("");

  const enrolled = (ENROLLMENTS[courseId]||[])
    .map(id=>STUDENTS.find(s=>s.id===id)).filter(Boolean)
    .filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.id.includes(search));

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>My Students</h1>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Select value={courseId} onChange={setCourseId}
          options={myCourses.map(c=>({value:c.id,label:`${c.code} — ${c.name}`}))}
          style={{ width:280 }} />
        <Input value={search} onChange={setSearch}
          placeholder="🔍 Search student..." style={{ maxWidth:220 }} />
        <span style={{ fontSize:12, color:T.text2, alignSelf:"center" }}>
          {enrolled.length} students
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {enrolled.map(s=>(
          <div key={s.id} style={{ background:T.card, border:`1px solid ${T.border}`,
            borderRadius:12, padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <Avatar name={s.name} color={s.color} size={40} />
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                <div style={{ fontSize:11, color:T.text2 }}>{s.id} · Yr {s.year}</div>
              </div>
              {s.present
                ? <span style={{ marginLeft:"auto", background:T.green+"15", color:T.green2,
                    padding:"2px 8px", borderRadius:20, fontSize:10 }}>● Present</span>
                : <span style={{ marginLeft:"auto", background:T.red+"15", color:"#f87171",
                    padding:"2px 8px", borderRadius:20, fontSize:10 }}>○ Absent</span>}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              <span style={{ background:EMO_COLOR[s.emotion]+"22",
                color:EMO_COLOR[s.emotion], padding:"2px 8px", borderRadius:20, fontSize:10 }}>
                {EMO_EMOJI[s.emotion]} {s.emotion}
              </span>
              <span style={{ fontSize:10, color:T.text2 }}>Eng: {s.engagement}%</span>
            </div>
            <AttBar pct={s.attendance_rate} />
            <div style={{ fontSize:10, color:T.text3, marginTop:3 }}>
              Attendance: {s.attendance_rate}%
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DoctorAttendance({ myCourses }) {
  const [courseId, setCourseId] = useState(myCourses[0]?.id||"");
  const [week, setWeek] = useState("1");

  const key = `${courseId}_W${week}`;
  const records = ATTENDANCE[key] || {};
  const enrolled = ENROLLMENTS[courseId] || [];
  const present = Object.keys(records).length;

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>Attendance</h1>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Select value={courseId} onChange={setCourseId}
          options={myCourses.map(c=>({value:c.id,label:`${c.code} — ${c.name}`}))}
          style={{ width:260 }} />
        <Select value={week} onChange={setWeek}
          options={Array.from({length:8},(_,i)=>({value:String(i+1),label:`Week ${i+1}`}))}
          style={{ width:120 }} />
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="👥" value={enrolled.length} label="Enrolled"      accent="blue" />
        <StatCard icon="✅" value={present}          label="Present"       accent="green" />
        <StatCard icon="📊" value={`${Math.round(present/Math.max(enrolled.length,1)*100)}%`} label="Rate" accent="purple" />
        <StatCard icon="❌" value={enrolled.length-present} label="Absent" accent="amber" />
      </div>
      <Card title={`Week ${week} Attendance`}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {enrolled.map(sid=>{
            const s = STUDENTS.find(st=>st.id===sid);
            if (!s) return null;
            const rec = records[sid];
            return (
              <div key={sid} style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", background:T.card2,
                borderRadius:8, padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar name={s.name} color={s.color} size={32} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div>
                    <div style={{ fontSize:11, color:T.text2 }}>{s.id}</div>
                  </div>
                </div>
                {rec
                  ? <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ background:T.green+"15", color:T.green2,
                        padding:"2px 10px", borderRadius:20, fontSize:11 }}>✅ Present</span>
                      <span style={{ fontSize:11, color:T.text3 }}>{rec.method} · {Math.round(rec.confidence*100)}%</span>
                    </div>
                  : <span style={{ background:T.red+"15", color:"#f87171",
                      padding:"2px 10px", borderRadius:20, fontSize:11 }}>❌ Absent</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function DoctorGrades({ myCourses }) {
  const [courseId, setCourseId] = useState(myCourses[0]?.id||"");
  const [editSid, setEditSid] = useState(null);
  const [editGrade, setEditGrade] = useState("");
  const enrolled = (ENROLLMENTS[courseId]||[]).map(id=>STUDENTS.find(s=>s.id===id)).filter(Boolean);

  function saveGrade(sid) {
    const g = parseInt(editGrade);
    if (isNaN(g)||g<0||g>100) return;
    if (!EXAM_RESULTS[sid]) EXAM_RESULTS[sid]={};
    EXAM_RESULTS[sid][courseId] = { grade:g, date:new Date().toISOString().split("T")[0], status:"active" };
    setEditSid(null); setEditGrade("");
  }

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>Exam Results</h1>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Select value={courseId} onChange={setCourseId}
          options={myCourses.map(c=>({value:c.id,label:`${c.code} — ${c.name}`}))}
          style={{ width:280 }} />
      </div>
      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Student","ID","Grade","Letter","Status","Action"].map(h=>(
                <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:T.text2,
                  fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enrolled.map(s=>{
              const rec = EXAM_RESULTS[s.id]?.[courseId];
              const g = rec?.grade;
              const gc = g!=null?(g>=75?T.green:g>=50?T.amber:T.red):T.text3;
              return (
                <tr key={s.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={s.name} color={s.color} size={28} />
                      <span style={{ fontWeight:500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px", color:T.text3 }}>{s.id}</td>
                  <td style={{ padding:"10px 12px" }}>
                    {editSid===s.id
                      ? <input type="number" value={editGrade}
                          onChange={e=>setEditGrade(e.target.value)}
                          style={{ width:70, background:T.card2, border:`1px solid ${T.blue}`,
                            borderRadius:6, padding:"4px 8px", color:T.text, fontSize:13 }}
                          min="0" max="100" />
                      : <span style={{ color:gc, fontWeight:700 }}>
                          {g!=null?`${g}%`:"—"}
                        </span>}
                  </td>
                  <td style={{ padding:"10px 12px", color:gc }}>
                    {g!=null?letterGrade(g):"—"}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {g!=null
                      ? <span style={{ background:g>=50?T.green+"15":T.red+"15",
                          color:g>=50?T.green2:"#f87171", padding:"2px 8px",
                          borderRadius:20, fontSize:10 }}>{g>=50?"✓ Pass":"✗ Fail"}</span>
                      : <span style={{ color:T.text3, fontSize:11 }}>No grade</span>}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {editSid===s.id
                      ? <div style={{ display:"flex", gap:6 }}>
                          <Btn variant="success" style={{ padding:"4px 10px", fontSize:11 }}
                            onClick={()=>saveGrade(s.id)}>Save</Btn>
                          <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:11 }}
                            onClick={()=>setEditSid(null)}>Cancel</Btn>
                        </div>
                      : <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:11 }}
                          onClick={()=>{ setEditSid(s.id); setEditGrade(g!=null?String(g):""); }}>
                          {g!=null?"✏️ Edit":"+ Add"}
                        </Btn>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function DoctorChat({ myCourses }) {
  const [courseId, setCourseId] = useState(myCourses[0]?.id||"");
  const [messages, setMessages] = useState([
    { id:1, author:"Dr. Ahmed Sami", text:"Welcome to CS301! Office hours are Mon 10-12.", time:"09:00", isMe:true },
    { id:2, author:"Ahmed Hassan",   text:"Thank you doctor! Quick question about the assignment.",    time:"09:05", isMe:false },
    { id:3, author:"Sara Ali",       text:"When is the midterm exam?", time:"09:10", isMe:false },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  function send() {
    if (!input.trim()) return;
    setMessages(m=>[...m,{ id:Date.now(), author:"Dr. Ahmed Sami",
      text:input, time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), isMe:true }]);
    setInput("");
  }

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>Community Chat</h1>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Select value={courseId} onChange={setCourseId}
          options={myCourses.map(c=>({value:c.id,label:`${c.code} — ${c.name}`}))}
          style={{ width:280 }} />
      </div>
      <Card style={{ height:500, display:"flex", flexDirection:"column", padding:0 }}>
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex",
          flexDirection:"column", gap:10 }}>
          {messages.map(m=>(
            <div key={m.id} style={{ display:"flex",
              justifyContent:m.isMe?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"70%", background:m.isMe?T.blue:T.card2,
                borderRadius:m.isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",
                padding:"10px 14px" }}>
                {!m.isMe && <div style={{ fontSize:11, fontWeight:600, color:T.blue2,
                  marginBottom:4 }}>{m.author}</div>}
                <div style={{ fontSize:13, color:T.text }}>{m.text}</div>
                <div style={{ fontSize:10, color:m.isMe?"rgba(255,255,255,.5)":T.text3,
                  marginTop:4, textAlign:"right" }}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{ borderTop:`1px solid ${T.border}`, padding:16,
          display:"flex", gap:10 }}>
          <Input value={input} onChange={setInput} placeholder="Type a message..."
            style={{ flex:1 }} />
          <Btn onClick={send}>Send</Btn>
        </div>
      </Card>
    </>
  );
}

function DoctorAnalytics({ myCourses }) {
  const myStudentIds = new Set(myCourses.flatMap(c=>ENROLLMENTS[c.id]||[]));
  const myStudents = STUDENTS.filter(s=>myStudentIds.has(s.id));

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Analytics</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Engagement Distribution">
          <MiniBarChart height={180} data={myCourses.map((c,i)=>({
            label:c.code,
            value: Math.round(myStudents.reduce((a,s)=>a+s.engagement,0)/Math.max(myStudents.length,1)),
            color:[T.blue,T.purple,T.green,T.amber,T.cyan][i]
          }))} />
        </Card>
        <Card title="Emotion Breakdown">
          <MiniBarChart height={180} data={Object.entries(EMO_COLOR).map(([emo,col])=>({
            label:emo, value:myStudents.filter(s=>s.emotion===emo).length, color:col
          }))} />
        </Card>
        <Card title="Attendance by Week">
          <MiniBarChart height={160} data={[1,2,3,4,5,6,7,8].map(w=>({
            label:`W${w}`, value:Math.floor(50+Math.random()*50), color:T.green
          }))} />
        </Card>
        <Card title="Grade Distribution">
          <MiniBarChart height={160} data={[["A",T.green],[`B`,T.blue],["C",T.amber],["D",T.purple],["F",T.red]].map(([l,c])=>({
            label:l, value:Math.floor(5+Math.random()*25), color:c
          }))} />
        </Card>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// STUDENT PAGE
// ══════════════════════════════════════════════════════════════
function StudentPageComp({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const stu = STUDENTS.find(s=>s.id===user.student_id) || STUDENTS[0];

  const NAV = [
    { id:"dashboard",  icon:"📊", label:"Dashboard" },
    { id:"attendance", icon:"✅", label:"My Attendance" },
    { id:"emotions",   icon:"😊", label:"My Emotions" },
    { id:"schedule",   icon:"📅", label:"Schedule" },
    { id:"grades",     icon:"📝", label:"My Grades" },
    { id:"portfolio",  icon:"🎓", label:"My Portfolio" },
    { id:"chat",       icon:"💬", label:"Community" },
  ];
  const labels = { dashboard:"Dashboard", attendance:"My Attendance",
    emotions:"My Emotions", schedule:"Schedule", grades:"My Grades",
    portfolio:"My Portfolio", chat:"Community Chat" };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar nav={NAV} active={page} onNav={setPage} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar user={user} onLogout={onLogout} pageLabel={labels[page]||page} />
        <div style={{ flex:1, overflowY:"auto", padding:24, background:T.bg }}>
          {page==="dashboard"  && <StudentDashboard stu={stu} />}
          {page==="attendance" && <StudentAttendance stu={stu} />}
          {page==="emotions"   && <StudentEmotions stu={stu} />}
          {page==="schedule"   && <StudentSchedule stu={stu} />}
          {page==="grades"     && <StudentGrades stu={stu} />}
          {page==="portfolio"  && <StudentPortfolio stu={stu} />}
          {page==="chat"       && <StudentChat stu={stu} />}
        </div>
      </div>
    </div>
  );
}

function StudentDashboard({ stu }) {
  const myCourses = COURSES.filter(c=>(ENROLLMENTS[c.id]||[]).includes(stu.id));
  const results = EXAM_RESULTS[stu.id]||{};
  const grades = Object.values(results).map(r=>r.grade);
  const avgGrade = grades.length ? Math.round(grades.reduce((a,g)=>a+g,0)/grades.length) : 0;

  return (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
        <Avatar name={stu.name} color={stu.color} size={60} />
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>{stu.name}</h1>
          <p style={{ color:T.text2, fontSize:12 }}>{stu.id} · {stu.dept} · Year {stu.year}</p>
          <span style={{ background:EMO_COLOR[stu.emotion]+"22", color:EMO_COLOR[stu.emotion],
            padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>
            {EMO_EMOJI[stu.emotion]} {stu.emotion}
          </span>
        </div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📅" value={`${stu.attendance_rate}%`} label="Attendance"  accent="blue" />
        <StatCard icon="🧠" value={`${stu.engagement}%`}      label="Engagement"  accent="green" />
        <StatCard icon="👁️" value={`${stu.attention_score}%`} label="Attention"   accent="purple" />
        <StatCard icon="🎓" value={stu.gpa}                   label="GPA"         accent="amber" />
        <StatCard icon="📝" value={`${avgGrade}%`}            label="Avg Grade"   accent="blue" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card title="My Courses">
          {myCourses.length===0
            ? <p style={{ color:T.text3, fontSize:12 }}>Not enrolled in any course yet.</p>
            : myCourses.map(c=>{
              const doc = DOCTORS.find(d=>d.id===c.doctor_id);
              return (
                <div key={c.id} style={{ display:"flex", alignItems:"center",
                  background:T.card2, borderRadius:10, padding:"12px 14px",
                  marginBottom:8, gap:12 }}>
                  <div style={{ width:4, height:44, borderRadius:2, background:c.color }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:T.text2 }}>
                      {c.code} · {c.room} · {c.time} · {doc?.name||"—"}
                    </div>
                  </div>
                </div>
              );
            })}
        </Card>
        <Card title="Quick Stats">
          {[
            ["Courses",  myCourses.length,          T.blue],
            ["Grades",   Object.keys(EXAM_RESULTS[stu.id]||{}).length, T.purple],
            ["Passed",   grades.filter(g=>g>=50).length, T.green],
            ["Failed",   grades.filter(g=>g<50).length,  T.red],
          ].map(([l,v,c])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between",
              padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:13, color:T.text2 }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:700, color:c }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function StudentAttendance({ stu }) {
  const myCourses = COURSES.filter(c=>(ENROLLMENTS[c.id]||[]).includes(stu.id));

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>My Attendance</h1>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📅" value={`${stu.attendance_rate}%`} label="Overall Rate" accent="blue" />
        <StatCard icon="✅" value={Math.round(stu.attendance_rate*0.08)} label="Sessions Present" accent="green" />
        <StatCard icon="❌" value={Math.round((100-stu.attendance_rate)*0.08)} label="Sessions Absent" accent="red" />
      </div>
      {myCourses.map(c=>{
        const weeks = [1,2,3,4,5,6,7,8];
        return (
          <Card key={c.id} title={`${c.name} (${c.code})`}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {weeks.map(w=>{
                const key=`${c.id}_W${w}`;
                const present = !!(ATTENDANCE[key]?.[stu.id]);
                return (
                  <div key={w} style={{ width:44, height:44, borderRadius:8,
                    background:present?T.green+"22":T.red+"15",
                    border:`1px solid ${present?T.green:T.red}44`,
                    display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center" }}>
                    <div style={{ fontSize:9, color:T.text3 }}>W{w}</div>
                    <div style={{ fontSize:14 }}>{present?"✅":"❌"}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </>
  );
}

function StudentEmotions({ stu }) {
  const history = [
    { date:"Mon", emotion:"happy" }, { date:"Tue", emotion:"neutral" },
    { date:"Wed", emotion:"confused" }, { date:"Thu", emotion:"happy" },
    { date:"Sun", emotion:"bored" }, { date:"Mon", emotion:"neutral" },
    { date:"Tue", emotion:"happy" },
  ];

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>My Emotions</h1>
      <Card title="Current State">
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ fontSize:60 }}>{EMO_EMOJI[stu.emotion]}</div>
          <div>
            <div style={{ fontSize:24, fontWeight:700, color:EMO_COLOR[stu.emotion],
              textTransform:"capitalize" }}>{stu.emotion}</div>
            <div style={{ fontSize:12, color:T.text2, marginTop:4 }}>Current detected emotion</div>
            <div style={{ display:"flex", gap:12, marginTop:12 }}>
              <div>
                <div style={{ fontSize:11, color:T.text3 }}>Engagement</div>
                <div style={{ fontSize:18, fontWeight:700, color:T.blue }}>{stu.engagement}%</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.text3 }}>Attention</div>
                <div style={{ fontSize:18, fontWeight:700, color:T.purple }}>{stu.attention_score}%</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="Emotion History (This Week)">
        <div style={{ display:"flex", gap:10 }}>
          {history.map((h,i)=>(
            <div key={i} style={{ flex:1, textAlign:"center",
              background:EMO_COLOR[h.emotion]+"15", borderRadius:10,
              padding:"12px 8px", border:`1px solid ${EMO_COLOR[h.emotion]}44` }}>
              <div style={{ fontSize:22 }}>{EMO_EMOJI[h.emotion]}</div>
              <div style={{ fontSize:10, color:T.text3, marginTop:4 }}>{h.date}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Emotion Distribution">
        <MiniBarChart height={160} data={Object.entries(EMO_COLOR).map(([emo,col])=>({
          label:emo, value:Math.floor(Math.random()*10)+1, color:col
        }))} />
      </Card>
    </>
  );
}

function StudentSchedule({ stu }) {
  const myCourses = COURSES.filter(c=>(ENROLLMENTS[c.id]||[]).includes(stu.id));
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday"];
  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>My Schedule</h1>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {myCourses.map((c,i)=>{
          const doc = DOCTORS.find(d=>d.id===c.doctor_id);
          return (
            <div key={c.id} style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, padding:"16px 20px", display:"flex",
              alignItems:"center", gap:16 }}>
              <div style={{ width:4, height:56, borderRadius:2, background:c.color }} />
              <div style={{ width:80, textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:c.color }}>{c.time}</div>
                <div style={{ fontSize:11, color:T.text3 }}>{days[i%days.length]}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{c.name}</div>
                <div style={{ fontSize:12, color:T.text2, marginTop:2 }}>
                  {c.code} · {c.room} · {doc?.name||"—"} · {c.duration} min
                </div>
              </div>
              <Badge text="Active" color={T.green} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function StudentGrades({ stu }) {
  const results = EXAM_RESULTS[stu.id]||{};
  const grades = Object.values(results).map(r=>r.grade);
  const avg = grades.length ? Math.round(grades.reduce((a,g)=>a+g,0)/grades.length) : 0;

  if (Object.keys(results).length===0) {
    return (
      <>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>My Grades</h1>
        <div style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:48 }}>📝</div>
          <h2 style={{ fontSize:18, fontWeight:600, marginTop:16 }}>No grades yet</h2>
          <p style={{ color:T.text2, fontSize:13, marginTop:8 }}>Your lecturer has not entered grades yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>My Grades</h1>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📝" value={grades.length}                   label="Subjects"     accent="blue" />
        <StatCard icon="📊" value={`${avg}%`}                       label="Average"      accent="amber" />
        <StatCard icon="✅" value={grades.filter(g=>g>=50).length}  label="Passed"       accent="green" />
        <StatCard icon="🏆" value={`${Math.max(...grades)}%`}       label="Highest"      accent="purple" />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {Object.entries(results).map(([cid,rec])=>{
          const course = COURSES.find(c=>c.id===cid);
          const g = rec.grade;
          const gc = g>=75?T.green:g>=50?T.amber:T.red;
          return (
            <div key={cid} style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, padding:"16px 20px", display:"flex",
              alignItems:"center", gap:16 }}>
              <div style={{ width:4, height:56, borderRadius:2, background:gc }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{course?.name||cid}</div>
                <div style={{ fontSize:12, color:T.text2 }}>{cid} · {rec.date}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:28, fontWeight:700, color:gc }}>{g}%</div>
                <div style={{ fontSize:13, color:gc }}>{letterGrade(g)}</div>
              </div>
              <span style={{ background:g>=50?T.green+"15":T.red+"15",
                color:g>=50?T.green2:"#f87171", padding:"4px 12px",
                borderRadius:20, fontSize:11, fontWeight:600 }}>
                {g>=50?"✓ Pass":"✗ Fail"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StudentPortfolio({ stu }) {
  const results = EXAM_RESULTS[stu.id]||{};
  const grades = Object.values(results).map(r=>r.grade);
  const avg = grades.length ? Math.round(grades.reduce((a,g)=>a+g,0)/grades.length) : 0;
  const myCourses = COURSES.filter(c=>(ENROLLMENTS[c.id]||[]).includes(stu.id));

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>My Portfolio</h1>
      <Card style={{ border:`2px solid ${T.blue}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:24 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:T.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:32, fontWeight:700, color:"#fff", border:`3px solid ${T.blue2}` }}>
            {stu.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:700 }}>{stu.name}</h2>
            <p style={{ color:T.text2, fontSize:13, marginTop:2 }}>
              {stu.id} · {stu.dept} · Year {stu.year}
            </p>
            <p style={{ color:T.text3, fontSize:12 }}>{stu.email}</p>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[
            ["GPA",           stu.gpa,            T.amber],
            ["Attendance",    `${stu.attendance_rate}%`, T.blue],
            ["Avg Grade",     `${avg}%`,           T.green],
            ["Courses",       myCourses.length,    T.purple],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:T.card2, borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div>
          <h3 style={{ fontSize:14, fontWeight:600, color:T.text2, marginBottom:10,
            textTransform:"uppercase", letterSpacing:".07em" }}>Enrolled Courses</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {myCourses.map(c=>(
              <span key={c.id} style={{ background:c.color+"22", color:c.color,
                padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:500 }}>
                {c.code} — {c.name}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <Card title="Achievements">
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {stu.attendance_rate>=80 && <div style={{ background:T.green+"22", border:`1px solid ${T.green}44`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>🏆 High Attendance</div>}
          {stu.engagement>=70 && <div style={{ background:T.blue+"22", border:`1px solid ${T.blue}44`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>⚡ High Engagement</div>}
          {avg>=75 && <div style={{ background:T.amber+"22", border:`1px solid ${T.amber}44`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>🌟 Top Performer</div>}
        </div>
      </Card>
    </>
  );
}

function StudentChat({ stu }) {
  const [messages, setMessages] = useState([
    { id:1, author:"Dr. Ahmed Sami",  text:"Welcome to CS301! Office hours Mon 10-12.", time:"09:00", isMe:false },
    { id:2, author:"Sara Ali",         text:"When is the assignment due?",               time:"09:15", isMe:false },
    { id:3, author:stu.name,          text:"Can we get an extension?",                  time:"09:20", isMe:true },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  function send() {
    if (!input.trim()) return;
    setMessages(m=>[...m,{ id:Date.now(), author:stu.name, text:input,
      time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), isMe:true }]);
    setInput("");
  }

  return (
    <>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>Community Chat</h1>
      <Card style={{ height:520, display:"flex", flexDirection:"column", padding:0 }}>
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex",
          flexDirection:"column", gap:10 }}>
          {messages.map(m=>(
            <div key={m.id} style={{ display:"flex",
              justifyContent:m.isMe?"flex-end":"flex-start", gap:8, alignItems:"flex-end" }}>
              {!m.isMe && <Avatar name={m.author} color={T.purple} size={28} />}
              <div style={{ maxWidth:"70%", background:m.isMe?T.blue:T.card2,
                borderRadius:m.isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",
                padding:"10px 14px" }}>
                {!m.isMe && <div style={{ fontSize:11, fontWeight:600, color:T.blue2, marginBottom:4 }}>{m.author}</div>}
                <div style={{ fontSize:13, color:T.text }}>{m.text}</div>
                <div style={{ fontSize:10, color:m.isMe?"rgba(255,255,255,.5)":T.text3, marginTop:4, textAlign:"right" }}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{ borderTop:`1px solid ${T.border}`, padding:16, display:"flex", gap:10 }}>
          <Input value={input} onChange={setInput} placeholder="Type a message..."
            style={{ flex:1 }} />
          <Btn onClick={send}>Send</Btn>
        </div>
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// PARENT PAGE
// ══════════════════════════════════════════════════════════════
function ParentPage({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const child = STUDENTS.find(s=>s.id===user.student_id) || STUDENTS[0];

  const NAV = [
    { id:"dashboard",  icon:"🏠", label:"Overview" },
    { id:"attendance", icon:"✅", label:"Attendance" },
    { id:"grades",     icon:"📝", label:"Grades" },
    { id:"emotions",   icon:"😊", label:"Emotions" },
    { id:"schedule",   icon:"📅", label:"Schedule" },
  ];
  const labels = { dashboard:"Overview", attendance:"Attendance",
    grades:"Grades", emotions:"Emotions", schedule:"Schedule" };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar nav={NAV} active={page} onNav={setPage} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar user={user} onLogout={onLogout} pageLabel={labels[page]||page} />
        <div style={{ flex:1, overflowY:"auto", padding:24, background:T.bg }}>
          {page==="dashboard"  && <ParentDashboard child={child} user={user} />}
          {page==="attendance" && <StudentAttendance stu={child} />}
          {page==="grades"     && <StudentGrades stu={child} />}
          {page==="emotions"   && <StudentEmotions stu={child} />}
          {page==="schedule"   && <StudentSchedule stu={child} />}
        </div>
      </div>
    </div>
  );
}

function ParentDashboard({ child, user }) {
  const myCourses = COURSES.filter(c=>(ENROLLMENTS[c.id]||[]).includes(child.id));
  const results = EXAM_RESULTS[child.id]||{};
  const grades = Object.values(results).map(r=>r.grade);
  const avg = grades.length ? Math.round(grades.reduce((a,g)=>a+g,0)/grades.length) : 0;

  return (
    <>
      <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14,
        padding:24, marginBottom:20 }}>
        <div style={{ fontSize:13, color:T.text3, marginBottom:4 }}>Monitoring child</div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <Avatar name={child.name} color={child.color} size={60} />
          <div>
            <h2 style={{ fontSize:20, fontWeight:700 }}>{child.name}</h2>
            <p style={{ color:T.text2, fontSize:12, marginTop:2 }}>
              {child.id} · {child.dept} · Year {child.year}
            </p>
            <span style={{ background:EMO_COLOR[child.emotion]+"22",
              color:EMO_COLOR[child.emotion], padding:"2px 10px",
              borderRadius:20, fontSize:11, fontWeight:600 }}>
              {EMO_EMOJI[child.emotion]} {child.emotion}
            </span>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:12, color:T.text3 }}>Parent:</div>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{user.name}</div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <StatCard icon="📅" value={`${child.attendance_rate}%`} label="Attendance"  accent="blue" />
        <StatCard icon="🧠" value={`${child.engagement}%`}      label="Engagement"  accent="green" />
        <StatCard icon="📝" value={`${avg}%`}                   label="Avg Grade"   accent="amber" />
        <StatCard icon="🎓" value={child.gpa}                   label="GPA"         accent="purple" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card title="Enrolled Courses">
          {myCourses.map(c=>{
            const doc = DOCTORS.find(d=>d.id===c.doctor_id);
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center",
                background:T.card2, borderRadius:10, padding:"12px 14px",
                marginBottom:8, gap:12 }}>
                <div style={{ width:4, height:40, borderRadius:2, background:c.color }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:T.text2 }}>{c.code} · {doc?.name||"—"}</div>
                </div>
              </div>
            );
          })}
        </Card>
        <Card title="Alerts">
          {child.attendance_rate < 70 && (
            <div style={{ background:T.red+"15", border:`1px solid ${T.red}44`,
              borderRadius:10, padding:12, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#f87171" }}>⚠ Low Attendance</div>
              <div style={{ fontSize:11, color:T.text2, marginTop:2 }}>
                {child.attendance_rate}% — below the 70% required
              </div>
            </div>
          )}
          {child.engagement < 50 && (
            <div style={{ background:T.amber+"15", border:`1px solid ${T.amber}44`,
              borderRadius:10, padding:12, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.amber }}>⚡ Low Engagement</div>
              <div style={{ fontSize:11, color:T.text2, marginTop:2 }}>
                Engagement at {child.engagement}% this week
              </div>
            </div>
          )}
          {child.attendance_rate >= 70 && child.engagement >= 50 && (
            <div style={{ background:T.green+"15", border:`1px solid ${T.green}44`,
              borderRadius:10, padding:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.green2 }}>✅ All Good</div>
              <div style={{ fontSize:11, color:T.text2, marginTop:2 }}>
                No alerts at this time
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => { injectCSS(); }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      try {
        setLoading(true);
        setLoadError("");

        // Loads the persisted store.json. Vite serves files from /public,
        // so we copy it into the frontend as a static asset.
        const res = await fetch('/store.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load store.json: ${res.status}`);
        const store = await res.json();

        // Map store.json structure into the global constants used throughout this file.
        DEPTS = store?.DEPTS || DEPTS;
        EMOTIONS = store?.EMOTIONS || EMOTIONS;

        STUDENTS = store?.students || [];
        DOCTORS = store?.doctors || [];
        COURSES = store?.courses || [];
        ATTENDANCE = store?.attendance || {};
        EXAM_RESULTS = store?.exam_results || store?.examResults || {};
        ENROLLMENTS = store?.course_enrollments || store?.enrollments || store?.courseEnrollments || {};

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setLoadError(String(e?.message || e));
          setLoading(false);
        }
      }
    }

    loadStore();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.text }}>
        Loading store.json...
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  const props = { user, onLogout: () => setUser(null) };

  if (loadError) {
    // Non-blocking: UI still works with whatever global data is present.
    // eslint-disable-next-line no-console
    console.warn('store.json load error:', loadError);
  }

  if (user.role === "admin")   return <AdminPage   {...props} />;
  if (user.role === "doctor")  return <DoctorPage  {...props} />;
  if (user.role === "student") return <StudentPageComp {...props} />;
  if (user.role === "parent")  return <ParentPage  {...props} />;

  return <div style={{ color:T.text, padding:40 }}>Unknown role: {user.role}</div>;
}

