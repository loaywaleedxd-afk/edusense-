import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../api';

/* ── Shared toast queue (module-level so any component can push) ── */
let _listeners = [];
let _queue = [];

export function pushToast(toast) {
  const t = {
    id: Date.now() + Math.random(),
    title: toast.title || 'Notification',
    message: toast.message || '',
    icon: toast.icon || '🔔',
    color: toast.color || '#3b82f6',
    duration: toast.duration ?? 4500,
  };
  _queue = [..._queue, t];
  _listeners.forEach(cb => cb([..._queue]));
}

function subscribe(cb) {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter(l => l !== cb); };
}

/* ── WebSocket real-time connector ── */
let _ws = null;
function connectWS(userId, onMessage) {
  if (_ws) return;
  try {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws/notifications/${userId}?token=${encodeURIComponent(getToken() || '')}`;
    _ws = new WebSocket(url);
    _ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch {}
    };
    _ws.onerror = () => { _ws = null; };
    _ws.onclose = () => { _ws = null; };
  } catch {}
}

/* ── Toast container component ── */
export default function NotificationToast({ user }) {
  const [toasts, setToasts] = useState([]);

  const handleWS = useCallback((data) => {
    pushToast({
      title: data.title || data.type || 'Alert',
      message: data.message || data.body || '',
      icon: data.icon || '🔔',
      color: data.color || '#3b82f6',
    });
  }, []);

  useEffect(() => {
    if (user?.id) {
      connectWS(user.studentId || user.doctorId || user.id, handleWS);
    }
    const unsub = subscribe(setToasts);
    return unsub;
  }, [user, handleWS]);

  function dismiss(id) {
    _queue = _queue.filter(t => t.id !== id);
    setToasts([..._queue]);
  }

  // Auto-dismiss
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t => {
      if (!t.duration) return null;
      return setTimeout(() => dismiss(t.id), t.duration);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [toasts]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.slice(-5).map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              pointerEvents: 'all',
              background: '#1e293b',
              border: `1.5px solid ${toast.color}55`,
              borderRadius: 14,
              padding: '12px 16px',
              minWidth: 280, maxWidth: 360,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${toast.color}22`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${toast.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {toast.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                fontSize: 16, cursor: 'pointer', flexShrink: 0,
                lineHeight: 1, padding: '0 2px',
              }}
            >×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
