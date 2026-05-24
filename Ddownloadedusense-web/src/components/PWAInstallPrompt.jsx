/**
 * PWAInstallPrompt — shows a subtle banner when the browser fires
 * the `beforeinstallprompt` event (Chrome/Edge/Android).
 *
 * On iOS Safari the event is never fired, so we show a manual
 * "Share → Add to Home Screen" tip instead when running in mobile Safari.
 *
 * The prompt is dismissed for 30 days once the user taps "Not now".
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'es_pwa_dismissed';
const DISMISS_DAYS = 30;

function wasDismissedRecently() {
  try {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

export default function PWAInstallPrompt({ theme: C }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [showIosTip, setShowIosTip]         = useState(false);

  useEffect(() => {
    // Already installed or dismissed recently — do nothing
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    // Android / Chrome / Edge — native install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari — show manual tip
    if (isIosSafari()) {
      setTimeout(() => setShowIosTip(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
    setShowIosTip(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  const bannerStyle = {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
    background: C ? C.card : '#1e1e2e',
    borderTop: `1px solid ${C ? C.border : '#2a2a3e'}`,
    padding: '14px 20px',
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
  };

  return (
    <AnimatePresence>
      {/* Android / Chrome install banner */}
      {showBanner && (
        <motion.div
          key="install"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={bannerStyle}
        >
          <div style={{ fontSize: 32, flexShrink: 0 }}>🎓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C ? C.text : '#e2e8f0', marginBottom: 2 }}>
              Install EduSense
            </div>
            <div style={{ fontSize: 11, color: C ? C.text2 : '#94a3b8' }}>
              Add to your home screen for quick access
            </div>
          </div>
          <button
            onClick={install}
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
              border: 'none', borderRadius: 10, padding: '9px 18px',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Install
          </button>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none',
              color: C ? C.text3 : '#64748b', fontSize: 20, cursor: 'pointer',
              padding: '0 4px', lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* iOS Safari manual tip */}
      {showIosTip && !showBanner && (
        <motion.div
          key="ios"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={bannerStyle}
        >
          <div style={{ fontSize: 28, flexShrink: 0 }}>📲</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C ? C.text : '#e2e8f0', marginBottom: 3 }}>
              Install EduSense on iPhone
            </div>
            <div style={{ fontSize: 11, color: C ? C.text2 : '#94a3b8', lineHeight: 1.5 }}>
              Tap <strong style={{ color: '#3b82f6' }}>Share</strong> then{' '}
              <strong style={{ color: '#3b82f6' }}>"Add to Home Screen"</strong>
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none',
              color: C ? C.text3 : '#64748b', fontSize: 20, cursor: 'pointer',
              padding: '0 4px', lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
