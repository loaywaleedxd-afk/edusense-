export default function EmptyState({ icon = '📭', title, subtitle, theme: C }) {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.text3 }}>{subtitle}</div>}
    </div>
  );
}
