import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import store from '../dataStore';
import api from '../api';
import { useLang } from '../context/LanguageContext';

/* ── GPA scale ── */
function toGPA(pct) {
  if (pct >= 90) return 4.0;
  if (pct >= 85) return 3.7;
  if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0;
  if (pct >= 70) return 2.7;
  if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0;
  if (pct >= 50) return 1.0;
  return 0.0;
}
function letterGrade(pct) {
  if (pct >= 90) return 'A+'; if (pct >= 85) return 'A'; if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';  if (pct >= 70) return 'C+'; if (pct >= 65) return 'C';
  if (pct >= 60) return 'D+'; if (pct >= 50) return 'D'; return 'F';
}
function gpaColor(g) {
  if (g >= 3.5) return '#10b981';
  if (g >= 3.0) return '#3b82f6';
  if (g >= 2.0) return '#f59e0b';
  return '#ef4444';
}
function gpaLabel(g) {
  if (g >= 3.7) return 'Excellent';
  if (g >= 3.3) return 'Very Good';
  if (g >= 3.0) return 'Good';
  if (g >= 2.0) return 'Satisfactory';
  if (g >= 1.0) return 'Poor';
  return 'Failing';
}

/* circular progress ring */
function GPARing({ value, max = 4, size = 140, stroke = 11, color = '#3b82f6' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / max) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - fill }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  );
}

export default function GPACalculatorPage({ theme: C, stu }) {
  const { t } = useLang();

  const [courses, setCourses] = useState([]);
  const [grades,  setGrades]  = useState([]);
  const [sliders, setSliders] = useState({});

  useEffect(() => {
    if (!stu?.id) return;
    Promise.allSettled([
      api.getLectures(),
      api.getEnrollments(),
      api.getStudentGrades(stu.id),
    ]).then(([lecRes, enrollRes, gradesRes]) => {
      const lecs   = lecRes.status    === 'fulfilled' ? lecRes.value    : [];
      const enroll = enrollRes.status  === 'fulfilled' ? enrollRes.value  : [];
      const gList  = gradesRes.status  === 'fulfilled' ? (Array.isArray(gradesRes.value) ? gradesRes.value : []) : [];
      const myIds  = new Set(enroll.filter(e => String(e.student_id) === String(stu.id)).map(e => String(e.lecture_id || e.course_id)));
      const myCourses = lecs.filter(l => myIds.has(String(l.id)));
      setCourses(myCourses);
      setGrades(gList);
      setSliders(init => {
        const s = { ...init };
        myCourses.forEach(c => {
          if (s[c.id] == null) {
            const rec = gList.find(g => g.course_code === c.code || g.course_id === c.id);
            s[c.id] = rec?.grade ?? rec?.score ?? 75;
          }
        });
        return s;
      });
    });
  }, [stu?.id]);

  // Build results map from API grades
  const results = useMemo(() => {
    const map = {};
    grades.forEach(g => { map[g.course_code || g.course_id] = { grade: g.grade ?? g.score, courseName: g.course_name }; });
    return map;
  }, [grades]);

  // Current GPA from actual grades only (courses with grades)
  const currentGPA = useMemo(() => {
    const graded = grades.filter(g => g.grade != null || g.score != null);
    if (!graded.length) return stu?.gpa || 0;
    const sum = graded.reduce((a, g) => a + toGPA(g.grade ?? g.score), 0);
    return +(sum / graded.length).toFixed(2);
  }, [grades, stu?.gpa]);

  // Projected GPA using slider values for all courses
  const projectedGPA = useMemo(() => {
    if (!courses.length) return currentGPA;
    const sum = courses.reduce((a, c) => a + toGPA(sliders[c.id] ?? 75), 0);
    return +(sum / courses.length).toFixed(2);
  }, [sliders, courses, currentGPA]);

  const delta = +(projectedGPA - currentGPA).toFixed(2);
  const projColor = gpaColor(projectedGPA);
  const currColor = gpaColor(currentGPA);

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        📊 {t('gpa_title')}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 24 }}>{t('gpa_sub')}</div>

      {/* ── GPA rings ── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        {/* Current */}
        <div style={{
          flex: 1, minWidth: 200, background: C.card, borderRadius: 18,
          border: `1px solid ${C.border}`, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 16, letterSpacing: '0.06em' }}>
            {t('current_gpa').toUpperCase()}
          </div>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <GPARing value={currentGPA} color={currColor} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: currColor }}>{currentGPA.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>/ 4.00</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: currColor }}>{gpaLabel(currentGPA)}</div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: delta >= 0 ? '#10b981' : '#ef4444' }}>
          {delta >= 0 ? '▲' : '▼'}
          <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        </div>

        {/* Projected */}
        <div style={{
          flex: 1, minWidth: 200, background: C.card, borderRadius: 18,
          border: `2px solid ${projColor}44`, padding: '24px 20px', textAlign: 'center',
          boxShadow: `0 0 24px ${projColor}22`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 16, letterSpacing: '0.06em' }}>
            {t('projected_gpa').toUpperCase()}
          </div>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <GPARing value={projectedGPA} color={projColor} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div
                key={projectedGPA}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ fontSize: 30, fontWeight: 800, color: projColor }}
              >
                {projectedGPA.toFixed(2)}
              </motion.div>
              <div style={{ fontSize: 10, color: C.text3 }}>/ 4.00</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: projColor }}>{gpaLabel(projectedGPA)}</div>
        </div>
      </div>

      {/* ── Course sliders ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {courses.map(c => {
          const pct = sliders[c.id] ?? 75;
          const gp = toGPA(pct);
          const col = gpaColor(gp);
          const existing = results[c.id]?.grade;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{c.code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: col }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: col, fontWeight: 600 }}>{letterGrade(pct)} · {gp.toFixed(1)} pts</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: C.text3, width: 24 }}>0</span>
                <input
                  type="range" min={0} max={100} value={pct}
                  onChange={e => setSliders(s => ({ ...s, [c.id]: +e.target.value }))}
                  style={{ flex: 1, accentColor: col, height: 6, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 10, color: C.text3, width: 28 }}>100</span>
              </div>

              {existing != null && (
                <div style={{ marginTop: 8, fontSize: 10, color: C.text3 }}>
                  📝 Current grade: <b style={{ color: C.text2 }}>{existing}% ({letterGrade(existing)})</b>
                  {pct !== existing && (
                    <span style={{ color: pct > existing ? '#10b981' : '#ef4444', marginLeft: 8, fontWeight: 600 }}>
                      {pct > existing ? `↑ +${pct - existing}%` : `↓ ${pct - existing}%`} from actual
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {courses.length === 0 && (
          <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No courses found</div>
          </div>
        )}
      </div>

      {/* ── GPA scale legend ── */}
      <div style={{ marginTop: 24, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, letterSpacing: '0.05em' }}>
          GPA SCALE REFERENCE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[['90–100%','A+','4.0','#10b981'],['85–89%','A','3.7','#10b981'],['80–84%','B+','3.3','#3b82f6'],
            ['75–79%','B','3.0','#3b82f6'],['70–74%','C+','2.7','#f59e0b'],['65–69%','C','2.3','#f59e0b'],
            ['60–64%','D+','2.0','#f97316'],['50–59%','D','1.0','#ef4444'],['<50%','F','0.0','#ef4444'],
          ].map(([range, letter, pts, col]) => (
            <div key={range} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${col}15`, border: `1px solid ${col}33`,
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{letter}</span>
              <span style={{ fontSize: 10, color: C.text3 }}>{range} = {pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
