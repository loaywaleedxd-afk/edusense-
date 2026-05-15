import { useState } from 'react';

export default function Sidebar({ theme: C, navItems, activeId, onNav }) {
  return (
    <div style={{
      width: 230, minWidth: 230, height: '100%',
      background: C.sidebar, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.blue2 }}>⚡ EduSense</div>
        <div style={{ fontSize: 9, color: C.text3, marginTop: 4 }}>Emotion & Attendance AI</div>
      </div>

      {/* Accent line */}
      <div style={{ height: 2, background: C.blue3, flexShrink: 0 }} />

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navItems.map((item, idx) => (
          item.section
            ? <div key={idx} style={{ fontSize: 9, fontWeight: 700, color: C.text3, padding: '14px 18px 4px', letterSpacing: '0.08em' }}>
                {item.section.toUpperCase()}
              </div>
            : <NavBtn key={item.id} item={item} isActive={activeId === item.id} theme={C} onClick={() => onNav(item.id)} />
        ))}
      </div>

      {/* Version */}
      <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 9, color: C.text3, flexShrink: 0 }}>
        v 3.0 · EduSense
      </div>
    </div>
  );
}

function NavBtn({ item, isActive, theme: C, onClick }) {
  const [hovered, setHovered] = useState(false);

  const bg = isActive ? C.blue_dim : hovered ? C.hover : 'transparent';
  const textColor = isActive ? C.blue2 : C.text3;
  const barColor = isActive ? C.blue2 : 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', margin: '2px 8px', borderRadius: 10,
        background: bg, cursor: 'pointer', transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: 4, minHeight: 42, borderRadius: 2, background: barColor, margin: '4px 0 4px 4px', transition: 'background 0.15s' }} />

      {/* Icon */}
      <span style={{ fontSize: 15, width: 28, textAlign: 'center', padding: '11px 8px 11px 8px', color: textColor }}>
        {item.icon}
      </span>

      {/* Label */}
      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: textColor, flex: 1, transition: 'color 0.15s' }}>
        {item.label}
      </span>

      {/* Badge */}
      {item.badge && (
        <span style={{
          background: C.red, color: '#fff', fontSize: 9, fontWeight: 700,
          borderRadius: 10, minWidth: 22, height: 18, display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginRight: 10, padding: '0 4px',
        }}>{item.badge}</span>
      )}

      {/* Live dot */}
      {item.live && (
        <span className="live-dot" style={{ color: C.red, fontSize: 10, marginRight: 10 }}>●</span>
      )}
    </div>
  );
}
