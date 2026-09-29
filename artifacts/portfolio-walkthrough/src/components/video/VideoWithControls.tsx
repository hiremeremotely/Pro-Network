import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  intro: { title: 'Portfolio overview', filePath: 'src/components/video/video_scenes/SceneOne.tsx' },
  links: { title: 'Build from links', filePath: 'src/components/video/video_scenes/SceneTwo.tsx' },
  manual: { title: 'Add manually', filePath: 'src/components/video/video_scenes/SceneThree.tsx' },
  finish: { title: 'Privacy and finish', filePath: 'src/components/video/video_scenes/SceneFour.tsx' },
};

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;
  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: {
      sceneIndex: index,
      sceneCount: sceneKeys.length,
      sceneTitle: details.title || key,
      filePath: details.filePath,
      lineNumber: 1,
    },
  }, '*');
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const {
    sceneKeys, activeIndex, locked, paused, mountKey, tick,
    durations, activeDuration, activeStartTime, totalDuration,
    onSceneChange, jumpTo, toggleLock, togglePause,
  } = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);

  useEffect(() => {
    if (!paused) return;
    const running = document.getAnimations().filter((animation) => animation.playState === 'running');
    running.forEach((animation) => animation.pause());
    return () => running.forEach((animation) => animation.play());
  }, [paused]);

  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      if (!current) {
        setHovering(false);
        setTapPinned(false);
      }
      return !current;
    });
  }, []);
  const handleToggleMute = useCallback(() => {
    if (audioBlocked && !muted) {
      const audio = document.querySelector<HTMLAudioElement>('[data-walkthrough-audio]');
      if (audio) {
        audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      }
      return;
    }
    setMuted((current) => !current);
  }, [audioBlocked, muted]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const handleOutsideTap = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', handleOutsideTap);
    return () => document.removeEventListener('pointerdown', handleOutsideTap);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        paused={paused}
        muted={muted}
        onSceneChange={onSceneChange}
        onAudioBlocked={setAudioBlocked}
      />
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="w-full flex-1" aria-hidden="true" />
        {audioBlocked && (
          <div className="mx-auto mb-2 rounded-md bg-black/70 px-3 py-1 text-xs text-white/90" role="status">
            Audio was blocked by the browser. Select the speaker to start the music.
          </div>
        )}
        <ControlBar
          visible={!collapsed || hovering || tapPinned}
          collapsed={collapsed}
          locked={locked}
          paused={paused}
          muted={muted}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          activeStartTime={activeStartTime}
          totalDuration={totalDuration}
          tick={tick}
          onTogglePause={togglePause}
          onToggleLock={toggleLock}
          onToggleMute={handleToggleMute}
          onJumpTo={handleJumpTo}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </div>
    </div>
  );
}

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  paused: boolean;
  muted: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  onTogglePause: () => void;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}

function ControlBar({
  visible, collapsed, locked, paused, muted, sceneKeys, activeIndex, activeDuration,
  activeStartTime, totalDuration, tick, onTogglePause, onToggleLock, onToggleMute,
  onJumpTo, onToggleCollapsed,
}: ControlBarProps) {
  return (
    <div
      className={`flex items-center gap-3 bg-black/60 px-5 py-3 backdrop-blur-sm transition-all duration-200 ease-out ${
        visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button" onClick={onTogglePause} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={paused ? 'Play' : 'Pause'} aria-label={paused ? 'Play' : 'Pause'}
      >
        {paused ? <Play className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
      </button>
      <button
        type="button" onClick={onToggleLock}
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg transition-colors ${locked ? 'bg-white/15 text-white hover:bg-white/25' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
        title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-pressed={locked}
      >
        <Repeat className="h-8 w-8" />
      </button>
      <button
        type="button" onClick={onToggleMute}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={muted ? 'Unmute music' : 'Mute music'} aria-label={muted ? 'Unmute music' : 'Mute music'} aria-pressed={muted}
      >
        {muted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
      </button>
      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />
      <PlaybackStatus
        sceneKeys={sceneKeys} activeIndex={activeIndex} activeDuration={activeDuration}
        activeStartTime={activeStartTime} totalDuration={totalDuration} tick={tick}
        paused={paused} onJumpTo={onJumpTo}
      />
      <button
        type="button" onClick={onToggleCollapsed}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className="h-10 w-10" /> : <ChevronDown className="h-10 w-10" />}
      </button>
    </div>
  );
}

function PlaybackStatus({
  sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration, tick, paused, onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - startedAt);
    }, 60);
    return () => {
      window.clearInterval(timer);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [tick, paused]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));

  return (
    <>
      <div className="flex flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => {
          const isActive = index === activeIndex;
          const fill = isActive ? progress * 100 : 0;
          const title = SCENE_DETAILS[key]?.title ?? `Scene ${index + 1}`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onJumpTo(index)}
              className="relative h-3 min-h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/25"
              aria-label={`Jump to ${title}`}
              aria-current={isActive ? 'true' : undefined}
              title={title}
            >
              <span className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100" style={{ width: `${fill}%` }} />
            </button>
          );
        })}
      </div>
      <div className="shrink-0 font-mono text-xl tabular-nums text-white/60" aria-label={`Scene ${activeIndex + 1} of ${sceneKeys.length}`}>
        {activeIndex + 1}/{sceneKeys.length}
      </div>
      <div
        className="min-w-[11ch] shrink-0 text-right font-mono text-xl tabular-nums text-white/80"
        role="timer"
        aria-label={`Playback time ${formatPlaybackTime(totalElapsed)} of ${formatPlaybackTime(totalDuration)}`}
      >
        {formatPlaybackTime(totalElapsed)} / {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

function formatPlaybackTime(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}