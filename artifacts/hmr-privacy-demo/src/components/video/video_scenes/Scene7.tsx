import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text
      setTimeout(() => setPhase(2), 1500), // Chat UI appears
      setTimeout(() => setPhase(3), 2200), // Msg 1
      setTimeout(() => setPhase(4), 3200), // Msg 2
      setTimeout(() => setPhase(5), 5000), // Exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-24"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="absolute top-[12vh] w-full text-center z-30">
        <motion.h2
          className="text-[3.5vw] font-bold tracking-tight drop-shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          We mediate the <span className="text-gradient">introduction</span>.
        </motion.h2>
      </div>

      <motion.div 
        className="mt-[15vh] w-[50vw] bg-[var(--color-bg-dark)] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 50 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
            AC
          </div>
          <div className="text-[1.2vw] font-bold text-white">Acme Corp</div>
        </div>

        <div className="p-6 space-y-6 flex-1 bg-gradient-to-b from-transparent to-white/5">
          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ type: "spring" }}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] mt-1 flex-shrink-0" />
            <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none text-[1.1vw] text-white/80 max-w-[80%]">
              Hi Alex, thanks for approving! We love your work on Behance. Are you available for a quick chat next week?
            </div>
          </motion.div>

          <motion.div 
            className="flex gap-4 flex-row-reverse"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ type: "spring" }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] mt-1 flex-shrink-0" />
            <div className="bg-[var(--color-primary)] p-4 rounded-2xl rounded-tr-none text-[1.1vw] text-white max-w-[80%] shadow-lg">
              Hi! Yes, I'm currently exploring new contracts. Happy to chat Tuesday.
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
