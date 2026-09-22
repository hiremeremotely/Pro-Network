import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene8() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-[var(--color-primary)] mix-blend-multiply opacity-50 z-0" />
      
      <motion.img 
        src={`${import.meta.env.BASE_URL}logo-transparent.png`}
        alt="Logo"
        className="w-32 h-auto mb-8 drop-shadow-2xl brightness-0 invert z-10"
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: 20, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />
      
      <motion.h1
        className="text-[4vw] font-bold text-white tracking-tight z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        Hire Me Remotely
      </motion.h1>
      <motion.p
        className="text-[1.5vw] text-white/70 mt-4 z-10 font-medium tracking-wide uppercase"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Join free. Start today.
      </motion.p>
    </motion.div>
  );
}
