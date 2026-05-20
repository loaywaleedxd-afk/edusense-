import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DARK, LIGHT } from './theme';
import { useLang } from './context/LanguageContext';
import LoginPage             from './pages/LoginPage';
import StudentPage           from './pages/StudentPage';
import DoctorPage            from './pages/DoctorPage';
import AdminPage             from './pages/AdminPage';
import ParentPage            from './pages/ParentPage';
import ChatWidget            from './components/ChatWidget';
import ExamProctoringPage    from './pages/ExamProctoringPage';
import AdvisingPage          from './pages/AdvisingPage';
import AtRiskPage            from './pages/AtRiskPage';
import NotificationToast     from './components/NotificationToast';
import store                 from './dataStore';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [user,   setUser]   = useState(null);
  const [loading, setLoading] = useState(false);
  const { isRTL } = useLang();

  // Read QR check-in payload from URL (mobile scan) and persist through login
  const [pendingQR, setPendingQR] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('checkin');
      if (p) {
        window.history.replaceState({}, '', window.location.pathname);
        const data = JSON.parse(atob(p));
        sessionStorage.setItem('es_pending_qr', JSON.stringify(data));
        return data;
      }
      const stored = sessionStorage.getItem('es_pending_qr');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  });
  function clearPendingQR() { sessionStorage.removeItem('es_pending_qr'); setPendingQR(null); }

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

  const [overlay, setOverlay] = useState(null); // 'proctoring' | 'advising' | 'atrisk'

  const commonProps = {
    theme: C, user, isDark, onToggleMode: toggleMode, onLogout,
    onOpenProctoring: () => setOverlay('proctoring'),
    onOpenAdvising:   () => setOverlay('advising'),
    onOpenAtRisk:     () => setOverlay('atrisk'),
  };

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
    <div style={{ height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", direction: isRTL ? 'rtl' : 'ltr' }}>
      {!user ? (
        <LoginPage theme={C} onLogin={onLogin} />
      ) : user.role === 'student' ? (
        <StudentPage {...commonProps} pendingQR={pendingQR} onClearPendingQR={clearPendingQR} />
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
      {user && <NotificationToast user={user} />}

      {/* ── Full-screen overlay pages ── */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            key="overlay"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0,      opacity: 1 }}
            exit={{    x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed', inset: 0, background: C.bg, zIndex: 200,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Overlay top-bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px', background: C.sidebar || C.card,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <motion.button
                onClick={() => setOverlay(null)}
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: C.bg3, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '5px 12px', fontSize: 12,
                  color: C.text, cursor: 'pointer', fontWeight: 600,
                }}
              >← Back</motion.button>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {overlay === 'proctoring' ? '🎥 Exam Proctoring'
                 : overlay === 'advising' ? '🎓 Academic Advising'
                 : '🚨 Early Warning System'}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {overlay === 'proctoring' && <ExamProctoringPage theme={C} user={user} />}
              {overlay === 'advising'   && <AdvisingPage       theme={C} user={user} />}
              {overlay === 'atrisk'     && <AtRiskPage         theme={C} user={user} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
