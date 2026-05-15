const ROLE_COLORS = { doctor: '#8b5cf6', admin: '#10b981', student: '#3b82f6', parent: '#f59e0b' };

export default function Topbar({ theme: C, user, pageTitle, isDark, onToggleMode, onLogout }) {
  const roleColor = ROLE_COLORS[user?.role] || '#3b82f6';
  const initials = user?.initials || user?.name?.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '??';

  return (
    <div style={{
      height: 64, background: C.card, display: 'flex', alignItems: 'center',
      paddingLeft: 24, paddingRight: 16, borderBottom: `1px solid ${C.border}`,
      flexShrink: 0, position: 'relative', zIndex: 10,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.text }}>
        {pageTitle}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mode toggle */}
        <button
          onClick={onToggleMode}
          style={{
            background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 20,
            padding: '7px 14px', fontSize: 11, fontWeight: 700, color: C.text2,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s',
          }}
        >
          <span>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: C.border }} />

        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: roleColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          overflow: 'hidden', border: `2px solid ${roleColor}`,
        }}>
          {user?.photoUrl
            ? <img src={user.photoUrl} alt={initials} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{display: user?.photoUrl ? 'none' : 'flex'}}>{initials}</span>
        </div>

        {/* Name + role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user?.name || 'User'}</div>
          <div style={{ fontSize: 10, color: C.text3 }}>{(user?.role||'').replace(/^\w/,c=>c.toUpperCase())}</div>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          style={{
            background: C.red_dim, border: `1px solid ${C.red}`, borderRadius: 8,
            padding: '8px 14px', fontSize: 11, color: C.red2, fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.background=C.red}
          onMouseLeave={e=>e.currentTarget.style.background=C.red_dim}
        >Sign Out</button>
      </div>
    </div>
  );
}
