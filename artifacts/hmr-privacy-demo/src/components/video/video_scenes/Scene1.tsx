import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300), // Logo scale down, text 1 in
      setTimeout(() => setPhase(2), 1200), // Text 2 in
      setTimeout(() => setPhase(3), 3200), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <motion.img 
        src={`${import.meta.env.BASE_URL}logo-transparent.png`}
        alt="Logo"
        className="absolute brightness-0 invert"
        initial={{ y: 0, opacity: 0, scale: 0.5, width: '30vw' }}
        animate={
          phase === 0 ? { y: 0, opacity: 1, scale: 1, width: '30vw' } :
          phase >= 1 ? { y: '-40vh', opacity: 1, scale: 0.5, width: '15vw' } : {}
        }
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      />
      
      <div className="flex flex-col items-center mt-[10vh]">
        <div className="overflow-hidden">
          <motion.h1 
            className="text-[4.5vw] font-bold text-white text-center tracking-tight leading-tight"
            initial={{ y: "100%", opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            Your work, your terms.
          </motion.h1>
        </div>
        <div className="overflow-hidden mt-4">
          <motion.p 
            className="text-[2.5vw] text-white/70 text-center font-medium"
            initial={{ y: "100%", opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <span className="text-gradient">Privacy-first</span> remote hiring.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
