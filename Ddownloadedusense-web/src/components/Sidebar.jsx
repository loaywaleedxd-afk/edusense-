import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden:  { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

export default function Sidebar({ theme: C, navItems, activeId, onNav }) {
  return (
    <div style={{
      width: 230, minWidth: 230, height: '100%',
      background: C.sidebar, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', flexShrink: 0 }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, color: C.blue2 }}>⚡ EduSense</div>
        <div style={{ fontSize: 9, color: C.text3, marginTop: 4 }}>Emotion & Attendance AI</div>
      </motion.div>

      {/* Accent line */}
      <div style={{ height: 2, background: C.blue3, flexShrink: 0 }} />

      {/* Nav items */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
      >
        {navItems.map((item, idx) => (
          item.section
            ? (
              <motion.div
                key={idx}
                variants={itemVariants}
                style={{ fontSize: 9, fontWeight: 700, color: C.text3, padding: '14px 18px 4px', letterSpacing: '0.08em' }}
              >
                {item.section.toUpperCase()}
              </motion.div>
            )
            : (
              <motion.div key={item.id} variants={itemVariants}>
                <NavBtn item={item} isActive={activeId === item.id} theme={C} onClick={() => onNav(item.id)} />
              </motion.div>
            )
        ))}
      </motion.div>

      {/* Version */}
      <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 9, color: C.text3, flexShrink: 0 }}>
        v 3.0 · EduSense
      </div>
    </div>
  );
}

function NavBtn({ item, isActive, theme: C, onClick }) {
  const textColor = isActive ? C.blue2 : C.text3;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        display: 'flex', alignItems: 'center', margin: '2px 8px', borderRadius: 10,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Sliding active background — same layoutId across all buttons */}
      {isActive && (
        <motion.div
          layoutId="nav-active-bg"
          style={{
            position: 'absolute', inset: 0,
            background: C.blue_dim,
            borderRadius: 10,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}

      {/* Left accent bar */}
      <div style={{
        width: 4, minHeight: 42, borderRadius: 2,
        background: isActive ? C.blue2 : 'transparent',
        margin: '4px 0 4px 4px',
        transition: 'background 0.2s',
        position: 'relative', zIndex: 1,
      }} />

      {/* Icon */}
      <span style={{
        fontSize: 15, width: 28, textAlign: 'center',
        padding: '11px 8px', color: textColor,
        position: 'relative', zIndex: 1, transition: 'color 0.2s',
      }}>
        {item.icon}
      </span>

      {/* Label */}
      <span style={{
        fontSize: 12, fontWeight: isActive ? 700 : 400,
        color: textColor, flex: 1,
        position: 'relative', zIndex: 1, transition: 'color 0.2s',
      }}>
        {item.label}
      </span>

      {/* Badge */}
      {(() => {
        const b = typeof item.badge === 'function' ? item.badge() : item.badge;
        return b > 0 ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            style={{
              background: C.red, color: '#fff', fontSize: 9, fontWeight: 700,
              borderRadius: 10, minWidth: 22, height: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 10, padding: '0 4px',
              position: 'relative', zIndex: 1,
            }}
          >{b}</motion.span>
        ) : null;
      })()}

      {/* Live dot */}
      {item.live && (
        <span className="live-dot" style={{ color: C.red, fontSize: 10, marginRight: 10, position: 'relative', zIndex: 1 }}>●</span>
      )}
    </motion.div>
  );
}
