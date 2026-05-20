import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';

const LS_KEY = 'es_academic_calendar';

const EVENT_TYPES = {
  exam:     { label: 'Exam',           ar: 'امتحان',     color: '#ef4444', bg: '#ef444420', icon: '📝' },
  holiday:  { label: 'Holiday',        ar: 'إجازة',      color: '#10b981', bg: '#10b98120', icon: '🌴' },
  deadline: { label: 'Deadline',       ar: 'موعد نهائي', color: '#f97316', bg: '#f9731620', icon: '⏰' },
  lecture:  { label: 'Special Lecture',ar: 'محاضرة',     color: '#3b82f6', bg: '#3b82f620', icon: '📚' },
  semester: { label: 'Semester Event', ar: 'حدث فصلي',   color: '#8b5cf6', bg: '#8b5cf620', icon: '🎓' },
  meeting:  { label: 'Meeting',        ar: 'اجتماع',     color: '#06b6d4', bg: '#06b6d420', icon: '🤝' },
};

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_NAMES_EN   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_AR   = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveEvents(evts) {
  localStorage.setItem(LS_KEY, JSON.stringify(evts));
}

export default function AcademicCalendarPage({ theme: C, role = 'student' }) {
  const { t, isRTL } = useLang();
  const isAdmin = role === 'admin';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState(loadEvents);
  const [selected, setSelected] = useState(null); // selected day { year, month, day }
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'exam', description: '' });
  const [detailEvt, setDetailEvt] = useState(null);

  const MONTHS  = isRTL ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const DAYS    = isRTL ? DAY_NAMES_AR   : DAY_NAMES_EN;

  /* ─── Calendar grid ─── */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getEventsFor(d) {
    if (!d) return [];
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return events.filter(e => e.date === key);
  }

  function addEvent() {
    if (!form.title.trim() || !selected) return;
    const key = `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-${String(selected.day).padStart(2, '0')}`;
    const newEvt = { id: Date.now(), date: key, ...form };
    const updated = [...events, newEvt];
    setEvents(updated);
    saveEvents(updated);
    setForm({ title: '', type: 'exam', description: '' });
    setShowForm(false);
  }

  function deleteEvent(id) {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveEvents(updated);
    setDetailEvt(null);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  /* Upcoming events list */
  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>
            📅 {isRTL ? 'التقويم الأكاديمي' : 'Academic Calendar'}
          </div>
          <div style={{ fontSize: 12, color: C.text2 }}>
            {isRTL ? 'تتبع الامتحانات والمواعيد النهائية والأحداث الأكاديمية' : 'Track exams, deadlines, and academic events'}
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
          {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: cfg.color, fontWeight: 700 }}>
              <span>{cfg.icon}</span>
              <span>{isRTL ? cfg.ar : cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* ── Calendar ── */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row', borderBottom: `1px solid ${C.border}` }}>
            <button onClick={prevMonth}
              style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: C.text, fontSize: 16 }}>
              {isRTL ? '›' : '‹'}
            </button>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {MONTHS[month]} {year}
            </div>
            <button onClick={nextMonth}
              style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: C.text, fontSize: 16 }}>
              {isRTL ? '‹' : '›'}
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${C.border}` }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((d, i) => {
              const dayEvts = getEventsFor(d);
              const isSelected = selected && selected.day === d && selected.month === month && selected.year === year;
              return (
                <motion.div
                  key={i}
                  whileHover={d ? { scale: 1.02 } : {}}
                  onClick={() => { if (!d) return; setSelected({ year, month, day: d }); setShowForm(false); }}
                  style={{
                    minHeight: 72, padding: '6px 6px 4px', cursor: d ? 'pointer' : 'default',
                    borderBottom: `1px solid ${C.border}`, borderRight: (i + 1) % 7 !== 0 ? `1px solid ${C.border}` : 'none',
                    background: isSelected ? C.blue_dim : isToday(d) ? `${C.blue}18` : 'transparent',
                    position: 'relative',
                  }}
                >
                  {d && (
                    <>
                      <div style={{
                        fontSize: 13, fontWeight: isToday(d) ? 800 : 400,
                        color: isToday(d) ? C.blue2 : isSelected ? C.blue2 : C.text,
                        marginBottom: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%',
                        background: isToday(d) ? C.blue3 : 'transparent',
                      }}>{d}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {dayEvts.slice(0, 3).map(evt => {
                          const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
                          return (
                            <motion.div key={evt.id}
                              whileHover={{ scale: 1.05 }}
                              onClick={e => { e.stopPropagation(); setDetailEvt(evt); }}
                              style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                background: cfg.bg, color: cfg.color, cursor: 'pointer',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                              {cfg.icon} {evt.title}
                            </motion.div>
                          );
                        })}
                        {dayEvts.length > 3 && (
                          <div style={{ fontSize: 9, color: C.text3 }}>+{dayEvts.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Selected day actions */}
          {selected && (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                📅 {selected.day} {MONTHS[selected.month]} {selected.year}
              </div>
              {getEventsFor(selected.day).length === 0 && (
                <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: '8px 0' }}>
                  {isRTL ? 'لا توجد أحداث في هذا اليوم' : 'No events this day'}
                </div>
              )}
              {getEventsFor(selected.day).map(evt => {
                const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
                return (
                  <div key={evt.id} style={{ background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.color}44`, padding: '8px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{evt.title}</span>
                    </div>
                    {evt.description && <div style={{ fontSize: 11, color: C.text2 }}>{evt.description}</div>}
                    {isAdmin && (
                      <button onClick={() => deleteEvent(evt.id)}
                        style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                        🗑️ {isRTL ? 'حذف' : 'Delete'}
                      </button>
                    )}
                  </div>
                );
              })}
              {isAdmin && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowForm(f => !f)}
                  style={{ width: '100%', marginTop: 8, background: C.blue3, border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {showForm ? (isRTL ? '✕ إلغاء' : '✕ Cancel') : (isRTL ? '＋ إضافة حدث' : '＋ Add Event')}
                </motion.button>
              )}
              {/* Add form */}
              <AnimatePresence>
                {showForm && isAdmin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder={isRTL ? 'عنوان الحدث...' : 'Event title...'}
                        style={{ height: 34, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, width: '100%', boxSizing: 'border-box' }}/>
                      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                        style={{ height: 34, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                        {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.icon} {isRTL ? cfg.ar : cfg.label}</option>
                        ))}
                      </select>
                      <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder={isRTL ? 'وصف اختياري...' : 'Optional description...'}
                        rows={2} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, fontSize: 12, color: C.text, resize: 'none', boxSizing: 'border-box', width: '100%' }}/>
                      <button onClick={addEvent}
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                        {isRTL ? '✓ حفظ الحدث' : '✓ Save Event'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Upcoming events */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              🗓️ {isRTL ? 'الأحداث القادمة' : 'Upcoming Events'}
            </div>
            {upcoming.length === 0
              ? <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: '16px 0' }}>
                  {isRTL ? 'لا توجد أحداث قادمة' : 'No upcoming events'}
                </div>
              : upcoming.map((evt, i) => {
                const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
                const [, m, d] = evt.date.split('-').map(Number);
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: i < upcoming.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: 36, flexShrink: 0, textAlign: 'center', background: cfg.bg, borderRadius: 8, padding: '4px 0' }}>
                      <div style={{ fontSize: 9, color: cfg.color, fontWeight: 700, textTransform: 'uppercase' }}>{MONTHS[m - 1]?.slice(0, 3)}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{d}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cfg.icon} {evt.title}
                      </div>
                      <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>{isRTL ? cfg.ar : cfg.label}</div>
                      {evt.description && <div style={{ fontSize: 10, color: C.text3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.description}</div>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Event detail modal */}
      <AnimatePresence>
        {detailEvt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetailEvt(null)}
            style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, minWidth: 320, maxWidth: 440 }}>
              {(() => {
                const cfg = EVENT_TYPES[detailEvt.type] || EVENT_TYPES.exam;
                return (
                  <>
                    <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 4 }}>{detailEvt.title}</div>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{isRTL ? cfg.ar : cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text2, textAlign: 'center', marginBottom: 12 }}>📅 {detailEvt.date}</div>
                    {detailEvt.description && <div style={{ fontSize: 13, color: C.text2, background: C.bg3, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>{detailEvt.description}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isAdmin && (
                        <button onClick={() => deleteEvent(detailEvt.id)}
                          style={{ flex: 1, background: '#ef444420', border: '1px solid #ef444444', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
                          🗑️ {isRTL ? 'حذف' : 'Delete'}
                        </button>
                      )}
                      <button onClick={() => setDetailEvt(null)}
                        style={{ flex: 1, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 700, color: C.text, cursor: 'pointer' }}>
                        {isRTL ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
