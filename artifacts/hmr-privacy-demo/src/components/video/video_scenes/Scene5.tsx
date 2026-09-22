import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text
      setTimeout(() => setPhase(2), 1500), // Card
      setTimeout(() => setPhase(3), 2500), // Fields stagger in
      setTimeout(() => setPhase(4), 4500), // Send button pulse
      setTimeout(() => setPhase(5), 7000), // Exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10 px-24"
      initial={{ opacity: 0, x: '10vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex w-full items-center justify-between gap-16">
        <div className="w-[45%]">
          <div className="overflow-hidden">
            <motion.h2
              className="text-[4vw] font-bold leading-tight drop-shadow-xl"
              initial={{ y: "100%" }}
              animate={phase >= 1 ? { y: 0 } : { y: "100%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              They send a <br/><span className="text-gradient">structured request</span>.
            </motion.h2>
          </div>
          <motion.p
            className="text-[1.8vw] text-white/70 mt-6"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            No cold outreach. No generic spam.<br/>Upfront context only.
          </motion.p>
        </div>

        <div className="w-[50%] perspective-[1200px]">
          <motion.div
            className="w-full relative"
            initial={{ opacity: 0, rotateY: 30, z: -100, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: -10, z: 0, x: 0 } : { opacity: 0, rotateY: 30, z: -100, x: 50 }}
            transition={{ type: "spring", stiffness: 120, damping: 25 }}
          >
            <img 
              src={`${import.meta.env.BASE_URL}job-card.png`} 
              className="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
            />
            
            {phase >= 4 && (
              <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-4 rounded-xl bg-[var(--color-primary)] shadow-[0_10px_30px_rgba(91,80,232,0.6)] text-white font-bold text-[1.2vw] flex items-center gap-3 border border-white/20"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                Request Sent
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
