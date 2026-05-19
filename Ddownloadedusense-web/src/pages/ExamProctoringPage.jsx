/**
 * ExamProctoringPage — shown to student during an online exam
 * 1. Identity verification (webcam snapshot at start)
 * 2. Continuous monitoring every 4 seconds
 * 3. Alerts shown to student for each suspicious event
 * 4. Doctor/admin review panel (when viewed by those roles)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { get, post } from '../api.js';

const EVENT_LABELS = {
  face_not_visible: { label: 'Face not visible',   icon: '👁️',  color: '#dc2626' },
  multiple_faces:   { label: 'Multiple faces',      icon: '👥',  color: '#dc2626' },
  looking_away:     { label: 'Looking away',        icon: '↩️',  color: '#f97316' },
  ok:               { label: 'All clear',           icon: '✅',  color: '#16a34a' },
};

const CHECK_INTERVAL_MS = 4000;   // check every 4 seconds
const WARN_THRESHOLD    = 3;      // warn student after this many events

// ── Doctor/Admin: Review panel ────────────────────────────────────────────────
function ReviewPanel({ theme: C, examId }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    get(`/api/proctor/sessions${examId ? `?exam_id=${examId}` : ''}`)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [examId]);

  async function viewSession(s) {
    setSelected(s);
    const ev = await get(`/api/proctor/events/${s.id}`).catch(() => []);
    setEvents(ev);
  }

  const levelColor = (count) =>
    count >= 5 ? '#dc2626' : count >= 3 ? '#f97316' : count >= 1 ? '#eab308' : '#16a34a';

  if (loading) return <div style={{ color: C.text2, padding: 32 }}>Loading sessions…</div>;
  // backend offline / no sessions yet → handled gracefully by empty list below

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Session list */}
      <div style={{ width: 340, overflowY: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          🎥 Proctoring Sessions ({sessions.length})
        </div>
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => viewSession(s)}
            style={{
              background: selected?.id === s.id ? C.hover : C.card,
              border: `1px solid ${selected?.id === s.id ? C.blue2 : C.border}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 8,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {s.student_name || s.student_id}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#fff',
                background: levelColor(s.suspicious_count),
                borderRadius: 20, padding: '2px 10px',
              }}>
                {s.suspicious_count} events
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
              {s.status === 'flagged' ? '🚩 FLAGGED' : s.status === 'completed' ? '✅ Clean' : '🔴 Active'}
              {' · '}
              {s.identity_verified ? '🪪 Verified' : '⚠️ Unverified'}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={{ color: C.text2, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            No proctoring sessions yet
          </div>
        )}
      </div>

      {/* Event detail */}
      <div style={{ flex: 1, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, overflowY: 'auto' }}>
        {selected ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {selected.student_name || selected.student_id}
            </div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 16 }}>
              Exam: {selected.exam_id} · Checks: {selected.total_checks} · Started: {selected.started_at?.slice(0,16)}
            </div>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { label: `${selected.suspicious_count} Suspicious`, color: levelColor(selected.suspicious_count) },
                { label: selected.identity_verified ? 'ID Verified' : 'ID Unverified', color: selected.identity_verified ? '#16a34a' : '#dc2626' },
                { label: selected.status.toUpperCase(), color: selected.status === 'flagged' ? '#dc2626' : '#16a34a' },
              ].map(chip => (
                <span key={chip.label} style={{
                  background: chip.color + '20', color: chip.color, borderRadius: 20,
                  padding: '3px 12px', fontSize: 11, fontWeight: 700,
                }}>{chip.label}</span>
              ))}
            </div>

            {/* Events timeline */}
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 8 }}>
              SUSPICIOUS EVENTS TIMELINE
            </div>
            {events.length === 0 ? (
              <div style={{ color: C.text2, fontSize: 13 }}>✅ No suspicious events recorded</div>
            ) : events.map((ev, i) => {
              const info = EVENT_LABELS[ev.event_type] || { label: ev.event_type, icon: '⚠️', color: '#64748b' };
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  background: info.color + '10', border: `1px solid ${info.color}30`,
                }}>
                  <span style={{ fontSize: 18 }}>{info.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</div>
                    <div style={{ fontSize: 11, color: C.text2 }}>{ev.timestamp?.slice(0, 19)}</div>
                  </div>
                  <span style={{
                    fontSize: 10, background: info.color, color: '#fff',
                    borderRadius: 10, padding: '2px 8px', fontWeight: 700,
                  }}>{ev.severity}</span>
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ color: C.text2, fontSize: 13, textAlign: 'center', marginTop: 60 }}>
            👈 Select a session to view events
          </div>
        )}
      </div>
    </div>
  );
}


// ── Student: Live proctoring session ─────────────────────────────────────────
function StudentProctoring({ theme: C, user, examId }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const streamRef   = useRef(null);

  const [phase,         setPhase]       = useState('setup');     // setup | verifying | active | ended
  const [sessionId,     setSessionId]   = useState(null);
  const [alertMsg,      setAlertMsg]    = useState('');
  const [alertSeverity, setAlertSev]   = useState('info');
  const [warnCount,     setWarnCount]  = useState(0);
  const [camError,      setCamError]   = useState('');
  const [events,        setEvents]     = useState([]);
  const [localMode,     setLocalMode]  = useState(false);  // true when backend is unavailable

  // Start camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamError('');
    } catch {
      setCamError('Camera access denied. Please allow camera access to take this exam.');
    }
  }

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  function stopCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  // Capture current frame as base64
  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return null;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width  = videoRef.current.videoWidth  || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvasRef.current.toDataURL('image/jpeg', 0.7);
  }

  // Client-side frame analysis when backend is unavailable
  // Uses pixel brightness as a proxy: very dark = no face visible
  function analyzeFrameLocally() {
    if (!canvasRef.current) return { event: 'ok', severity: 'info' };
    try {
      const ctx    = canvasRef.current.getContext('2d');
      const { width, height } = canvasRef.current;
      if (!width || !height) return { event: 'ok', severity: 'info' };
      const data   = ctx.getImageData(0, 0, width, height).data;
      let brightness = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        brightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      }
      brightness = brightness / pixels;
      if (brightness < 15) return { event: 'face_not_visible', severity: 'critical' };
    } catch { /* ignore */ }
    return { event: 'ok', severity: 'info' };
  }

  // Identity verification step
  async function verifyIdentity() {
    setPhase('verifying');
    const frame = captureFrame();
    if (!frame) { setPhase('setup'); return; }
    try {
      const res = await post('/api/proctor/verify-identity', {
        student_id: user.studentId || user.username,
        exam_id:    examId,
        frame_b64:  frame,
      });
      if (res.verified) {
        await beginSession(false);
      } else {
        setAlertMsg(res.message);
        setAlertSev('critical');
        setPhase('setup');
      }
    } catch {
      // Backend unavailable — use local mode (camera is on = verified)
      setLocalMode(true);
      await beginSession(true);
    }
  }

  async function beginSession(isLocal = false) {
    let sid;
    if (!isLocal) {
      const s = await post('/api/proctor/start', {
        student_id: user.studentId || user.username,
        exam_id:    examId,
      });
      sid = s.session_id;
    } else {
      sid = `local_${Date.now()}`;
    }
    setSessionId(sid);
    setPhase('active');
    setAlertMsg('✅ Exam started. Keep your face visible at all times.');
    setAlertSev('ok');
    intervalRef.current = setInterval(() => checkFrame(sid, isLocal), CHECK_INTERVAL_MS);
  }

  const checkFrame = useCallback(async (sid, isLocal = false) => {
    const frame = captureFrame();
    if (!frame) return;

    if (isLocal) {
      // Client-side analysis only
      const result = analyzeFrameLocally();
      if (result.event !== 'ok') {
        const info = EVENT_LABELS[result.event] || {};
        setWarnCount(c => c + 1);
        setAlertMsg(info.label || result.event);
        setAlertSev(result.severity);
        setEvents(prev => [{ event: result.event, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);
      } else {
        setAlertMsg('');
        setAlertSev('info');
      }
      return;
    }

    try {
      const res = await post('/api/proctor/check-frame', {
        session_id: sid,
        student_id: user.studentId || user.username,
        exam_id:    examId,
        frame_b64:  frame,
      });
      const info = EVENT_LABELS[res.event] || {};
      if (res.event !== 'ok') {
        setWarnCount(res.suspicious_count);
        setAlertMsg(info.label || res.event);
        setAlertSev(res.severity);
        setEvents(prev => [{ ...res, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);
      } else {
        setAlertMsg('');
        setAlertSev('info');
      }
    } catch {
      // Backend went offline mid-session — switch to local analysis
      setLocalMode(true);
      const result = analyzeFrameLocally();
      if (result.event !== 'ok') {
        const info = EVENT_LABELS[result.event] || {};
        setWarnCount(c => c + 1);
        setAlertMsg(info.label || result.event);
        setAlertSev(result.severity);
        setEvents(prev => [{ event: result.event, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);
      } else {
        setAlertMsg('');
        setAlertSev('info');
      }
    }
  }, [examId, user]);

  async function endExam() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionId && !sessionId.startsWith('local_')) {
      await post('/api/proctor/end', { session_id: sessionId }).catch(() => {});
    }
    stopCamera();
    setPhase('ended');
  }

  const alertColors = {
    ok: '#16a34a', info: '#3b82f6', warning: '#f97316', critical: '#dc2626',
  };
  const alertColor = alertColors[alertSeverity] || '#64748b';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>🎥 Exam Proctoring</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Exam: {examId} · Student: {user.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {localMode && (
            <span style={{ background: '#f59e0b20', color: '#92400e', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
              🟡 Offline mode
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ background: '#dc262620', color: '#dc2626', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
              ⚠️ {warnCount} warnings
            </span>
          )}
          <span style={{
            background: phase === 'active' ? '#16a34a20' : '#64748b20',
            color: phase === 'active' ? '#16a34a' : '#64748b',
            borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
          }}>
            {phase === 'active' ? '🔴 LIVE' : phase.toUpperCase()}
          </span>
        </div>
      </div>

      {phase === 'ended' ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Exam Submitted</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 8 }}>
            Your proctoring session has ended. {warnCount > 0 ? `${warnCount} events were recorded.` : 'No suspicious events detected.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          {/* Webcam */}
          <div style={{ background: C.card, borderRadius: 14, border: `2px solid ${alertMsg && alertSeverity !== 'ok' ? alertColor : C.border}`, overflow: 'hidden', transition: 'border-color 0.3s' }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {camError ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontSize: 13 }}>
                🚫 {camError}
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width: '100%', display: 'block', borderRadius: 12 }} />
            )}
            {alertMsg && (
              <div style={{ padding: '10px 16px', background: alertColor + '15', borderTop: `1px solid ${alertColor}30` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: alertColor }}>
                  {EVENT_LABELS[alertSeverity === 'ok' ? 'ok' : '']?.icon || '⚠️'} {alertMsg}
                </span>
              </div>
            )}
          </div>

          {/* Controls + event log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Action buttons */}
            {phase === 'setup' && (
              <button onClick={verifyIdentity} style={{
                background: C.blue2, color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                🪪 Verify Identity & Start
              </button>
            )}
            {phase === 'verifying' && (
              <div style={{ textAlign: 'center', color: C.text2, fontSize: 12, padding: 12 }}>
                Verifying identity…
              </div>
            )}
            {phase === 'active' && (
              <button onClick={endExam} style={{
                background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                ✅ Submit & End Exam
              </button>
            )}

            {/* Rules */}
            <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8 }}>📋 EXAM RULES</div>
              {['Keep face visible at all times', 'Only one person in frame', 'Look at screen, not away', 'No phones or external help'].map(r => (
                <div key={r} style={{ fontSize: 11, color: C.text2, marginBottom: 4 }}>• {r}</div>
              ))}
            </div>

            {/* Event log */}
            <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8 }}>⚠️ EVENT LOG</div>
              {events.length === 0
                ? <div style={{ fontSize: 11, color: C.text2 }}>No events yet</div>
                : events.map((ev, i) => {
                  const info = EVENT_LABELS[ev.event] || {};
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{info.icon || '⚠️'}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: info.color || '#64748b' }}>{info.label || ev.event}</div>
                        <div style={{ fontSize: 10, color: C.text3 }}>{ev.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Main export ───────────────────────────────────────────────────────────────
export default function ExamProctoringPage({ theme: C, user, examId = 'DEMO-EXAM-001' }) {
  const isReviewer = user?.role === 'doctor' || user?.role === 'admin';

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🎥 Exam Proctoring</div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          {isReviewer ? 'Review flagged sessions and suspicious behaviour' : 'AI-monitored exam session'}
        </div>
      </div>

      {isReviewer
        ? <ReviewPanel theme={C} examId={examId} />
        : <StudentProctoring theme={C} user={user} examId={examId} />
      }
    </div>
  );
}
