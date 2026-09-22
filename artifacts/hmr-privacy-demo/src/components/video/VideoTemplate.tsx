import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';

export const SCENE_DURATIONS = {
  hook: 4000,
  consolidate: 6000,
  control: 6000,
  discovery: 8000,
  request: 8000,
  approval: 8000,
  connection: 6000,
  closing: 4000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1,
  consolidate: Scene2,
  control: Scene3,
  discovery: Scene4,
  request: Scene5,
  approval: Scene6,
  connection: Scene7,
  closing: Scene8,
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
      className="w-full h-[100vh] overflow-hidden relative bg-[var(--color-bg-dark)] font-body"
    >
      {/* Persistent Background Video Loop */}
      <div className="absolute inset-0 z-0">
        <video 
          src={`${import.meta.env.BASE_URL}network-bg.mp4`}
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-20 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)]/90 to-[var(--color-bg-muted)]/80" />
      </div>

      {/* Persistent Midground Layers */}
      <motion.div
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] pointer-events-none z-0 opacity-30"
        style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
        animate={{
          x: safeIndex % 2 === 0 ? '-10vw' : '30vw',
          y: safeIndex > 3 ? '20vh' : '-20vh',
          scale: safeIndex === 7 ? 1.5 : 1,
          opacity: safeIndex === 7 ? 0.5 : 0.3,
        }}
        transition={{ duration: 4, ease: 'easeInOut' }}
      />
      
      {/* Grid overlay for tech feel */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }} 
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </motion.div>
  );
}
