import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';
import store from '../dataStore';

const BREVO_KEY    = import.meta.env.VITE_BREVO_API_KEY;
const BREVO_SENDER = import.meta.env.VITE_BREVO_SENDER;
const EMAIL_CONFIGURED = !!(BREVO_KEY && BREVO_SENDER);

async function sendResetEmail(toEmail, toName, code) {
  if (!EMAIL_CONFIGURED) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'EduSense', email: BREVO_SENDER },
        to: [{ email: toEmail, name: toName }],
        subject: 'Your EduSense password reset code',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#6366f1">⚡ EduSense</h2>
            <p>Hi <strong>${toName}</strong>,</p>
            <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:800;letter-spacing:12px;font-family:monospace;
                        background:#f3f4f6;padding:20px;text-align:center;border-radius:10px;
                        color:#1e1b4b;margin:20px 0">${code}</div>
            <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          </div>`,
      }),
    });
    return res.ok;
  } catch (e) { console.error('Brevo:', e); return false; }
}

function maskEmail(email) {
  const [local, domain] = (email || '').split('@');
  if (!local || !domain) return email || '—';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

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

export default function LoginPage({ theme: C, onLogin, branding }) {
  const { t, toggleLang, lang, isRTL } = useLang();
  const isMobile = useMobile();
  const [selected, setSelected] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy,  setBusy]        = useState(false);
  const [forgotOpen,  setForgotOpen]  = useState(false);
  const [forgotStep,  setForgotStep]  = useState(0); // 0=username 1=code 2=newpass
  const [forgotUser,  setForgotUser]  = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode,  setForgotCode]  = useState('');
  const [forgotPass,  setForgotPass]  = useState('');
  const [forgotPass2, setForgotPass2] = useState('');
  const [forgotErr,   setForgotErr]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDemoCode, setForgotDemoCode] = useState('');
  const [forgotDone,  setForgotDone]  = useState(false);

  function openForgot() {
    setForgotStep(0); setForgotUser(selected?.user || '');
    setForgotEmail(''); setForgotCode(''); setForgotPass('');
    setForgotPass2(''); setForgotErr(''); setForgotDemoCode('');
    setForgotDone(false); setForgotOpen(true);
  }

  function closeForgot() { setForgotOpen(false); }

  function selectRole(r) {
    setSelected(r);
    setUsername(r.user);
    setPassword(r.pass);
    setError('');
    setForgotOpen(false);
  }

  async function handleRequestReset() {
    if (!forgotUser.trim()) { setForgotErr('Please enter your username.'); return; }
    setForgotLoading(true); setForgotErr('');
    const result = store.requestPasswordReset(forgotUser.trim());
    if (!result.ok) { setForgotErr(result.error); setForgotLoading(false); return; }
    const sent = await sendResetEmail(result.email, result.name, result.token);
    setForgotEmail(maskEmail(result.email));
    setForgotDemoCode(sent ? '' : result.token); // show on-screen if email not configured
    setForgotLoading(false);
    setForgotStep(1);
  }

  function handleVerifyCode() {
    setForgotErr('');
    const r = store.verifyResetToken(forgotUser.trim(), forgotCode.trim());
    if (!r.ok) { setForgotErr(r.error); return; }
    setForgotStep(2);
  }

  function handleResetPassword() {
    if (!forgotPass) { setForgotErr('Enter a new password.'); return; }
    if (forgotPass.length < 6) { setForgotErr('Password must be at least 6 characters.'); return; }
    if (forgotPass !== forgotPass2) { setForgotErr('Passwords do not match.'); return; }
    setForgotErr('');
    const r = store.resetPassword(forgotUser.trim(), forgotCode.trim(), forgotPass);
    if (!r.ok) { setForgotErr(r.error); return; }
    setForgotDone(true);
    setTimeout(() => {
      setPassword(forgotPass);
      setUsername(forgotUser.trim());
      closeForgot();
    }, 1800);
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
      height: '100%', overflow: 'hidden', position: 'relative',
      direction: isRTL ? 'rtl' : 'ltr',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Animated background orbs */}
      {ORBS.map((orb, i) => (
        <motion.div key={i} style={{
          position: 'absolute', width: orb.w, height: orb.h,
          top: orb.top, left: orb.left, borderRadius: '50%',
          background: orb.color, filter: 'blur(80px)', pointerEvents: 'none',
        }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Language toggle */}
      <button onClick={toggleLang} style={{
        position: 'absolute', top: 18,
        right: isRTL ? 'auto' : 18, left: isRTL ? 18 : 'auto',
        zIndex: 10, background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20,
        padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      }}>
        <span>{lang === 'en' ? '🇦🇪' : '🇬🇧'}</span>
        <span>{lang === 'en' ? 'عربي' : 'English'}</span>
      </button>

      {/* ── Main content ── */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 640, padding: '0 24px', boxSizing: 'border-box' }}>

        {/* University logo + name */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 36 }}
        >
          {branding?.logo ? (
            <>
              <img src={branding.logo} alt={branding.name || 'University'}
                style={{ maxHeight: 90, maxWidth: 240, objectFit: 'contain', marginBottom: 14 }} />
              {branding.name && (
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  {branding.name}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 6 }}>
                ⚡ {branding?.name || 'EduSense'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                AI-Powered University Management System
              </div>
            </>
          )}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
            {isRTL ? 'اختر دورك للمتابعة' : 'Select your role to continue'}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selected ? (
            /* ─── Role Cards ─── */
            <motion.div key="roles"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {ROLES.map((r, i) => (
                  <motion.button
                    key={r.role}
                    onClick={() => selectRole(r)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: `1.5px solid rgba(255,255,255,0.12)`,
                      borderRadius: 18, padding: '28px 20px',
                      cursor: 'pointer', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      backdropFilter: 'blur(12px)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.background = `${r.color}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: `${r.color}22`, border: `2px solid ${r.color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                    }}>{r.emoji}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{r.desc}</div>
                  </motion.button>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                Powered by EduSense · AI-Powered University Platform
              </div>
            </motion.div>
          ) : (
            /* ─── Login Form ─── */
            <motion.div key="form"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: 16,  scale: 0.97 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)',
                padding: isMobile ? '24px 20px' : '32px 36px',
              }}
            >
              {/* Role badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: `${selected.color}28`, border: `1px solid ${selected.color}55`,
                  borderRadius: 30, padding: '5px 16px 5px 10px',
                }}>
                  <span style={{ fontSize: 20 }}>{selected.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: selected.color }}>{selected.label}</span>
                </div>
              </div>

              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                {isRTL ? 'تسجيل الدخول' : 'Sign in'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>
                {isRTL ? 'أدخل بياناتك للمتابعة' : 'Enter your credentials to continue'}
              </div>

              {/* Username */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {t('username')}
                </div>
                <input value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  placeholder="Enter username" disabled={busy}
                  style={{
                    width: '100%', height: 44, background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 11,
                    padding: '0 14px', fontSize: 13, color: '#fff',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = selected.color}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {t('password')}
                </div>
                <input type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  placeholder="Password" disabled={busy}
                  style={{
                    width: '100%', height: 44, background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 11,
                    padding: '0 14px', fontSize: 13, color: '#fff',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = selected.color}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: isRTL ? 'left' : 'right', marginBottom: 10 }}>
                <button onClick={openForgot} style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: selected.color, cursor: 'pointer', fontWeight: 600,
                }}>
                  {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 11, color: '#f87171', marginBottom: 10, padding: '7px 12px', background: 'rgba(239,68,68,0.15)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button onClick={doLogin} disabled={busy}
                whileHover={!busy ? { scale: 1.02, boxShadow: `0 8px 24px ${selected.color}55` } : {}}
                whileTap={!busy ? { scale: 0.97 } : {}}
                style={{
                  width: '100%', height: 46, marginTop: 4,
                  background: busy ? 'rgba(255,255,255,0.15)' : `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)`,
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
                }}>
                {busy ? (isRTL ? 'جارٍ تسجيل الدخول…' : 'Signing in…') : (isRTL ? `${t('sign_in')} ←` : `${t('sign_in')} →`)}
              </motion.button>

              <div style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 9, padding: '8px 12px',
                marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.45)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>🔑</span>
                <span>Demo: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{selected.user}</strong></span>
              </div>

              <button onClick={() => setSelected(null)} style={{
                width: '100%', marginTop: 12, background: 'transparent', border: 'none',
                fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '8px 0',
              }}>
                {isRTL ? 'اختر دوراً مختلفاً →' : '← Choose different role'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Forgot Password Modal (3-step) ── */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            key="forgot-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeForgot}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              key="forgot-card"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.88, y: 20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card, borderRadius: 20,
                border: `1px solid ${C.border2}`,
                padding: '28px 28px 24px',
                width: 360, maxWidth: '92vw',
                boxShadow: '0 28px 72px rgba(0,0,0,0.5)',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                    {forgotDone
                      ? (isRTL ? '✅ تم تغيير كلمة المرور' : '✅ Password Updated')
                      : forgotStep === 0 ? (isRTL ? '🔒 إعادة تعيين كلمة المرور' : '🔒 Reset Password')
                      : forgotStep === 1 ? (isRTL ? '📧 أدخل الرمز' : '📧 Enter Code')
                      : (isRTL ? '🔑 كلمة مرور جديدة' : '🔑 New Password')}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                    {[
                      isRTL ? 'أدخل اسم المستخدم لإرسال رمز التحقق' : 'Enter your username to receive a reset code',
                      isRTL ? `تم إرسال رمز إلى ${forgotEmail}` : `Code sent to ${forgotEmail}`,
                      isRTL ? 'اختر كلمة مرور جديدة آمنة' : 'Choose a strong new password',
                      isRTL ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' : 'You can now sign in with your new password',
                    ][forgotDone ? 3 : forgotStep]}
                  </div>
                </div>
                <button
                  onClick={closeForgot}
                  style={{
                    background: C.bg3, border: `1px solid ${C.border}`,
                    borderRadius: 8, width: 28, height: 28, fontSize: 13,
                    color: C.text2, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0,
                  }}
                >✕</button>
              </div>

              {/* ── Step progress dots ── */}
              {!forgotDone && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      height: 3, flex: 1, borderRadius: 4,
                      background: i <= forgotStep ? '#6366f1' : C.border,
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── STEP 0: Username ── */}
                {!forgotDone && forgotStep === 0 && (
                  <motion.div key="s0"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
                  >
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                      {isRTL ? 'اسم المستخدم' : 'Username'}
                    </label>
                    <input
                      value={forgotUser}
                      onChange={e => { setForgotUser(e.target.value); setForgotErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleRequestReset()}
                      placeholder={isRTL ? 'اسم المستخدم' : 'Your username'}
                      autoFocus
                      style={{
                        width: '100%', height: 42, background: C.bg3,
                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: '0 14px', fontSize: 13, color: C.text,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {forgotErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{forgotErr}</div>}
                    <motion.button
                      onClick={handleRequestReset}
                      disabled={forgotLoading}
                      whileHover={!forgotLoading ? { scale: 1.02 } : {}}
                      whileTap={!forgotLoading ? { scale: 0.97 } : {}}
                      style={{
                        width: '100%', height: 42, marginTop: 14,
                        background: forgotLoading ? C.border : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        color: '#fff', cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {forgotLoading
                        ? (isRTL ? 'جارٍ الإرسال…' : 'Sending…')
                        : (isRTL ? 'إرسال رمز التحقق' : 'Send Reset Code')}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── STEP 1: Enter code ── */}
                {!forgotDone && forgotStep === 1 && (
                  <motion.div key="s1"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
                  >
                    {forgotDemoCode && (
                      <div style={{
                        background: '#f59e0b18', border: '1px solid #f59e0b44',
                        borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                        fontSize: 11, color: '#d97706',
                      }}>
                        <strong>{isRTL ? '🔑 وضع العرض التجريبي — رمزك:' : '🔑 Demo mode — your code:'}</strong>
                        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, display: 'block', textAlign: 'center', letterSpacing: 6, marginTop: 4, color: C.text }}>
                          {forgotDemoCode}
                        </span>
                        <div style={{ marginTop: 4, fontSize: 10, color: C.text3 }}>
                          {isRTL ? 'في الإنتاج سيُرسل هذا إلى بريدك الإلكتروني' : 'In production this would be emailed to you'}
                        </div>
                      </div>
                    )}
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                      {isRTL ? 'رمز التحقق (6 أرقام)' : '6-digit reset code'}
                    </label>
                    <input
                      value={forgotCode}
                      onChange={e => { setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setForgotErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      style={{
                        width: '100%', height: 48, background: C.bg3,
                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: '0 14px', fontSize: 22, fontWeight: 700,
                        color: C.text, outline: 'none', boxSizing: 'border-box',
                        letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace',
                      }}
                    />
                    {forgotErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{forgotErr}</div>}
                    <motion.button
                      onClick={handleVerifyCode}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: '100%', height: 42, marginTop: 14,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        color: '#fff', cursor: 'pointer',
                      }}
                    >{isRTL ? 'تحقق من الرمز' : 'Verify Code'}</motion.button>
                    <button onClick={() => { setForgotStep(0); setForgotErr(''); }} style={{
                      width: '100%', marginTop: 8, background: 'transparent', border: 'none',
                      fontSize: 11, color: C.text3, cursor: 'pointer', padding: '6px 0',
                    }}>{isRTL ? '← إرسال رمز جديد' : '← Resend / change username'}</button>
                  </motion.div>
                )}

                {/* ── STEP 2: New password ── */}
                {!forgotDone && forgotStep === 2 && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
                  >
                    {['new', 'confirm'].map((field, i) => (
                      <div key={field} style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                          {i === 0
                            ? (isRTL ? 'كلمة المرور الجديدة' : 'New password')
                            : (isRTL ? 'تأكيد كلمة المرور' : 'Confirm password')}
                        </label>
                        <input
                          type="password"
                          value={i === 0 ? forgotPass : forgotPass2}
                          onChange={e => { i === 0 ? setForgotPass(e.target.value) : setForgotPass2(e.target.value); setForgotErr(''); }}
                          onKeyDown={e => e.key === 'Enter' && i === 1 && handleResetPassword()}
                          placeholder={i === 0 ? '••••••••' : '••••••••'}
                          autoFocus={i === 0}
                          style={{
                            width: '100%', height: 42, background: C.bg3,
                            border: `1.5px solid ${C.border}`, borderRadius: 10,
                            padding: '0 14px', fontSize: 13, color: C.text,
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                    {forgotErr && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 4 }}>{forgotErr}</div>}
                    <motion.button
                      onClick={handleResetPassword}
                      whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        width: '100%', height: 42, marginTop: 4,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        color: '#fff', cursor: 'pointer',
                      }}
                    >{isRTL ? 'تحديث كلمة المرور' : 'Update Password'}</motion.button>
                  </motion.div>
                )}

                {/* ── DONE ── */}
                {forgotDone && (
                  <motion.div key="done"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center', padding: '12px 0' }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: 13, color: C.text2 }}>
                      {isRTL ? 'سيتم تسجيل دخولك الآن…' : 'Signing you in now…'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
