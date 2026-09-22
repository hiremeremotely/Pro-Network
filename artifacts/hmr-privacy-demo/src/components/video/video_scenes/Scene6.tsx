import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text
      setTimeout(() => setPhase(2), 1500), // Action panel appears
      setTimeout(() => setPhase(3), 3500), // Click approve
      setTimeout(() => setPhase(4), 4000), // Identity unblurs
      setTimeout(() => setPhase(5), 7000), // Exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-24"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[12vh] w-full text-center z-30">
        <motion.h2
          className="text-[4vw] font-bold tracking-tight drop-shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          You hold the <span className="text-gradient">keys</span>.
        </motion.h2>
      </div>

      <div className="mt-[15vh] w-[60vw] bg-[var(--color-bg-light)] rounded-2xl border border-white/20 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Approve effect overlay */}
        <motion.div 
          className="absolute inset-0 bg-success/20 z-0 pointer-events-none mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: [0, 0.5, 0] } : { opacity: 0 }}
          transition={{ duration: 1.5 }}
        />

        <div className="relative z-10 flex justify-between items-center mb-8">
          <div>
            <div className="text-[1.5vw] font-bold text-white mb-2">Acme Corp</div>
            <div className="text-[1.2vw] text-white/60">Requested access to your full profile</div>
          </div>
          
          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ type: "spring" }}
          >
            <div className="px-6 py-3 rounded-xl border border-white/20 text-white/60 font-bold text-[1.1vw]">
              Decline
            </div>
            <motion.div 
              className="px-6 py-3 rounded-xl bg-success text-white font-bold text-[1.1vw] flex items-center gap-2 overflow-hidden relative"
              animate={phase >= 3 ? { scale: 0.95 } : { scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              {phase >= 4 && (
                <motion.div 
                  className="absolute inset-0 bg-white/30"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                />
              )}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </motion.div>
          </motion.div>
        </div>

        <div className="border-t border-white/10 pt-8 flex gap-6 items-center">
          <motion.div 
            className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 relative"
            animate={phase >= 4 ? { borderColor: '#10B981' } : {}}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)]"
              initial={{ filter: 'blur(15px)' }}
              animate={phase >= 4 ? { filter: 'blur(0px)' } : { filter: 'blur(15px)' }}
              transition={{ duration: 1 }}
            />
          </motion.div>
          <div>
            <motion.div 
              className="h-8 bg-white/20 rounded mb-3 w-48 relative overflow-hidden"
              initial={{ opacity: 1 }}
              animate={phase >= 4 ? { opacity: 0 } : { opacity: 1 }}
            />
            {phase >= 4 && (
              <motion.div 
                className="text-[1.8vw] font-bold text-white absolute -mt-[44px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Alex Designer
              </motion.div>
            )}
            <div className="text-[1.2vw] text-white/60">Identity unlocked for Acme Corp</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
