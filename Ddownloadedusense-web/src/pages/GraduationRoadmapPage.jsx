import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import store from '../dataStore';

/* ── Curriculum definition ─────────────────────────────────────────────────── */
const CURRICULUM = [
  { sem: 1, year: 1, label: 'Year 1 — Semester 1', courses: [
    { code:'MATH101', name:'Calculus I',         credits:3, cat:'core' },
    { code:'CS101',   name:'Intro to CS',         credits:3, cat:'core' },
    { code:'ENG101',  name:'English Composition',  credits:2, cat:'gen' },
    { code:'PHYS101', name:'Physics I',            credits:3, cat:'core' },
    { code:'GEN101',  name:'Critical Thinking',    credits:2, cat:'gen' },
  ]},
  { sem: 2, year: 1, label: 'Year 1 — Semester 2', courses: [
    { code:'MATH102', name:'Calculus II',          credits:3, cat:'core' },
    { code:'CS102',   name:'Programming Fundamentals', credits:3, cat:'core' },
    { code:'PHYS102', name:'Physics II',           credits:3, cat:'core' },
    { code:'STAT101', name:'Statistics',           credits:2, cat:'core' },
    { code:'GEN102',  name:'Technical Writing',    credits:2, cat:'gen' },
  ]},
  { sem: 3, year: 2, label: 'Year 2 — Semester 1', courses: [
    { code:'CS201',   name:'Data Structures',      credits:3, cat:'core' },
    { code:'CS202',   name:'Discrete Mathematics', credits:3, cat:'core' },
    { code:'MATH201', name:'Linear Algebra',       credits:3, cat:'core' },
    { code:'GEN201',  name:'Ethics in Technology', credits:2, cat:'gen' },
  ]},
  { sem: 4, year: 2, label: 'Year 2 — Semester 2', courses: [
    { code:'CS203',   name:'Algorithms',           credits:3, cat:'core' },
    { code:'CS204',   name:'Operating Systems',    credits:3, cat:'core' },
    { code:'CS205',   name:'Database Systems',     credits:3, cat:'core' },
    { code:'ELE201',  name:'Elective I',            credits:3, cat:'elective' },
  ]},
  { sem: 5, year: 3, label: 'Year 3 — Semester 1', courses: [
    { code:'CS301',   name:'Computer Networks',    credits:3, cat:'core' },
    { code:'CS302',   name:'Software Engineering', credits:3, cat:'core' },
    { code:'CS303',   name:'Artificial Intelligence', credits:3, cat:'core' },
    { code:'ELE301',  name:'Elective II',           credits:3, cat:'elective' },
  ]},
  { sem: 6, year: 3, label: 'Year 3 — Semester 2', courses: [
    { code:'CS304',   name:'Machine Learning',     credits:3, cat:'core' },
    { code:'CS305',   name:'Computer Security',    credits:3, cat:'core' },
    { code:'CS306',   name:'Compiler Design',      credits:3, cat:'core' },
    { code:'ELE302',  name:'Elective III',          credits:3, cat:'elective' },
  ]},
  { sem: 7, year: 4, label: 'Year 4 — Semester 1', courses: [
    { code:'CS401',   name:'Capstone Project I',   credits:3, cat:'capstone' },
    { code:'CS402',   name:'Research Methods',     credits:2, cat:'core' },
    { code:'ELE401',  name:'Elective IV',           credits:3, cat:'elective' },
    { code:'ELE402',  name:'Elective V',            credits:3, cat:'elective' },
  ]},
  { sem: 8, year: 4, label: 'Year 4 — Semester 2', courses: [
    { code:'CS403',   name:'Capstone Project II',  credits:3, cat:'capstone' },
    { code:'CS404',   name:'Internship',            credits:6, cat:'capstone' },
    { code:'CS405',   name:'Senior Seminar',        credits:1, cat:'gen' },
  ]},
];

const CAT_META = {
  core:     { label: 'Core',     color: '#3b82f6' },
  gen:      { label: 'General',  color: '#8b5cf6' },
  elective: { label: 'Elective', color: '#f59e0b' },
  capstone: { label: 'Capstone', color: '#10b981' },
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function getCourseStatus(code, stu) {
  const completed = [
    'MATH101','CS101','ENG101','PHYS101','GEN101',
    'MATH102','CS102','PHYS102','STAT101','GEN102',
  ];
  const inProgress = ['CS201','CS202','MATH201'];
  if (!stu) return 'not_started';
  const stuYear = stu.year || 1;
  const semMap = {};
  CURRICULUM.forEach(s => s.courses.forEach(c => { semMap[c.code] = s.year; }));
  const courseYear = semMap[code] || 99;
  if (completed.includes(code) || courseYear < stuYear) return 'completed';
  if (inProgress.includes(code) || courseYear === stuYear) return 'in_progress';
  return 'not_started';
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function GraduationRoadmapPage({ theme: C, stu }) {
  const { t, isRTL } = useLang();
  const [expanded, setExpanded] = useState(new Set([1, 2, 3]));
  const [filter, setFilter] = useState('all');

  const totalCredits = CURRICULUM.flatMap(s => s.courses).reduce((a, c) => a + c.credits, 0);
  const completedCredits = CURRICULUM.flatMap(s =>
    s.courses.filter(c => getCourseStatus(c.code, stu) === 'completed')
  ).reduce((a, c) => a + c.credits, 0);
  const inProgressCredits = CURRICULUM.flatMap(s =>
    s.courses.filter(c => getCourseStatus(c.code, stu) === 'in_progress')
  ).reduce((a, c) => a + c.credits, 0);
  const pct = Math.round((completedCredits / totalCredits) * 100);

  function toggle(sem) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(sem) ? next.delete(sem) : next.add(sem);
      return next;
    });
  }

  const filterOpts = [
    { id: 'all',      label: t('all') },
    { id: 'core',     label: CAT_META.core.label },
    { id: 'elective', label: CAT_META.elective.label },
    { id: 'capstone', label: CAT_META.capstone.label },
    { id: 'gen',      label: CAT_META.gen.label },
  ];

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {t('grad_roadmap')}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>
        {t('grad_roadmap_sub')}
      </div>

      {/* Progress summary */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t('graduation_progress')}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{pct}%</div>
        </div>
        <div style={{ height: 12, background: C.bg3, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {[
            { label: t('credits_earned'), value: completedCredits, color: C.green },
            { label: t('in_progress'),    value: inProgressCredits, color: C.blue },
            { label: 'Remaining',         value: totalCredits - completedCredits - inProgressCredits, color: C.text3 },
            { label: t('credits_required'), value: totalCredits, color: C.text2 },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category legend + filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {filterOpts.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? (f.id === 'all' ? C.blue3 : CAT_META[f.id]?.color || C.blue3) : C.bg3,
              border: `1px solid ${filter === f.id ? (CAT_META[f.id]?.color || C.blue) : C.border}`,
              borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700,
              color: filter === f.id ? '#fff' : C.text2, cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {f.id !== 'all' && <span style={{ marginRight: 5, color: CAT_META[f.id]?.color }}>●</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Semester cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CURRICULUM.map(sem => {
          const open = expanded.has(sem.sem);
          const courses = filter === 'all' ? sem.courses : sem.courses.filter(c => c.cat === filter);
          if (filter !== 'all' && courses.length === 0) return null;
          const semDone = sem.courses.filter(c => getCourseStatus(c.code, stu) === 'completed').length;
          const semTotal = sem.courses.length;

          return (
            <div key={sem.sem} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden',
            }}>
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
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: semDone === semTotal ? C.green : semDone > 0 ? C.blue : C.bg3,
                    fontSize: 14,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 5, background: C.bg3, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: semDone === semTotal ? C.green : C.blue,
                      width: `${(semDone / semTotal) * 100}%`,
                      transition: 'width 0.4s',
                    }}/>
                  </div>
                  <span style={{ color: C.text3, fontSize: 12, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', display:'inline-block' }}>▾</span>
                </div>
              </div>

              {/* Course list */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {courses.map(course => {
                        const status = getCourseStatus(course.code, stu);
                        const cat = CAT_META[course.cat];
                        const statusMeta = {
                          completed:   { icon: '✅', color: C.green,  bg: 'rgba(16,185,129,0.12)', label: t('completed') },
                          in_progress: { icon: '🔵', color: C.blue,   bg: 'rgba(59,130,246,0.12)', label: t('in_progress') },
                          not_started: { icon: '⬜', color: C.text3,  bg: C.bg3,                  label: t('not_started') },
                        }[status];

                        return (
                          <motion.div
                            key={course.code}
                            initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18 }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              background: statusMeta.bg, borderRadius: 10, padding: '9px 12px',
                              border: `1px solid ${statusMeta.color}22`,
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                            }}
                          >
                            <span style={{ fontSize: 14 }}>{statusMeta.icon}</span>
                            <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{course.name}</div>
                              <div style={{ fontSize: 10, color: C.text3 }}>{course.code}</div>
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 700, background: cat.color + '22',
                              color: cat.color, borderRadius: 6, padding: '2px 7px',
                            }}>{cat.label}</span>
                            <span style={{ fontSize: 10, color: C.text3, minWidth: 24, textAlign: 'right' }}>
                              {course.credits}cr
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, background: statusMeta.color + '22',
                              color: statusMeta.color, borderRadius: 6, padding: '2px 7px', minWidth: 60, textAlign: 'center',
                            }}>{statusMeta.label}</span>
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
