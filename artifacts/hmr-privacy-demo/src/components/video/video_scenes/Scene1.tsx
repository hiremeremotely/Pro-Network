import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 2500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.img 
        src={`${import.meta.env.BASE_URL}logo-transparent.png`}
        alt="Logo"
        className="w-32 h-auto mb-8 brightness-0 invert"
        initial={{ y: 50, opacity: 0, scale: 0.8 }}
        animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: 50, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />
      
      <div className="overflow-hidden">
        <motion.h1 
          className="text-[4vw] font-bold text-white text-center tracking-tight leading-tight"
          initial={{ y: "100%" }}
          animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          Remote jobs. <br/>
          <span className="text-gradient">Real connections.</span> <br/>
          One ecosystem.
        </motion.h1>
      </div>
    </motion.div>
  );
}
