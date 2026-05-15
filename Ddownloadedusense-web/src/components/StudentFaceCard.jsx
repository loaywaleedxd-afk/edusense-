import { EMOTION_ICONS } from '../theme';
import store from '../dataStore';

const STATUS_COLORS = { attentive: '#10b981', moderate: '#f59e0b', distracted: '#ef4444', absent: '#475569' };

export default function StudentFaceCard({ theme: C, student, onClick }) {
  const sc = STATUS_COLORS[student.attention] || C.border;
  const eng = student.engagement || 50;
  const engColor = eng > 65 ? '#10b981' : eng > 40 ? '#f59e0b' : '#ef4444';
  const photoUrl = store.getPhotoUrl(student);

  return (
    <div
      onClick={() => onClick?.(student.id)}
      style={{
        background: C.card2, borderRadius: 14, border: `2px solid ${sc}`,
        width: 112, cursor: onClick ? 'pointer' : 'default', overflow: 'hidden',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.transform='scale(1.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
    >
      <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: student.color || '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            overflow: 'hidden',
          }}>
            {photoUrl
              ? <img src={photoUrl} alt={student.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : null}
            <span style={{display: photoUrl ? 'none' : 'flex'}}>{student.emoji || '👤'}</span>
          </div>
          {/* Status dot */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%',
            background: sc, border: `2px solid ${C.card2}`,
          }}/>
        </div>

        {/* Name */}
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text, marginTop: 4, textAlign: 'center' }}>
          {student.name.split(' ')[0].slice(0,9)}
        </div>

        {/* Emotion */}
        <div style={{ fontSize: 9, color: C.text2, marginTop: 1 }}>
          {EMOTION_ICONS[student.emotion]||'😐'} {student.emotion}
        </div>

        {/* Engagement bar */}
        <div style={{ width: 80, height: 5, background: C.bg3, borderRadius: 5, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${eng}%`, height: '100%', background: engColor, borderRadius: 5 }}/>
        </div>
      </div>
    </div>
  );
}
