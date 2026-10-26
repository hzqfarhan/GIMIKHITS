'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

type WaitingMusicProps = { active: boolean; enabled: boolean; epoch?: string; volume?: number; src?: string };
const WAITING_TRACK = '/media/the-final-ascent.mp3';

export default function WaitingMusic({ active, enabled, epoch, volume = .25, src = WAITING_TRACK }: WaitingMusicProps) {
  const source = src || WAITING_TRACK;
  return active && enabled ? <WaitingMusicPlayer key={`${epoch ?? ''}:${source}`} volume={volume} src={source}/> : null;
}

function WaitingMusicPlayer({ volume, src }: { volume: number; src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const volumeInitialized = useRef(false);
  const [issue, setIssue] = useState<'blocked' | 'unavailable' | null>(null);
  const retry = useRef<(() => void) | null>(null);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    const target = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
    if (!volumeInitialized.current || document.hidden) {
      player.volume = target;
      volumeInitialized.current = true;
      return;
    }
    const initial = player.volume;
    if (initial === target) return;
    let frame = 0;
    const started = performance.now();
    const fade = (now: number) => {
      const progress = Math.min(1, (now - started) / 180);
      player.volume = initial + (target - initial) * progress;
      if (progress < 1) frame = requestAnimationFrame(fade);
    };
    frame = requestAnimationFrame(fade);
    return () => cancelAnimationFrame(frame);
  }, [volume]);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    // Restore the source if development Strict Mode replays this effect.
    player.src = src;
    let disposed = false;
    let starting = false;

    function removeGestureListeners() {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
    }

    function addGestureListeners() {
      document.addEventListener('pointerdown', start);
      document.addEventListener('keydown', start);
    }

    function unavailable() {
      if (disposed) return;
      setIssue('unavailable');
      removeGestureListeners();
    }

    const start = () => {
      if (disposed || starting) return;
      if (player.error) player.load();
      starting = true;
      void player.play().then(() => {
        // Cleanup already stopped this node; a late result has no side effects.
        if (disposed) return;
        setIssue(null);
        removeGestureListeners();
      }).catch((error: unknown) => {
        if (disposed) return;
        if ((error as { name?: string } | null)?.name === 'NotAllowedError') {
          setIssue('blocked');
          addGestureListeners();
        }
        else unavailable();
      }).finally(() => { starting = false; });
    };

    retry.current = start;
    addGestureListeners();
    player.addEventListener('error', unavailable);
    start();

    return () => {
      disposed = true;
      removeGestureListeners();
      player.removeEventListener('error', unavailable);
      if (retry.current === start) retry.current = null;
      player.pause();
      player.currentTime = 0;
      player.removeAttribute('src');
      player.load();
    };
  }, [src]);

  return <>
    <audio ref={audio} src={src} loop preload="auto" hidden aria-hidden="true"/>
    {issue && <div role="status" style={{ position: 'fixed', bottom: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 32px)' }}>
      {issue === 'unavailable' && <span>Waiting music could not load.</span>}
      <button type="button" className="button secondary" onClick={() => retry.current?.()} style={{ whiteSpace: 'nowrap' }}>
        <Play size={16}/> {issue === 'unavailable' ? 'Retry music' : 'Play waiting music'}
      </button>
    </div>}
  </>;
}
