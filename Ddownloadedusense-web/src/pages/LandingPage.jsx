/**
 * LandingPage.jsx — Marketing / product landing page for EduSense.
 * Interactive features: scroll-progress bar, typewriter hero, floating orbs,
 * mouse-parallax, expandable feature cards, role-preview live demo,
 * cycling phone screens, pricing billing toggle, smooth-scroll nav.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion, useInView, AnimatePresence,
  useScroll, useTransform, useMotionValue, useSpring,
} from 'framer-motion';

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
  cyan:   '#06b6d4',
  text:   '#f1f5f9',
  text2:  '#94a3b8',
  text3:  '#64748b',
};

/* ── Count-up hook ───────────────────────────────────────────────────────── */
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

/* ── Typewriter hook ─────────────────────────────────────────────────────── */
function useTypewriter(phrases, typeMs = 72, deleteMs = 36, pauseMs = 2200) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx,   setCharIdx]   = useState(0);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    if (!deleting && charIdx < phrase.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), typeMs);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === phrase.length) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx(c => c - 1), deleteMs);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % phrases.length);
    }
  }, [charIdx, deleting, phraseIdx, phrases, typeMs, deleteMs, pauseMs]);

  return {
    text:    phrases[phraseIdx].slice(0, charIdx),
    isDone:  !deleting && charIdx === phrases[phraseIdx].length,
  };
}

/* ── FadeIn wrapper ──────────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, style, from = 'bottom' }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const initial = from === 'left'  ? { opacity: 0, x: -32 }
               : from === 'right' ? { opacity: 0, x:  32 }
               : { opacity: 0, y: 32 };
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🧠', color: P.purple, title: 'Emotion AI Detection',
    desc: 'Real-time facial emotion recognition powered by deep learning.',
    extra: 'Detects 7 emotions — Happy, Neutral, Confused, Bored, Stressed, Engaged, and Frustrated — with <50 ms latency on any webcam.',
  },
  {
    icon: '✅', color: P.green, title: 'Face Recognition Attendance',
    desc: 'Automatic attendance marking via camera. No roll-calls, no paper.',
    extra: 'Students are marked present the moment they sit down. Exports to CSV, integrates with any SIS, and handles 300+ students per session.',
  },
  {
    icon: '📱', color: P.blue, title: 'QR Code Check-In',
    desc: 'Doctor generates a QR code, students scan it on their phones.',
    extra: 'Session QR refreshes every 60 seconds to prevent screenshot sharing. Works fully offline with a cached PWA — no install required.',
  },
  {
    icon: '📊', color: P.amber, title: 'Real-Time Analytics',
    desc: 'Engagement heatmaps, emotion trends, attendance rates, GPA correlation.',
    extra: 'Live dashboards update every 5 seconds. Export historical data as PDF or Excel. Drill down by section, course, or individual student.',
  },
  {
    icon: '🚨', color: P.red, title: 'At-Risk Early Warning',
    desc: 'Flags students at risk of failing using attendance, grades, and emotion data.',
    extra: 'Composite risk score factors in 6 signals. Triggered alerts go to the advisor by email instantly. Average intervention lead-time: 3 weeks.',
  },
  {
    icon: '💬', color: P.cyan, title: 'Live Course Chat & DMs',
    desc: 'Integrated messaging per course plus private doctor–student DMs.',
    extra: 'WebSocket-powered chat with read receipts, file sharing, and full message history. No third-party apps or data leaves your server.',
  },
  {
    icon: '🎓', color: '#a855f7', title: 'Academic Advising',
    desc: 'Students book advising appointments, doctors manage office hours.',
    extra: 'Degree-audit engine checks graduation requirements in real time. Advisors see the full academic history before each session.',
  },
  {
    icon: '🏛️', color: '#f97316', title: 'Multi-Tenant SaaS',
    desc: 'One platform, unlimited universities. Each gets isolated data and branding.',
    extra: 'Per-schema PostgreSQL isolation means data never bleeds between tenants. Custom logo, colors, and domain on each instance.',
  },
];

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

const TESTIMONIALS = [
  {
    quote: 'EduSense cut our attendance processing time from 15 minutes to zero. The emotion data completely changed how we think about student engagement.',
    name: 'Dr. Ahmed M.', role: 'Dean of Computer Science', uni: 'AAST University',
    avatar: '👨‍🏫',
  },
  {
    quote: 'Our at-risk detection caught 23 students who would have failed midterms. We intervened early and 18 of them passed. This system saves academic careers.',
    name: 'Prof. Sara N.', role: 'Academic Affairs Director', uni: 'Engineering Faculty',
    avatar: '👩‍💼',
  },
  {
    quote: "As a student, checking my attendance and grades from my phone is just normal now. I don't even think about going to the admin office anymore.",
    name: 'Loay W.', role: 'Computer Science Student', uni: 'Year 3',
    avatar: '👨‍🎓',
  },
];

/* ── Role-preview data ───────────────────────────────────────────────────── */
const ROLE_PREVIEWS = {
  student: {
    label: '🎓 Student', color: P.blue,
    title: 'Student Portal',
    subtitle: 'Track grades, attendance & more',
    stats: [
      { icon: '✅', label: 'Attendance', val: '91%', color: P.green },
      { icon: '📝', label: 'Avg Grade',  val: '84',  color: P.blue },
      { icon: '🧠', label: 'Engagement', val: '78%', color: P.purple },
      { icon: '📋', label: 'Assignments',val: '6/7', color: P.amber },
    ],
    items: [
      { dot: P.blue,   text: 'Live QR check-in from your phone' },
      { dot: P.green,  text: 'Per-course grade breakdown' },
      { dot: P.purple, text: 'Emotion history & engagement trends' },
      { dot: P.amber,  text: 'Push alerts for grades & announcements' },
    ],
  },
  doctor: {
    label: '👨‍🏫 Doctor', color: P.purple,
    title: 'Doctor Dashboard',
    subtitle: 'Run classes, track engagement',
    stats: [
      { icon: '👥', label: 'Students Today', val: '147', color: P.blue },
      { icon: '🧠', label: 'Avg Engagement', val: '74%', color: P.purple },
      { icon: '📋', label: 'Attendance Rate', val: '88%', color: P.green },
      { icon: '🚨', label: 'At-Risk',         val: '4',   color: P.red },
    ],
    items: [
      { dot: P.purple, text: 'One-click live emotion session' },
      { dot: P.blue,   text: 'Generate QR codes for attendance' },
      { dot: P.green,  text: 'See per-student emotion heatmap' },
      { dot: P.red,    text: 'At-risk alerts with drill-down' },
    ],
  },
  admin: {
    label: '🛡️ Admin', color: P.amber,
    title: 'Admin Panel',
    subtitle: 'University-wide operations',
    stats: [
      { icon: '🏫', label: 'Departments', val: '12',    color: P.blue },
      { icon: '🎓', label: 'Students',    val: '4,280', color: P.green },
      { icon: '👨‍🏫', label: 'Faculty',    val: '89',    color: P.purple },
      { icon: '🚨', label: 'Alerts Today',val: '7',     color: P.red },
    ],
    items: [
      { dot: P.amber,  text: 'Bulk-import students via CSV' },
      { dot: P.blue,   text: 'Manage courses, schedules & rooms' },
      { dot: P.green,  text: 'University-wide analytics export' },
      { dot: P.purple, text: 'Custom branding & tenant settings' },
    ],
  },
  parent: {
    label: '👨‍👩‍👧 Parent', color: P.green,
    title: 'Parent View',
    subtitle: "Monitor your child's progress",
    stats: [
      { icon: '✅', label: 'Attendance',   val: '91%', color: P.green },
      { icon: '📝', label: 'Avg Grade',    val: '84',  color: P.blue },
      { icon: '⏰', label: 'Absences',     val: '2',   color: P.amber },
      { icon: '🔔', label: 'New Alerts',   val: '1',   color: P.red },
    ],
    items: [
      { dot: P.green,  text: 'Real-time attendance notifications' },
      { dot: P.blue,   text: 'Grade reports for each course' },
      { dot: P.amber,  text: 'Absence alerts sent instantly' },
      { dot: P.purple, text: 'Semester-end academic summary' },
    ],
  },
};

/* ── Phone screens ───────────────────────────────────────────────────────── */
const PHONE_SCREENS = [
  {
    label: 'Dashboard',
    render: () => (
      <>
        <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 10 }}>📊 My Dashboard</div>
        {[
          { label: 'Attendance', val: '91%', color: P.green,  icon: '✅' },
          { label: 'Avg Grade',  val: '84',  color: P.blue,   icon: '📝' },
          { label: 'Engagement', val: '78%', color: P.purple, icon: '🧠' },
        ].map((s, i) => (
          <div key={i} style={{
            background: P.navy2, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 8, color: P.text3 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{s.icon}</div>
          </div>
        ))}
        <div style={{ background: P.navy2, borderRadius: 8, padding: '8px 10px', marginTop: 4 }}>
          <div style={{ fontSize: 8, color: P.text3, marginBottom: 4 }}>🔔 Latest Alert</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: P.blue }}>Grade Posted — CS401: 87/100</div>
          <div style={{ fontSize: 8, color: P.text3, marginTop: 2 }}>2 minutes ago</div>
        </div>
      </>
    ),
  },
  {
    label: 'Attendance',
    render: () => (
      <>
        <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 10 }}>✅ Attendance</div>
        {[
          { course: 'CS401 — AI', pct: '95%', color: P.green,  icon: '🧠' },
          { course: 'CS301 — OS', pct: '88%', color: P.blue,   icon: '💻' },
          { course: 'CS201 — DS', pct: '79%', color: P.amber,  icon: '📊' },
          { course: 'MATH201',    pct: '92%', color: P.purple, icon: '📐' },
        ].map((c, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <div style={{ fontSize: 8, color: P.text2 }}>{c.icon} {c.course}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: c.color }}>{c.pct}</div>
            </div>
            <div style={{ height: 4, background: P.border, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: c.pct, background: c.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
        <div style={{ background: P.navy2, borderRadius: 8, padding: '8px 10px', marginTop: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: P.text3 }}>Overall Attendance</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: P.green }}>91%</div>
        </div>
      </>
    ),
  },
  {
    label: 'Schedule',
    render: () => (
      <>
        <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 10 }}>📅 Today</div>
        {[
          { time: '09:00',  course: 'CS401 — AI',    room: 'B-204', color: P.purple, live: true },
          { time: '11:30',  course: 'CS301 — OS',    room: 'A-101', color: P.blue   },
          { time: '14:00',  course: 'MATH201',        room: 'C-302', color: P.amber  },
        ].map((c, i) => (
          <div key={i} style={{
            background: P.navy2, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
            borderLeft: `3px solid ${c.color}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: P.text }}>{c.course}</div>
              <div style={{ fontSize: 8, color: P.text3 }}>🕐 {c.time}  📍 {c.room}</div>
            </div>
            {c.live && (
              <div style={{ fontSize: 7, fontWeight: 700, color: P.red, background: P.red + '22', padding: '2px 6px', borderRadius: 4 }}>LIVE</div>
            )}
          </div>
        ))}
        <div style={{ background: P.blue + '18', borderRadius: 8, padding: '8px 10px', marginTop: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: P.blue2 }}>📱 Tap LIVE class to QR check-in →</div>
        </div>
      </>
    ),
  },
];

/* ── Floating orb component ──────────────────────────────────────────────── */
function FloatingOrb({ size, x, y, color, duration, delay = 0 }) {
  return (
    <motion.div
      style={{
        position: 'absolute', width: size, height: size,
        left: x, top: y,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.08, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/* ── PWA install banner ──────────────────────────────────────────────────── */
function MobileInstallBanner() {
  const isIOS     = /iphone|ipad/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isIOS && !isAndroid) return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${P.purple}22, ${P.blue}22)`,
      border: `1px solid ${P.border}`,
      borderRadius: 14, padding: '14px 18px',
      display: 'flex', gap: 14, alignItems: 'center',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 32 }}>📲</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 3 }}>Install EduSense</div>
        <div style={{ fontSize: 11, color: P.text2 }}>
          {isIOS ? 'Share → "Add to Home Screen"' : 'Menu → "Add to Home Screen"'}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage({ onLogin, branding }) {
  /* ── Refs ── */
  const containerRef = useRef(null);
  const statsRef     = useRef(null);

  /* ── Scroll progress ── */
  const { scrollYProgress } = useScroll({ container: containerRef });

  /* ── Mouse parallax ── */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 55, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 55, damping: 18 });

  const handleMouseMove = useCallback((e) => {
    rawX.set((e.clientX / window.innerWidth  - 0.5) * 28);
    rawY.set((e.clientY / window.innerHeight - 0.5) * 18);
  }, [rawX, rawY]);

  /* ── State ── */
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [testimonialIdx,  setTestimonialIdx]  = useState(0);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [activeRole,      setActiveRole]      = useState('student');
  const [phoneScreen,     setPhoneScreen]     = useState(0);
  const [billingAnnual,   setBillingAnnual]   = useState(false);

  /* ── Stats count-up ── */
  const statsView = useInView(statsRef, { once: true });
  const s1 = useCountUp(50,    1200, statsView);
  const s2 = useCountUp(10000, 1600, statsView);
  const s3 = useCountUp(98,    1000, statsView);
  const s4 = useCountUp(3,      800, statsView);

  /* ── Typewriter ── */
  const { text: heroWord, isDone } = useTypewriter(
    ['Every Classroom.', 'Every Student.', 'Every Emotion.', 'Every Campus.'],
  );

  /* ── Testimonial auto-advance ── */
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  /* ── Phone screen auto-cycle ── */
  useEffect(() => {
    const t = setInterval(() => setPhoneScreen(i => (i + 1) % PHONE_SCREENS.length), 3500);
    return () => clearInterval(t);
  }, []);

  /* ── Smooth-scroll helper ── */
  function scrollTo(id) {
    const el = containerRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }

  const isMobile = window.innerWidth < 768;
  const uniName  = branding?.name || 'EduSense';

  /* ── Pricing multiplier ── */
  const priceMul = billingAnnual ? 0.8 : 1;
  const PLANS = [
    {
      name: 'Starter',      color: P.blue,   monthlyPrice: 5000,
      features: ['Up to 500 students', '3 departments', 'Emotion AI + Attendance', 'Email support'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Professional', color: P.purple, monthlyPrice: 12000, popular: true,
      features: ['Up to 5,000 students', 'Unlimited departments', 'All features', 'Priority support', 'Custom branding'],
      cta: 'Get Professional',
    },
    {
      name: 'Enterprise',   color: P.green,  monthlyPrice: null,
      features: ['Unlimited students', 'Multi-campus', 'SLA guarantee', 'Dedicated support', 'On-premise option'],
      cta: 'Contact Sales',
    },
  ];

  /* ════════════════════════════════ RENDER ════════════════════════════════ */
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        height: '100%', overflowY: 'auto', overflowX: 'hidden',
        background: P.navy, color: P.text,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        scrollBehavior: 'smooth',
      }}
    >
      {/* ── Scroll progress bar ─────────────────────────────────────────── */}
      <motion.div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${P.blue}, ${P.purple}, ${P.cyan})`,
          transformOrigin: '0% 50%',
          scaleX: scrollYProgress,
          zIndex: 300,
        }}
      />

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${P.navy}ee`, backdropFilter: 'blur(14px)',
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
          <span style={{ fontSize: 18, fontWeight: 800, color: P.text, letterSpacing: '-0.3px' }}>{uniName}</span>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[
              ['Features', 'features'],
              ['Live Demo', 'role-preview'],
              ['How It Works', 'how-it-works'],
              ['Mobile', 'mobile-app'],
              ['Pricing', 'pricing'],
            ].map(([label, id]) => (
              <button key={id}
                onClick={() => scrollTo(id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: P.text2, fontSize: 13, fontWeight: 500,
                  padding: 0, transition: 'color .2s',
                }}
                onMouseEnter={e => e.target.style.color = P.text}
                onMouseLeave={e => e.target.style.color = P.text2}
              >{label}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(o => !o)} style={{
              background: 'none', border: `1px solid ${P.border}`, borderRadius: 8,
              padding: '6px 10px', color: P.text, cursor: 'pointer', fontSize: 16,
            }}>☰</button>
          )}
          <button onClick={onLogin} style={{
            background: 'transparent', border: `1.5px solid ${P.border}`,
            borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600,
            color: P.text2, cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.blue; e.currentTarget.style.color = P.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.text2; }}
          >Login</button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={onLogin}
            style={{
              background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
              border: 'none', borderRadius: 8, padding: '8px 20px',
              fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
              boxShadow: `0 4px 14px ${P.blue}44`,
            }}
          >Get Started →</motion.button>
        </div>
      </nav>

      {/* ── Mobile menu ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'sticky', top: 64, zIndex: 99,
              background: P.navy2, borderBottom: `1px solid ${P.border}`,
              padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            {[['Features','features'],['Live Demo','role-preview'],['How It Works','how-it-works'],['Pricing','pricing']].map(([l,id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', color: P.text2, fontSize: 14,
                cursor: 'pointer', textAlign: 'left', padding: '6px 0', fontWeight: 500,
              }}>{l}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(48px,10vh,96px) clamp(16px,4vw,64px) 48px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Floating orbs */}
        <FloatingOrb size={600} x="5%"   y="5%"   color={P.blue   + '14'} duration={22} delay={0} />
        <FloatingOrb size={400} x="70%"  y="3%"   color={P.purple + '14'} duration={28} delay={2} />
        <FloatingOrb size={500} x="55%"  y="55%"  color={P.blue   + '0d'} duration={34} delay={4} />
        <FloatingOrb size={280} x="15%"  y="65%"  color={P.purple + '12'} duration={20} delay={1} />
        <FloatingOrb size={350} x="85%"  y="45%"  color={P.cyan   + '0e'} duration={26} delay={3} />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${P.blue}18`, border: `1px solid ${P.blue}44`,
            borderRadius: 100, padding: '6px 16px', fontSize: 12,
            fontWeight: 600, color: P.blue2, marginBottom: 28,
          }}>
            🎓 AI-Powered University Management Platform
          </div>

          {/* Typewriter headline */}
          <h1 style={{
            fontSize: 'clamp(34px, 6.5vw, 76px)', fontWeight: 900,
            lineHeight: 1.08, margin: '0 0 24px', position: 'relative', zIndex: 1,
          }}>
            <span style={{
              background: `linear-gradient(135deg, ${P.text} 30%, ${P.blue2} 70%, ${P.purple} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {heroWord}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ color: P.blue2, WebkitTextFillColor: P.blue2 }}
            >|</motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: 'clamp(15px, 2vw, 20px)', color: P.text2, maxWidth: 580,
              lineHeight: 1.7, margin: '0 auto 40px',
            }}
          >
            EduSense combines face recognition, emotion AI, and smart analytics
            to give universities complete real-time insight into classroom engagement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: `0 12px 40px ${P.blue}66` }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              style={{
                background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
                border: 'none', borderRadius: 12, padding: '14px 36px',
                fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: `0 8px 32px ${P.blue}44`,
              }}
            >🚀 Get Started Free</motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => scrollTo('role-preview')}
              style={{
                background: 'transparent', border: `1.5px solid ${P.border}`,
                borderRadius: 12, padding: '13px 30px',
                fontSize: 15, fontWeight: 600, color: P.text2, cursor: 'pointer',
              }}
            >▶ See Live Demo</motion.button>
          </motion.div>
        </motion.div>

        {/* Hero dashboard mockup with parallax */}
        <motion.div
          style={{
            marginTop: 64, width: '100%', maxWidth: 900, position: 'relative', zIndex: 1,
            x: springX, y: springY,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            style={{
              background: P.navy2, borderRadius: 20,
              border: `1px solid ${P.border}`,
              boxShadow: `0 40px 120px ${P.blue}22, 0 0 0 1px ${P.border}`,
              overflow: 'hidden',
            }}
          >
            {/* Browser chrome */}
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
            {/* Stat cards */}
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Students Online', val: '247', icon: '👥', color: P.blue },
                { label: 'Avg Engagement',  val: '78%', icon: '📊', color: P.green },
                { label: 'Attendance Rate', val: '91%', icon: '✅', color: P.purple },
                { label: 'At-Risk Alerts',  val: '3',   icon: '🚨', color: P.amber },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.1 }}
                  whileHover={{ scale: 1.04, y: -2 }}
                  style={{
                    background: P.card, borderRadius: 10, padding: '14px 16px',
                    border: `1px solid ${P.border}`, cursor: 'default',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: P.text3, marginTop: 2 }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
            {/* Emotion chart */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, alignItems: 'flex-end', height: 72 }}>
              {[
                { e: '😊', pct: 72, c: P.green },
                { e: '😐', pct: 45, c: P.text3 },
                { e: '😕', pct: 28, c: P.amber },
                { e: '😴', pct: 18, c: P.blue },
                { e: '😠', pct:  8, c: P.red },
              ].map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: b.pct * 0.58 }}
                    transition={{ delay: 0.8 + i * 0.08, duration: 0.8 }}
                    style={{ width: '100%', background: b.c + '88', borderRadius: '4px 4px 0 0', minHeight: 4 }}
                  />
                  <span style={{ fontSize: 15 }}>{b.e}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div ref={statsRef} style={{
        background: P.card, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
        padding: '36px clamp(16px, 4vw, 64px)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24,
        textAlign: 'center',
      }}>
        {[
          { n: s1 + '+',              label: 'Universities',        icon: '🏛️' },
          { n: s2.toLocaleString() + '+', label: 'Students Tracked', icon: '🎓' },
          { n: s3 + '%',              label: 'Attendance Accuracy',  icon: '✅' },
          { n: s4 + 's',              label: 'Avg Check-in Time',    icon: '⚡' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.05 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: P.blue2 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: P.text3, marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Features (expandable cards) ─────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(64px,10vw,120px) clamp(16px,4vw,64px)' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.blue, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Everything You Need
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>
            One Platform. Every Department.
          </h2>
          <p style={{ fontSize: 16, color: P.text2, maxWidth: 560, margin: '0 auto' }}>
            Click any card to learn more.
          </p>
        </FadeIn>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map((f, i) => {
            const isOpen = expandedFeature === i;
            return (
              <FadeIn key={i} delay={i * 0.05}>
                <motion.div
                  onClick={() => setExpandedFeature(isOpen ? null : i)}
                  layout
                  whileHover={{ y: isOpen ? 0 : -4 }}
                  style={{
                    background: isOpen
                      ? `linear-gradient(145deg, ${f.color}18, ${P.card})`
                      : P.card,
                    border: `1.5px solid ${isOpen ? f.color + '66' : P.border}`,
                    borderRadius: 16, padding: '24px 22px', cursor: 'pointer',
                    boxShadow: isOpen ? `0 20px 60px ${f.color}22` : 'none',
                    transition: 'border-color .25s, background .25s',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = f.color + '66'; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = P.border; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: f.color + '22', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 22, flexShrink: 0,
                    }}>{f.icon}</div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      style={{ fontSize: 14, color: P.text3, marginTop: 4 }}
                    >▼</motion.div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.65 }}>{f.desc}</div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          marginTop: 14, paddingTop: 14,
                          borderTop: `1px solid ${f.color}33`,
                          fontSize: 12, color: P.text2, lineHeight: 1.75,
                        }}>
                          {f.extra}
                        </div>
                        <div style={{
                          marginTop: 12, display: 'inline-block',
                          fontSize: 11, fontWeight: 700, color: f.color,
                          background: f.color + '18', padding: '4px 10px', borderRadius: 6,
                        }}>
                          ✓ Included in all plans
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── Role Preview (Live Demo) ─────────────────────────────────────── */}
      <section id="role-preview" style={{
        padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)',
        background: P.navy2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
      }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.cyan, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Live Demo
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 14px', color: P.text }}>
            See Every Role in Action
          </h2>
          <p style={{ fontSize: 15, color: P.text2 }}>Pick a role to explore the dashboard experience.</p>
        </FadeIn>

        {/* Role tabs */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          {Object.entries(ROLE_PREVIEWS).map(([key, r]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActiveRole(key)}
              style={{
                background: activeRole === key
                  ? `linear-gradient(135deg, ${r.color}44, ${r.color}22)`
                  : P.card,
                border: `1.5px solid ${activeRole === key ? r.color : P.border}`,
                borderRadius: 100, padding: '8px 22px',
                fontSize: 13, fontWeight: 700,
                color: activeRole === key ? P.text : P.text2,
                cursor: 'pointer',
                boxShadow: activeRole === key ? `0 4px 20px ${r.color}33` : 'none',
                transition: 'all .25s',
              }}
            >{r.label}</motion.button>
          ))}
        </div>

        {/* Demo panel */}
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            {Object.entries(ROLE_PREVIEWS).filter(([k]) => k === activeRole).map(([key, demo]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                style={{
                  background: P.card, border: `1.5px solid ${demo.color}44`,
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: `0 24px 80px ${demo.color}18`,
                }}
              >
                {/* Demo browser chrome */}
                <div style={{
                  background: P.navy, padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: `1px solid ${P.border}`,
                }}>
                  {['#ef4444','#f59e0b','#10b981'].map((c, i) => (
                    <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                  ))}
                  <div style={{
                    flex: 1, background: P.navy2, borderRadius: 6, padding: '4px 12px',
                    fontSize: 11, color: P.text3, marginLeft: 8,
                  }}>edusense.app/{key}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: demo.color,
                    background: demo.color + '22', padding: '3px 10px', borderRadius: 6,
                  }}>{demo.title}</div>
                </div>

                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
                  {/* Left: stat grid */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text2, marginBottom: 16 }}>
                      {demo.subtitle}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {demo.stats.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.07 }}
                          style={{
                            background: P.navy, borderRadius: 12, padding: '16px',
                            border: `1px solid ${s.color}33`,
                          }}
                        >
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: 10, color: P.text3, marginTop: 2 }}>{s.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Right: feature bullets */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 4 }}>
                      Key capabilities for this role:
                    </div>
                    {demo.items.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07 }}
                        style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                      >
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: item.dot + '22', border: `1.5px solid ${item.dot}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot }} />
                        </div>
                        <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.55 }}>{item.text}</div>
                      </motion.div>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      onClick={onLogin}
                      style={{
                        marginTop: 8,
                        background: `linear-gradient(135deg, ${demo.color}, ${demo.color}aa)`,
                        border: 'none', borderRadius: 10, padding: '11px 24px',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        cursor: 'pointer', alignSelf: 'flex-start',
                        boxShadow: `0 6px 20px ${demo.color}44`,
                      }}
                    >Try as {demo.label.split(' ')[1]} →</motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)' }}>
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
          gap: 32, maxWidth: 960, margin: '0 auto', position: 'relative',
        }}>
          {STEPS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.14}>
              <motion.div
                whileHover={{ y: -6 }}
                style={{ textAlign: 'center', padding: '24px 20px', background: P.card, borderRadius: 20, border: `1px solid ${P.border}` }}
              >
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 5 }}
                  style={{
                    width: 68, height: 68, borderRadius: '50%', margin: '0 auto 20px',
                    background: `linear-gradient(135deg, ${P.blue}33, ${P.purple}33)`,
                    border: `2px solid ${P.blue}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 30,
                  }}
                >{s.icon}</motion.div>
                <div style={{ fontSize: 11, color: P.blue, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                  STEP {s.n}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: P.text, marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.7 }}>{s.desc}</div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Mobile App / PWA ────────────────────────────────────────────── */}
      <section id="mobile-app" style={{
        padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)',
        background: P.navy2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
      }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto',
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 56, alignItems: 'center',
        }}>
          <FadeIn from="left">
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { icon: '📊', text: 'Live attendance & grade tracking' },
                { icon: '📱', text: 'QR check-in — just scan & done' },
                { icon: '🔔', text: 'Real-time push notifications' },
                { icon: '💬', text: 'Course chat & doctor DMs' },
                { icon: '🎓', text: 'Degree roadmap & graduation progress' },
                { icon: '📴', text: 'Works offline — cached data always available' },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.07} from="left">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: P.green + '22', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16,
                    }}>{item.icon}</div>
                    <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.6, paddingTop: 6 }}>{item.text}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
            <MobileInstallBanner />
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              style={{
                background: `linear-gradient(135deg, ${P.green}, #059669)`,
                border: 'none', borderRadius: 12, padding: '13px 32px',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: `0 8px 24px ${P.green}44`,
              }}
            >📲 Open the App</motion.button>
          </FadeIn>

          {/* Phone mockup with cycling screens */}
          <FadeIn delay={0.2} from="right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Screen tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              {PHONE_SCREENS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPhoneScreen(i)}
                  style={{
                    background: phoneScreen === i ? P.green + '33' : P.card,
                    border: `1.5px solid ${phoneScreen === i ? P.green : P.border}`,
                    borderRadius: 8, padding: '5px 14px',
                    fontSize: 11, fontWeight: 700,
                    color: phoneScreen === i ? P.green : P.text3,
                    cursor: 'pointer', transition: 'all .2s',
                  }}
                >{s.label}</button>
              ))}
            </div>

            <div style={{
              width: 260, background: P.card, borderRadius: 36, padding: 12,
              border: `2px solid ${P.border}`,
              boxShadow: `0 32px 80px #00000055, 0 0 0 6px ${P.navy}`,
            }}>
              <div style={{ background: P.navy, borderRadius: 28, overflow: 'hidden', minHeight: 460 }}>
                {/* Dynamic island notch */}
                <div style={{
                  background: P.navy, height: 32, display: 'flex',
                  justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4,
                }}>
                  <div style={{ width: 80, height: 4, background: P.border, borderRadius: 4 }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phoneScreen}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ padding: '10px 14px' }}
                  >
                    {PHONE_SCREENS[phoneScreen].render()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Dot indicator */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {PHONE_SCREENS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ width: phoneScreen === i ? 20 : 8, background: phoneScreen === i ? P.green : P.border }}
                  style={{ height: 8, borderRadius: 4, cursor: 'pointer' }}
                  onClick={() => setPhoneScreen(i)}
                />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.amber, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Social Proof
          </div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: P.text, margin: 0 }}>
            Trusted by Educators
          </h2>
        </FadeIn>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.97 }}
              transition={{ duration: 0.45 }}
              style={{
                background: P.card, border: `1px solid ${P.border}`,
                borderRadius: 24, padding: 'clamp(24px,4vw,40px)',
                textAlign: 'center', position: 'relative',
              }}
            >
              {/* Decorative quote mark */}
              <div style={{
                position: 'absolute', top: 20, left: 28,
                fontSize: 80, color: P.blue, opacity: 0.08,
                fontFamily: 'Georgia, serif', lineHeight: 1,
              }}>"</div>
              <div style={{ fontSize: 44, marginBottom: 16 }}>{TESTIMONIALS[testimonialIdx].avatar}</div>
              <p style={{ fontSize: 15, color: P.text, lineHeight: 1.8, margin: '0 0 24px', fontStyle: 'italic', position: 'relative' }}>
                "{TESTIMONIALS[testimonialIdx].quote}"
              </p>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{TESTIMONIALS[testimonialIdx].name}</div>
              <div style={{ fontSize: 12, color: P.text3, marginTop: 4 }}>
                {TESTIMONIALS[testimonialIdx].role} · {TESTIMONIALS[testimonialIdx].uni}
              </div>
              {/* Star rating */}
              <div style={{ marginTop: 12, fontSize: 16, color: P.amber }}>★★★★★</div>
            </motion.div>
          </AnimatePresence>

          {/* Nav dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {TESTIMONIALS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                animate={{ width: i === testimonialIdx ? 28 : 8, background: i === testimonialIdx ? P.amber : P.border }}
                style={{ height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0 }}
              />
            ))}
          </div>

          {/* Prev / Next arrows */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            {[['← Prev', -1], ['Next →', 1]].map(([label, dir]) => (
              <button
                key={label}
                onClick={() => setTestimonialIdx(i => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length)}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 8, padding: '6px 16px', fontSize: 12,
                  fontWeight: 600, color: P.text2, cursor: 'pointer',
                }}
              >{label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" style={{
        padding: 'clamp(64px,10vw,100px) clamp(16px,4vw,64px)',
        background: P.navy2, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
      }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.amber, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', color: P.text }}>
            Simple, Per-University Pricing
          </h2>
          <p style={{ fontSize: 15, color: P.text2, maxWidth: 500, margin: '0 auto 32px' }}>
            No per-seat fees. One flat annual license per institution.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, color: billingAnnual ? P.text3 : P.text, fontWeight: billingAnnual ? 400 : 700 }}>Monthly</span>
            <motion.div
              onClick={() => setBillingAnnual(a => !a)}
              style={{
                width: 52, height: 28, borderRadius: 14,
                background: billingAnnual ? P.purple : P.border,
                cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center',
                transition: 'background .3s',
              }}
            >
              <motion.div
                animate={{ x: billingAnnual ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff' }}
              />
            </motion.div>
            <span style={{ fontSize: 13, color: billingAnnual ? P.text : P.text3, fontWeight: billingAnnual ? 700 : 400 }}>
              Annual
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700, color: P.green,
                background: P.green + '22', padding: '2px 8px', borderRadius: 100,
              }}>Save 20%</span>
            </span>
          </div>
        </FadeIn>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20, maxWidth: 920, margin: '0 auto',
        }}>
          {PLANS.map((plan, i) => {
            const price = plan.monthlyPrice
              ? `$${Math.round(plan.monthlyPrice * priceMul).toLocaleString()}`
              : 'Custom';
            const period = plan.monthlyPrice ? (billingAnnual ? '/yr' : '/yr') : '';
            return (
              <FadeIn key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: `0 24px 80px ${plan.color}28` }}
                  style={{
                    background: plan.popular ? `linear-gradient(145deg, ${P.purple}22, ${P.blue}18)` : P.card,
                    border: `1.5px solid ${plan.popular ? P.purple : P.border}`,
                    borderRadius: 20, padding: '28px 24px', position: 'relative',
                    boxShadow: plan.popular ? `0 12px 48px ${P.purple}28` : 'none',
                    transition: 'box-shadow .3s',
                  }}
                >
                  {plan.popular && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: `linear-gradient(135deg, ${P.purple}, ${P.blue})`,
                      color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px',
                      borderRadius: 100, letterSpacing: '0.1em', whiteSpace: 'nowrap',
                    }}>⭐ MOST POPULAR</div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 700, color: plan.color, marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 6 }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={price}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        style={{ fontSize: 36, fontWeight: 900, color: P.text }}
                      >{price}</motion.span>
                    </AnimatePresence>
                    <span style={{ fontSize: 13, color: P.text3, paddingBottom: 7 }}>{period}</span>
                  </div>
                  {billingAnnual && plan.monthlyPrice && (
                    <div style={{ fontSize: 11, color: P.green, marginBottom: 16 }}>
                      ✓ Save ${Math.round(plan.monthlyPrice * 0.2).toLocaleString()} vs monthly
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, marginTop: 16 }}>
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
                      background: plan.popular
                        ? `linear-gradient(135deg, ${P.purple}, ${P.blue})`
                        : 'transparent',
                      border: plan.popular ? 'none' : `1.5px solid ${P.border}`,
                      borderRadius: 10, fontSize: 13, fontWeight: 700,
                      color: plan.popular ? '#fff' : P.text2, cursor: 'pointer',
                    }}
                  >{plan.cta}</motion.button>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────────── */}
      <FadeIn>
        <div style={{
          margin: 'clamp(40px,6vw,80px) clamp(16px,4vw,64px)',
          background: `linear-gradient(135deg, ${P.blue}22, ${P.purple}22)`,
          border: `1px solid ${P.blue}44`, borderRadius: 24,
          padding: 'clamp(36px,6vw,64px)', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* CTA background orbs */}
          <FloatingOrb size={300} x="5%"  y="10%"  color={P.blue   + '18'} duration={18} />
          <FloatingOrb size={250} x="75%" y="20%"  color={P.purple + '18'} duration={22} delay={1} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: 900, color: P.text, marginBottom: 14 }}>
              Ready to Transform Your Campus?
            </div>
            <p style={{ fontSize: 15, color: P.text2, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Join universities already using EduSense to improve retention, engagement, and academic outcomes.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: `0 16px 48px ${P.blue}77` }}
                whileTap={{ scale: 0.97 }}
                onClick={onLogin}
                style={{
                  background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
                  border: 'none', borderRadius: 14, padding: '16px 48px',
                  fontSize: 16, fontWeight: 800, color: '#fff', cursor: 'pointer',
                  boxShadow: `0 12px 40px ${P.blue}55`,
                }}
              >🚀 Get Started Today — Free</motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => scrollTo('role-preview')}
                style={{
                  background: 'transparent', border: `1.5px solid ${P.border}`,
                  borderRadius: 14, padding: '15px 32px',
                  fontSize: 15, fontWeight: 600, color: P.text2, cursor: 'pointer',
                }}
              >▶ Watch Demo</motion.button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>⚡</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: P.text }}>EduSense</span>
            </div>
            <p style={{ fontSize: 12, color: P.text3, lineHeight: 1.7, margin: 0 }}>
              AI-powered university management.<br />Making every classroom smarter.
            </p>
          </div>
          {[
            { title: 'Product',  links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { title: 'Platform', links: ['Student Portal', 'Doctor Dashboard', 'Admin Panel', 'Parent View'] },
            { title: 'Support',  links: ['Documentation', 'API Reference', 'Contact Us', 'Status'] },
          ].map((col, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.text2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(l => (
                  <span key={l} style={{ fontSize: 13, color: P.text3, cursor: 'pointer', transition: 'color .2s' }}
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
          <div style={{ fontSize: 12, color: P.text3 }}>© {new Date().getFullYear()} EduSense. All rights reserved.</div>
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
