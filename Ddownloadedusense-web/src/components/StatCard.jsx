const ACCENTS = {
  blue:   ['#3b82f6','#06b6d4'],
  green:  ['#10b981','#34d399'],
  amber:  ['#f59e0b','#ef4444'],
  purple: ['#8b5cf6','#ec4899'],
  red:    ['#ef4444','#f97316'],
  cyan:   ['#06b6d4','#3b82f6'],
};

const DIM_MAP = {
  blue: 'blue_dim', green: 'green_dim', amber: 'amber_dim',
  red: 'red_dim', purple: 'purple_dim', cyan: 'blue_dim',
};

export default function StatCard({ theme: C, label, value, sub, icon, accent = 'blue' }) {
  const [c1, c2] = ACCENTS[accent] || ACCENTS.blue;
  const dimKey = DIM_MAP[accent] || 'bg3';
  const dimColor = C[dimKey] || C.bg3;

  return (
    <div style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
      overflow: 'hidden', flex: 1, minWidth: 0,
    }}>
      {/* Top accent bar */}
      <div style={{ height: 4, background: c1, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 80, height: 4, background: c2 }} />
      </div>

      <div style={{ padding: '16px 20px 18px' }}>
        {/* Icon bubble */}
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: dimColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, marginBottom: 6,
          }}>{icon}</div>
        )}

        {/* Label */}
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 2, marginTop: icon ? 4 : 0 }}>{label}</div>

        {/* Value */}
        <div style={{ fontSize: 32, fontWeight: 700, color: c1, lineHeight: 1.1 }}>{value}</div>

        {/* Sub */}
        {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
