import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, x: '10vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-10vw', filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[80vw] max-w-4xl flex items-center justify-between">
        <div className="w-[45%]">
          <motion.h2
            className="text-[4vw] font-bold leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            No more <br/>cold DMs.
          </motion.h2>
          <motion.p
            className="text-[1.5vw] text-text-secondary mt-4"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            Companies can't message you out of the blue.
          </motion.p>
        </div>

        <div className="w-[45%] relative h-[30vh]">
          {/* Old Button */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/5 border border-white/10 rounded-lg px-8 py-4 flex items-center gap-3 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.8, y: '-50%' }}
            animate={
              phase >= 1 && phase < 3
                ? { opacity: 1, scale: 1, y: '-50%' }
                : phase >= 3
                ? { opacity: 0, scale: 0.8, y: '50%' }
                : { opacity: 0, scale: 0.8, y: '-50%' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <span className="text-white/50 text-[1.2vw] line-through">Message</span>
          </motion.div>

          {/* New Button */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-primary rounded-lg px-8 py-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
            initial={{ opacity: 0, scale: 0.8, y: '-150%' }}
            animate={
              phase >= 3
                ? { opacity: 1, scale: 1, y: '-50%' }
                : { opacity: 0, scale: 0.8, y: '-150%' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-white text-[1.2vw] font-medium">Express Interest</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}