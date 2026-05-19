import { useState } from 'react';
import { DARK, LIGHT } from './theme';
import LoginPage   from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import DoctorPage  from './pages/DoctorPage';
import AdminPage   from './pages/AdminPage';
import ParentPage  from './pages/ParentPage';
import ChatWidget  from './components/ChatWidget';
import store       from './dataStore';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [user,   setUser]   = useState(null);
  const [loading, setLoading] = useState(false);

  const C = isDark ? DARK : LIGHT;

  function toggleMode() { setIsDark(d => !d); }

  function onLogout() {
    store.signOut();   // clear JWT token
    setUser(null);
  }

  async function onLogin(username, password) {
    setLoading(true);
    try {
      const u = await store.authenticate(username, password);
      setUser(u || null);
      return u;
    } finally {
      setLoading(false);
    }
  }

  const commonProps = { theme: C, user, isDark, onToggleMode: toggleMode, onLogout };

  if (loading) {
    return (
      <div style={{
        height: '100vh', background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 36 }}>⚡</div>
        <div style={{ fontSize: 14, color: C.text2 }}>Signing in…</div>
        <div style={{
          width: 120, height: 4, background: C.border, borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            width: '60%', height: '100%', background: C.blue2, borderRadius: 4,
            animation: 'slide 1s ease-in-out infinite alternate',
          }} />
        </div>
        <style>{`@keyframes slide{from{transform:translateX(0)}to{transform:translateX(100px)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {!user ? (
        <LoginPage theme={C} onLogin={onLogin} />
      ) : user.role === 'student' ? (
        <StudentPage {...commonProps} />
      ) : user.role === 'doctor' ? (
        <DoctorPage {...commonProps} />
      ) : user.role === 'admin' ? (
        <AdminPage {...commonProps} />
      ) : user.role === 'parent' ? (
        <ParentPage {...commonProps} />
      ) : (
        <AdminPage {...commonProps} />
      )}
      {user && <ChatWidget user={user} />}
    </div>
  );
}
