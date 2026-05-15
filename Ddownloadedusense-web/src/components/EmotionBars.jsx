import { EMOTION_ICONS } from '../theme';

export default function EmotionBarsWidget({ theme: C, data = [] }) {
  return (
    <div style={{ padding: '4px 0 14px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
          {/* Label */}
          <div style={{ width: 116, fontSize: 11, color: C.text2, flexShrink: 0 }}>
            {EMOTION_ICONS[d.emotion] || '😐'} {d.emotion}
          </div>

          {/* Bar */}
          <div style={{ flex: 1, height: 8, background: C.bg3, borderRadius: 4, margin: '0 8px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${d.pct||0}%`, background: d.color || C.blue, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>

          {/* Percent */}
          <div style={{ width: 36, fontSize: 10, color: C.text3, textAlign: 'right', flexShrink: 0 }}>{d.pct}%</div>
        </div>
      ))}
    </div>
  );
}
