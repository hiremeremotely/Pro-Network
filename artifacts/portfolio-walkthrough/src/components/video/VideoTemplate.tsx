// Video Template - Replace ReplitLoadingScene with your scenes

import { useEffect, useRef } from 'react';
import {
  VideoCanvas,
  VideoPausedContext,
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
const SCENE_START_SEC: Record<string, number> = (() => {
  const offsets: Record<string, number> = {};
  let elapsedMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    offsets[key] = elapsedMs / 1000;
    elapsedMs += duration;
  }
  return offsets;
})();
const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
  onAudioBlocked,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
  onAudioBlocked?: (blocked: boolean) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseKey = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENES[Object.keys(SCENE_DURATIONS).indexOf(baseKey)];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);
  useEffect(() => { onSceneChange?.(currentSceneKey); }, [currentSceneKey, onSceneChange]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) audio.currentTime = targetTime;
    }
    audio.play()
      .then(() => onAudioBlocked?.(false))
      .catch(() => onAudioBlocked?.(true));
  }, [currentSceneKey, baseKey, muted, paused, onAudioBlocked]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: 'var(--color-bg-light)' }}>
        <AnimatePresence mode="sync">
          {Scene && <Scene key={currentSceneKey} />}
        </AnimatePresence>
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
          data-walkthrough-audio
          style={{ display: 'none' }}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
