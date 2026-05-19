/**
 * AnimatedPage — drop-in replacement for <div className="animate-in" key={page}>
 * Wraps page content with a smooth fade+slide transition on every page change.
 */
import { AnimatePresence, motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.13, ease: 'easeIn'  } },
};

export default function AnimatedPage({ pageKey, children, style }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
