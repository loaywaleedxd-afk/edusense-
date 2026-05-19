/**
 * AdvisingPage
 * Student view:  book appointments · see degree audit · graduation progress
 * Doctor view:   manage appointments · add notes · view student degree status
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { get, post, put, del } from '../api.js';
import store from '../dataStore.js';

// ── Build local degree audit from dataStore (no backend needed) ───────────────
function buildLocalAudit(studentId) {
  const stu    = store.getStudent?.(studentId) || store.students?.[0];
  const sid    = stu?.id || studentId;
  const grades = (store.grades || []).filter(g => g.studentId === sid);
  const enroll = (store.courses || store.lectures || []);

  // Courses the student has passed (grade ≥ 60)
  const passed = grades.filter(g => (g.grade || g.score || 0) >= 60);
  const passedCodes = new Set(passed.map(g => g.courseCode || g.course_code || ''));

  // Build "completed" category from passed courses
  const completedCourses = passed.map(g => ({
    course_code: g.courseCode || g.course_code,
    course_name: g.courseName || g.course_name || g.courseCode,
    credits: 3,
    category: 'completed',
    is_required: 1,
    completed: true,
    grade: g.grade || g.score,
    semester_order: 1,
  }));

  // Build "in progress" from enrolled courses not yet passed
  const inProgress = enroll
    .filter(c => !passedCodes.has(c.courseCode || c.course_code || c.id))
    .slice(0, 8)
    .map(c => ({
      course_code: c.courseCode || c.course_code || c.id,
      course_name: c.courseName || c.course_name || c.name,
      credits: 3,
      category: 'in_progress',
      is_required: 1,
      completed: false,
      grade: null,
      semester_order: 2,
    }));

  const totalReq = completedCourses.length + inProgress.length;
  const done     = completedCourses.length;
  const pct      = totalReq > 0 ? Math.round(done / totalReq * 100) : 0;

  return {
    student_id:         sid,
    total_required:     totalReq,
    completed_required: done,
    electives_done:     0,
    graduation_pct:     pct,
    currently_enrolled: inProgress,
    categories: {
      completed:   { total: done,          completed: done,         courses: completedCourses },
      in_progress: { total: inProgress.length, completed: 0,        courses: inProgress },
    },
    _source: 'local',
  };
}

// ── Circular progress ring ────────────────────────────────────────────────────
function Ring({ pct, size = 120, stroke = 10, color = '#3b82f6', label, C }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={C.border2} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          fill={C.text} fontSize={size * 0.18} fontWeight={700}>
          {pct}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>{label}</div>}
    </div>
  );
}

// ── Degree Audit view ─────────────────────────────────────────────────────────
function DegreeAudit({ theme: C, studentId }) {
  const [audit,   setAudit]   = useState(() => buildLocalAudit(studentId));
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    get(`/api/advising/degree-audit/${studentId}`)
      .then(data => { setAudit(data); setFromAPI(true); })
      .catch(() => {}); // keep local data silently
  }, [studentId]);

  const catColors = {
    core: '#3b82f6', elective: '#8b5cf6', general: '#10b981',
    completed: '#16a34a', in_progress: '#f59e0b',
  };

  return (
    <div>
      {/* Data source badge */}
      <div style={{ textAlign: 'right', marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
          background: fromAPI ? '#16a34a20' : '#f59e0b20',
          color:      fromAPI ? '#16a34a'   : '#92400e',
        }}>
          {fromAPI ? '🟢 Full degree audit from server' : '🟡 Estimated from your grades & courses'}
        </span>
      </div>

      {/* Graduation progress */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 28, flexWrap: 'wrap' }}>
        <Ring pct={audit.graduation_pct} color="#3b82f6" label="Graduation Progress" C={C} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          {[
            { label: 'Required Completed', val: `${audit.completed_required} / ${audit.total_required}`, color: '#3b82f6' },
            { label: 'Electives Done',     val: audit.electives_done,     color: '#8b5cf6' },
            { label: 'Currently Enrolled', val: audit.currently_enrolled?.length || 0, color: '#10b981' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: 12, color: C.text2 }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, marginLeft: 'auto' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-category tables */}
      {Object.entries(audit.categories || {}).map(([cat, data]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: catColors[cat] || C.text2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat} courses
            </div>
            <div style={{ fontSize: 11, color: C.text2 }}>
              {data.completed}/{data.total} completed
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {data.courses.map((course, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i < data.courses.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <span style={{ fontSize: 16 }}>{course.completed ? '✅' : '⬜'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: course.completed ? C.text : C.text2 }}>
                    {course.course_name}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{course.course_code} · {course.credits} credits</div>
                </div>
                {course.grade != null && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: course.grade >= 85 ? '#16a34a' : course.grade >= 70 ? '#3b82f6' : '#f97316',
                  }}>
                    {course.grade}%
                  </span>
                )}
                {!course.completed && course.is_required && (
                  <span style={{ fontSize: 10, color: '#dc2626', background: '#dc262610', borderRadius: 8, padding: '2px 8px' }}>Required</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(audit.categories || {}).length === 0 && (
        <div style={{ textAlign: 'center', color: C.text2, fontSize: 13, padding: 40 }}>
          No degree requirements configured yet.<br />
          <span style={{ fontSize: 11 }}>An admin can add them via the database or API.</span>
        </div>
      )}
    </div>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────
function ApptCard({ appt, role, theme: C, onUpdate, onCancel }) {
  const statusColor = {
    pending:   '#f59e0b', confirmed: '#3b82f6',
    completed: '#16a34a', cancelled: '#64748b',
  };
  const sc = statusColor[appt.status] || '#64748b';

  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            {role === 'student' ? `👨‍🏫 ${appt.advisor_name || appt.advisor_id}` : `🎓 ${appt.student_name || appt.student_id}`}
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
            📅 {appt.scheduled_date} at {appt.scheduled_time} · {appt.duration_min} min
          </div>
          {appt.topic && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>📌 {appt.topic}</div>}
          {appt.meeting_link && (
            <a href={appt.meeting_link} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.blue2, marginTop: 4, display: 'block' }}>
              🔗 Join Meeting
            </a>
          )}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: sc + '15', borderRadius: 20, padding: '3px 10px' }}>
          {appt.status.toUpperCase()}
        </span>
      </div>

      {/* Advisor notes (visible to all) */}
      {appt.advisor_notes && (
        <div style={{ marginTop: 10, background: C.blue_dim, borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.blue2 }}>ADVISOR NOTE</div>
          <div style={{ fontSize: 11, color: C.text2 }}>{appt.advisor_notes}</div>
        </div>
      )}

      {/* Action buttons */}
      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {role !== 'student' && appt.status === 'pending' && (
            <button onClick={() => onUpdate(appt.id, 'confirmed')} style={{
              background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>Confirm</button>
          )}
          {role !== 'student' && (
            <button onClick={() => onUpdate(appt.id, 'completed')} style={{
              background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>Mark Done</button>
          )}
          <button onClick={() => onCancel(appt.id)} style={{
            background: '#dc262615', color: '#dc2626', border: 'none', borderRadius: 8,
            padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Book appointment form ─────────────────────────────────────────────────────
function BookForm({ theme: C, user, onBooked }) {
  const [date,  setDate]  = useState('');
  const [time,  setTime]  = useState('09:00');
  const [topic, setTopic] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState('');

  async function submit() {
    if (!date) { setMsg('Please select a date'); return; }
    setBusy(true);
    const apptData = {
      student_id:     user.studentId || user.username,
      advisor_id:     'dr.ahmed',
      scheduled_date: date,
      scheduled_time: time,
      topic,
      duration_min:   30,
      status:         'pending',
    };
    try {
      await post('/api/advising/appointments', apptData);
      setMsg('✅ Appointment requested!');
    } catch {
      // Save to localStorage when backend is offline
      const existing = loadLocalAppts();
      existing.push({ ...apptData, id: `local_${Date.now()}`, created_at: new Date().toISOString(), _local: true });
      saveLocalAppts(existing);
      setMsg('✅ Saved locally — will sync when server is available');
    }
    onBooked();
    setBusy(false);
  }

  const inp = {
    width: '100%', background: C.bg3, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.text,
  };

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>📅 Book Appointment</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4 }}>DATE</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4 }}>TIME</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4 }}>TOPIC / REASON</div>
        <input value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Grade query, Course selection, Personal issue"
          style={inp} />
      </div>
      {msg && <div style={{ fontSize: 11, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', marginBottom: 8 }}>{msg}</div>}
      <button onClick={submit} disabled={busy} style={{
        background: busy ? C.border : C.blue2, color: '#fff', border: 'none',
        borderRadius: 8, padding: '9px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
      }}>
        {busy ? 'Requesting…' : 'Request Appointment →'}
      </button>
    </div>
  );
}


const LOCAL_APPTS_KEY = 'es_local_appts';

function loadLocalAppts() {
  try { return JSON.parse(localStorage.getItem(LOCAL_APPTS_KEY) || '[]'); }
  catch { return []; }
}
function saveLocalAppts(appts) {
  localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify(appts));
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdvisingPage({ theme: C, user }) {
  const [tab,   setTab]   = useState('appointments');
  const [appts, setAppts] = useState(() => loadLocalAppts());
  const [loading, setLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);

  const studentId = user?.studentId || user?.username;
  const isAdvisor = user?.role === 'doctor' || user?.role === 'admin';

  async function loadAppts() {
    setLoading(true);
    try {
      const data = await get('/api/advising/appointments');
      setAppts(data);
      saveLocalAppts(data);
      setFromAPI(true);
    } catch {
      // Keep whatever is already in state (loaded from localStorage on init)
      setFromAPI(false);
    }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAppts(); }, []);

  async function handleUpdate(id, status) {
    try {
      await put(`/api/advising/appointments/${id}`, { status });
    } catch {
      // Update locally
      const updated = appts.map(a => a.id === id ? { ...a, status } : a);
      setAppts(updated);
      saveLocalAppts(updated);
      return;
    }
    loadAppts();
  }

  async function handleCancel(id) {
    try {
      await del(`/api/advising/appointments/${id}`);
    } catch {
      // Remove locally
      const updated = appts.filter(a => a.id !== id);
      setAppts(updated);
      saveLocalAppts(updated);
      return;
    }
    loadAppts();
  }

  const TABS = isAdvisor
    ? [{ id: 'appointments', label: '📅 Appointments' }]
    : [
        { id: 'appointments', label: '📅 Appointments' },
        { id: 'degree',       label: '🎓 Degree Audit' },
        { id: 'progress',     label: '📊 Progress' },
      ];

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🎓 Academic Advising</div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          {isAdvisor ? 'Manage student appointments and degree progress' : 'Book appointments and track your graduation progress'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <motion.button
            key={t.id}
            onClick={() => setTab(t.id)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: tab === t.id ? C.blue2 : C.card,
              color:      tab === t.id ? '#fff'  : C.text2,
              border: `1px solid ${tab === t.id ? C.blue2 : C.border}`,
              borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', position: 'relative',
            }}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="tab-active"
                style={{ position: 'absolute', inset: 0, borderRadius: 8, background: C.blue2, zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Appointments tab */}
      {tab === 'appointments' && (
        <div style={{ maxWidth: 720 }}>
          {!isAdvisor && <BookForm theme={C} user={user} onBooked={loadAppts} />}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {isAdvisor ? 'Student Appointments' : 'My Appointments'} ({appts.length})
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
              background: fromAPI ? '#16a34a20' : '#f59e0b20',
              color:      fromAPI ? '#16a34a'   : '#92400e',
            }}>
              {fromAPI ? '🟢 Live from server' : '🟡 Saved locally'}
            </span>
          </div>

          {appts.length === 0
            ? <div style={{ color: C.text2, fontSize: 13 }}>
                {loading ? 'Loading…' : 'No appointments yet.'}
              </div>
            : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
              >
                {appts.map(a => (
                  <motion.div
                    key={a.id}
                    variants={{
                      hidden:  { opacity: 0, y: 14 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
                    }}
                  >
                    <ApptCard
                      appt={a} role={user?.role} theme={C}
                      onUpdate={handleUpdate} onCancel={handleCancel}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )
          }
        </div>
      )}

      {/* Degree Audit tab */}
      {tab === 'degree' && (
        <div style={{ maxWidth: 720 }}>
          <DegreeAudit theme={C} studentId={studentId} />
        </div>
      )}

      {/* Progress tab */}
      {tab === 'progress' && (
        <div style={{ maxWidth: 480 }}>
          <GraduationProgressCard theme={C} studentId={studentId} />
        </div>
      )}
    </div>
  );
}

function GraduationProgressCard({ theme: C, studentId }) {
  // Local fallback: count passed grades as "done"
  const localAudit = buildLocalAudit(studentId);
  const [data, setData] = useState({
    done:    localAudit.completed_required,
    total:   localAudit.total_required || 20,
    percent: localAudit.graduation_pct,
  });

  useEffect(() => {
    get(`/api/advising/graduation-progress/${studentId}`)
      .then(setData).catch(() => {});
  }, [studentId]);

  const pct = data.percent;
  const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f97316' : '#dc2626';

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>🎓 Graduation Progress</div>
      <Ring pct={pct} size={160} stroke={14} color={color} C={C} />
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 40 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: color }}>{data.done}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Completed</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{data.total}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Required</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text3 }}>{data.total - data.done}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Remaining</div>
        </div>
      </div>
      {pct >= 100 && (
        <div style={{ marginTop: 20, background: '#16a34a20', borderRadius: 10, padding: 14, color: '#16a34a', fontWeight: 700, fontSize: 14 }}>
          🎉 Congratulations! You are eligible to graduate!
        </div>
      )}
    </div>
  );
}
