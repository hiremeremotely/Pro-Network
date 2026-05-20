import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3800),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[60vw] h-[40vh] flex items-center justify-center">
        {/* Company Node */}
        <motion.div
          className="absolute left-0 w-20 h-20 bg-white/10 rounded-full border border-white/20 flex items-center justify-center"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-xs text-white/50">Company</span>
        </motion.div>

        {/* HMR Node */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full border-2 border-primary flex items-center justify-center backdrop-blur-sm z-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-white font-bold text-xl">HMR</span>
        </motion.div>

        {/* Candidate Node */}
        <motion.div
          className="absolute right-0 w-20 h-20 bg-white/10 rounded-full border border-white/20 flex items-center justify-center"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-xs text-white/50">You</span>
        </motion.div>

        {/* Lines */}
        <motion.div
          className="absolute left-20 right-[50%] h-[2px] bg-gradient-to-r from-white/10 to-primary/50 top-1/2 -translate-y-1/2"
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: 'circOut' }}
        />

        {/* Scanning Effect in HMR Node */}
        {phase >= 4 && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-accent/50 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-[3vw] font-bold">We vet every request.</h2>
        <p className="text-[1.2vw] text-text-secondary mt-2 max-w-2xl mx-auto">
          We review the intent and craft a high-signal intro on the company's behalf.
        </p>
      </motion.div>
    </motion.div>
  );
}