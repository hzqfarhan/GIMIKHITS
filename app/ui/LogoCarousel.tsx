'use client';

import { useEffect, useState } from 'react';
import { HitsLogo, PROGRAMS, ProgramLogo } from './Brand';

const LOGO_INTERVAL_MS = 5000;

export default function LogoCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive(value => (value + 1) % (PROGRAMS.length + 1));
    }, LOGO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  return <div className="hero-logo-carousel" aria-label="HITS and its five programmes">
    <div className="hero-logo-window">
      <div className={`hero-logo-slide ${active === 0 ? 'is-current' : ''}`} aria-hidden={active !== 0}>
        <HitsLogo/>
      </div>
      {PROGRAMS.map((program, index) => <div key={program.name} className={`hero-logo-slide hero-program-${index} ${active === index + 1 ? 'is-current' : ''}`} aria-hidden={active !== index + 1}>
        <ProgramLogo index={index} className="carousel-program-mark"/>
      </div>)}
      <span key={active} className="hero-logo-interference" aria-hidden="true"/>
    </div>
    <div className="hero-logo-controls">
      <span>{active === 0 ? 'HITS' : PROGRAMS[active - 1].name}</span>
      <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume programme logo rotation' : 'Pause programme logo rotation'} aria-pressed={paused}>{paused ? 'PLAY' : 'PAUSE'}</button>
    </div>
  </div>;
}
