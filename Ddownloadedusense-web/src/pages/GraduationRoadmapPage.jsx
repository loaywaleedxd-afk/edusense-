import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import store from '../dataStore';

const LS_PREFIX = 'es_roadmap_';

/* ── Curriculum ─────────────────────────────────────────────────────────────── */
const CURRICULUM = [
  { sem: 1, year: 1, label: 'Year 1 — Semester 1', courses: [
    { code:'MATH101', name:'Calculus I',              credits:3, cat:'core' },
    { code:'CS101',   name:'Intro to CS',              credits:3, cat:'core' },
    { code:'ENG101',  name:'English Composition',      credits:2, cat:'gen'  },
    { code:'PHYS101', name:'Physics I',                credits:3, cat:'core' },
    { code:'GEN101',  name:'Critical Thinking',        credits:2, cat:'gen'  },
  ]},
  { sem: 2, year: 1, label: 'Year 1 — Semester 2', courses: [
    { code:'MATH102', name:'Calculus II',              credits:3, cat:'core' },
    { code:'CS102',   name:'Programming Fundamentals', credits:3, cat:'core' },
    { code:'PHYS102', name:'Physics II',               credits:3, cat:'core' },
    { code:'STAT101', name:'Statistics',               credits:2, cat:'core' },
    { code:'GEN102',  name:'Technical Writing',        credits:2, cat:'gen'  },
  ]},
  { sem: 3, year: 2, label: 'Year 2 — Semester 1', courses: [
    { code:'CS201',   name:'Data Structures',          credits:3, cat:'core' },
    { code:'CS202',   name:'Discrete Mathematics',     credits:3, cat:'core' },
    { code:'MATH201', name:'Linear Algebra',           credits:3, cat:'core' },
    { code:'GEN201',  name:'Ethics in Technology',     credits:2, cat:'gen'  },
  ]},
  { sem: 4, year: 2, label: 'Year 2 — Semester 2', courses: [
    { code:'CS203',   name:'Algorithms',               credits:3, cat:'core'    },
    { code:'CS204',   name:'Operating Systems',        credits:3, cat:'core'    },
    { code:'CS205',   name:'Database Systems',         credits:3, cat:'core'    },
    { code:'ELE201',  name:'Elective I',               credits:3, cat:'elective'},
  ]},
  { sem: 5, year: 3, label: 'Year 3 — Semester 1', courses: [
    { code:'CS301',   name:'Computer Networks',        credits:3, cat:'core'    },
    { code:'CS302',   name:'Software Engineering',     credits:3, cat:'core'    },
    { code:'CS303',   name:'Artificial Intelligence',  credits:3, cat:'core'    },
    { code:'ELE301',  name:'Elective II',              credits:3, cat:'elective'},
  ]},
  { sem: 6, year: 3, label: 'Year 3 — Semester 2', courses: [
    { code:'CS304',   name:'Machine Learning',         credits:3, cat:'core'    },
    { code:'CS305',   name:'Computer Security',        credits:3, cat:'core'    },
    { code:'CS306',   name:'Compiler Design',          credits:3, cat:'core'    },
    { code:'ELE302',  name:'Elective III',             credits:3, cat:'elective'},
  ]},
  { sem: 7, year: 4, label: 'Year 4 — Semester 1', courses: [
    { code:'CS401',   name:'Capstone Project I',       credits:3, cat:'capstone'},
    { code:'CS402',   name:'Research Methods',         credits:2, cat:'core'    },
    { code:'ELE401',  name:'Elective IV',              credits:3, cat:'elective'},
    { code:'ELE402',  name:'Elective V',               credits:3, cat:'elective'},
  ]},
  { sem: 8, year: 4, label: 'Year 4 — Semester 2', courses: [
    { code:'CS403',   name:'Capstone Project II',      credits:3, cat:'capstone'},
    { code:'CS404',   name:'Internship',               credits:6, cat:'capstone'},
    { code:'CS405',   name:'Senior Seminar',           credits:1, cat:'gen'     },
  ]},
];

const CAT_META = {
  core:     { label: 'Core',     color: '#3b82f6' },
  gen:      { label: 'General',  color: '#8b5cf6' },
  elective: { label: 'Elective', color: '#f59e0b' },
  capstone: { label: 'Capstone', color: '#10b981' },
};

/* ── localStorage helpers ─────────────────────────────────────────────────── */
function loadOverrides(stuId) {
  try { return JSON.parse(localStorage.getItem(LS_PREFIX + stuId) || '{}'); } catch { return {}; }
}
function saveOverrides(stuId, obj) { localStorage.setItem(LS_PREFIX + stuId, JSON.stringify(obj)); }

const ROADMAP_CUSTOM_KEY = 'es_roadmap_custom_courses';
function loadCustomSemesters() {
  try { return JSON.parse(localStorage.getItem(ROADMAP_CUSTOM_KEY) || '[]'); } catch { return []; }
}
function saveCustomSemesters(arr) { localStorage.setItem(ROADMAP_CUSTOM_KEY, JSON.stringify(arr)); }

/* Build curriculum merged with store courses */
function buildCurriculum() {
  const custom = loadCustomSemesters(); // [{ semIdx (0-based), code, name, credits, cat }]
  const result = CURRICULUM.map(s => ({ ...s, courses: [...s.courses] }));
  custom.forEach(entry => {
    const sem = result[entry.semIdx];
    if (sem && !sem.courses.some(c => c.code === entry.code)) {
      sem.courses.push({ code: entry.code, name: entry.name, credits: entry.credits || 3, cat: entry.cat || 'elective', custom: true });
    }
  });
  return result;
}

/* ── Default status by student year ──────────────────────────────────────── */
function defaultStatus(code, stu) {
  const COMPLETED_SEMS = [1, 2]; // semesters auto-completed
  const semNum = CURRICULUM.findIndex(s => s.courses.some(c => c.code === code)) + 1;
  const stuYear = stu?.year || 1;
  if (semNum === 0) return 'not_started';
  if (semNum <= COMPLETED_SEMS.length) return 'completed';
  if (Math.ceil(semNum / 2) < stuYear) return 'completed';
  if (Math.ceil(semNum / 2) === stuYear) return 'in_progress';
  return 'not_started';
}

/* ══════════════════════════════════════════════════ Main component ══════ */
export default function GraduationRoadmapPage({ theme: C, stu, role = 'student' }) {
  const { t, isRTL } = useLang();
  const isAdmin = role === 'admin';

  // Admin: student picker
  const [selectedStuId, setSelectedStuId] = useState(stu?.id || store.students[0]?.id || '');
  const activeStu = isAdmin ? store.getStudent(selectedStuId) || store.students[0] : stu;

  // Overrides: { [code]: 'completed'|'in_progress'|'not_started' }
  const [overrides, setOverrides] = useState(() => loadOverrides(activeStu?.id || ''));

  function loadStu(id) {
    setSelectedStuId(id);
    setOverrides(loadOverrides(id));
  }

  function getCourseStatus(code) {
    if (overrides[code]) return overrides[code];
    return defaultStatus(code, activeStu);
  }

  function toggleStatus(code) {
    if (!isAdmin) return;
    const cur = getCourseStatus(code);
    const next = cur === 'completed' ? 'not_started' : cur === 'in_progress' ? 'completed' : 'in_progress';
    const updated = { ...overrides, [code]: next };
    setOverrides(updated);
    saveOverrides(activeStu?.id || '', updated);
  }

  const [expanded, setExpanded] = useState(new Set([1, 2, 3]));
  const [filter,   setFilter]   = useState('all');
  const [curriculum, setCurriculum] = useState(() => buildCurriculum());
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [addCourseForm, setAddCourseForm] = useState({ semIdx: 0, code: '', name: '', credits: 3, cat: 'elective' });
  const [stuSearch, setStuSearch] = useState('');

  // Filtered student list for admin picker
  const filteredStudents = stuSearch
    ? store.students.filter(s =>
        s.name.toLowerCase().includes(stuSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(stuSearch.toLowerCase())
      )
    : store.students;

  function addCourseToRoadmap() {
    const { semIdx, code, name, credits, cat } = addCourseForm;
    if (!code.trim() || !name.trim()) return alert('Course code and name are required');
    const allCodes = curriculum.flatMap(s => s.courses.map(c => c.code));
    if (allCodes.includes(code.trim().toUpperCase())) return alert('Course code already exists in roadmap');
    const entry = { semIdx: Number(semIdx), code: code.trim().toUpperCase(), name: name.trim(), credits: Number(credits), cat };
    const existing = loadCustomSemesters();
    saveCustomSemesters([...existing, entry]);
    setCurriculum(buildCurriculum());
    setAddCourseForm({ semIdx: 0, code: '', name: '', credits: 3, cat: 'elective' });
    setShowAddCourse(false);
  }

  function removeCourseFromRoadmap(code) {
    const existing = loadCustomSemesters().filter(e => e.code !== code);
    saveCustomSemesters(existing);
    setCurriculum(buildCurriculum());
  }

  // Sync store courses into roadmap (match by code)
  function syncStoreCoursesToRoadmap() {
    const existing = loadCustomSemesters();
    const existingCodes = new Set([
      ...curriculum.flatMap(s => s.courses.map(c => c.code)),
      ...existing.map(e => e.code),
    ]);
    const newEntries = store.courses
      .filter(c => !existingCodes.has(c.code))
      .map(c => ({ semIdx: 7, code: c.code, name: c.name, credits: 3, cat: 'elective' }));
    if (!newEntries.length) return alert('All store courses are already in the roadmap');
    saveCustomSemesters([...existing, ...newEntries]);
    setCurriculum(buildCurriculum());
    alert(`Added ${newEntries.length} course(s) from the Courses page to Semester 8`);
  }

  function toggle(sem) {
    setExpanded(prev => { const n = new Set(prev); n.has(sem) ? n.delete(sem) : n.add(sem); return n; });
  }

  const allCourses = curriculum.flatMap(s => s.courses);
  const totalCredits     = allCourses.reduce((a, c) => a + c.credits, 0);
  const completedCredits = allCourses.filter(c => getCourseStatus(c.code) === 'completed').reduce((a, c) => a + c.credits, 0);
  const inProgressCredits = allCourses.filter(c => getCourseStatus(c.code) === 'in_progress').reduce((a, c) => a + c.credits, 0);
  const pct = Math.round((completedCredits / totalCredits) * 100);

  const filterOpts = [
    { id: 'all',      label: t('all') },
    { id: 'core',     label: 'Core' },
    { id: 'elective', label: 'Elective' },
    { id: 'capstone', label: 'Capstone' },
    { id: 'gen',      label: 'General' },
  ];

  const STATUS_META = {
    completed:   { icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: t('completed') },
    in_progress: { icon: '🔵', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: t('in_progress') },
    not_started: { icon: '⬜', color: C.text3,   bg: C.bg3,                   label: t('not_started') },
  };

  return (
    <div style={{ padding: '8px 20px 40px' }}>

      {/* ── Header ── */}
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('grad_roadmap')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>{t('grad_roadmap_sub')}</div>

      {/* ── Admin: student selector + course management ── */}
      {isAdmin && (
        <>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>👤 Student</div>
            <input
              value={stuSearch}
              onChange={e => setStuSearch(e.target.value)}
              placeholder="Search by name or ID…"
              style={{ height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 12, color: C.text, width: 180 }}
            />
            <select
              value={selectedStuId}
              onChange={e => loadStu(e.target.value)}
              style={{ flex: 1, minWidth: 220, height: 38, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 13, color: C.text }}
            >
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.id} — {s.dept} (Y{s.year})</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: C.text3 }}>Click a course card to toggle status</div>
          </div>

          {/* Course management toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setShowAddCourse(v => !v)} style={{ background: showAddCourse ? C.card : 'linear-gradient(135deg,#3b82f6,#6366f1)', border: showAddCourse ? `1px solid ${C.border}` : 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: showAddCourse ? C.text2 : '#fff', cursor: 'pointer' }}>
              {showAddCourse ? '✕ Cancel' : '+ Add Course to Roadmap'}
            </button>
            <button onClick={syncStoreCoursesToRoadmap} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#10b981', cursor: 'pointer' }}>
              🔄 Sync from Courses Page
            </button>
          </div>

          {showAddCourse && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: C.card, border: `1px solid ${C.blue}`, borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Add Course to Roadmap</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
                {[['code','Course Code (e.g. CS501)','text'],['name','Course Name','text'],['credits','Credits','number']].map(([k,ph,tp]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>{ph}</div>
                    <input type={tp} value={addCourseForm[k]} onChange={e => setAddCourseForm(f => ({ ...f, [k]: e.target.value }))}
                      placeholder={ph} style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Semester</div>
                  <select value={addCourseForm.semIdx} onChange={e => setAddCourseForm(f => ({ ...f, semIdx: e.target.value }))}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                    {CURRICULUM.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Category</div>
                  <select value={addCourseForm.cat} onChange={e => setAddCourseForm(f => ({ ...f, cat: e.target.value }))}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                    {Object.entries(CAT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addCourseToRoadmap} style={{ background: C.green, border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                ✅ Add Course
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* ── Progress summary ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{activeStu?.name || ''} — {t('graduation_progress')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{pct}%</div>
        </div>
        <div style={{ height: 12, background: C.bg3, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 8, background: `linear-gradient(90deg,${C.blue},${C.cyan})` }}
          />
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {[
            { label: t('credits_earned'),   value: completedCredits,  color: '#10b981' },
            { label: t('in_progress'),       value: inProgressCredits, color: C.blue    },
            { label: isRTL ? 'متبقية' : 'Remaining', value: totalCredits - completedCredits - inProgressCredits, color: C.text3 },
            { label: t('credits_required'), value: totalCredits,       color: C.text2   },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {filterOpts.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? (f.id === 'all' ? C.blue3 : CAT_META[f.id]?.color || C.blue3) : C.bg3,
              border: `1px solid ${filter === f.id ? (CAT_META[f.id]?.color || C.blue) : C.border}`,
              borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700,
              color: filter === f.id ? '#fff' : C.text2, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f.id !== 'all' && <span style={{ marginRight: 5, color: filter === f.id ? '#ffffffaa' : CAT_META[f.id]?.color }}>●</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Admin legend ── */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 11, color: C.text3, alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>{isRTL ? 'الحالة:' : 'Status:'}</span>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{m.icon}</span> <span style={{ color: m.color }}>{m.label}</span>
            </span>
          ))}
          <span style={{ color: C.blue, marginLeft: 8 }}>← {isRTL ? 'انقر لتغيير' : 'click to change'}</span>
        </div>
      )}

      {/* ── Semester cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {curriculum.map(sem => {
          const open    = expanded.has(sem.sem);
          const courses = filter === 'all' ? sem.courses : sem.courses.filter(c => c.cat === filter);
          if (filter !== 'all' && courses.length === 0) return null;
          const semDone  = sem.courses.filter(c => getCourseStatus(c.code) === 'completed').length;
          const semTotal = sem.courses.length;

          return (
            <div key={sem.sem} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              {/* Semester header */}
              <div
                onClick={() => toggle(sem.sem)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                  justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row',
                  background: semDone === semTotal ? 'rgba(16,185,129,0.06)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: semDone === semTotal ? '#10b981' : semDone > 0 ? C.blue : C.bg3,
                    fontSize: 13, fontWeight: 700, color: semDone > 0 ? '#fff' : C.text3,
                  }}>
                    {semDone === semTotal ? '✓' : `${sem.year}.${sem.sem % 2 === 1 ? '1' : '2'}`}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{sem.label}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>
                      {semDone}/{semTotal} {t('completed')} · {sem.courses.reduce((a,c)=>a+c.credits,0)} {t('credits')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 70, height: 5, background: C.bg3, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: semDone === semTotal ? '#10b981' : C.blue, width: `${(semDone / semTotal) * 100}%`, transition: 'width 0.4s' }}/>
                  </div>
                  <span style={{ color: C.text3, fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {/* Course list */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {courses.map(course => {
                        const status = getCourseStatus(course.code);
                        const sm     = STATUS_META[status];
                        const cat    = CAT_META[course.cat];
                        return (
                          <motion.div
                            key={course.code}
                            initial={{ opacity: 0, x: isRTL ? 10 : -10 }} animate={{ opacity: 1, x: 0 }}
                            onClick={() => toggleStatus(course.code)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              background: sm.bg, borderRadius: 10, padding: '9px 12px',
                              border: `1px solid ${sm.color}22`,
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                              cursor: isAdmin ? 'pointer' : 'default',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontSize: 15 }}>{sm.icon}</span>
                            <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{course.name}</div>
                              <div style={{ fontSize: 10, color: C.text3 }}>{course.code}</div>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, background: cat.color + '22', color: cat.color, borderRadius: 6, padding: '2px 7px' }}>{cat.label}</span>
                            <span style={{ fontSize: 10, color: C.text3, width: 28, textAlign: 'right' }}>{course.credits}cr</span>
                            <span style={{ fontSize: 9, fontWeight: 700, background: sm.color + '22', color: sm.color, borderRadius: 6, padding: '2px 7px', minWidth: 58, textAlign: 'center' }}>
                              {sm.label}
                            </span>
                            {isAdmin && course.custom && (
                              <button
                                onClick={e => { e.stopPropagation(); removeCourseFromRoadmap(course.code); }}
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}
                                title="Remove from roadmap"
                              >🗑️</button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
