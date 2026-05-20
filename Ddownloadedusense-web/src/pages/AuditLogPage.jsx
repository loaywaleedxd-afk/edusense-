import { useState } from 'react';
import store from '../dataStore';
import Card from '../components/Card';
import Badge from '../components/Badge';

const ROLE_COLORS = { admin:'blue', doctor:'purple', student:'green', system:'gray' };
const ACTION_LABELS = {
  grade_appeal_submitted: 'Grade Appeal Submitted',
  grade_appeal_updated: 'Grade Appeal Updated',
  login: 'Login',
  logout: 'Logout',
  student_added: 'Student Added',
  student_deleted: 'Student Deleted',
  doctor_added: 'Lecturer Added',
  course_added: 'Course Added',
  grade_posted: 'Grade Posted',
};

export default function AuditLogPage({ theme: C }) {
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [search,       setSearch]       = useState('');

  const filters = {};
  if (roleFilter   !== 'all') filters.role   = roleFilter;
  if (actionFilter !== 'all') filters.action = actionFilter;
  if (search)                 filters.search = search;
  const logs = store.getAuditLog(filters);

  const roles    = ['all', ...new Set(store.getAuditLog().map(l => l.actorRole))];
  const actions  = ['all', ...new Set(store.getAuditLog().map(l => l.action))];

  const inp = {
    background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '6px 10px', fontSize: 12, color: C.text, outline: 'none',
  };
  const sel = { ...inp, cursor: 'pointer' };

  return (
    <div style={{ padding: '12px 20px 24px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        🗃️ Audit Log
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>
        Full trail of system actions — {logs.length} entries
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inp, minWidth: 180 }}
          placeholder="Search actor, action, details…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={sel} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          {roles.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>)}
        </select>
        <select style={sel} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          {actions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : (ACTION_LABELS[a] || a)}</option>)}
        </select>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 48, fontSize: 13 }}>
          No audit entries found.
        </div>
      ) : (
        <Card theme={C} title="">
          <div style={{ padding: '0 0 8px' }}>
            {logs.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                }}
              >
                <Badge text={entry.actorRole || 'system'} color={ROLE_COLORS[entry.actorRole] || 'gray'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>
                    By <strong>{entry.actorName}</strong>
                    {entry.details ? ` — ${entry.details}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.text3, flexShrink: 0, textAlign: 'right' }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
