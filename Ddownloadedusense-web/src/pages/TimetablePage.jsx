import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import store from '../dataStore';
import api from '../api';
import { useLang } from '../context/LanguageContext';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu'];
const DAYS_FULL = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday' };
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am–6pm

function extractTime(scheduled_at) {
  if (!scheduled_at) return '09:00';
  const s = String(scheduled_at);
  // ISO "2025-01-15T09:00" or "2025-01-15T09:00:00" or space-separated or plain "09:00"
  const m = s.match(/[T ](\d{2}:\d{2})/);
  if (m) return m[1];
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return '09:00';
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
  const [selected,  setSelected]  = useState(null);
  const [lectures,  setLectures]  = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.getLectures(),
      api.getEnrollments(),
    ]).then(([lecRes, enrollRes]) => {
      const allLecs   = lecRes.status === 'fulfilled'   ? lecRes.value   : [];
      const allEnroll = enrollRes.status === 'fulfilled' ? enrollRes.value : [];

      if (role === 'student' && stu) {
        // Enrollments use course_code as course_id; match against l.course_code
        const myIds = new Set(
          allEnroll
            .filter(e => String(e.student_id) === String(stu.id) || String(e.student_id) === String(stu.student_id))
            .map(e => String(e.course_id))
        );
        setLectures(allLecs.filter(l => myIds.has(String(l.course_code))));
      } else if (role === 'doctor') {
        setLectures(allLecs.filter(l => String(l.doctor_id || l.doctorId) === String(doctorId)));
      } else {
        setLectures(allLecs);
      }
    });
  }, [role, stu?.id, doctorId]);

  // Map JS getDay() to our day keys (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu)
  const DAY_MAP = [0, 1, 2, 3, 4]; // index in DAYS array

  // Build events per day: { sun: [...], mon: [...], ... }
  const events = {};
  DAYS.forEach(d => (events[d] = []));

  lectures.forEach(lec => {
    // lec.days is stored as a JSON string in PostgreSQL TEXT column — parse it
    let days = lec.days || [];
    if (typeof days === 'string') { try { days = JSON.parse(days); } catch { days = []; } }
    const startMin = timeToMinutes(extractTime(lec.scheduled_at));
    const duration = lec.duration_min || 90;
    const endMin = startMin + duration;

    days.forEach(dayIdx => {
      if (dayIdx < 0 || dayIdx > 4) return;
      const dayKey = DAYS[dayIdx];
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

      {/* ── Grid ── */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: 'hidden', overflowX: 'auto',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {/* Time gutter */}
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
          {DAYS.map(d => (
            <div key={d} style={{
              flex: 1, minWidth: 130, textAlign: 'center',
              padding: '12px 0',
              background: d === todayKey ? `${C.blue}15` : 'transparent',
              borderRight: `1px solid ${C.border}`,
              borderLeft: 'none',
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: d === todayKey ? C.blue : C.text,
              }}>
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
          {/* Time labels column */}
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
                {/* Hour lines */}
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
                  return (
                    <motion.div
                      key={`${ev.id}-${i}`}
                      onClick={() => setSelected(ev)}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        position: 'absolute', top: top + 2, left: 4, right: 4,
                        height, borderRadius: 8,
                        background: `${ev.color || '#3b82f6'}22`,
                        border: `1.5px solid ${ev.color || '#3b82f6'}`,
                        padding: '6px 8px', cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                        boxShadow: isActive ? `0 0 12px ${ev.color || '#3b82f6'}66` : 'none',
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: 6, border: `2px solid ${ev.color}`,
                          animation: 'pulse 2s ease-in-out infinite',
                        }} />
                      )}
                      <div style={{
                        fontSize: height > 50 ? 11 : 9,
                        fontWeight: 700, color: ev.color || '#3b82f6',
                        lineHeight: 1.3, overflow: 'hidden',
                      }}>
                        {isActive && '🔴 '}{ev.course_name || ev.course_code}
                      </div>
                      {height > 45 && (
                        <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
                          {ev.room} · {extractTime(ev.scheduled_at)}
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
          <div key={lec.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.card, borderRadius: 8, padding: '5px 12px',
            border: `1px solid ${lec.color || C.border}44`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: lec.color || '#3b82f6', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{lec.course_code}</span>
            <span style={{ fontSize: 11, color: C.text3 }}>{lec.course_name}</span>
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
                boxShadow: `0 16px 48px rgba(0,0,0,0.35)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${selected.color || '#3b82f6'}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>📚</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selected.course_name}</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>{selected.course_code}</div>
                </div>
              </div>
              {[
                ['🕐 Time', `${extractTime(selected.scheduled_at)} (${selected.duration_min || 90} min)`],
                ['🏫 Room', selected.room],
                ['👨‍🏫 Instructor', selected.doctor_name || '—'],
                ['📅 Days', selected.days_label || '—'],
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
                  width: '100%', marginTop: 20, background: `${selected.color || '#3b82f6'}22`,
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
