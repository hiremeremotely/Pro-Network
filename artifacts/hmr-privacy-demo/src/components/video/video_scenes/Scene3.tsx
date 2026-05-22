import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 14000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-24"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full text-center mb-12">
        <motion.h2
          className="text-[4vw] font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          For <span className="text-gradient">Businesses</span>
        </motion.h2>
        <motion.p
          className="text-[1.5vw] text-white/70 mt-4"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Post jobs. Review applicants. Manage your company.
        </motion.p>
      </div>

      <motion.div 
        className="w-[70vw] relative perspective-[1200px]"
        initial={{ opacity: 0, rotateX: 20, y: 100 }}
        animate={phase >= 2 ? { opacity: 1, rotateX: 0, y: 0 } : { opacity: 0, rotateX: 20, y: 100 }}
        transition={{ type: "spring", stiffness: 100, damping: 25 }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}company-dashboard.png`} 
          className="w-full h-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10"
        />
        
        {/* Floating Accent Cards over Dashboard */}
        {phase >= 2 && (
          <motion.div 
            className="absolute -right-8 top-12 w-64 h-24 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, type: "spring" }}
          >
            <div className="w-8 h-8 rounded-full bg-success/20 mb-2" />
            <div className="h-2 w-3/4 bg-white/20 rounded mb-2" />
            <div className="h-2 w-1/2 bg-white/20 rounded" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
