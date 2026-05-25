import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import store from '../dataStore';
import { get, post, del } from '../api.js';
import { useLang } from '../context/LanguageContext';

/* ── Local storage keys ── */
const LS_SLOTS        = 'es_oh_slots';
const LS_BOOKINGS     = 'es_oh_bookings';        // student bookings (keyed by student id)
const LS_DOC_BOOKINGS = 'es_oh_doc_bookings';   // doctor bookings (separate key)

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ── Generate default slots for a doctor ── */
function buildDefaultSlots(doctorId) {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];
  const times  = ['09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45',
                  '11:00','11:15','13:00','13:15','13:30','13:45','14:00','14:15'];
  const slots  = [];
  // 3 office-hours days per doctor (deterministic)
  const dayIdx = [(doctorId?.charCodeAt(3) || 1) % 5, 1, 3];
  dayIdx.forEach(di => {
    times.slice(0, 12).forEach((time, ti) => {
      slots.push({
        id: `slot-${doctorId}-${di}-${ti}`,
        doctorId,
        day: days[di],
        time,
        duration: 15,
        available: true,
      });
    });
  });
  return slots;
}

/* ── Student view ── */
export function StudentOfficeHours({ theme: C, stu }) {
  const { t } = useLang();
  const [slots, setSlots]       = useState([]);
  const [bookings, setBookings] = useState(() => loadLS(`${LS_BOOKINGS}_${stu?.id}`, []));
  const [doctors,  setDoctors]  = useState([]);
  const [selDoc, setSelDoc]     = useState('');
  const [note, setNote]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState('');
  const [tab, setTab]           = useState('book'); // 'book' | 'mine'

  useEffect(() => {
    get('/api/lectures/doctors').then(docs => {
      setDoctors(docs || []);
      if (docs?.length) setSelDoc(d => d || docs[0].id);
    }).catch(() => {});
  }, []);

  // Always load bookings from DB (source of truth); merge with localStorage fallback
  useEffect(() => {
    if (!stu?.id) return;
    (async () => {
      try {
        const res = await get(`/api/office-hours/bookings/student/${stu.id}`);
        const dbBookings = res?.bookings || [];
        // Merge: start with DB bookings, add any LS-only ones not yet in DB
        const lsBookings = loadLS(`${LS_BOOKINGS}_${stu.id}`, []);
        const dbIds = new Set(dbBookings.map(b => b.id));
        const merged = [...dbBookings, ...lsBookings.filter(b => !dbIds.has(b.id))];
        setBookings(merged);
        saveLS(`${LS_BOOKINGS}_${stu.id}`, merged);
      } catch {
        // Network error — fall back to localStorage only
        const lsBookings = loadLS(`${LS_BOOKINGS}_${stu.id}`, []);
        setBookings(lsBookings);
      }
    })();
  }, [stu?.id]);

  const loadSlots = useCallback(async () => {
    // Try API first
    try {
      const res = await get(`/api/office-hours/slots/${selDoc}`);
      if (res?.slots?.length > 0) { setSlots(res.slots); return; }
    } catch {}
    // Fallback: local generation + filter out booked ones
    const local = loadLS(`${LS_SLOTS}_${selDoc}`, null) || buildDefaultSlots(selDoc);
    const myBooked = bookings.filter(b => b.doctorId === selDoc).map(b => b.slotId);
    setSlots(local.map(s => ({ ...s, available: s.available && !myBooked.includes(s.id) })));
  }, [selDoc, bookings]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  async function bookSlot(slot) {
    if (busy) return;
    setBusy(true);
    // Slots from DB have snake_case (doctor_id); locally-generated have camelCase (doctorId)
    const doctorId = slot.doctorId || slot.doctor_id || selDoc;
    const booking = {
      id: `bk-${Date.now()}`,
      slotId: slot.id,
      doctorId,
      doctorName: doctors.find(d => d.id === doctorId)?.name || doctorId,
      studentId: String(stu.id),
      studentName: stu.name,
      day: slot.day, time: slot.time, duration: slot.duration || 15,
      note: note.trim(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await post('/api/office-hours/book', booking);
      if (res?.booking?.id) booking.id = res.booking.id;
    } catch (e) {
      console.warn('Office hours booking API error:', e);
    }

    // Local save always (DB is source of truth on next load)
    const newBookings = [...bookings, booking];
    setBookings(newBookings);
    saveLS(`${LS_BOOKINGS}_${stu.id}`, newBookings);

    // Mark slot unavailable locally
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, available: false } : s));
    setNote('');
    setMsg(`✅ Slot booked for ${slot.day} at ${slot.time}`);
    setTimeout(() => setMsg(''), 3500);
    setBusy(false);
  }

  async function cancelBooking(bk) {
    try { await del(`/api/office-hours/booking/${bk.id}`); } catch {}
    const newBookings = bookings.filter(b => b.id !== bk.id);
    setBookings(newBookings);
    saveLS(`${LS_BOOKINGS}_${stu.id}`, newBookings);
    loadSlots();
    setMsg(`🗑️ Booking cancelled`);
    setTimeout(() => setMsg(''), 2500);
  }

  // Group available slots by day
  const byDay = {};
  slots.filter(s => s.available).forEach(s => {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  });

  const myBookings = bookings; // already student-specific (keyed LS + filtered from DB)

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        🕐 {t('oh_title')}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>{t('oh_sub')}</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['book',`📅 ${t('available_slots')}`],['mine',`📋 ${t('your_bookings')} (${myBookings.length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: tab === id ? C.blue : C.card,
            color: tab === id ? '#fff' : C.text2,
            border: `1px solid ${tab === id ? C.blue : C.border}`,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            background: '#10b98122', border: '1px solid #10b98144', borderRadius: 10,
            padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 16,
          }}
        >{msg}</motion.div>
      )}

      {tab === 'book' && (
        <>
          {/* Doctor selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, letterSpacing: '0.05em' }}>
              SELECT INSTRUCTOR
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {doctors.map(doc => (
                <motion.button
                  key={doc.id} onClick={() => setSelDoc(doc.id)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                    background: selDoc === doc.id ? `${doc.color}22` : C.card,
                    border: `1.5px solid ${selDoc === doc.id ? doc.color : C.border}`,
                    fontWeight: selDoc === doc.id ? 700 : 400, fontSize: 13, color: C.text,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{doc.emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selDoc === doc.id ? doc.color : C.text }}>{doc.name}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{doc.dept}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Note field */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, letterSpacing: '0.05em' }}>
              NOTE (OPTIONAL)
            </div>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="What would you like to discuss? (optional)"
              style={{
                width: '100%', background: C.bg3, border: `1px solid ${C.border}`,
                borderRadius: 9, padding: '10px 14px', fontSize: 12, color: C.text,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Slots by day */}
          {Object.keys(byDay).length === 0 ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 14 }}>No available slots for this instructor</div>
            </div>
          ) : (
            Object.entries(byDay).map(([day, daySlots]) => (
              <div key={day} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>📆 {day}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {daySlots.map(slot => (
                    <motion.button
                      key={slot.id}
                      onClick={() => bookSlot(slot)}
                      disabled={busy}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                        cursor: busy ? 'not-allowed' : 'pointer',
                        background: C.blue + '18', border: `1px solid ${C.blue}44`,
                        color: C.blue2, opacity: busy ? 0.6 : 1,
                      }}
                    >
                      🕐 {slot.time}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'mine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myBookings.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14 }}>No bookings yet</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Switch to "Available Slots" to book a session</div>
            </div>
          ) : myBookings.map((bk, i) => (
            <motion.div
              key={bk.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: C.card, borderRadius: 14,
                border: `1px solid ${bk.status === 'confirmed' ? '#10b98133' : C.border}`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: '#10b98120',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>🕐</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{bk.doctorName}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  {bk.day} at {bk.time} · {bk.duration} min
                </div>
                {bk.note && <div style={{ fontSize: 11, color: C.text2, marginTop: 4, fontStyle: 'italic' }}>"{bk.note}"</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 8,
                  background: '#10b98120', color: '#10b981',
                }}>
                  {bk.status.toUpperCase()}
                </div>
                <button
                  onClick={() => cancelBooking(bk)}
                  style={{
                    background: '#ef444415', border: '1px solid #ef444433',
                    borderRadius: 8, padding: '5px 12px', fontSize: 11,
                    fontWeight: 600, color: '#ef4444', cursor: 'pointer',
                  }}
                >{t('cancel_booking')}</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Doctor view ── */
export function DoctorOfficeHours({ theme: C, doctor }) {
  const { t } = useLang();
  const [slots, setSlots]     = useState(() => {
    const saved = loadLS(`${LS_SLOTS}_${doctor?.id}`, null);
    return saved || buildDefaultSlots(doctor?.id || 'D001');
  });
  const [bookings, setBookings] = useState(() => {
    return loadLS(`${LS_DOC_BOOKINGS}_${doctor?.id}`, []);
  });
  const [tab, setTab] = useState('schedule');

  // Load slots + bookings from backend on mount; seed DB if empty
  useEffect(() => {
    if (!doctor?.id) return;
    (async () => {
      try {
        // Load slots
        const sRes = await get(`/api/office-hours/slots/${doctor.id}`);
        if (sRes?.slots?.length > 0) {
          setSlots(sRes.slots);
          saveLS(`${LS_SLOTS}_${doctor.id}`, sRes.slots);
        } else {
          // DB is empty — seed with default slots
          const defaults = loadLS(`${LS_SLOTS}_${doctor.id}`, null) || buildDefaultSlots(doctor.id);
          await post('/api/office-hours/slots/bulk', { slots: defaults }).catch(() => {});
          setSlots(defaults);
        }
      } catch {}
      try {
        // Load bookings
        const bRes = await get(`/api/office-hours/bookings/doctor/${doctor.id}`);
        const dbBookings = bRes?.bookings || [];
        setBookings(dbBookings);
        saveLS(`${LS_DOC_BOOKINGS}_${doctor.id}`, dbBookings);
      } catch {}
    })();
  }, [doctor?.id]);

  async function toggleSlot(slotId) {
    const slot    = slots.find(s => s.id === slotId);
    const newVal  = !slot?.available;
    const updated = slots.map(s => s.id === slotId ? { ...s, available: newVal } : s);
    setSlots(updated);
    saveLS(`${LS_SLOTS}_${doctor?.id}`, updated);
    // PATCH just the availability (send full slot so backend can upsert if missing)
    try {
      await fetch(`/api/office-hours/slots/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}` },
        body: JSON.stringify({ available: newVal, ...slot }),
      });
    } catch {}
  }

  const byDay = {};
  slots.forEach(s => { if (!byDay[s.day]) byDay[s.day] = []; byDay[s.day].push(s); });

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        🕐 Office Hours Management
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>
        Set your availability and view student bookings
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          ['Available Slots', slots.filter(s => s.available).length, C.blue, '📅'],
          ['Student Bookings', bookings.length, '#10b981', '📋'],
          ['Blocked Slots', slots.filter(s => !s.available).length, '#f59e0b', '🚫'],
        ].map(([label, val, col, icon]) => (
          <div key={label} style={{
            flex: 1, background: C.card, borderRadius: 14,
            border: `1px solid ${col}33`, padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: col, marginTop: 6 }}>{val}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['schedule','📅 My Schedule'],['bookings',`📋 Bookings (${bookings.length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: tab === id ? C.blue : C.card,
            color: tab === id ? '#fff' : C.text2,
            border: `1px solid ${tab === id ? C.blue : C.border}`,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 14 }}>
            Click a slot to toggle its availability for students
          </div>
          {Object.entries(byDay).map(([day, daySlots]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>📆 {day}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {daySlots.map(slot => {
                  const isBooked = bookings.some(b => b.slotId === slot.id);
                  return (
                    <motion.button
                      key={slot.id}
                      onClick={() => !isBooked && toggleSlot(slot.id)}
                      whileHover={!isBooked ? { scale: 1.05 } : {}}
                      whileTap={!isBooked ? { scale: 0.95 } : {}}
                      style={{
                        padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                        cursor: isBooked ? 'default' : 'pointer',
                        background: isBooked ? '#8b5cf620'
                          : slot.available ? '#10b98118' : '#ef444415',
                        border: `1px solid ${isBooked ? '#8b5cf644'
                          : slot.available ? '#10b98144' : '#ef444433'}`,
                        color: isBooked ? '#8b5cf6'
                          : slot.available ? '#10b981' : '#ef4444',
                      }}
                    >
                      {isBooked ? '👤' : slot.available ? '✅' : '🚫'} {slot.time}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div>No student bookings yet</div>
            </div>
          ) : bookings.map((bk, i) => (
            <motion.div
              key={bk.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: C.card, borderRadius: 14,
                border: '1px solid #10b98133',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#3b82f620',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{bk.studentName}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{bk.day} at {bk.time} · {bk.duration} min</div>
                {bk.note && <div style={{ fontSize: 11, color: C.text2, marginTop: 4, fontStyle: 'italic' }}>"{bk.note}"</div>}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: '#10b98120', color: '#10b981',
              }}>
                CONFIRMED
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentOfficeHours;
