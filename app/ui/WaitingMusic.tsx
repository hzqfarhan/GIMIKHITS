'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

type WaitingMusicProps = { active: boolean; enabled: boolean; epoch?: string };
const WAITING_TRACK = '/media/the-final-ascent.mp3';

export default function WaitingMusic({ active, enabled, epoch }: WaitingMusicProps) {
  return active && enabled ? <WaitingMusicPlayer key={epoch}/> : null;
}

function WaitingMusicPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const retry = useRef<(() => void) | null>(null);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    // Restore the source if development Strict Mode replays this effect.
    player.src = WAITING_TRACK;
    let disposed = false;
    let starting = false;

    function removeGestureListeners() {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
    }

    const start = () => {
      if (disposed || starting) return;
      starting = true;
      void player.play().then(() => {
        // Cleanup already stopped this node; a late result has no side effects.
        if (disposed) return;
        setBlocked(false);
        removeGestureListeners();
      }).catch(() => {
        if (!disposed) setBlocked(true);
      }).finally(() => { starting = false; });
    };

    retry.current = start;
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    start();

    return () => {
      disposed = true;
      removeGestureListeners();
      if (retry.current === start) retry.current = null;
      player.pause();
      player.currentTime = 0;
      player.removeAttribute('src');
      player.load();
    };
  }, []);

  return <>
    <audio ref={audio} src={WAITING_TRACK} loop preload="auto" hidden aria-hidden="true"/>
    {blocked && <button type="button" className="button secondary" onClick={() => retry.current?.()}
    style={{ position: 'fixed', bottom: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 50, whiteSpace: 'nowrap' }}>
    <Play size={16}/> Play waiting music
    </button>}
  </>;
}
