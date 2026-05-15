const PALETTE = {
  green:  ['#052e1a','#34d399'],
  red:    ['#2d0808','#f87171'],
  amber:  ['#2d1a00','#fbbf24'],
  blue:   ['#172a50','#60a5fa'],
  purple: ['#1e0d3d','#a78bfa'],
  gray:   ['#1e293b','#94a3b8'],
};

const PALETTE_LIGHT = {
  green:  ['#d1fae5','#059669'],
  red:    ['#fee2e2','#dc2626'],
  amber:  ['#fef3c7','#d97706'],
  blue:   ['#dbeafe','#2563eb'],
  purple: ['#ede9fe','#7c3aed'],
  gray:   ['#f1f5f9','#475569'],
};

export default function Badge({ text, color = 'blue', isDark = true, style }) {
  const pal = isDark ? PALETTE : PALETTE_LIGHT;
  const [bg, fg] = pal[color] || pal.blue;

  return (
    <span style={{
      background: bg, color: fg, fontSize: 10, fontWeight: 700,
      borderRadius: 12, padding: '2px 8px', display: 'inline-block',
      ...style,
    }}>{text}</span>
  );
}
