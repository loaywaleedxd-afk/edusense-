/**
 * LandingPage.jsx — Marketing / product landing page for EduSense.
 * Shown to visitors before login. "Get Started" / "Login" opens the login flow.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

/* ── Palette ──────────────────────────────────────────────────────────────── */
const P = {
  navy:   '#0f172a',
  navy2:  '#1e293b',
  card:   '#1e2d45',
  border: '#2d3f57',
  blue:   '#3b82f6',
  blue2:  '#60a5fa',
  purple: '#8b5cf6',
  green:  '#10b981',
  amber:  '#f59e0b',
  red:    '#ef4444',
  text:   '#f1f5f9',
  text2:  '#94a3b8',
  text3:  '#64748b',
};

/* ── Tiny hook: animate number on enter ─────────────────────────────────── */
function useCountUp(target, duration = 1400, trigger = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const steps = 60;
    const step  = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, trigger]);
  return val;
}

/* ── Section fade-in wrapper ─────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, style }) {
  const ref  = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Features data ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🧠', color: P.purple, title: 'Emotion AI Detection',
    desc: 'Real-time facial emotion recognition powered by deep learning. Know exactly how engaged your students are — second by second.',
  },
  {
    icon: '✅', color: P.green, title: 'Face Recognition Attendance',
    desc: 'Automatic attendance marking via camera. No roll-calls, no paper — students are marked present the moment they sit down.',
  },
  {
    icon: '📱', color: P.blue, title: 'QR Code Check-In',
    desc: 'Doctor generates a QR code, students scan it on their phones. Attendance confirmed in under 3 seconds.',
  },
  {
    icon: '📊', color: P.amber, title: 'Real-Time Analytics',
    desc: 'Engagement heatmaps, emotion trends, attendance rates, GPA correlation — all in one live dashboard.',
  },
  {
    icon: '🚨', color: P.red, title: 'At-Risk Early Warning',
    desc: 'Automatically flags students at risk of failing based on attendance, grades, emotion data and assignment completion.',
  },
  {
    icon: '💬', color: '#06b6d4', title: 'Live Course Chat & DMs',
    desc: 'Integrated messaging per course plus private doctor–student direct messaging. No external tools needed.',
  },
  {
    icon: '🎓', color: '#a855f7', title: 'Academic Advising',
    desc: 'Students book advising appointments, doctors manage office hours, degree audit tracks progress toward graduation.',
  },
  {
    icon: '🏛️', color: '#f97316', title: 'Multi-Tenant SaaS',
    desc: 'One platform, unlimited universities. Each institution gets its own isolated schema, branding, and data.',
  },
];

/* ── How it works steps ─────────────────────────────────────────────────── */
const STEPS = [
  {
    n: '01', icon: '🏫', title: 'University Onboards',
    desc: 'Admin sets up the university, imports students via CSV, and assigns doctors to courses. Takes under 10 minutes.',
  },
  {
    n: '02', icon: '📷', title: 'Class Begins',
    desc: 'Doctor starts a live session. The AI camera silently detects attendance and emotion in real time — no disruption.',
  },
  {
    n: '03', icon: '📈', title: 'Insights Delivered',
    desc: 'Admins and doctors see live dashboards. At-risk alerts fire automatically. Students view their own progress on mobile.',
  },
];

/* ── Testimonials ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'EduSense cut our attendance processing time from 15 minutes to zero. The emotion data completely changed how we think about student engagement.',
    name: 'Dr. Ahmed M.', role: 'Dean of Computer Science', uni: 'AAST University',
  },
  {
    quote: 'Our at-risk detection caught 23 students who would have failed midterms. We intervened early and 18 of them passed. This system saves academic careers.',
    name: 'Prof. Sara N.', role: 'Academic Affairs Director', uni: 'Engineering Faculty',
  },
  {
    quote: "As a student, checking my attendance and grades from my phone is just normal now. I don't even think about going to the admin office anymore.",
    name: 'Loay W.', role: 'Computer Science Student', uni: 'Year 3',
  },
];

/* ── PWA Install banner ─────────────────────────────────────────────────── */
function MobileInstallBanner() {
  const isIOS     = /iphone|ipad/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobile  = isIOS || isAndroid;
  if (!isMobile) return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${P.purple}22, ${P.blue}22)`,
      border: `1px solid ${P.border}`,
      borderRadius: 16, padding: '18px 22px',
      display: 'flex', gap: 16, alignItems: 'center',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 36 }}>📲</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 4 }}>
          Install EduSense on your phone
        </div>
        <div style={{ fontSize: 12, color: P.text2 }}>
          {isIOS
            ? 'Tap the Share button → "Add to Home Screen" for the full app experience.'
            : 'Tap the menu → "Add to Home Screen" or wait for the install prompt.'}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage({ onLogin, branding }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const statsRef  = useRef(null);
  const statsView = useInView(statsRef, { once: true });

  const s1 = useCountUp(50,  1200, statsView);
  const s2 = useCountUp(10000, 1600, statsView);
  const s3 = useCountUp(98,  1000, statsView);
  const s4 = useCountUp(3,   800,  statsView);

  // Auto-advance testimonial
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const isMobile = window.innerWidth < 768;
  const uniName  = branding?.name || 'EduSense';

  return (
    <div style={{
      background: P.navy, color: P.text,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      overflowX: 'hidden', minHeight: '100vh',
    }}>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${P.navy}ee`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${P.border}`,
        padding: '0 clamp(16px, 4vw, 64px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#fff',
          }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: P.text, letterSpacing: '-0.3px' }}>
            {uniName === 'EduSense' ? 'EduSense' : uniName}
          </span>
        </div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Features', 'How It Works', 'Mobile App', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                style={{ color: P.text2, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = P.text}
                onMouseLeave={e => e.target.style.color = P.text2}
              >{l}</a>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onLogin} style={{
            background: 'transparent', border: `1.5px solid ${P.border}`,
            borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600,
            color: P.text2, cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseEnter={e => { e.target.style.borderColor = P.blue; e.target.style.color = P.text; }}
            onMouseLeave={e => { e.target.style.borderColor = P.border; e.target.style.color = P.text2; }}
          >Login</button>
          <button onClick={onLogin} style={{
            background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
            border: 'none', borderRadius: 8, padding: '8px 20px',
            fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
            boxShadow: `0 4px 14px ${P.blue}44`,
          }}>Get Started →</button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(48px, 10vh, 96px) clamp(16px, 4vw, 64px) 48px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 500, borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(ellipse, ${P.blue}18 0%, transparent 70%)`,
        }}/>
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 400, height: 300, borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(ellipse, ${P.purple}18 0%, transparent 70%)`,
        }}/>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${P.blue}18`, border: `1px solid ${P.blue}44`,
            borderRadius: 100, padding: '6px 16px', fontSize: 12,
            fontWeight: 600, color: P.blue2, marginBottom: 28,
          }}>
            🎓 AI-Powered University Management Platform
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: 900,
            lineHeight: 1.1, margin: '0 0 24px',
            background: `linear-gradient(135deg, ${P.text} 30%, ${P.blue2} 70%, ${P.purple} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Every Classroom.<br />Every Emotion.<br />Every Student.
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 20px)', color: P.text2, maxWidth: 580,
            lineHeight: 1.7, margin: '0 auto 40px',
          }}>
            EduSense combines face recognition, emotion AI, and smart analytics
            to give universities complete real-time insight into classroom engagement.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              style={{
                background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
                border: 'none', borderRadius: 12, padding: '14px 36px',
                fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: `0 8px 32px ${P.blue}55`,
              }}
            >🚀 Get Started Free</motion.button>
            <motion.a
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              href="#how-it-works"
              style={{
                background: 'transparent', border: `1.5px solid ${P.border}`,
                borderRadius: 12, padding: '13px 30px',
                fontSize: 15, fontWeight: 600, color: P.text2,
                cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
              }}
            >▶ See How It Works</motion.a>
          </div>
        </motion.div>

        {/* Hero dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          style={{
            marginTop: 64, width: '100%', maxWidth: 900,
            background: P.navy2, borderRadius: 20,
            border: `1px solid ${P.border}`,
            boxShadow: `0 40px 120px ${P.blue}22, 0 0 0 1px ${P.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Fake browser chrome */}
          <div style={{
            background: P.card, padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: `1px solid ${P.border}`,
          }}>
            {['#ef4444','#f59e0b','#10b981'].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
            <div style={{
              flex: 1, background: P.navy, borderRadius: 6, padding: '4px 12px',
              fontSize: 11, color: P.text3, marginLeft: 8,
            }}>edusense.app/dashboard</div>
          </div>
          {/* Dashboard preview */}
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Students Online', val: '247', icon: '👥', color: P.blue },
              { label: 'Avg Engagement', val: '78%', icon: '📊', color: P.green },
              { label: 'Attendance Rate', val: '91%', icon: '✅', color: P.purple },
              { label: 'At-Risk Alerts', val: '3', icon: '🚨', color: P.amber },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                style={{
                  background: P.card, borderRadius: 10, padding: '14px 16px',
                  border: `1px solid ${P.border}`,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: P.text3, marginTop: 2 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
          {/* Fake emotion bar chart */}
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, alignItems: 'flex-end', height: 70 }}>
            {[
              { e: '😊', pct: 72, c: P.green },
              { e: '😐', pct: 45, c: P.text3 },
              { e: '😕', pct: 28, c: P.amber },
              { e: '😴', pct: 18, c: P.blue },
              { e: '😠', pct: 8,  c: P.red },
            ].map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: b.pct * 0.55 }}
                  transition={{ delay: 0.8 + i * 0.08, duration: 0.7 }}
                  style={{ width: '100%', background: b.c + '88', borderRadius: '4px 4px 0 0', minHeight: 4 }}
                />
                <span style={{ fontSize: 14 }}>{b.e}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      <div ref={statsRef} style={{
        background: P.card, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
        padding: '36px clamp(16px, 4vw, 64px)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24,
        textAlign: 'center',
      }}>
        {[
          { n: s1 + '+', label: 'Universities', icon: '🏛️' },
          { n: s2.toLocaleString() + '+', label: 'Students Tracked', icon: '🎓' },
          { n: s3 + '%', label: 'Attendance Accuracy', icon: '✅' },
          { n: s4 + 's', label: 'Avg Check-in Time', icon: '⚡' },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: P.blue2 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: P.text3, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(64px,10vw,120px) clamp(16px,4vw,64px)' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.blue, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Everything You Need
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>
            One Platform. Every Department.
          </h2>
          <p style={{ fontSize: 16, color: P.text2, maxWidth: 560, margin: '0 auto' }}>
            From AI-powered attendance to degree audits — EduSense covers the full academic lifecycle.
          </p>
        </FadeIn>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <motion.div
                whileHover={{ y: -4, boxShadow: `0 20px 60px ${f.color}22` }}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 16, padding: '24px 22px', cursor: 'default',
                  transition: 'border-color .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = f.color + '66'}
                onMouseLeave={e => e.currentTarget.style.borderColor = P.border}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: f.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.65 }}>{f.desc}</div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)',
        background: P.navy2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
      }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.purple, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Simple Onboarding
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>
            Up and Running in 10 Minutes
          </h2>
        </FadeIn>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 32, maxWidth: 960, margin: '0 auto',
        }}>
          {STEPS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.12}>
              <div style={{ textAlign: 'center', padding: '8px 16px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                  background: `linear-gradient(135deg, ${P.blue}33, ${P.purple}33)`,
                  border: `2px solid ${P.blue}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: P.blue, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                  STEP {s.n}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: P.text, marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Mobile App / PWA ─────────────────────────────────────────── */}
      <section id="mobile-app" style={{ padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)' }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center',
        }}>
          <FadeIn>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.green, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Mobile App
            </div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>
              Students & Parents.<br />Always in the Loop.
            </h2>
            <p style={{ fontSize: 14, color: P.text2, lineHeight: 1.8, marginBottom: 28 }}>
              The full EduSense experience runs directly in mobile browsers — no app store needed.
              Students install it as a native app in seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '📊', text: 'Live attendance & grade tracking' },
                { icon: '📱', text: 'QR check-in — just scan & done' },
                { icon: '🔔', text: 'Real-time push notifications' },
                { icon: '💬', text: 'Course chat & doctor DMs' },
                { icon: '🎓', text: 'Degree roadmap & graduation progress' },
                { icon: '📴', text: 'Works offline — cached data always available' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: P.green + '22', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16,
                  }}>{item.icon}</div>
                  <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.6, paddingTop: 6 }}>{item.text}</div>
                </div>
              ))}
            </div>
            <MobileInstallBanner />
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              style={{
                marginTop: 28, background: `linear-gradient(135deg, ${P.green}, #059669)`,
                border: 'none', borderRadius: 12, padding: '13px 32px',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: `0 8px 24px ${P.green}44`,
              }}
            >📲 Open the App</motion.button>
          </FadeIn>

          {/* Phone mockup */}
          <FadeIn delay={0.2} style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 260, background: P.card, borderRadius: 36, padding: 12,
              border: `2px solid ${P.border}`,
              boxShadow: `0 32px 80px #00000055, 0 0 0 6px ${P.navy2}`,
            }}>
              {/* Phone notch */}
              <div style={{ background: P.navy, borderRadius: 28, overflow: 'hidden', minHeight: 520 }}>
                <div style={{ background: P.navy, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4 }}>
                  <div style={{ width: 80, height: 4, background: P.border, borderRadius: 4 }} />
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {/* Student dashboard mini */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 12 }}>📊 My Dashboard</div>
                  {[
                    { label: 'Attendance', val: '91%', color: P.green, icon: '✅' },
                    { label: 'Avg Grade', val: '84', color: P.blue, icon: '📝' },
                    { label: 'Engagement', val: '78%', color: P.purple, icon: '🧠' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: P.navy2, borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 9, color: P.text3 }}>{s.icon} {s.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {s.icon}
                      </div>
                    </div>
                  ))}
                  <div style={{ background: P.navy2, borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                    <div style={{ fontSize: 9, color: P.text3, marginBottom: 6 }}>🔔 Notifications</div>
                    {[
                      { t: 'Grade Posted', d: 'CS401 — 87/100', c: P.blue },
                      { t: 'New Announcement', d: 'Assignment due Friday', c: P.amber },
                    ].map((n, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.c, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 9, color: P.text, fontWeight: 600 }}>{n.t}</div>
                          <div style={{ fontSize: 8, color: P.text3 }}>{n.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)',
        background: P.navy2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
      }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: P.text, margin: 0 }}>
            Trusted by Educators
          </h2>
        </FadeIn>
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', minHeight: 200 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              style={{
                background: P.card, border: `1px solid ${P.border}`,
                borderRadius: 20, padding: '32px 36px', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, color: P.blue, marginBottom: 20, opacity: 0.5 }}>"</div>
              <p style={{ fontSize: 15, color: P.text, lineHeight: 1.75, margin: '0 0 24px', fontStyle: 'italic' }}>
                {TESTIMONIALS[testimonialIdx].quote}
              </p>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{TESTIMONIALS[testimonialIdx].name}</div>
              <div style={{ fontSize: 12, color: P.text3, marginTop: 4 }}>
                {TESTIMONIALS[testimonialIdx].role} · {TESTIMONIALS[testimonialIdx].uni}
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)} style={{
                width: i === testimonialIdx ? 24 : 8, height: 8, borderRadius: 4,
                background: i === testimonialIdx ? P.blue : P.border,
                border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0,
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.amber, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>Simple, Per-University Pricing</h2>
          <p style={{ fontSize: 15, color: P.text2, maxWidth: 500, margin: '0 auto' }}>No per-seat fees. One flat annual license per institution — scales to unlimited students.</p>
        </FadeIn>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20, maxWidth: 900, margin: '0 auto',
        }}>
          {[
            {
              name: 'Starter', price: '$5,000', period: '/year', color: P.blue,
              features: ['Up to 500 students', '3 departments', 'Emotion AI + Attendance', 'Email support'],
              cta: 'Start Free Trial',
            },
            {
              name: 'Professional', price: '$12,000', period: '/year', color: P.purple, popular: true,
              features: ['Up to 5,000 students', 'Unlimited departments', 'All features', 'Priority support', 'Custom branding'],
              cta: 'Get Professional',
            },
            {
              name: 'Enterprise', price: 'Custom', period: '', color: P.green,
              features: ['Unlimited students', 'Multi-campus', 'SLA guarantee', 'Dedicated support', 'On-premise option'],
              cta: 'Contact Sales',
            },
          ].map((plan, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div style={{
                background: plan.popular ? `linear-gradient(145deg, ${P.purple}22, ${P.blue}18)` : P.card,
                border: `1.5px solid ${plan.popular ? P.purple : P.border}`,
                borderRadius: 20, padding: '28px 24px', position: 'relative',
                boxShadow: plan.popular ? `0 12px 48px ${P.purple}33` : 'none',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${P.purple}, ${P.blue})`,
                    color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px',
                    borderRadius: 100, letterSpacing: '0.1em',
                  }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: plan.color, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: P.text }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: P.text3, paddingBottom: 6 }}>{plan.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ color: plan.color, fontSize: 14, flexShrink: 0 }}>✓</div>
                      <div style={{ fontSize: 13, color: P.text2 }}>{f}</div>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={onLogin}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: plan.popular ? `linear-gradient(135deg, ${P.purple}, ${P.blue})` : 'transparent',
                    border: plan.popular ? 'none' : `1.5px solid ${P.border}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 700,
                    color: plan.popular ? '#fff' : P.text2, cursor: 'pointer',
                  }}
                >{plan.cta}</motion.button>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────── */}
      <FadeIn>
        <div style={{
          margin: '0 clamp(16px,4vw,64px) 80px',
          background: `linear-gradient(135deg, ${P.blue}22, ${P.purple}22)`,
          border: `1px solid ${P.blue}44`, borderRadius: 24,
          padding: 'clamp(36px,6vw,64px)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: 900, color: P.text, marginBottom: 12 }}>
            Ready to Transform Your Campus?
          </div>
          <p style={{ fontSize: 15, color: P.text2, marginBottom: 32 }}>
            Join universities already using EduSense to improve retention and engagement.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={onLogin}
            style={{
              background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
              border: 'none', borderRadius: 14, padding: '16px 48px',
              fontSize: 16, fontWeight: 800, color: '#fff', cursor: 'pointer',
              boxShadow: `0 12px 40px ${P.blue}66`,
            }}
          >🚀 Get Started Today — Free</motion.button>
        </div>
      </FadeIn>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        background: P.card, borderTop: `1px solid ${P.border}`,
        padding: 'clamp(32px,4vw,48px) clamp(16px,4vw,64px)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 32, maxWidth: 1000, margin: '0 auto', marginBottom: 36,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>⚡</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: P.text }}>EduSense</span>
            </div>
            <p style={{ fontSize: 12, color: P.text3, lineHeight: 1.7, margin: 0 }}>
              AI-powered university management.<br />Making every classroom smarter.
            </p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { title: 'Platform', links: ['Student Portal', 'Doctor Dashboard', 'Admin Panel', 'Parent View'] },
            { title: 'Support', links: ['Documentation', 'API Reference', 'Contact Us', 'Status'] },
          ].map((col, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.text2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(l => (
                  <span key={l} style={{ fontSize: 13, color: P.text3, cursor: 'pointer' }}
                    onMouseEnter={e => e.target.style.color = P.text}
                    onMouseLeave={e => e.target.style.color = P.text3}
                  >{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          borderTop: `1px solid ${P.border}`, paddingTop: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 12, color: P.text3 }}>
            © {new Date().getFullYear()} EduSense. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
              <span key={l} style={{ fontSize: 11, color: P.text3, cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
