/**
 * CourseRegistrationPage — students browse available courses and request enrollment.
 * Admin approves/rejects requests in the AdminPage "Enrollments" tab.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api, getToken } from '../api';
import { pushToast } from '../components/NotificationToast';

const STATUS_COLORS = {
  enrolled: '#10b981',
  approved: '#10b981',
  pending:  '#f59e0b',
  rejected: '#ef4444',
  none:     '#6b7280',
};

const STATUS_LABELS = {
  enrolled: '✅ Enrolled',
  approved: '✅ Approved',
  pending:  '⏳ Pending',
  rejected: '❌ Rejected',
  none:     '+ Request Enrollment',
};

export default function CourseRegistrationPage({ theme: C }) {
  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [working,  setWorking]  = useState({}); // courseId → bool
  const fetchedRef = useRef(false); // prevent double-fetch in React StrictMode
  const hasToken = Boolean(getToken());

  // All hooks must be called unconditionally — auth check is in the render return below
  function load() {
    setLoading(true);
    setError('');
    api.getAvailableCourses()
      .then(data => { setCourses(data); setError(''); })
      .catch(err => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!hasToken) return; // no-op when not authenticated
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [hasToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // No JWT — show notice (all hooks already called above, safe to return early here)
  if (!hasToken) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text, marginBottom: 4, fontSize: 22 }}>🏛️ Course Registration</h2>
        <div style={{
          background: '#f59e0b18', border: '1px solid #f59e0b44',
          borderRadius: 10, padding: '16px 20px', marginTop: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 26 }}>🔒</span>
          <div>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15 }}>Server login required</div>
            <div style={{ color: C.text2, fontSize: 13, marginTop: 3 }}>
              Course registration requires a live server connection. Please log out and sign in again while the server is running.
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleRequest(course) {
    const cid = course.course_code;
    setWorking(w => ({ ...w, [cid]: true }));
    try {
      await api.requestEnrollment({ course_id: cid });
      pushToast({ title: 'Request sent!', message: `Your request for ${course.course_name} is pending admin approval.`, color: '#10b981' });
      setCourses(cs => cs.map(c => c.course_code === cid ? { ...c, my_status: 'pending' } : c));
    } catch (err) {
      pushToast({ title: 'Request failed', message: err.message, color: '#ef4444' });
    } finally {
      setWorking(w => ({ ...w, [cid]: false }));
    }
  }

  async function handleCancel(course) {
    const cid = course.course_code;
    setWorking(w => ({ ...w, [cid]: true }));
    try {
      const reqs = await api.getEnrollmentRequests();
      const req = reqs.find(r => r.course_id === cid);
      if (req) {
        await api.cancelEnrollmentRequest(req.id);
        pushToast({ title: 'Request cancelled', color: '#f59e0b' });
        setCourses(cs => cs.map(c => c.course_code === cid ? { ...c, my_status: 'none' } : c));
      }
    } catch (err) {
      setError(err.message || 'Cancel failed');
    } finally {
      setWorking(w => ({ ...w, [cid]: false }));
    }
  }

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return (
      c.course_name?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.doctor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: C.text, marginBottom: 4, fontSize: 22 }}>🏛️ Course Registration</h2>
      <p style={{ color: C.text2, fontSize: 14, marginBottom: 20 }}>
        Browse available courses and request enrollment. Your request will be reviewed by the admin.
      </p>

      {/* Search */}
      <input
        placeholder="Search by course name, code, or instructor…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 480, background: C.bg3,
          border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '9px 14px', color: C.text, fontSize: 14,
          outline: 'none', marginBottom: 20, boxSizing: 'border-box',
        }}
      />

      {error && (
        <div style={{
          background: '#ef444418', border: '1px solid #ef444444',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Could not load courses</div>
            <div style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>{error}</div>
          </div>
          <button
            onClick={() => { fetchedRef.current = false; load(); }}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#ef4444', color: '#fff', fontSize: 12,
              fontWeight: 700, cursor: 'pointer',
            }}
          >↻ Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.text2, fontSize: 14 }}>Loading courses…</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(course => {
            const status   = course.my_status || 'none';
            const filled   = Number(course.enrolled_count) || 0;
            const capacity = Number(course.capacity) || 0;
            const pct      = capacity > 0 ? Math.min(100, Math.round(filled / capacity * 100)) : 0;
            const isFull   = capacity > 0 && filled >= capacity;
            const busy     = working[course.course_code];

            return (
              <motion.div key={course.course_code}
                whileHover={{ y: -2 }}
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
                  borderLeft: `4px solid ${course.color || '#3b82f6'}`,
                }}
              >
                {/* Course header */}
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{course.course_name}</div>
                  <div style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>
                    {course.course_code} · {course.doctor_name || 'TBA'}
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: C.text2 }}>
                  {course.days_label && <span>📅 {course.days_label}</span>}
                  {course.scheduled_at && <span>🕐 {course.scheduled_at}</span>}
                  {course.room && <span>📍 {course.room}</span>}
                  {course.semester && <span>🎓 {course.semester}</span>}
                </div>

                {/* Capacity bar */}
                {capacity > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.text2, marginBottom: 4 }}>
                      <span>Seats filled</span>
                      <span style={{ color: isFull ? '#ef4444' : C.text2 }}>{filled}/{capacity}</span>
                    </div>
                    <div style={{ height: 4, background: C.bg3, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, transition: 'width .3s',
                        width: `${pct}%`,
                        background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981',
                      }} />
                    </div>
                  </div>
                )}

                {/* Action button */}
                <motion.button
                  whileHover={status === 'none' && !isFull ? { scale: 1.02 } : {}}
                  whileTap={status === 'none' && !isFull ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (status === 'none' && !isFull) handleRequest(course);
                    if (status === 'pending') handleCancel(course);
                  }}
                  disabled={busy || status === 'enrolled' || status === 'approved' || status === 'rejected' || (isFull && status === 'none')}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: busy ? 'wait'
                      : (status === 'none' && !isFull) || status === 'pending' ? 'pointer' : 'default',
                    background: status === 'enrolled' || status === 'approved'
                      ? '#10b981' + '22'
                      : status === 'pending'
                      ? '#f59e0b' + '22'
                      : status === 'rejected'
                      ? '#ef4444' + '22'
                      : isFull ? C.bg3 : C.blue2,
                    color: status === 'enrolled' || status === 'approved'
                      ? '#10b981'
                      : status === 'pending'
                      ? '#f59e0b'
                      : status === 'rejected'
                      ? '#ef4444'
                      : isFull ? C.text2 : '#fff',
                    marginTop: 'auto',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? '⏳ Working…'
                   : isFull && status === 'none' ? '🈵 Full'
                   : status === 'pending' ? '⏳ Pending — Cancel'
                   : STATUS_LABELS[status] || '+ Request'
                  }
                </motion.button>
              </motion.div>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: C.text2, padding: 40 }}>
              No courses found matching "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
