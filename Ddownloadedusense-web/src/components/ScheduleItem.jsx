import Badge from './Badge';

export default function ScheduleItem({ theme: C, lecture, onClick }) {
  const statusColor = { active: 'green', scheduled: 'amber', ended: 'gray' }[lecture.status] || 'gray';

  return (
    <div
      onClick={() => onClick?.(lecture.id)}
      style={{
        background: C.card2, borderRadius: 12, display: 'flex', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Left accent */}
      <div style={{ width: 5, background: lecture.color || C.blue, flexShrink: 0 }} />

      <div style={{ padding: '12px 14px', flex: 1 }}>
        <div style={{ fontSize: 10, color: C.text3, marginBottom: 2 }}>
          {lecture.time} · {lecture.duration} min
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          {lecture.name}
        </div>
        <div style={{ fontSize: 10, color: C.text2, marginBottom: 6 }}>
          {lecture.room} · {lecture.doctor || ''}
        </div>
        <Badge text={(lecture.status||'scheduled').replace(/^\w/,c=>c.toUpperCase())} color={statusColor} />
      </div>
    </div>
  );
}
