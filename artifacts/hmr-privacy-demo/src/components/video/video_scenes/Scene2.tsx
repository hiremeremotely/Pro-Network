import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const CHIPS = [
  { label: 'GitHub', color: '#333333', start: { x: '-30vw', y: '-20vh' } },
  { label: 'Behance', color: '#1769ff', start: { x: '30vw', y: '-15vh' } },
  { label: 'Framer', color: '#0055FF', start: { x: '-25vw', y: '20vh' } },
  { label: 'Portfolio', color: '#5B50E8', start: { x: '25vw', y: '25vh' } },
];

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text in
      setTimeout(() => setPhase(2), 1200), // Chips appear
      setTimeout(() => setPhase(3), 2500), // Chips converge
      setTimeout(() => setPhase(4), 5000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute top-[15vh] text-center w-full">
        <motion.h2
          className="text-[4vw] font-bold text-white tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Bring your best work <span className="text-gradient">together</span>.
        </motion.h2>
      </div>

      <div className="relative w-[60vw] h-[40vh] mt-[10vh] flex items-center justify-center">
        {/* Central Hub */}
        <motion.div
          className="absolute w-32 h-32 rounded-3xl bg-[var(--color-bg-light)] border border-white/20 shadow-[0_0_50px_var(--color-primary)] flex items-center justify-center z-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
        >
          <img src={`${import.meta.env.BASE_URL}logo-transparent.png`} className="w-16 brightness-0 invert opacity-50" />
        </motion.div>

        {/* Source Chips */}
        {CHIPS.map((chip, i) => (
          <motion.div
            key={chip.label}
            className="absolute px-6 py-3 rounded-full text-white text-[1.5vw] font-medium shadow-xl border border-white/10 z-30"
            style={{ backgroundColor: chip.color }}
            initial={{ x: chip.start.x, y: chip.start.y, opacity: 0, scale: 0 }}
            animate={
              phase === 2 ? { x: chip.start.x, y: chip.start.y, opacity: 1, scale: 1 } :
              phase >= 3 ? { x: 0, y: 0, opacity: 0, scale: 0.5 } :
              { x: chip.start.x, y: chip.start.y, opacity: 0, scale: 0 }
            }
            transition={{ 
              type: 'spring', 
              stiffness: phase === 2 ? 150 : 80, 
              damping: phase === 2 ? 15 : 20,
              delay: phase === 2 ? i * 0.1 : i * 0.05
            }}
          >
            {chip.label}
          </motion.div>
        ))}

        {/* Pulse effect on merge */}
        {phase >= 3 && (
          <motion.div
            className="absolute w-32 h-32 rounded-3xl border-2 border-[var(--color-accent)] z-10"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          />
        )}
      </div>
    </motion.div>
  );
}
