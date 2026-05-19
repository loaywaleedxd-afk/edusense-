/**
 * AtRiskPage — Early Warning System Dashboard
 * Doctor/Admin: see all at-risk students, run assessment, send alerts
 * Student: see their own risk card (personal view)
 */
import { useState, useEffect } from 'react';
import { get, post } from '../api.js';
import store from '../dataStore.js';

// ── Calculate risk locally from dataStore (works without backend) ─────────────
function calcLocalRisk(studentId) {
  const stu       = store.getStudent(studentId) || store.students[0];
  const sid       = stu?.id || studentId;
  const grades    = store.getStudentGrades?.(sid) || store.grades?.filter(g => g.studentId === sid) || [];
  const att       = store.getStudentAttendance?.(sid) || store.attendance?.filter(a => a.studentId === sid) || [];
  const emotions  = store.emotions?.filter(e => e.studentId === sid) || [];
  const subs      = store.submissions?.filter(s => s.studentId === sid) || [];
  const assigns   = store.assignments || [];

  // Attendance rate
  const totalAtt    = att.length || 1;
  const presentAtt  = att.filter(a => a.status === 'present').length;
  const attRate     = Math.round(presentAtt / totalAtt * 100);

  // Average grade
  const avgGrade = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.grade || g.score || 0), 0) / grades.length)
    : 85;

  // Negative emotion rate
  const negEmotions = ['sad', 'bored', 'angry', 'disgust', 'fear'];
  const negRate     = emotions.length
    ? Math.round(emotions.filter(e => negEmotions.includes(e.emotion)).length / emotions.length * 100)
    : 10;

  // Submission rate
  const subRate = assigns.length
    ? Math.round(subs.length / assigns.length * 100)
    : 100;

  // Score factors
  const attFactor  = attRate  < 50 ? 30 : attRate  < 70 ? 20 : attRate  < 80 ? 10 : 0;
  const gradeFactor= avgGrade < 50 ? 30 : avgGrade < 60 ? 20 : avgGrade < 70 ? 10 : 0;
  const emFactor   = negRate  > 70 ? 20 : negRate  > 50 ? 12 : negRate  > 30 ?  6 : 0;
  const subFactor  = subRate  < 50 ? 20 : subRate  < 70 ? 12 : subRate  < 85 ?  6 : 0;
  const score      = attFactor + gradeFactor + emFactor + subFactor;
  const level      = score >= 60 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';

  return {
    student_id: sid,
    risk_score:  score,
    risk_level:  level,
    attendance_factor:  attFactor,
    grade_factor:       gradeFactor,
    emotion_factor:     emFactor,
    assignment_factor:  subFactor,
    details: { attendance_rate: attRate, avg_grade: avgGrade, negative_emotion: negRate, submission_rate: subRate },
    _source: 'local',
  };
}

const LEVEL_META = {
  critical: { color: '#dc2626', bg: '#fef2f2', icon: '🚨', label: 'CRITICAL' },
  high:     { color: '#f97316', bg: '#fff7ed', icon: '⚠️',  label: 'HIGH' },
  medium:   { color: '#eab308', bg: '#fefce8', icon: '📊',  label: 'MEDIUM' },
  low:      { color: '#16a34a', bg: '#f0fdf4', icon: '✅',  label: 'LOW' },
};

// ── Risk score bar ────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 30, color, C }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: C.text2 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
        <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Student risk card ─────────────────────────────────────────────────────────
function RiskCard({ student, theme: C, onNotify }) {
  const [expanded, setExpanded] = useState(false);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const meta    = LEVEL_META[student.risk_level] || LEVEL_META.low;
  const details = student.details || {};

  async function sendAlert() {
    setSending(true);
    try {
      await post(`/api/at-risk/notify/${student.student_id}?notify_advisor=true&notify_parent=true`, {});
      setSent(true);
      onNotify?.();
    } catch (e) {
      alert('Failed to send: ' + e.message);
    } finally { setSending(false); }
  }

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${meta.color}40`,
      borderLeft: `4px solid ${meta.color}`,
      borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
        }}
      >
        {/* Risk badge */}
        <div style={{
          minWidth: 64, textAlign: 'center',
          background: meta.color + '15', borderRadius: 8, padding: '6px 0',
        }}>
          <div style={{ fontSize: 18 }}>{meta.icon}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: meta.color }}>{meta.label}</div>
        </div>

        {/* Student info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {student.student_name || student.student_id}
          </div>
          <div style={{ fontSize: 11, color: C.text2 }}>
            {student.department || 'Department N/A'} · ID: {student.student_id}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: meta.color }}>
            {student.risk_score}
          </div>
          <div style={{ fontSize: 9, color: C.text3 }}>/ 100</div>
        </div>

        <div style={{ fontSize: 12, color: C.text3 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Factor bars */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10 }}>
                RISK FACTOR BREAKDOWN
              </div>
              <ScoreBar label="📅 Attendance"   value={student.attendance_factor} max={30} color="#3b82f6" C={C} />
              <ScoreBar label="📝 Grades"        value={student.grade_factor}      max={30} color="#8b5cf6" C={C} />
              <ScoreBar label="😔 Emotions"      value={student.emotion_factor}    max={20} color="#f97316" C={C} />
              <ScoreBar label="📋 Assignments"   value={student.assignment_factor} max={20} color="#dc2626" C={C} />
            </div>

            {/* Actual data values */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10 }}>
                ACTUAL VALUES
              </div>
              {[
                { label: '📅 Attendance Rate',    val: `${details.attendance_rate ?? '—'}%` },
                { label: '📝 Average Grade',       val: `${details.avg_grade ?? '—'}%` },
                { label: '😔 Negative Emotions',  val: `${details.negative_emotion ?? '—'}%` },
                { label: '📋 Submission Rate',     val: `${details.submission_rate ?? '—'}%` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: C.text2 }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{item.val}</span>
                </div>
              ))}

              <div style={{ marginTop: 4, fontSize: 10, color: C.text3 }}>
                Last assessed: {student.assessed_at?.slice(0, 16) || '—'}
              </div>
            </div>
          </div>

          {/* Notification status + action */}
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                fontSize: 10, borderRadius: 10, padding: '3px 10px', fontWeight: 600,
                background: student.advisor_notified ? '#16a34a20' : '#64748b15',
                color: student.advisor_notified ? '#16a34a' : '#64748b',
              }}>
                {student.advisor_notified ? '✅ Advisor notified' : '⬜ Advisor not notified'}
              </span>
              <span style={{
                fontSize: 10, borderRadius: 10, padding: '3px 10px', fontWeight: 600,
                background: student.parent_notified ? '#16a34a20' : '#64748b15',
                color: student.parent_notified ? '#16a34a' : '#64748b',
              }}>
                {student.parent_notified ? '✅ Parent notified' : '⬜ Parent not notified'}
              </span>
            </div>

            {!sent ? (
              <button
                onClick={sendAlert}
                disabled={sending}
                style={{
                  marginLeft: 'auto',
                  background: sending ? C.border : meta.color,
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '7px 16px', fontSize: 11, fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : '📧 Send Alert Emails'}
              </button>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                ✅ Alerts sent!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Doctor/Admin dashboard ────────────────────────────────────────────────────
function AdminAtRisk({ theme: C }) {
  const [students, setStudents] = useState([]);
  const [filter,   setFilter]   = useState('medium');
  const [assessing, setAssessing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [lastRun,   setLastRun]   = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await get(`/api/at-risk/students?min_level=${filter}`);
      setStudents(data);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }

  async function runAssessment() {
    setAssessing(true);
    try {
      const res = await post('/api/at-risk/assess', {});
      setLastRun(`Assessed ${res.assessed} students`);
      await load();
    } catch (e) {
      setLastRun('Error: ' + e.message);
    } finally { setAssessing(false); }
  }

  useEffect(() => { load(); }, [filter]);

  const counts = {
    critical: students.filter(s => s.risk_level === 'critical').length,
    high:     students.filter(s => s.risk_level === 'high').length,
    medium:   students.filter(s => s.risk_level === 'medium').length,
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {Object.entries(counts).map(([level, count]) => {
          const m = LEVEL_META[level];
          return (
            <div key={level} style={{
              background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 12,
              padding: '16px 20px', cursor: 'pointer',
              outline: filter === level ? `2px solid ${m.color}` : 'none',
            }} onClick={() => setFilter(level)}>
              <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.icon} {m.label}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>students</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          Showing {filter}+ risk students ({students.length})
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '6px 12px', fontSize: 12, color: C.text,
            }}
          >
            <option value="low">All students</option>
            <option value="medium">Medium+ risk</option>
            <option value="high">High+ risk</option>
            <option value="critical">Critical only</option>
          </select>
          <button
            onClick={runAssessment}
            disabled={assessing}
            style={{
              background: assessing ? C.border : C.blue2,
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 16px', fontSize: 12, fontWeight: 700,
              cursor: assessing ? 'not-allowed' : 'pointer',
            }}
          >
            {assessing ? '⟳ Assessing…' : '⟳ Run Assessment'}
          </button>
        </div>
        {lastRun && <div style={{ fontSize: 11, color: C.text2, width: '100%' }}>✅ {lastRun}</div>}
      </div>

      {/* Student cards */}
      {loading
        ? <div style={{ color: C.text2 }}>Loading…</div>
        : students.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.text2 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>No results yet</div>
              <div style={{ fontSize: 12, marginTop: 4, marginBottom: 16 }}>
                Click <strong>⟳ Run Assessment</strong> to calculate risk scores for all students.
              </div>
              <div style={{ fontSize: 11, color: C.text3 }}>
                ⚠️ Requires the backend server to be running on port 8000
              </div>
            </div>
          )
          : students.map(s => (
            <RiskCard key={s.student_id} student={s} theme={C} onNotify={load} />
          ))
      }
    </div>
  );
}


// ── Student self-view ─────────────────────────────────────────────────────────
function StudentSelfRisk({ theme: C, studentId }) {
  // Start immediately with local data — no loading spinner needed
  const [data, setData] = useState(() => calcLocalRisk(studentId));
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    // Try to upgrade with real backend data silently
    get(`/api/at-risk/student/${studentId}`)
      .then(res => {
        if (res && res.risk_score !== undefined) {
          if (typeof res.details === 'string') {
            try { res.details = JSON.parse(res.details); } catch { res.details = {}; }
          }
          setData(res);
          setFromAPI(true);
        }
      })
      .catch(() => {}); // silently keep local data
  }, [studentId]);

  const meta    = LEVEL_META[data.risk_level] || LEVEL_META.low;
  const details = data.details || {};

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Data source badge */}
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
          background: fromAPI ? '#16a34a20' : '#f59e0b20',
          color:      fromAPI ? '#16a34a'   : '#92400e',
        }}>
          {fromAPI ? '🟢 Live from server' : '🟡 Estimated from local data'}
        </span>
      </div>

      <div style={{ background: meta.bg, border: `2px solid ${meta.color}40`, borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48 }}>{meta.icon}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: meta.color, marginTop: 8 }}>{data.risk_score}/100</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: meta.color }}>{meta.label} RISK</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {data.risk_level === 'low'
            ? 'You are on track. Keep up the good work!'
            : data.risk_level === 'medium'
            ? 'Some areas need attention. Consider visiting your advisor.'
            : data.risk_level === 'high'
            ? 'Important: Please meet with your advisor as soon as possible.'
            : '🚨 Critical: Immediate action required. Contact your advisor today.'}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 14 }}>YOUR PERFORMANCE SUMMARY</div>
        {[
          { label: '📅 Attendance Rate',   val: `${details.attendance_rate ?? '—'}%`,   ok: (details.attendance_rate ?? 100) >= 80 },
          { label: '📝 Average Grade',      val: `${details.avg_grade ?? '—'}%`,          ok: (details.avg_grade ?? 100) >= 70 },
          { label: '😔 Negative Emotions', val: `${details.negative_emotion ?? '—'}%`,   ok: (details.negative_emotion ?? 0) < 30 },
          { label: '📋 Submission Rate',    val: `${details.submission_rate ?? '—'}%`,   ok: (details.submission_rate ?? 100) >= 85 },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 12px', borderRadius: 8,
            background: item.ok ? '#16a34a08' : '#dc262608',
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 12, color: C.text2 }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: item.ok ? '#16a34a' : '#dc2626' }}>
              {item.ok ? '✅' : '⚠️'} {item.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Main export ───────────────────────────────────────────────────────────────
export default function AtRiskPage({ theme: C, user }) {
  const isAdvisor = user?.role === 'doctor' || user?.role === 'admin';
  const studentId = user?.studentId || user?.username;

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
          {isAdvisor ? '🚨 Early Warning System' : '📊 My Academic Status'}
        </div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          {isAdvisor
            ? 'AI-powered at-risk detection — attendance, grades, emotions, and assignments'
            : 'Your personal risk assessment and performance overview'}
        </div>
      </div>

      {isAdvisor
        ? <AdminAtRisk theme={C} />
        : <StudentSelfRisk theme={C} studentId={studentId} />
      }
    </div>
  );
}
