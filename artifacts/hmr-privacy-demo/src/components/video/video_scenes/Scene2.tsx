import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 6000),
      setTimeout(() => setPhase(4), 9000),
      setTimeout(() => setPhase(5), 14000), // exit begin
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10 px-24"
      initial={{ opacity: 0, x: '10vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-10vw', filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex w-full justify-between items-center gap-16">
        <div className="w-[45%]">
          <motion.div className="overflow-hidden">
            <motion.h2
              className="text-[4vw] font-bold leading-tight"
              initial={{ y: "100%" }}
              animate={phase >= 1 ? { y: 0 } : { y: "100%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              For <span className="text-gradient">Professionals</span>
            </motion.h2>
          </motion.div>
          
          <div className="mt-8 space-y-4">
            <motion.p
              className="text-[1.8vw] text-white/80"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
            >
              Browse remote jobs
            </motion.p>
            <motion.p
              className="text-[1.8vw] text-white/80"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
            >
              Build your public profile
            </motion.p>
            <motion.p
              className="text-[1.8vw] text-white/80"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
            >
              Connect with peers
            </motion.p>
          </div>
        </div>

        <div className="w-[50%] relative h-[60vh] perspective-[1000px]">
          <motion.img 
            src={`${import.meta.env.BASE_URL}job-card.png`}
            className="absolute right-[10%] top-[10%] w-[80%] rounded-xl shadow-2xl"
            initial={{ opacity: 0, rotateY: 30, z: -200, x: 100 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: -10, z: 0, x: 0 } : { opacity: 0, rotateY: 30, z: -200, x: 100 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          <motion.img 
            src={`${import.meta.env.BASE_URL}profile-card.png`}
            className="absolute left-[10%] bottom-[10%] w-[70%] rounded-xl shadow-2xl border border-white/10"
            initial={{ opacity: 0, rotateY: -30, z: -100, x: -50 }}
            animate={phase >= 3 ? { opacity: 1, rotateY: 5, z: 50, x: 0 } : { opacity: 0, rotateY: -30, z: -100, x: -50 }}
            transition={{ type: "spring", stiffness: 120, damping: 25 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
