'use client';
import type { CSSProperties } from 'react';
import { Check, Fingerprint, Play, ArrowUpRight } from 'lucide-react';
import { HitsLogo, PROGRAMS, ProgramLogo } from './Brand';
import { SEQUENCE_SECONDS } from './useLaunch';
import TechBackground from './TechBackground';

export function phaseAt(elapsed: number) {
  return elapsed < 3 ? 'verify' : elapsed < 7 ? 'assemble' : elapsed < 12 ? 'charge' : elapsed < 17 ? 'countdown' : 'burst';
}

export default function LaunchSequence({ elapsed, placeholder, bypassUrl }: { elapsed: number; placeholder: boolean; bypassUrl: string }) {
  const phase = phaseAt(elapsed);
  const reveal = elapsed >= 18.5;
  const videoTime = elapsed >= SEQUENCE_SECONDS;
  const countdown = Math.max(1, Math.ceil(17 - elapsed));
  return <section className={`cinematic phase-${phase} ${reveal ? 'logo-revealed' : ''} ${videoTime ? 'is-placeholder' : ''}`} aria-label="HITS launch sequence">
    <div className="cinematic-grid" aria-hidden="true"/>
    <TechBackground cinematic/>
    {!videoTime && <div className={`launch-effects effects-${phase}`} aria-hidden="true">
      <div className="launch-iris"><i/><i/><i/></div>
      <div className="launch-rails">{Array.from({length:8},(_,i)=><i key={i} style={{'--rail-angle':`${i*45}deg`,'--rail-delay':`${i*-.4}s`} as CSSProperties}/>)}</div>
      <div className="launch-gate" key={`gate-${phase}`}><i/><i/></div>
      {phase==='burst'&&<div className="launch-fragments">{Array.from({length:18},(_,i)=><i key={i} style={{'--fragment-angle':`${i*20}deg`,'--fragment-distance':`${32+i%4*8}vmin`,'--fragment-delay':`${i%3*.07}s`} as CSSProperties}/>)}</div>}
      <div className="launch-side-meter left"><i/><i/><i/><i/><i/></div><div className="launch-side-meter right"><i/><i/><i/><i/><i/></div>
    </div>}
    {!videoTime && <div className={`phase-handoff handoff-${phase}`} key={`handoff-${phase}`} aria-hidden="true"><i/><i/><span>{phase==='verify'?'AUTHORISING':phase==='assemble'?'CONNECTING':phase==='charge'?'SYNCHRONISING':phase==='countdown'?'IGNITION ARMED':'HITS ONLINE'}</span></div>}
    {!videoTime && <div className="cinematic-scene launch-light-core" aria-hidden="true"><i/><i/><HitsLogo/></div>}
    <div className="cinematic-vignette" aria-hidden="true"/>
    {(phase==='charge'||phase==='countdown')&&!videoTime&&<div className="programme-constellation" aria-label="Five HITS programmes connected">{PROGRAMS.map((p,i)=><div className={`programme-satellite satellite-${i}`} key={p.name} style={{'--arrival':`${i*.12}s`} as CSSProperties}><ProgramLogo index={i}/><span>{p.name}</span><i/></div>)}</div>}
    {!videoTime&&<div className="sequence-progress-track" aria-hidden="true"><i style={{width:`${Math.min(100,elapsed/SEQUENCE_SECONDS*100)}%`}}/></div>}
    <div className="cinematic-topline"><span>HITS / UTHM</span><span>{videoTime ? 'THE NEXT CHAPTER IS HERE' : 'OFFICIAL LAUNCH SEQUENCE'}</span><span>{String(Math.min(SEQUENCE_SECONDS,Math.floor(elapsed))).padStart(2,'0')} / {SEQUENCE_SECONDS}</span></div>
    {phase === 'verify' && <div className="cinematic-copy verification-copy" key="verify">
      <HitsLogo className="verification-brand"/><div className="scan-fingerprint"><Fingerprint strokeWidth={.7}/><i/></div><span className="eyebrow">IDENTITY VERIFIED</span><h2>Access <em>granted.</em></h2>
      <div className="verification-steps"><span><Check size={13}/> CORE CHARGED</span><span><Check size={13}/> VIP AUTHORISED</span><span><Check size={13}/> FUTURE UNLOCKED</span></div>
    </div>}
    {phase === 'assemble' && <div className="cinematic-copy assembly-copy" key="assemble"><span className="eyebrow">FIVE PLATFORMS. ONE VISION.</span><h2>Everything.<br/><em>Coming together.</em></h2><div className="assembly-logo-line">{PROGRAMS.map((p,i) => <div className="assembly-logo" key={p.name} style={{'--arrival':`${i*.23}s`} as CSSProperties}><span className="assembly-index">0{i+1} / {p.signal}</span><ProgramLogo index={i}/><strong>{p.name}</strong><i/></div>)}</div></div>}
    {phase === 'charge' && <div className="cinematic-copy charge-copy" key="charge"><span className="eyebrow">COLLECTIVE ENERGY SYNCHRONISED</span><h2>Beyond<br/><em>possibility.</em></h2><div className="charge-readout"><span>IGNITION ENERGY</span><strong>{Math.min(100,Math.floor((elapsed-7)/5*100)).toString().padStart(3,'0')}<small>%</small></strong><div><i style={{width:`${Math.min(100,(elapsed-7)/5*100)}%`}}/></div></div></div>}
    {phase === 'countdown' && <div className="cinematic-copy countdown-copy" key="countdown"><span className="eyebrow">A NEW CHAPTER BEGINS IN</span><div className="countdown-orbit" key={countdown}><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="142"/></svg><strong>{String(countdown).padStart(2,'0')}</strong></div><p>THINK. CREATE. TRANSFORM.</p></div>}
    {phase === 'burst' && <><div className="ignition-wave" aria-hidden="true"/><div className="ignition-flare" aria-hidden="true"/></>}
    {reveal && <div className={`cinematic-copy reveal-copy ${videoTime ? 'holding' : ''}`} key="reveal">
      {videoTime && placeholder && <span className="video-placeholder-label"><Play size={12}/> CONTINUITY VIDEO PLACEHOLDER</span>}
      <span className="eyebrow">HUSSEIN INNOVATION & TALENT SYMPOSIUM</span><HitsLogo className="reveal-logo"/>
      <h2>The future.<br/><em>Starts with us.</em></h2><div className="reveal-signature"><span/><b>OFFICIALLY LAUNCHED</b><span/></div>
      <div className="reveal-logo-line">{PROGRAMS.map((p,i)=><div key={p.name} style={{'--arrival':`${.2+i*.12}s`} as CSSProperties}><ProgramLogo index={i}/><span>{p.name}</span></div>)}</div>
      {videoTime && placeholder && <a className="sequence-return" href={bypassUrl}>Back to bypass controls <ArrowUpRight size={13}/></a>}
    </div>}
    {!videoTime && <div className="sequence-timeline">{['AUTHORISE','ASSEMBLE','ENERGISE','COUNTDOWN','IGNITE'].map((step,i) => <span key={step} className={['verify','assemble','charge','countdown','burst'].indexOf(phase)>=i?'complete':''}><i/>{step}</span>)}</div>}
  </section>;
}
