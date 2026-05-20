import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS_BY_ROLE = {
  admin: [
    { title: 'Welcome, Admin!', body: 'This is the EduSense dashboard. Manage students, lecturers, courses, and system-wide analytics from here.', icon: '📊' },
    { title: 'Students & Lecturers', body: 'Use the sidebar to navigate to Students, Lecturers, and Courses to manage all university data.', icon: '🎓' },
    { title: 'Audit Log', body: 'Every action is logged. Visit the Audit Log in the sidebar to review the full activity trail.', icon: '🗃️' },
    { title: 'Grade Appeals', body: 'Review and resolve student grade appeals from the Appeals section.', icon: '📋' },
    { title: "You're all set!", body: 'Explore the rest of the sidebar to access reports, analytics, calendar, and more.', icon: '✅' },
  ],
  doctor: [
    { title: 'Welcome, Lecturer!', body: 'Your dashboard shows live sessions, student engagement metrics, and course analytics.', icon: '👨‍🏫' },
    { title: 'Live Session', body: 'Go to Live Session to view real-time face detection, emotion analytics, and attendance marking.', icon: '📷' },
    { title: 'Office Hours', body: 'Manage your office hour slots under the Office Hours page. Students can book sessions directly.', icon: '🕐' },
    { title: 'Grade Appeals', body: 'Review student grade appeals and respond with a decision from the Appeals tab.', icon: '📋' },
    { title: "You're all set!", body: 'Use the sidebar to explore Announcements, Assignments, Resources, and more.', icon: '✅' },
  ],
  student: [
    { title: 'Welcome, Student!', body: 'Your personal learning dashboard — track attendance, grades, emotions, and performance.', icon: '🎓' },
    { title: 'My Grades', body: 'Check your grades and GPA from the My Grades page. You can also run a GPA Calculator.', icon: '📝' },
    { title: 'Office Hours', body: 'Book a one-on-one slot with your lecturers from the Office Hours page.', icon: '🕐' },
    { title: 'Grade Appeals', body: 'If you disagree with a grade, submit a formal appeal under My Appeals.', icon: '📋' },
    { title: 'Export Portfolio', body: 'Export your academic portfolio as a PDF from the My Portfolio page.', icon: '📄' },
    { title: "You're all set!", body: 'Use the sidebar to navigate your schedule, assignments, exam timetable, and more.', icon: '✅' },
  ],
  parent: [
    { title: "Welcome, Parent!", body: "Monitor your child's academic progress — grades, attendance, emotions, and risk status.", icon: '👨‍👩‍👧' },
    { title: 'Grades & Attendance', body: "View your child's grades and attendance records. Alerts appear if attendance drops below thresholds.", icon: '📝' },
    { title: 'Academic Alerts', body: 'The Alerts page shows system notifications about your child — low attendance, grade changes, etc.', icon: '🔔' },
    { title: "You're all set!", body: 'This is a read-only monitoring view. Explore the sidebar for more details.', icon: '✅' },
  ],
};

const TOUR_KEY = 'edusense_tour_seen';

export default function OnboardingTour({ user, theme: C }) {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);

  useEffect(() => {
    if (!user?.role) return;
    const key = `${TOUR_KEY}_${user.role}_${user.username || user.id}`;
    const seen = localStorage.getItem(key);
    if (!seen) setVisible(true);
  }, [user]);

  if (!visible || !user?.role) return null;

  const steps = STEPS_BY_ROLE[user.role] || STEPS_BY_ROLE.student;
  const current = steps[step];
  const isLast  = step === steps.length - 1;

  function finish() {
    const key = `${TOUR_KEY}_${user.role}_${user.username || user.id}`;
    localStorage.setItem(key, '1');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tour-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={finish}
        >
          <motion.div
            key={step}
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.92, opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: C.card, borderRadius: 16, padding: '32px 36px',
              maxWidth: 440, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              border: `1px solid ${C.border}`, textAlign: 'center',
            }}
          >
            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                    background: i === step ? C.blue2 : C.border,
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>

            <div style={{ fontSize: 48, marginBottom: 16 }}>{current.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              {current.title}
            </div>
            <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.65, marginBottom: 28 }}>
              {current.body}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={finish}
                style={{
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '8px 18px', fontSize: 13,
                  color: C.text2, cursor: 'pointer',
                }}
              >
                Skip Tour
              </button>
              {!isLast ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  style={{
                    background: C.blue2, border: 'none', borderRadius: 8,
                    padding: '8px 22px', fontSize: 13, fontWeight: 600,
                    color: '#fff', cursor: 'pointer',
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={finish}
                  style={{
                    background: C.green, border: 'none', borderRadius: 8,
                    padding: '8px 22px', fontSize: 13, fontWeight: 600,
                    color: '#fff', cursor: 'pointer',
                  }}
                >
                  Get Started ✅
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
