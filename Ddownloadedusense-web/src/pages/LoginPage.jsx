import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';

const ROLES = [
  { role: 'student', emoji: '🎓', label: 'Student',            desc: 'View attendance & emotions',       color: '#3b82f6', user: '231014184.0', pass: 'WGaub52Z' },
  { role: 'doctor',  emoji: '👨‍🏫', label: 'Doctor / Lecturer', desc: 'Manage lectures & live sessions',  color: '#8b5cf6', user: 'dr.ahmed',    pass: 'Ahmed@2024' },
  { role: 'admin',   emoji: '🏛️', label: 'Admin',              desc: 'System management & reports',      color: '#10b981', user: 'admin',        pass: 'Admin@EduSense2025!' },
  { role: 'parent',  emoji: '👨‍👩‍👧', label: 'Parent',            desc: 'Monitor child performance',        color: '#f59e0b', user: 'parent',       pass: 'Parent@EduSense2025!' },
];

const FEATURES = [
  { icon: '✦', text: 'Real-time Emotion & Attention Detection' },
  { icon: '✦', text: 'QR-Based Smart Attendance' },
  { icon: '✦', text: 'Multi-Role Academic Portal' },
  { icon: '✦', text: 'AI Insights & Analytics Dashboard' },
  { icon: '✦', text: 'Grade Appeals & Office Hours Booking' },
  { icon: '✦', text: 'Parent Portal with Live Alerts' },
];

const STATS = ['500+ Students', '4 Roles', 'Real-time AI', 'Arabic RTL'];

/* Floating orb config — generated once, stable positions */
const ORBS = [
  { w: 320, h: 320, top: '10%',  left: '15%',  color: 'rgba(99,102,241,0.12)',  dur: 8 },
  { w: 200, h: 200, top: '55%',  left: '5%',   color: 'rgba(59,130,246,0.10)',  dur: 11 },
  { w: 260, h: 260, top: '25%',  left: '55%',  color: 'rgba(139,92,246,0.08)',  dur: 9 },
  { w: 150, h: 150, top: '70%',  left: '65%',  color: 'rgba(16,185,129,0.08)',  dur: 13 },
  { w: 180, h: 180, top: '-5%',  left: '70%',  color: 'rgba(245,158,11,0.07)',  dur: 10 },
];

export default function LoginPage({ theme: C, onLogin }) {
  const { t, toggleLang, lang, isRTL } = useLang();
  const isMobile = useMobile();
  const [selected, setSelected] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy,  setBusy]        = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [copied, setCopied]         = useState('');

  function selectRole(r) {
    setSelected(r);
    setUsername(r.user);
    setPassword(r.pass);
    setError('');
    setForgotOpen(false);
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  function autoFillAndClose() {
    setUsername(selected.user);
    setPassword(selected.pass);
    setForgotOpen(false);
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
      height: '100%', display: 'flex', overflow: 'hidden',
      direction: isRTL ? 'rtl' : 'ltr',
      flexDirection: isRTL ? 'row-reverse' : 'row',
    }}>
      {/* ── LEFT PANEL (hidden on mobile) ── */}
      {!isMobile && (
        <div style={{
          width: '60%', position: 'relative', overflow: 'hidden', flexShrink: 0,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 52px',
        }}>
          {/* Animated orbs */}
          {ORBS.map((orb, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: orb.w, height: orb.h,
                top: orb.top, left: orb.left,
                borderRadius: '50%',
                background: orb.color,
                filter: 'blur(60px)',
                pointerEvents: 'none',
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {/* Content above features */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{
                fontSize: 38, fontWeight: 800, color: '#ffffff',
                letterSpacing: '-0.5px', marginBottom: 10,
              }}>
                ⚡ EduSense
              </div>
              <div style={{
                fontSize: 14, color: 'rgba(255,255,255,0.55)',
                fontWeight: 500, marginBottom: 52, maxWidth: 380,
              }}>
                AI-Powered University Management System
              </div>
            </motion.div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: 'easeOut' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#a5b4fc',
                  }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.80)', fontWeight: 500 }}>
                    {f.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', gap: 0,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 14, overflow: 'hidden',
            }}
          >
            {STATS.map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: '14px 0', textAlign: 'center',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{s}</div>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: C.bg, overflowY: 'auto', position: 'relative',
        padding: isMobile ? '24px 16px' : '40px 48px',
      }}>
        {/* Language toggle */}
        <button onClick={toggleLang} style={{
          position: 'absolute', top: 16,
          right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto',
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: '6px 14px', fontSize: 11, fontWeight: 700, color: C.text2,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <span>{lang === 'en' ? '🇦🇪' : '🇬🇧'}</span>
          <span>{lang === 'en' ? 'عربي' : 'English'}</span>
        </button>

        {/* Mobile-only logo */}
        {isMobile && (
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.blue2, letterSpacing: '-0.5px' }}>
              ⚡ EduSense
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
              AI-Powered University Management System
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 420 }}>
          <AnimatePresence mode="wait">
            {!selected ? (
              /* ─── Role Selection ─── */
              <motion.div
                key="roles"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div style={{ marginBottom: 24, textAlign: 'center' }}>
                  {!isMobile && (
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                      Welcome back
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: C.text2 }}>{t('choose_role')}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {ROLES.map(r => (
                    <CompactRoleCard key={r.role} info={r} theme={C} onClick={selectRole} />
                  ))}
                </div>

                <div style={{
                  marginTop: 32, textAlign: 'center',
                  fontSize: 11, color: C.text3,
                }}>
                  Powered by AI · Built for universities
                </div>
              </motion.div>
            ) : (
              /* ─── Login Form ─── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{    opacity: 0, y: 16,  scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  background: C.card, borderRadius: 18, border: `1px solid ${C.border2}`,
                  padding: '28px 32px',
                }}
              >
                {/* Role indicator */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: `${selected.color}18`, border: `1px solid ${selected.color}44`,
                  borderRadius: 30, padding: '4px 14px 4px 10px', marginBottom: 20,
                }}>
                  <span style={{ fontSize: 18 }}>{selected.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: selected.color }}>{selected.label}</span>
                </div>

                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                  {t('sign_in')}
                </div>
                <div style={{ fontSize: 11, color: C.text2, marginBottom: 22 }}>
                  {isRTL ? 'أدخل بياناتك للمتابعة' : 'Enter your credentials to continue'}
                </div>

                {/* Username */}
                <div style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('username')}
                  </div>
                  <input
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    placeholder="Enter username"
                    disabled={busy}
                    style={{
                      width: '100%', height: 42, background: C.bg3,
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      padding: '0 14px', fontSize: 13, color: C.text,
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = selected.color}
                    onBlur={e  => e.target.style.borderColor = C.border}
                  />
                </div>

                {/* Password */}
                <div style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('password')}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    placeholder="Password"
                    disabled={busy}
                    style={{
                      width: '100%', height: 42, background: C.bg3,
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      padding: '0 14px', fontSize: 13, color: C.text,
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = selected.color}
                    onBlur={e  => e.target.style.borderColor = C.border}
                  />
                </div>

                {/* Forgot password link */}
                <div style={{ textAlign: isRTL ? 'left' : 'right', marginTop: 6, marginBottom: 4 }}>
                  <button
                    onClick={() => setForgotOpen(true)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: 11, color: selected.color, cursor: 'pointer',
                      fontWeight: 600, textDecoration: 'underline',
                    }}
                  >
                    {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: 11, color: C.red2, marginBottom: 4,
                        padding: '6px 10px', background: C.red_dim,
                        borderRadius: 7, border: `1px solid ${C.red}44`,
                      }}
                    >{error}</motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={doLogin}
                  disabled={busy}
                  whileHover={!busy ? { scale: 1.02, boxShadow: `0 6px 20px ${selected.color}44` } : {}}
                  whileTap={!busy ? { scale: 0.97 } : {}}
                  style={{
                    width: '100%', height: 44, marginTop: 14,
                    background: busy ? C.border : `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`,
                    border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700,
                    color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    letterSpacing: '0.02em',
                  }}
                >
                  {busy
                    ? (isRTL ? 'جارٍ تسجيل الدخول…' : 'Signing in…')
                    : (isRTL ? `${t('sign_in')} ←` : `${t('sign_in')}  →`)}
                </motion.button>

                <div style={{
                  background: C.blue_dim, borderRadius: 8, padding: '7px 12px',
                  marginTop: 14, fontSize: 10, color: C.blue2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>🔑</span>
                  <span>Demo: <strong>{selected.user}</strong></span>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  style={{
                    width: '100%', marginTop: 10, background: 'transparent', border: 'none',
                    fontSize: 11, color: C.text3, cursor: 'pointer', padding: '8px 0',
                  }}
                >
                  {isRTL ? 'اختر دوراً مختلفاً →' : '← Choose different role'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isMobile && (
          <div style={{
            position: 'absolute', bottom: 16,
            fontSize: 10, color: C.text3, textAlign: 'center',
          }}>
            Powered by AI · Built for universities
          </div>
        )}
      </div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {forgotOpen && selected && (
          <motion.div
            key="forgot-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setForgotOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              key="forgot-card"
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.88, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card,
                border: `1px solid ${selected.color}44`,
                borderRadius: 18,
                padding: '28px 28px 22px',
                width: 340, maxWidth: '90vw',
                boxShadow: `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px ${selected.color}22`,
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${selected.color}20`,
                  border: `1px solid ${selected.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {selected.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                    {isRTL ? 'بيانات الدخول' : 'Login Credentials'}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
                    {selected.label}
                  </div>
                </div>
                <button
                  onClick={() => setForgotOpen(false)}
                  style={{
                    marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0,
                    background: C.bg3, border: `1px solid ${C.border}`,
                    borderRadius: 8, width: 28, height: 28, fontSize: 14,
                    color: C.text2, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >✕</button>
              </div>

              {/* Credential rows */}
              {[
                { label: isRTL ? 'اسم المستخدم' : 'Username', value: selected.user, key: 'user' },
                { label: isRTL ? 'كلمة المرور'  : 'Password',  value: selected.pass, key: 'pass' },
              ].map(({ label, value, key }) => (
                <div key={key} style={{
                  background: C.bg3, borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  padding: '10px 12px', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: 'monospace' }}>
                      {key === 'pass' ? '•'.repeat(value.length) : value}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => copyText(value, key)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      background: copied === key ? '#10b98120' : `${selected.color}18`,
                      border: `1px solid ${copied === key ? '#10b981' : selected.color}44`,
                      borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700,
                      color: copied === key ? '#10b981' : selected.color,
                      cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                    }}
                  >
                    {copied === key ? (isRTL ? '✓ تم' : '✓ Copied') : (isRTL ? 'نسخ' : 'Copy')}
                  </motion.button>
                </div>
              ))}

              {/* Auto-fill button */}
              <motion.button
                onClick={autoFillAndClose}
                whileHover={{ scale: 1.02, boxShadow: `0 6px 20px ${selected.color}44` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', height: 42, marginTop: 6,
                  background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`,
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  color: '#fff', cursor: 'pointer', letterSpacing: '0.02em',
                }}
              >
                {isRTL ? '⚡ تعبئة تلقائية' : '⚡ Auto-fill & Sign In'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompactRoleCard({ info, theme: C, onClick }) {
  return (
    <motion.div
      onClick={() => onClick(info)}
      whileHover={{ y: -3, scale: 1.03, borderColor: info.color, boxShadow: `0 8px 24px ${info.color}28` }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        height: 100, background: C.card,
        borderRadius: 14, border: `1.5px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', gap: 5,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Subtle color accent top-bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: info.color, opacity: 0.7,
      }} />
      <div style={{ fontSize: 26 }}>{info.emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{info.label}</div>
      <div style={{ fontSize: 9, color: C.text3, textAlign: 'center', padding: '0 10px', lineHeight: 1.3 }}>
        {info.desc}
      </div>
    </motion.div>
  );
}
