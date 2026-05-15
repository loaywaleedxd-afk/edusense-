const TYPE_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
const TYPE_ICONS  = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };

export default function AlertItem({ theme: C, alert }) {
  const color = TYPE_COLORS[alert.type] || '#3b82f6';
  const icon  = TYPE_ICONS[alert.type]  || 'ℹ️';

  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${color}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 5, height: '100%', background: color }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 12px 12px 20px', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.text }}>{alert.msg}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{alert.time}</div>
        </div>
      </div>
    </div>
  );
}
