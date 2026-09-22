import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const LAYERS = [
  { label: 'Public Portfolio', desc: 'Visible to anyone', color: 'border-white/20', text: 'text-white/50' },
  { label: 'HMR Network', desc: 'Verified businesses only', color: 'border-[var(--color-primary)]', text: 'text-[var(--color-accent)]' },
  { label: 'Private Vault', desc: 'Unlocked on request', color: 'border-success', text: 'text-success' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 2900),
      setTimeout(() => setPhase(5), 5000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[15vh] text-center w-full">
        <motion.h2
          className="text-[4vw] font-bold text-white tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Control who sees <span className="text-gradient">what</span>.
        </motion.h2>
      </div>

      <div className="relative w-[50vw] mt-[10vh] space-y-6">
        {LAYERS.map((layer, i) => {
          const isVisible = phase >= i + 2;
          return (
            <motion.div
              key={layer.label}
              className={`w-full bg-[var(--color-bg-light)]/50 backdrop-blur-md rounded-2xl border-2 p-6 flex justify-between items-center ${layer.color}`}
              initial={{ opacity: 0, x: -50 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              <div>
                <h3 className={`text-[2vw] font-bold ${layer.text}`}>{layer.label}</h3>
                <p className="text-[1.2vw] text-white/50">{layer.desc}</p>
              </div>
              <motion.div 
                className={`w-12 h-6 rounded-full p-1 flex items-center ${isVisible ? 'bg-[var(--color-primary)] justify-end' : 'bg-white/20 justify-start'}`}
                initial={false}
              >
                <motion.div 
                  className="w-4 h-4 rounded-full bg-white shadow-sm"
                  layout
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
