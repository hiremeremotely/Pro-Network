import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text
      setTimeout(() => setPhase(2), 1500), // Dashboard
      setTimeout(() => setPhase(3), 2500), // Redacted Card pops up
      setTimeout(() => setPhase(4), 7000), // Exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-24"
      initial={{ opacity: 0, y: '10vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: 'blur(10px)', x: '-10vw' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[12vh] w-full text-center z-30">
        <motion.h2
          className="text-[3.5vw] font-bold tracking-tight drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          They discover your <span className="text-gradient">skills</span>,<br />not your identity.
        </motion.h2>
      </div>

      <div className="w-[80vw] relative mt-[20vh] perspective-[1200px] flex items-center justify-center">
        {/* Background Dashboard */}
        <motion.div
          className="w-full relative"
          initial={{ opacity: 0, rotateX: 20, z: -200, y: 100 }}
          animate={phase >= 2 ? { opacity: 0.4, rotateX: 10, z: -100, y: 0 } : { opacity: 0, rotateX: 20, z: -200, y: 100 }}
          transition={{ type: "spring", stiffness: 100, damping: 25 }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}company-dashboard.png`} 
            className="w-full h-auto rounded-2xl shadow-2xl border border-white/10 grayscale"
          />
        </motion.div>

        {/* Foreground Redacted Profile */}
        <motion.div
          className="absolute z-40 bg-[var(--color-bg-dark)] border border-white/20 p-8 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] w-[45vw]"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, y: -20 } : { opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
        >
          <div className="flex items-center gap-6 border-b border-white/10 pb-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 backdrop-blur-xl bg-[var(--color-bg-dark)]/50" />
              <svg className="w-8 h-8 text-white/50 z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="h-6 w-48 bg-white/20 rounded mb-3 animate-pulse" />
              <div className="text-[1.2vw] text-white/60">Senior Frontend Engineer</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="text-[1vw] text-white/50 uppercase tracking-widest font-bold">Verified Skills</div>
            <div className="flex gap-3 flex-wrap">
              {['React', 'TypeScript', 'Framer Motion', 'WebGL', 'UI/UX'].map((skill, i) => (
                <motion.div 
                  key={skill}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-accent)] border border-[var(--color-primary)]/30 text-[1.1vw]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ delay: 2.5 + i * 0.1, type: "spring" }}
                >
                  {skill}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
