export default function Card({ theme: C, title, accentColor, children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
      overflow: 'hidden', ...style,
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px 0', gap: accentColor ? 10 : 0 }}>
          {accentColor && <div style={{ width: 4, height: 20, borderRadius: 2, background: accentColor, flexShrink: 0 }} />}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}
