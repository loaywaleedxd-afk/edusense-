import { useState } from 'react';
import { DARK, LIGHT } from './theme';
import LoginPage  from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import DoctorPage  from './pages/DoctorPage';
import AdminPage   from './pages/AdminPage';
import ParentPage  from './pages/ParentPage';
import ChatWidget  from './components/ChatWidget';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [user, setUser]     = useState(null);

  const C = isDark ? DARK : LIGHT;

  function toggleMode() { setIsDark(d => !d); }
  function onLogin(u)   { setUser(u); }
  function onLogout()   { setUser(null); }

  const commonProps = { theme: C, user, isDark, onToggleMode: toggleMode, onLogout };

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
