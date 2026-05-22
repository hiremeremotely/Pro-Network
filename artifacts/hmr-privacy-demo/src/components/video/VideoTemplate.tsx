import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  hook: 3000,
  professionals: 15000,
  businesses: 15000,
  network: 12000,
  closing: 5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1,
  professionals: Scene2,
  businesses: Scene3,
  network: Scene4,
  closing: Scene5,
};

const SCENE_KEY_ORDER = Object.keys(SCENE_DURATIONS);

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
      className="w-full h-screen overflow-hidden relative bg-[var(--color-bg-dark)]"
    >
      {/* Persistent Background Video Loop */}
      <div className="absolute inset-0 z-0">
        <video 
          src={`${import.meta.env.BASE_URL}network-bg.mp4`}
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)]/90 to-[var(--color-bg-muted)]/80" />
      </div>

      {/* Persistent Midground Layers */}
      <motion.div
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] pointer-events-none z-0 opacity-30"
        style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
        animate={{
          x: ['-20%', '40%', '-10%'],
          y: ['-10%', '30%', '-20%'],
          scale: [1, 1.2, 0.9],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </motion.div>
  );
}
