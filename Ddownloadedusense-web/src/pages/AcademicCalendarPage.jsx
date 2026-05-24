import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';
import { api } from '../api';

const EVENT_TYPES = {
  exam:     { label: 'Exam',            ar: 'امتحان',       color: '#ef4444', bg: '#ef444420', icon: '📝' },
  holiday:  { label: 'Holiday',         ar: 'إجازة',        color: '#10b981', bg: '#10b98120', icon: '🌴' },
  deadline: { label: 'Deadline',        ar: 'موعد نهائي',   color: '#f97316', bg: '#f9731620', icon: '⏰' },
  lecture:  { label: 'Special Lecture', ar: 'محاضرة',       color: '#3b82f6', bg: '#3b82f620', icon: '📚' },
  semester: { label: 'Semester Event',  ar: 'حدث فصلي',    color: '#8b5cf6', bg: '#8b5cf620', icon: '🎓' },
  meeting:  { label: 'Meeting',         ar: 'اجتماع',       color: '#06b6d4', bg: '#06b6d420', icon: '🤝' },
};

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_NAMES_EN   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_AR   = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

export default function AcademicCalendarPage({ theme: C, role = 'student' }) {
  const { isRTL } = useLang();
  const isMobile = useMobile();
  const isAdmin  = role === 'admin';

  const today = new Date();
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
  const [events,   setEvents]   = useState([]);
  const [selected, setSelected] = useState(null);       // { year, month, day }
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ title: '', type: 'exam', date: '', description: '' });
  const [detailEvt, setDetailEvt] = useState(null);

  useEffect(() => {
    api.getCalendarEvents().then(setEvents).catch(() => {});
  }, []);

  const MONTHS = isRTL ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const DAYS   = isRTL ? DAY_NAMES_AR   : DAY_NAMES_EN;

  /* calendar grid */
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getEventsFor(d) {
    if (!d) return [];
    return events.filter(e => e.date === dateKey(year, month, d));
  }

  function addEvent() {
    if (!form.title.trim()) return;
    const key = form.date || (selected ? dateKey(selected.year, selected.month, selected.day) : dateKey(year, month, today.getDate()));
    const newEvt = { date: key, title: form.title.trim(), type: form.type, description: form.description };
    setForm({ title: '', type: 'exam', date: '', description: '' });
    setShowForm(false);
    api.addCalendarEvent(newEvt)
      .then(res => setEvents(prev => [...prev, { ...newEvt, id: res.id }]))
      .catch(() => {});
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setDetailEvt(null);
    api.deleteCalendarEvent(id).catch(() => {});
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelected(null); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelected(null); }

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

  /* pre-fill date input when clicking a cell */
  function selectDay(d) {
    if (!d) return;
    const sel = { year, month, day: d };
    setSelected(sel);
    if (isAdmin) setForm(f => ({ ...f, date: dateKey(year, month, d) }));
    setShowForm(false);
  }

  const todayIso = `${year}-${pad(month + 1)}-${pad(today.getDate())}`;

  return (
    <div style={{ padding: '8px 20px 20px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>
            📅 {isRTL ? 'التقويم الأكاديمي' : 'Academic Calendar'}
          </div>
          <div style={{ fontSize: 12, color: C.text2 }}>
            {isRTL ? 'تتبع الامتحانات والمواعيد النهائية والأحداث' : 'Track exams, deadlines, and academic events'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
          {/* Legend */}
          {!isMobile && Object.entries(EVENT_TYPES).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: cfg.color, fontWeight: 700 }}>
              <span>{cfg.icon}</span><span>{isRTL ? cfg.ar : cfg.label}</span>
            </div>
          ))}
          {/* Admin: global Add Event button */}
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setShowForm(true); setForm(f => ({ ...f, date: todayIso })); }}
              style={{
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none',
                borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 700,
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              ＋ {isRTL ? 'إضافة حدث' : 'Add Event'}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Global Add Event form (admin) ── */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 14 }}
          >
            <div style={{ background: C.card, border: `1.5px solid ${C.blue}55`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>
                ＋ {isRTL ? 'إضافة حدث جديد' : 'Add New Event'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{isRTL ? 'العنوان' : 'Title'}</div>
                  <input
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder={isRTL ? 'اسم الحدث...' : 'Event title...'}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{isRTL ? 'التاريخ' : 'Date'}</div>
                  <input
                    type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{isRTL ? 'النوع' : 'Type'}</div>
                  <select
                    value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, boxSizing: 'border-box' }}
                  >
                    {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.icon} {isRTL ? cfg.ar : cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={isRTL ? 'وصف اختياري...' : 'Optional description...'}
                rows={2}
                style={{ width: '100%', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: C.text, resize: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={addEvent}
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                >
                  ✓ {isRTL ? 'حفظ الحدث' : 'Save Event'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 12, color: C.text2, cursor: 'pointer' }}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 14, alignItems: 'start' }}>

        {/* ── Calendar grid ── */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row', borderBottom: `1px solid ${C.border}` }}>
            <button onClick={prevMonth} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: C.text, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRTL ? '›' : '‹'}
            </button>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: C.text, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRTL ? '‹' : '›'}
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${C.border}` }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '7px 2px', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((d, i) => {
              const dayEvts  = getEventsFor(d);
              const isSel    = selected && selected.day === d && selected.month === month && selected.year === year;
              const isTd     = isToday(d);
              return (
                <div
                  key={i}
                  onClick={() => selectDay(d)}
                  style={{
                    minHeight: isMobile ? 52 : 68, padding: '5px 5px 3px', cursor: d ? 'pointer' : 'default',
                    borderBottom: `1px solid ${C.border}`,
                    borderRight: (i + 1) % 7 !== 0 ? `1px solid ${C.border}` : 'none',
                    background: isSel ? C.blue_dim : isTd ? `${C.blue}18` : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {d && (
                    <>
                      <div style={{
                        fontSize: 12, fontWeight: isTd ? 800 : 400,
                        color: isTd ? C.blue2 : isSel ? C.blue2 : C.text,
                        width: 22, height: 22, borderRadius: '50%',
                        background: isTd ? C.blue3 : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 2,
                      }}>{d}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {dayEvts.slice(0, isMobile ? 1 : 2).map(evt => {
                          const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
                          return (
                            <div
                              key={evt.id}
                              onClick={e => { e.stopPropagation(); setDetailEvt(evt); }}
                              style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: cfg.bg, color: cfg.color, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                            >
                              {cfg.icon} {!isMobile && evt.title}
                            </div>
                          );
                        })}
                        {dayEvts.length > (isMobile ? 1 : 2) && (
                          <div style={{ fontSize: 8, color: C.text3 }}>+{dayEvts.length - (isMobile ? 1 : 2)}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Selected day details */}
          {selected && (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                📅 {selected.day} {MONTHS[selected.month]} {selected.year}
              </div>

              {getEventsFor(selected.day).length === 0 && (
                <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: '10px 0 6px' }}>
                  {isRTL ? 'لا توجد أحداث في هذا اليوم' : 'No events this day'}
                </div>
              )}

              {getEventsFor(selected.day).map(evt => {
                const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
                return (
                  <div key={evt.id} style={{ background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.color}44`, padding: '9px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{evt.title}</span>
                      </div>
                      {isAdmin && (
                        <button onClick={() => deleteEvent(evt.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
                      )}
                    </div>
                    {evt.description && <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>{evt.description}</div>}
                  </div>
                );
              })}

              {/* Quick add from selected day (admin only) */}
              {isAdmin && (
                <button
                  onClick={() => { setShowForm(true); setForm(f => ({ ...f, date: dateKey(selected.year, selected.month, selected.day) })); }}
                  style={{ width: '100%', marginTop: 4, background: C.bg3, border: `1px dashed ${C.blue}`, borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, color: C.blue, cursor: 'pointer' }}
                >
                  ＋ {isRTL ? 'إضافة لهذا اليوم' : 'Add to this day'}
                </button>
              )}
            </div>
          )}

          {/* Upcoming events */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              🗓️ {isRTL ? 'الأحداث القادمة' : 'Upcoming Events'}
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: '20px 0' }}>
                {isRTL ? 'لا توجد أحداث قادمة' : 'No upcoming events'}
                {isAdmin && <div style={{ fontSize: 10, marginTop: 6 }}>{isRTL ? 'أضف حدثاً من الزر أعلاه' : 'Add events with the button above'}</div>}
              </div>
            ) : upcoming.map((evt, i) => {
              const cfg = EVENT_TYPES[evt.type] || EVENT_TYPES.exam;
              const [, m, d] = evt.date.split('-').map(Number);
              return (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: i < upcoming.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                  onClick={() => setDetailEvt(evt)}
                >
                  <div style={{ width: 38, flexShrink: 0, textAlign: 'center', background: cfg.bg, borderRadius: 8, padding: '5px 0' }}>
                    <div style={{ fontSize: 8, color: cfg.color, fontWeight: 700, textTransform: 'uppercase' }}>{MONTHS[m - 1]?.slice(0, 3)}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{d}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cfg.icon} {evt.title}
                    </div>
                    <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>{isRTL ? cfg.ar : cfg.label}</div>
                    {evt.description && <div style={{ fontSize: 10, color: C.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.description}</div>}
                  </div>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); deleteEvent(evt.id); }} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Read-only notice for non-admin */}
          {!isAdmin && (
            <div style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}33`, borderRadius: 10, padding: '10px 14px', fontSize: 11, color: C.text3, textAlign: 'center' }}>
              ℹ️ {isRTL ? 'للعرض فقط — إضافة الأحداث للمسؤولين' : 'View only — only admins can add events'}
            </div>
          )}
        </div>
      </div>

      {/* ── Event detail modal ── */}
      <AnimatePresence>
        {detailEvt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetailEvt(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28, minWidth: 300, maxWidth: 420, width: '100%' }}
            >
              {(() => {
                const cfg = EVENT_TYPES[detailEvt.type] || EVENT_TYPES.exam;
                return (
                  <>
                    <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 6 }}>{detailEvt.title}</div>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{isRTL ? cfg.ar : cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text2, textAlign: 'center', marginBottom: 14 }}>📅 {detailEvt.date}</div>
                    {detailEvt.description && (
                      <div style={{ fontSize: 13, color: C.text2, background: C.bg3, borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>{detailEvt.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isAdmin && (
                        <button
                          onClick={() => deleteEvent(detailEvt.id)}
                          style={{ flex: 1, background: '#ef444420', border: '1px solid #ef444455', borderRadius: 10, padding: '10px 0', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}
                        >
                          🗑️ {isRTL ? 'حذف' : 'Delete'}
                        </button>
                      )}
                      <button
                        onClick={() => setDetailEvt(null)}
                        style={{ flex: 1, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 0', fontSize: 12, fontWeight: 700, color: C.text, cursor: 'pointer' }}
                      >
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
