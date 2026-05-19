import { useState } from 'react';

const ROLES = [
  { role: 'student', emoji: '🎓', label: 'Student',            desc: 'View attendance & emotions',       color: '#3b82f6', user: '231014184.0', pass: 'WGaub52Z' },
  { role: 'doctor',  emoji: '👨‍🏫', label: 'Doctor / Lecturer', desc: 'Manage lectures & live sessions',  color: '#8b5cf6', user: 'dr.ahmed',    pass: 'Ahmed@2024' },
  { role: 'admin',   emoji: '🏛️', label: 'Admin',              desc: 'System management & reports',      color: '#10b981', user: 'admin',        pass: 'Admin@EduSense2025!' },
  { role: 'parent',  emoji: '👨‍👩‍👧', label: 'Parent',            desc: 'Monitor child performance',        color: '#f59e0b', user: 'parent',       pass: 'Parent@EduSense2025!' },
];

export default function LoginPage({ theme: C, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy,  setBusy]        = useState(false);

  function selectRole(r) {
    setSelected(r);
    setUsername(r.user);
    setPassword(r.pass);
    setError('');
  }

  async function doLogin() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await onLogin(username.trim(), password.trim());
      if (!user) setError('⚠  Invalid username or password');
    } catch (e) {
      setError(`⚠  ${e.message || 'Login failed'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      height: '100%', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', overflow: 'auto',
    }}>
      <div style={{ textAlign: 'center' }}>
        {!selected ? (
          /* ─── Role Selection ─── */
          <div className="animate-in">
            <div style={{ fontSize: 42, fontWeight: 700, color: C.blue2, marginBottom: 4 }}>⚡ EduSense</div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 40 }}>Classroom Emotion Detection & Attendance System</div>
            <div style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>Choose your role to continue</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {ROLES.map(r => <RoleCard key={r.role} info={r} theme={C} onClick={selectRole} />)}
            </div>
          </div>
        ) : (
          /* ─── Login Form ─── */
          <div className="animate-in" style={{
            background: C.card, borderRadius: 18, border: `1px solid ${C.border2}`,
            padding: '24px 36px', minWidth: 392,
          }}>
            <div style={{ fontSize: 30, marginBottom: 4 }}>{selected.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {selected.label} Login
            </div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 16 }}>Enter your credentials to continue</div>

            {/* Username */}
            <div style={{ textAlign: 'left', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4, letterSpacing: '0.06em' }}>USERNAME</div>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                placeholder="Enter username"
                disabled={busy}
                style={{
                  width: '100%', height: 38, background: C.bg3, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: '0 12px', fontSize: 12, color: C.text,
                }}
              />
            </div>

            {/* Password */}
            <div style={{ textAlign: 'left', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4, letterSpacing: '0.06em' }}>PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                placeholder="Password"
                disabled={busy}
                style={{
                  width: '100%', height: 38, background: C.bg3, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: '0 12px', fontSize: 12, color: C.text,
                }}
              />
            </div>

            {error && <div style={{ fontSize: 11, color: C.red2, marginBottom: 4 }}>{error}</div>}

            <button
              onClick={doLogin}
              disabled={busy}
              style={{
                width: '100%', height: 40, background: busy ? C.border : selected.color,
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                color: '#fff', marginTop: 8, cursor: busy ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {busy ? 'Signing in…' : 'Sign In  →'}
            </button>

            <div style={{
              background: C.blue_dim, borderRadius: 8, padding: '7px 12px',
              marginTop: 12, fontSize: 10, color: C.blue2,
            }}>
              Demo: {selected.user}
            </div>

            <button
              onClick={() => setSelected(null)}
              style={{
                width: '100%', marginTop: 8, background: 'transparent', border: 'none',
                fontSize: 11, color: C.text3, cursor: 'pointer', padding: '8px 0',
              }}
            >← Choose different role</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({ info, theme: C, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onClick(info)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 220, height: 130, background: hov ? C.hover : C.card,
        borderRadius: 14, border: `1px solid ${hov ? info.color : C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', gap: 4,
      }}
    >
      <div style={{ fontSize: 30 }}>{info.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{info.label}</div>
      <div style={{ fontSize: 10, color: C.text2, textAlign: 'center', padding: '0 16px' }}>{info.desc}</div>
    </div>
  );
}
