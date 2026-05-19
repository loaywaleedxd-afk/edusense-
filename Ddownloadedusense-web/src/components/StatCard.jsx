import { motion } from 'framer-motion';

const ACCENTS = {
  blue:   ['#3b82f6','#06b6d4'],
  green:  ['#10b981','#34d399'],
  amber:  ['#f59e0b','#ef4444'],
  purple: ['#8b5cf6','#ec4899'],
  red:    ['#ef4444','#f97316'],
  cyan:   ['#06b6d4','#3b82f6'],
};

const DIM_MAP = {
  blue: 'blue_dim', green: 'green_dim', amber: 'amber_dim',
  red: 'red_dim', purple: 'purple_dim', cyan: 'blue_dim',
};

export default function StatCard({ theme: C, label, value, sub, icon, accent = 'blue' }) {
  const [c1, c2] = ACCENTS[accent] || ACCENTS.blue;
  const dimKey   = DIM_MAP[accent] || 'bg3';
  const dimColor = C[dimKey] || C.bg3;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.18)` }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: 'hidden', flex: 1, minWidth: 0, cursor: 'default',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: c1, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 80, height: 4, background: c2 }} />
      </div>

      <div style={{ padding: '16px 20px 18px' }}>
        {/* Icon bubble */}
        {icon && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
            style={{
              width: 40, height: 40, borderRadius: 10, background: dimColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 6,
            }}
          >{icon}</motion.div>
        )}

        {/* Label */}
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 2, marginTop: icon ? 4 : 0 }}>{label}</div>

        {/* Value */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ fontSize: 32, fontWeight: 700, color: c1, lineHeight: 1.1 }}
        >{value}</motion.div>

        {/* Sub */}
        {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}
