// Video Template - Replace ReplitLoadingScene with your scenes

import { useEffect } from 'react';
import {
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { SceneOne } from './video_scenes/SceneOne';
import { SceneTwo } from './video_scenes/SceneTwo';
import { SceneThree } from './video_scenes/SceneThree';
import { SceneFour } from './video_scenes/SceneFour';

export const SCENE_DURATIONS = {
  intro: 6000,
  links: 11000,
  manual: 13000,
  finish: 10000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';
const SCENES = [SceneOne, SceneTwo, SceneThree, SceneFour];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseKey = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENES[Object.keys(SCENE_DURATIONS).indexOf(baseKey)];
  useEffect(() => { onSceneChange?.(currentSceneKey); }, [currentSceneKey, onSceneChange]);

  return (
    <VideoCanvas
      aspectRatio={VIDEO_ASPECT_RATIO}
      style={{ backgroundColor: 'var(--color-bg-light)' }}
    >
      <AnimatePresence mode="sync">
        {Scene && <Scene key={currentSceneKey} />}
      </AnimatePresence>
    </VideoCanvas>
  );
}
