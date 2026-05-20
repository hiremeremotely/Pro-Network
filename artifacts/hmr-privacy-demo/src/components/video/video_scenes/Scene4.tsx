import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, y: '10vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[80vw] max-w-5xl flex flex-col items-center">
        <motion.h2
          className="text-[3.5vw] font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Only the best reach you.
        </motion.h2>

        <motion.div
          className="w-full max-w-3xl bg-bg-muted/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, y: 40, rotateX: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 40, rotateX: 20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            initial={{ x: '-200%' }}
            animate={phase >= 3 ? { x: '300%' } : { x: '-200%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              HMR
            </div>
            <div>
              <div className="font-bold text-[1.2vw]">HMR Talent Team</div>
              <div className="text-text-secondary text-[0.9vw]">Intro for ACME Corp</div>
            </div>
          </div>

          <div className="space-y-4">
            <motion.div
              className="h-4 bg-white/10 rounded w-full"
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
            />
            <motion.div
              className="h-4 bg-white/10 rounded w-[85%]"
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
            <motion.div
              className="h-4 bg-white/10 rounded w-[60%]"
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}