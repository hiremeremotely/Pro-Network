import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  open: 3500,
  build1: 4500,
  build2: 4500,
  build3: 4500,
  close: 3500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  build1: Scene2,
  build2: Scene3,
  build3: Scene4,
  close: Scene5,
};

const SCENE_KEY_ORDER = Object.keys(SCENE_DURATIONS);

const bgColors = [
  '#05050A',
  '#0B0A1A',
  '#1E1B4B',
  '#0B0A1A',
  '#4F46E5',
];

const lineLeft = ['10vw', '50vw', '80vw', '20vw', '50vw'];
const lineHeight = ['0vh', '100vh', '40vh', '80vh', '0vh'];
const lineTop = ['0vh', '0vh', '30vh', '10vh', '0vh'];

interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: VideoTemplateProps = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = SCENE_KEY_ORDER.indexOf(baseSceneKey);
  const safeIndex = sceneIndex >= 0 ? sceneIndex : 0;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <motion.div
      className="w-full h-screen overflow-hidden relative"
      animate={{ backgroundColor: bgColors[safeIndex] }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      {/* Persistent Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
          animate={{
            x: ['-20%', '40%', '-10%'],
            y: ['-10%', '30%', '-20%'],
            scale: [1, 1.2, 0.9],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-3xl right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
          animate={{
            x: ['10%', '-30%', '5%'],
            y: ['10%', '-40%', '0%'],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Persistent Midground Shape */}
      <motion.div
        className="absolute w-[1px] bg-white/20"
        animate={{
          left: lineLeft[safeIndex],
          height: lineHeight[safeIndex],
          top: lineTop[safeIndex],
          opacity: safeIndex === 4 ? 0 : 1,
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </motion.div>
  );
}
