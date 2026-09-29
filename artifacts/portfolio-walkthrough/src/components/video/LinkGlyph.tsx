import { motion } from 'framer-motion';

export function LinkGlyph({ size = 120, color = '#a89dff', animated = false }: {
  size?: number | string;
  color?: string;
  animated?: boolean;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <motion.path
        d="M50 74 40 84a20 20 0 0 1-28-28l20-20a20 20 0 0 1 28 0"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0, opacity: 0.2 } : false}
        animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 1.15, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.path
        d="m70 46 10-10a20 20 0 0 1 28 28L88 84a20 20 0 0 1-28 0"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0, opacity: 0.2 } : false}
        animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 1.15, delay: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.path
        d="m43 77 34-34"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : false}
        animate={animated ? { pathLength: 1, opacity: 0.9 } : undefined}
        transition={{ duration: 0.5, delay: 0.88, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}