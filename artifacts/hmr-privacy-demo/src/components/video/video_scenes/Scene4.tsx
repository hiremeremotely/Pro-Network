import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 11000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 bg-black/40 z-[-1]" />
      
      <div className="text-center z-10 px-8">
        <motion.h2
          className="text-[5vw] font-bold tracking-tight"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          The <span className="text-gradient">Network</span>
        </motion.h2>
        
        <motion.p
          className="text-[2vw] text-white/80 mt-6 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Conversations, connections, and hires happening in real-time.
        </motion.p>
      </div>
      
      {/* Floating Network Nodes (CSS/Framer) as an overlay on top of video bg */}
      {phase >= 1 && Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]"
          initial={{ 
            opacity: 0, 
            x: `${50 + (Math.random() * 40 - 20)}vw`, 
            y: `${50 + (Math.random() * 40 - 20)}vh` 
          }}
          animate={{
            opacity: [0, 1, 0.5, 1],
            x: `${Math.random() * 100}vw`,
            y: `${Math.random() * 100}vh`
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </motion.div>
  );
}
