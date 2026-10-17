'use client';
import dynamic from 'next/dynamic';
import { Check, Fingerprint, Play, ArrowUpRight } from 'lucide-react';
import { HitsLogo, PROGRAMS } from './Brand';
import { SEQUENCE_SECONDS } from './useLaunch';
import TechBackground from './TechBackground';
const Core = dynamic(() => import('./Core'), { ssr: false });

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
    {!videoTime && <div className={`phase-handoff handoff-${phase}`} key={`handoff-${phase}`} aria-hidden="true"><i/><i/><span>{phase==='verify'?'AUTHORISING':phase==='assemble'?'CONNECTING':phase==='charge'?'SYNCHRONISING':phase==='countdown'?'IGNITION ARMED':'HITS ONLINE'}</span></div>}
    {!videoTime && <div className="cinematic-scene"><Core progress={1} ignition phase={phase} intensity={phase === 'charge' ? Math.min(1,.5+(elapsed - 7)/10) : undefined}/></div>}
    <div className="cinematic-vignette" aria-hidden="true"/>
    <div className="cinematic-topline"><span>HITS / UTHM</span><span>{videoTime ? 'THE NEXT CHAPTER IS HERE' : 'OFFICIAL LAUNCH SEQUENCE'}</span><span>{String(Math.min(SEQUENCE_SECONDS,Math.floor(elapsed))).padStart(2,'0')} / {SEQUENCE_SECONDS}</span></div>
    {phase === 'verify' && <div className="cinematic-copy verification-copy" key="verify">
      <div className="scan-fingerprint"><Fingerprint strokeWidth={.7}/><i/></div><span className="eyebrow">IDENTITY VERIFIED</span><h2>Access <em>granted.</em></h2>
      <div className="verification-steps"><span><Check size={13}/> CORE CHARGED</span><span><Check size={13}/> VIP AUTHORISED</span><span><Check size={13}/> FUTURE UNLOCKED</span></div>
    </div>}
    {phase === 'assemble' && <div className="cinematic-copy assembly-copy" key="assemble"><span className="eyebrow">FIVE PLATFORMS. ONE VISION.</span><h2>Everything.<br/><em>Coming together.</em></h2><div className="assembly-programs">{PROGRAMS.map((p,i) => <span key={p.name} style={{animationDelay:`${i*.2}s`}}>{p.name}</span>)}</div></div>}
    {phase === 'charge' && <div className="cinematic-copy charge-copy" key="charge"><span className="eyebrow">COLLECTIVE ENERGY SYNCHRONISED</span><h2>Beyond<br/><em>possibility.</em></h2><div className="charge-readout"><span>IGNITION ENERGY</span><strong>{Math.min(100,Math.floor((elapsed-7)/5*100)).toString().padStart(3,'0')}<small>%</small></strong><div><i style={{width:`${Math.min(100,(elapsed-7)/5*100)}%`}}/></div></div></div>}
    {phase === 'countdown' && <div className="cinematic-copy countdown-copy" key="countdown"><span className="eyebrow">A NEW CHAPTER BEGINS IN</span><div className="countdown-orbit" key={countdown}><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="142"/></svg><strong>{String(countdown).padStart(2,'0')}</strong></div><p>THINK. CREATE. TRANSFORM.</p></div>}
    {phase === 'burst' && <><div className="ignition-wave" aria-hidden="true"/><div className="ignition-flare" aria-hidden="true"/></>}
    {reveal && <div className={`cinematic-copy reveal-copy ${videoTime ? 'holding' : ''}`} key="reveal">
      {videoTime && placeholder && <span className="video-placeholder-label"><Play size={12}/> CONTINUITY VIDEO PLACEHOLDER</span>}
      <span className="eyebrow">HUSSEIN INNOVATION & TALENT SYMPOSIUM</span><HitsLogo className="reveal-logo"/>
      <h2>The future.<br/><em>Starts with us.</em></h2><div className="reveal-signature"><span/><b>OFFICIALLY LAUNCHED</b><span/></div>
      <div className="reveal-programs">{PROGRAMS.map(p=><span key={p.name}>{p.name}</span>)}</div>
      {videoTime && placeholder && <a className="sequence-return" href={bypassUrl}>Back to bypass controls <ArrowUpRight size={13}/></a>}
    </div>}
    {!videoTime && <div className="sequence-timeline">{['AUTHORISE','ASSEMBLE','ENERGISE','COUNTDOWN','IGNITE'].map((step,i) => <span key={step} className={['verify','assemble','charge','countdown','burst'].indexOf(phase)>=i?'complete':''}><i/>{step}</span>)}</div>}
  </section>;
}
