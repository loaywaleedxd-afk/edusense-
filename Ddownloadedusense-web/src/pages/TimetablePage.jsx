import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import store from '../dataStore';
import api from '../api';
import { useLang } from '../context/LanguageContext';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am–6pm

// Map any day representation to 0–4 (Sun–Thu)
const DAY_NAME_MAP = {
  sun:0, sunday:0, 0:0,
  mon:1, monday:1, 1:1,
  tue:2, tuesday:2, 2:2,
  wed:3, wednesday:3, 3:3,
  thu:4, thursday:4, 4:4,
};
function dayToIdx(d) {
  if (d === null || d === undefined) return NaN;
  const n = Number(d);
  if (Number.isFinite(n)) return n; // already a number
  return DAY_NAME_MAP[String(d).toLowerCase().trim()] ?? NaN;
}

function timeToMinutes(t) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToPx(min, startHour = 8) {
  return ((min - startHour * 60) / 60) * 80; // 80px per hour
}

export default function TimetablePage({ theme: C, stu, role = 'student', doctorId }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [lectures, setLectures] = useState([]);

  useEffect(() => {
    // Prefer real API data; fall back to dataStore for offline scenarios
    api.getLectures().then(apiLectures => {
      if (!Array.isArray(apiLectures) || apiLectures.length === 0) throw new Error('empty');
      const stuId = String(stu?.studentId || stu?.student_id || stu?.id || '');
      if (role === 'student' && stuId) {
        api.getEnrollmentRequests?.().then(reqs => {
          const enrolled = new Set(
            (Array.isArray(reqs) ? reqs : [])
              .filter(r => r.status === 'approved' || r.status === 'enrolled')
              .map(r => r.course_id)
          );
          // If no formal enrollments found, show all lectures (student may be pre-enrolled)
          if (enrolled.size === 0) {
            setLectures(apiLectures);
          } else {
            setLectures(apiLectures.filter(l => enrolled.has(l.course_code) || enrolled.has(l.lecture_id)));
          }
        }).catch(() => setLectures(apiLectures));
      } else if (role === 'doctor') {
        const dId = String(doctorId || '');
        setLectures(dId ? apiLectures.filter(l => String(l.doctor_id || '') === dId) : apiLectures);
      } else {
        setLectures(apiLectures);
      }
    }).catch(() => {
      // Fallback to dataStore
      const allCourses = store.courses || [];
      const enrollments = store.courseEnrollments || {};
      const stuId = String(stu?.studentId || stu?.student_id || stu?.id || '');
      if (role === 'student' && stu) {
        const myIds = new Set(
          Object.entries(enrollments)
            .filter(([, ids]) => ids.some(id => String(id) === stuId))
            .map(([cid]) => cid)
        );
        setLectures(allCourses.filter(c => myIds.has(String(c.id || c.code))));
      } else if (role === 'doctor') {
        const dId = String(doctorId || '');
        setLectures(allCourses.filter(c => String(c.doctorId || c.doctor_id || '') === dId));
      } else {
        setLectures(allCourses);
      }
    });
  }, [role, stu?.id, stu?.student_id, stu?.studentId, doctorId]);

  // Build events per day
  const events = {};
  DAYS.forEach(d => (events[d] = []));

  lectures.forEach(lec => {
    let days = lec.days || [];
    if (typeof days === 'string') { try { days = JSON.parse(days); } catch { days = []; } }
    // Fallback: parse days_label string ("Sun & Wed" → [0,3]) when days array is empty
    if (!Array.isArray(days) || days.length === 0) {
      const label = (lec.days_label || lec.daysLabel || '').toLowerCase();
      if (label) {
        const MAP = { sun:0, mon:1, tue:2, wed:3, thu:4 };
        days = Object.entries(MAP).filter(([k]) => label.includes(k)).map(([,v]) => v);
      }
    }
    // Last resort: derive day from scheduled_at date
    if ((!Array.isArray(days) || days.length === 0) && lec.scheduled_at) {
      const d = new Date(lec.scheduled_at).getDay(); // 0=Sun,1=Mon...
      if (d >= 0 && d <= 4) days = [d];
    }
    if (!Array.isArray(days) || days.length === 0) return;

    // scheduled_at may be a full ISO datetime or just a time string (HH:MM)
    const rawTime = lec.scheduled_at || lec.time || '09:00';
    const timeStr = rawTime.includes('T') ? rawTime.split('T')[1].slice(0, 5) : rawTime.slice(0, 5);
    const startMin = timeToMinutes(timeStr);
    const duration = lec.duration || 90;
    const endMin = startMin + duration;

    days.forEach(d => {
      const idx = dayToIdx(d);
      if (!Number.isFinite(idx) || idx < 0 || idx > 4) return;
      const dayKey = DAYS[Math.round(idx)];
      if (!dayKey || !events[dayKey]) return;
      events[dayKey].push({ ...lec, startMin, endMin, duration });
    });
  });

  const now = new Date();
  const todayIdx = now.getDay(); // 0=Sun…4=Thu
  const todayKey = todayIdx >= 0 && todayIdx <= 4 ? DAYS[todayIdx] : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        📅 {t('timetable_title')}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>
        Your weekly class schedule — Sun to Thu, 8 AM – 6 PM
      </div>


      {lectures.length === 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '32px', textAlign: 'center', color: C.text3, fontSize: 14,
        }}>
          No courses found for your schedule.
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: 'hidden', overflowX: 'auto',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
          {DAYS.map(d => (
            <div key={d} style={{
              flex: 1, minWidth: 130, textAlign: 'center',
              padding: '12px 0',
              background: d === todayKey ? `${C.blue}15` : 'transparent',
              borderRight: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: d === todayKey ? C.blue : C.text }}>
                {t(d).toUpperCase()}
              </div>
              {d === todayKey && (
                <div style={{ fontSize: 9, color: C.blue, fontWeight: 600, marginTop: 2 }}>TODAY</div>
              )}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div style={{ display: 'flex', position: 'relative', minHeight: HOURS.length * 80 }}>
          {/* Time labels */}
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}`, position: 'relative' }}>
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute', top: (h - 8) * 80, height: 80,
                width: '100%', borderBottom: `1px solid ${C.border}22`,
                display: 'flex', alignItems: 'flex-start', paddingTop: 6, paddingLeft: 8,
              }}>
                <span style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>
                  {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map(dayKey => {
            const isToday = dayKey === todayKey;
            return (
              <div key={dayKey} style={{
                flex: 1, minWidth: 130, position: 'relative',
                background: isToday ? `${C.blue}06` : 'transparent',
                borderRight: `1px solid ${C.border}`,
              }}>
                {HOURS.map(h => (
                  <div key={h} style={{
                    position: 'absolute', top: (h - 8) * 80,
                    width: '100%', height: 80,
                    borderBottom: `1px solid ${C.border}22`,
                  }} />
                ))}

                {/* Now line */}
                {isToday && nowMin >= 8 * 60 && nowMin <= 18 * 60 && (
                  <div style={{
                    position: 'absolute', top: minutesToPx(nowMin),
                    left: 0, right: 0, height: 2,
                    background: '#ef4444', zIndex: 5,
                    boxShadow: '0 0 6px #ef4444',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: -5,
                      width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
                    }} />
                  </div>
                )}

                {/* Event blocks */}
                {events[dayKey].map((ev, i) => {
                  const top = minutesToPx(ev.startMin);
                  const height = Math.max(minutesToPx(ev.endMin) - minutesToPx(ev.startMin) - 4, 30);
                  const isActive = isToday && nowMin >= ev.startMin && nowMin < ev.endMin;
                  const color = ev.color || '#3b82f6';
                  return (
                    <motion.div
                      key={`${ev.id || ev.code}-${i}`}
                      onClick={() => setSelected(ev)}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        position: 'absolute', top: top + 2, left: 4, right: 4,
                        height, borderRadius: 8,
                        background: `${color}22`,
                        border: `1.5px solid ${color}`,
                        padding: '6px 8px', cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                        boxShadow: isActive ? `0 0 12px ${color}66` : 'none',
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: 6, border: `2px solid ${color}`,
                          animation: 'pulse 2s ease-in-out infinite',
                        }} />
                      )}
                      <div style={{
                        fontSize: height > 50 ? 11 : 9,
                        fontWeight: 700, color,
                        lineHeight: 1.3, overflow: 'hidden',
                      }}>
                        {isActive && '🔴 '}{ev.name || ev.code}
                      </div>
                      {height > 45 && (
                        <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
                          {ev.room} · {ev.time}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {lectures.map(lec => (
          <div key={lec.id || lec.code} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.card, borderRadius: 8, padding: '5px 12px',
            border: `1px solid ${(lec.color || C.border)}44`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: lec.color || '#3b82f6', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{lec.code}</span>
            <span style={{ fontSize: 11, color: C.text3 }}>{lec.name}</span>
          </div>
        ))}
      </div>

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: C.card, borderRadius: 18, padding: '24px 28px',
                border: `2px solid ${selected.color || C.border}`,
                zIndex: 101, minWidth: 320, maxWidth: 420,
                boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${selected.color || '#3b82f6'}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>📚</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>{selected.code}</div>
                </div>
              </div>
              {[
                ['🕐 Time', `${selected.time || '—'} (${selected.duration || 90} min)`],
                ['🏫 Room', selected.room || '—'],
                ['👨‍🏫 Instructor', selected.doctorName || selected.doctor_name || '—'],
                ['📅 Days', selected.daysLabel || selected.days_label || '—'],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: 'flex', gap: 12, padding: '8px 0',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 12, color: C.text3, width: 120, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{val}</span>
                </div>
              ))}
              <button
                onClick={() => setSelected(null)}
                style={{
                  width: '100%', marginTop: 20,
                  background: `${selected.color || '#3b82f6'}22`,
                  border: `1px solid ${selected.color || '#3b82f6'}44`,
                  borderRadius: 10, padding: '10px', fontSize: 13,
                  fontWeight: 700, color: selected.color || '#3b82f6', cursor: 'pointer',
                }}
              >Close</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50% { opacity:0.4; }
        }
      `}</style>
    </div>
  );
}
