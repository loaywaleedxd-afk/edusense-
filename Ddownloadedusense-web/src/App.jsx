import { useState, useEffect, lazy, Suspense, Component } from 'react';

/* ── Global error boundary — prevents any single-page crash from blanking the whole app ── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, textAlign: 'center', color: '#ef4444',
          fontFamily: 'monospace', fontSize: 13, background: '#0f172a', minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Something went wrong</div>
          <div style={{ color: '#94a3b8', maxWidth: 500 }}>{this.state.error?.message}</div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 12, background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AnimatePresence, motion } from 'framer-motion';
import { DARK, LIGHT, buildTheme } from './theme';
import { useLang } from './context/LanguageContext';
// LandingPage is shown to unauthenticated visitors; LoginPage is shown on "Get Started"
import LandingPage           from './pages/LandingPage';
import LoginPage             from './pages/LoginPage';
// All role pages are lazy-loaded — only the relevant one is ever downloaded
const StudentPage        = lazy(() => import('./pages/StudentPage'));
const DoctorPage         = lazy(() => import('./pages/DoctorPage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const ParentPage         = lazy(() => import('./pages/ParentPage'));
const SuperAdminPage     = lazy(() => import('./pages/SuperAdminPage'));
// Overlay pages: loaded only when the user opens them
const ExamProctoringPage = lazy(() => import('./pages/ExamProctoringPage'));
const AdvisingPage       = lazy(() => import('./pages/AdvisingPage'));
const AtRiskPage         = lazy(() => import('./pages/AtRiskPage'));
import ChatWidget            from './components/ChatWidget';
import NotificationToast     from './components/NotificationToast';
import OnboardingTour        from './components/OnboardingTour';
import PWAInstallPrompt      from './components/PWAInstallPrompt';
import store                 from './dataStore';
import PaymentReturnPage     from './pages/PaymentReturnPage';

// Rate-limit state: { count, lockedUntil } stored in sessionStorage
const RATE_KEY = 'es_login_rate';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000; // 30 seconds

function getRateState() {
  try { return JSON.parse(sessionStorage.getItem(RATE_KEY)) || { count: 0, lockedUntil: 0 }; }
  catch { return { count: 0, lockedUntil: 0 }; }
}
function setRateState(s) { sessionStorage.setItem(RATE_KEY, JSON.stringify(s)); }

// Show payment return page if Paymob redirected back here
const PAYMOB_RETURN = new URLSearchParams(window.location.search).has('success') &&
  new URLSearchParams(window.location.search).has('id') &&
  sessionStorage.getItem('es_pending_fee');

export default function App() {
  if (PAYMOB_RETURN) return <PaymentReturnPage />;

  const [isDark,       setIsDark]       = useState(true);
  const [user,         setUser]         = useState(null);
  const [showLanding,  setShowLanding]  = useState(true); // landing → login flow
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({ name: 'EduSense', primaryColor: '', logo: null });
  const { isRTL } = useLang();

  // Fetch tenant branding once on mount (public endpoint, no auth needed)
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || '';
    fetch(`${BASE}/api/branding`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setBranding({ name: d.name || 'EduSense', primaryColor: d.primary_color || '', logo: d.logo_data || null });
      })
      .catch(() => {});
  }, []);

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

  const C = buildTheme(isDark, branding.primaryColor);

  function toggleMode() { setIsDark(d => !d); }

  function onLogout() {
    store.signOut();
    setRateState({ count: 0, lockedUntil: 0 });
    setUser(null);
  }

  async function onLogin(username, password) {
    const rate = getRateState();
    if (Date.now() < rate.lockedUntil) {
      const secs = Math.ceil((rate.lockedUntil - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Try again in ${secs}s.`);
    }
    // Do NOT setLoading(true) here — it unmounts LoginPage and loses the
    // selected-role state. LoginPage has its own busy spinner on the button.
    const u = await store.authenticate(username, password);
    if (u) {
      setRateState({ count: 0, lockedUntil: 0 });
      setUser(u);          // triggers re-render → dashboard shown immediately
    } else {
      const next = rate.count + 1;
      setRateState({
        count: next,
        lockedUntil: next >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
      });
    }
    return u;
  }

  const [overlay, setOverlay] = useState(null); // 'proctoring' | 'advising' | 'atrisk'

  const commonProps = {
    theme: C, user, isDark, onToggleMode: toggleMode, onLogout,
    branding,
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
        {/* Rotating ring around ⚡ icon */}
        <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: `3px solid transparent`,
              borderTopColor: C.blue2,
              borderRightColor: C.blue2 + '55',
            }}
          />
          <div style={{ fontSize: 32 }}>⚡</div>
        </div>
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

  /* ── Shared lazy-load fallback ─────────────────────────────────────────── */
  const PageSpinner = (
    <div style={{
      height: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 14,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `3px solid transparent`,
          borderTopColor: C.blue2,
          borderRightColor: C.blue2 + '44',
        }}
      />
      <div style={{ fontSize: 13, color: C.text2 }}>Loading…</div>
    </div>
  );

  // SuperAdmin gets its own scrollable container (no overflow:hidden)
  if (user?.role === 'superadmin') {
    return (
      <div style={{ minHeight: '100vh', overflowY: 'auto', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Suspense fallback={PageSpinner}>
          <SuperAdminPage user={user} onLogout={onLogout} />
        </Suspense>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", direction: isRTL ? 'rtl' : 'ltr' }}>
      {!user && showLanding ? (
        <LandingPage onLogin={() => setShowLanding(false)} branding={branding} />
      ) : !user ? (
        <LoginPage theme={C} onLogin={onLogin} branding={branding} />
      ) : (
        <ErrorBoundary>
          <Suspense fallback={PageSpinner}>
            {user.role === 'student' ? (
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
          </Suspense>
        </ErrorBoundary>
      )}
      {user && <ChatWidget user={user} />}
      {user && <NotificationToast user={user} />}
      {user && <OnboardingTour user={user} theme={C} />}
      <PWAInstallPrompt theme={C} />

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
              <Suspense fallback={PageSpinner}>
                {overlay === 'proctoring' && <ExamProctoringPage theme={C} user={user} />}
                {overlay === 'advising'   && <AdvisingPage       theme={C} user={user} />}
                {overlay === 'atrisk'     && <AtRiskPage         theme={C} user={user} />}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
