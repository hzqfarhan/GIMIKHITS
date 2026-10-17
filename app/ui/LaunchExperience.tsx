'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, ArrowRight, Check, Copy, Delete, Expand, Fingerprint, LockKeyhole, Pause, Play, QrCode, Radio, RotateCcw, ShieldCheck, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { HitsLogo, ProgramStrip } from './Brand';
import LogoCarousel from './LogoCarousel';
import EnergyColumn from './EnergyColumn';
import { ThemeToggle } from './ThemeProvider';
import LaunchSequence, { phaseAt } from './LaunchSequence';
import TechBackground from './TechBackground';
import { LaunchAudio } from './LaunchAudio';
import { useLaunch, SEQUENCE_SECONDS, type LaunchView } from './useLaunch';
const Core = dynamic(() => import('./Core'), { ssr: false });
const PhonePreview = dynamic(() => import('./PhonePreview'), { ssr: false });
const BackgroundScene = dynamic(() => import('./BackgroundScene'), { ssr: false });

export default function LaunchExperience({ view }: { view: LaunchView }) {
  const { state, online, busy, error, setError, elapsed, progress, action, links } = useLaunch(view);
  const [notice, setNotice] = useState('');
  const [origin, setOrigin] = useState('');
  const [qr, setQr] = useState('');
  const [login, setLogin] = useState(false);
  const [key, setKey] = useState('');
  const [code, setCode] = useState('');
  const [quota, setQuota] = useState('100');
  const [videoUrl, setVideoUrl] = useState('');
  const [reset, setReset] = useState(false);
  const [sound, setSound] = useState(false);
  const [focus, setFocus] = useState(false);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const settingsLoaded = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<LaunchAudio | null>(null);
  const previousTotal = useRef<number|null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const ready = state?.phase === 'ready';
  const launching = state?.phase === 'launching';
  const inVideo = launching && elapsed >= SEQUENCE_SECONDS;
  const playbackUrl = state?.videoUrl || '/media/hits-placeholder.mp4';
  const audienceUrl = origin ? new URL(links.audience, origin).href : links.audience;
  const cue = launching ? elapsed >= SEQUENCE_SECONDS ? 'idle' : elapsed >= 12 && elapsed < 17 ? `countdown-${Math.ceil(17-elapsed)}` : phaseAt(elapsed) : ready ? 'ready' : 'idle';

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    if (view !== 'qr' || !origin) return;
    let cancelled = false;
    import('qrcode').then(module => module.default.toDataURL(audienceUrl, { width: 900, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#090812', light: '#ffffff' } }))
      .then(value => { if (!cancelled) setQr(value); }).catch(() => setError('QR could not load. Use the audience link below.'));
    return () => { cancelled = true; };
  }, [view, audienceUrl, origin, setError]);
  useEffect(() => {
    if (state && !settingsLoaded.current) { setQuota(String(state.quota)); setVideoUrl(state.videoUrl); settingsLoaded.current = true; }
  }, [state]);
  useEffect(() => {
    setCode(''); setVideoBlocked(false); setVideoError(false); setVideoEnded(false);
    audio.current?.stop();
    if (video.current) { video.current.pause(); video.current.currentTime = 0; }
  }, [state?.epoch]);
  useEffect(() => {
    setVideoBlocked(false); setVideoError(false); setVideoEnded(false);
  }, [state?.videoUrl]);
  useEffect(() => {
    if(inVideo)audio.current?.stop();
    if (!inVideo || view !== 'main') return;
    const player = video.current;
    if (player) { player.muted = false; void player.play().then(() => setVideoBlocked(false)).catch(() => setVideoBlocked(true)); }
  }, [inVideo, playbackUrl, view]);
  useEffect(() => {
    if (!login && !reset) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const nodes = () => Array.from(dialog?.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled),a[href]') || []);
    nodes()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setLogin(false); setReset(false); }
      if (event.key === 'Tab') {
        const list = nodes(), first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [login, reset]);
  useEffect(() => { if (sound && view === 'main' && cue !== 'idle') audio.current?.cue(cue); }, [cue, sound, view]);
  useEffect(()=>{const total=state?.total;if(total===undefined)return;if(sound&&view==='main'&&previousTotal.current!==null&&total>previousTotal.current&&!ready&&!launching)audio.current?.cue('activation');previousTotal.current=total;},[state?.total,sound,view,ready,launching]);
  useEffect(() => () => { audio.current?.close(); }, []);
  async function toggleSound() {
    try{if (!sound) { audio.current ??= new LaunchAudio(); await audio.current.enable(); audio.current.cue('tap'); }else audio.current?.mute();setSound(!sound);}catch{setError('Sound could not start. Check this browser’s audio settings.');}
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setNotice('Use your browser’s fullscreen option.'); }
  }
  async function launch() {
    if (!state?.operator) { setLogin(true); return; }
    if (video.current && video.current.readyState >= 2) {
      video.current.muted = true;
      await video.current.play().then(() => { video.current?.pause(); if (video.current) video.current.currentTime = 0; }).catch(() => {});
    }
    if (sound) audio.current?.cue('tap');
    await action('launch', { code });
  }
  function digit(value: string) {
    setCode(current => value === 'clear' ? '' : value === 'back' ? current.slice(0,-1) : (current + value).slice(0,6));
    setError(''); if (sound) audio.current?.cue('tap');
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Link copied.'); } catch { setNotice(value); }
  }
  const status = <span className={`connection ${online ? 'connected' : ''}`}><i/>{online ? 'LIVE CONNECTION' : 'CONNECTING'}</span>;
  const tools = <div className="stage-tools"><div>{view === 'main' && <button className={state?.operator ? 'armed' : ''} onClick={() => state?.operator ? setNotice('Stage authorised. The VIP can launch when the core is charged.') : setLogin(true)}><ShieldCheck size={14}/>{state?.operator ? 'Stage armed' : 'Prepare stage'}</button>}<span className="tool-divider"/>{status}</div><div><button onClick={toggleSound} aria-pressed={sound}>{sound ? <Volume2 size={15}/>:<VolumeX size={15}/>}Sound {sound?'on':'off'}</button><button onClick={()=>setFocus(!focus)} aria-pressed={focus}>{focus?'Show navigation':'Presentation mode'}</button><button onClick={fullscreen}><Expand size={15}/>Fullscreen</button></div></div>;

  return <main className={`experience view-${view} ${focus?'focus-mode':''} ${ready?'is-ready':''} ${launching?'is-launching':''}`}>
    <ThemeToggle/><div className="ambient-grid" aria-hidden="true"/><div className="ambient-glow" aria-hidden="true"/><TechBackground/>
    {(view==='audience'||view==='qr')&&<BackgroundScene/>}
    {view!=='qr'&&view!=='audience'&&<header className="site-header"><a className="brand-lockup" href={links.main} aria-label="HITS main stage"><HitsLogo/><span className="brand-divider"/><span>HUSSEIN INNOVATION<br/>& TALENT SYMPOSIUM</span></a><nav aria-label="Launch views">{(['main','qr','bypass','audience'] as const).map(item=><a key={item} href={links[item]} className={view===item?'active':''}>{item==='main'?'Main stage':item==='qr'?'QR screen':item==='bypass'?'Bypass':'Audience'}{item==='audience'&&<ArrowUpRight size={13}/>}</a>)}</nav><span className="header-edition">UTHM <i/> LIVE LAUNCH</span></header>}

    {view==='main'&&<>
      <section className={`stage-main ${ready?'stage-ready':''}`}>
        <div className="stage-coordinates" aria-hidden="true"><span>01 / COLLECTIVE ENERGY</span><span>INNOVATION HAS NO LIMITS</span></div>
        {!ready?<>
          <div className="stage-copy"><span className="eyebrow"><i/> THE OFFICIAL LAUNCH EXPERIENCE</span><LogoCarousel/><h1>Ideas become<br/><em>impact.</em></h1><p>A room full of possibility.<br/>One moment to bring it all to life.</p><a className="qr-link" href={links.qr}><span><QrCode size={20}/></span><div>SCAN. ACTIVATE. IGNITE.<small>Open the audience QR screen <ArrowUpRight size={13}/></small></div></a></div>
          <div className="reactor-stage"><div className="reactor-label top"><span>HITS ENERGY CORE</span><i/> SYSTEM ONLINE</div>{!launching&&<Core progress={progress} phase="idle" framing={1.22}/>}<EnergyColumn total={state?.total??0} quota={state?.quota??100} paused={state?.paused} loaded={!!state}/><div className="reactor-label bottom"><span>INNOVATION / TALENT / POSSIBILITIES</span><span className="reactor-bars">▁ ▃ ▅ ▂ ▆ ▄ ▁</span></div></div>
        </>:<>
          <div className="ready-story"><span className="eyebrow"><i/> ENERGY TARGET REACHED</span><HitsLogo className="ready-hits"/><h1>The future<br/>is <em>unlocked.</em></h1><p>The room has done its part.<br/>Now, the moment is yours.</p><div className="ready-code"><span>YOUR VIP ACCESS CODE</span><strong>{state?.code}</strong><small>Enter this code on the launch console.</small></div><div className="ready-reactor"><Core progress={1} phase="assemble"/></div></div>
          <section className="access-console" aria-labelledby="access-title"><div className="console-heading"><span className="console-icon"><Fingerprint size={28}/></span><div><span className="eyebrow">VIP AUTHORISATION</span><h2 id="access-title">Begin the extraordinary.</h2></div><span className="console-status"><i/> READY</span></div><form onSubmit={event=>{event.preventDefault();void launch();}}><label className="code-label" htmlFor="vip-code">ENTER THE SIX-DIGIT ACCESS CODE <span>{code.length} / 6</span></label><div className="code-entry" onClick={()=>codeInput.current?.focus()}><div className="digit-slots" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={`${code[i]?'filled':''} ${code.length===i?'current':''}`}>{code[i]||<i/>}</span>)}</div><input ref={codeInput} id="vip-code" aria-label="VIP access code" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></div><div className="keypad" aria-label="On-screen numeric keyboard">{['1','2','3','4','5','6','7','8','9','clear','0','back'].map(value=><button key={value} type="button" className={value.length>1?'key-function':''} aria-label={value==='back'?'Delete last digit':value==='clear'?'Clear code':value} onClick={()=>digit(value)} disabled={busy}>{value==='back'?<Delete size={24}/>:value==='clear'?'CLEAR':value}</button>)}</div><button className="launch-button" type="submit" disabled={busy||!online||code.length!==6}><span><Zap size={24}/>LAUNCH HITS</span><ArrowRight size={26}/></button><div className="console-foot"><LockKeyhole size={12}/>{state?.operator?'STAGE AUTHORISED · AWAITING YOUR COMMAND':'ORGANISER AUTHORISATION REQUIRED TO LAUNCH'}</div></form></section>
        </>}
      </section>
      <ProgramStrip/>{tools}
    </>}

    {view==='qr'&&<section className="qr-only qr-showcase"><div className="qr-top"><HitsLogo/><span className="qr-top-title">THE OFFICIAL HITS LAUNCH</span>{status}<button className="icon-button" onClick={fullscreen} aria-label="Fullscreen QR"><Expand size={20}/></button></div><div className="qr-showcase-grid"><div className="qr-invitation"><span className="eyebrow">YOUR PHONE. YOUR SPARK. OUR FUTURE.</span><h1>Be part of<br/><em>the ignition.</em></h1><p>A room full of ideas. One shared moment.<br/>Scan the code and bring HITS to life.</p><div className="qr-scanner-shell"><div className="qr-frame">{qr?<img src={qr} alt="Scan this QR code to open the HITS audience activation page"/>:<span>Preparing QR code…</span>}<i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/></div><div className="qr-scan-caption"><QrCode size={16}/><span>SCAN TO CONNECT</span><i/></div></div><a className="qr-readable" href={audienceUrl}>{audienceUrl.replace(/^https?:\/\//,'')} <ArrowUpRight size={14}/></a><div className="qr-steps"><span><b>01</b>SCAN THE CODE</span><i/><span><b>02</b>TAP ACTIVATE</span><i/><span><b>03</b>WATCH THE STAGE</span></div></div><div className="qr-phone-stage"><div className="phone-hud"><span>YOUR CONNECTION TO THE FUTURE</span><i/></div><PhonePreview progress={progress} total={state?.total??0} quota={state?.quota??100}/><div className="phone-ground"/><div className="qr-live-energy"><span><i/> LIVE COLLECTIVE ENERGY</span><strong>{state?.total??0}<small> / {state?.quota??100}</small></strong></div></div><EnergyColumn total={state?.total??0} quota={state?.quota??100} paused={state?.paused} loaded={!!state}/></div><div className="qr-bottom"><span>HUSSEIN INNOVATION & TALENT SYMPOSIUM · UTHM</span><a href={links.main}>Main stage <ArrowUpRight size={13}/></a></div></section>}

    {view==='audience'&&<section className={`audience-screen ${state?.activated?'has-activated':''}`}><div className="audience-top"><a href={links.main} aria-label="HITS main stage"><HitsLogo/></a>{status}</div><div className="audience-copy"><span className="eyebrow">YOU ARE PART OF WHAT COMES NEXT</span><h1>Your spark.<br/><em>Our future.</em></h1><p>{launching?'Look to the stage. This is our moment.':ready?'The core is charged. All eyes on the stage.':state?.activated?'Your energy is in. Together, we make it happen.':'A single touch. A collective moment.\nHelp us bring HITS to life.'}</p></div><div className="audience-core"><Core progress={progress} phase={launching?'burst':ready?'assemble':'idle'}/>{state?.activated&&<span className="spark-confirmed"><Check size={16}/> YOUR SPARK IS CONNECTED</span>}</div><button className={`activate-button ${state?.activated?'activated':''}`} disabled={busy||!online||!state||state.activated||state.paused||ready||launching} onClick={async()=>{if(await action('activate'))setNotice('Your spark has joined the HITS core.');}}>{state?.activated?<Check size={32}/>:<Fingerprint size={36}/>}<span>{launching?'HITS IS LAUNCHING':state?.activated?'YOU’RE CONNECTED':ready?'THE CORE IS CHARGED':state?.paused?'HOLD YOUR SPARK':busy?'CONNECTING…':'ACTIVATE'}<small>{state?.activated?'Thank you for being part of the moment':ready||launching?'Watch the main stage':'Touch to send your energy'}</small></span>{!state?.activated&&<ArrowRight size={24}/>}</button><div className="audience-meter"><div><span>OUR COLLECTIVE ENERGY</span><strong>{state?.total??0}<small> / {state?.quota??100}</small></strong></div><div className="smooth-meter"><i style={{width:`${progress*100}%`}}/></div></div><div className="audience-bottom">FIVE PLATFORMS. ONE EXTRAORDINARY FUTURE.<span>HITS × IUIC · UNIVERSITI TUN HUSSEIN ONN MALAYSIA</span></div></section>}

    {view==='bypass'&&<section className="control-room"><div className="control-heading"><div><span className="eyebrow">BEHIND THE MOMENT</span><h1>Bypass <em>control.</em></h1><p>Keep the room connected. Keep the launch on cue.</p></div>{status}</div>{!state?.operator?<div className="login-card"><div className="panel-icon"><ShieldCheck size={30}/></div><h2>Your backstage access.</h2><p>Enter the organiser key to manage the live experience.</p><form onSubmit={async event=>{event.preventDefault();if(await action('login',{key})){setKey('');setNotice('Bypass controls unlocked.');}}}><label htmlFor="control-key">ORGANISER KEY</label><input id="control-key" type="password" value={key} onChange={event=>setKey(event.target.value)} required placeholder="Your private organiser key" autoComplete="current-password"/><button disabled={busy||!online} className="button primary">Unlock controls <ArrowRight size={17}/></button></form><small>Find your private key in CONTROL-ACCESS.txt in the project folder.</small></div>:<><div className="control-stats"><div><span>EVENT STATUS</span><strong className="stat-status"><i/>{launching?'Sequence running':ready?'Ready to ignite':state.paused?'Paused':'Collecting energy'}</strong></div><div><span>AUDIENCE</span><strong>{state.audience}</strong></div><div><span>TEAM BOOST</span><strong>+{state.boost??0}</strong></div><div><span>TOTAL ENERGY</span><strong>{state.total}<small> / {state.quota}</small></strong></div></div><div className="control-grid"><section className="control-card"><div className="card-title"><Zap size={20}/><h2>Keep the energy moving.</h2></div><p>Add a boost when the room needs a little help.</p><div className="smooth-meter"><i style={{width:`${progress*100}%`}}/></div><div className="boost-buttons">{[1,5,10,25].map(value=><button key={value} disabled={busy||launching||ready||!online} onClick={()=>action('boost',{value})}>+{value}<Zap size={14}/></button>)}</div><div className="control-actions"><button className="button secondary" disabled={busy||launching||!online} onClick={()=>action('pause')}>{state.paused?<Play size={16}/>:<Pause size={16}/>} {state.paused?'Resume audience':'Pause audience'}</button><button className="button primary" disabled={busy||launching||ready||!online} onClick={()=>action('unlock')}>Complete charge <ArrowRight size={17}/></button></div><small>The VIP enters the code to begin the launch sequence.</small>{ready&&<div className="control-code">VIP ACCESS CODE<strong>{state.code}</strong></div>}</section><section className="control-card"><div className="card-title"><Radio size={20}/><h2>Set the moment.</h2></div><form onSubmit={async event=>{event.preventDefault();if(await action('settings',{value:Number(quota),videoUrl}))setNotice('Launch settings saved.');}}><label htmlFor="quota">ACTIVATION TARGET</label><input id="quota" type="number" min="1" max="100000" value={quota} onChange={event=>setQuota(event.target.value)} required disabled={launching}/><label htmlFor="video">CONTINUITY VIDEO</label><input id="video" type="text" value={videoUrl} onChange={event=>setVideoUrl(event.target.value)} placeholder="HTTPS video link, or leave empty" disabled={launching}/><small>Leave empty to play the 12-second HITS rehearsal video. Use a direct MP4 link for the final video.</small><button className="button secondary" disabled={busy||launching||!online}>Save settings <Check size={16}/></button></form></section><section className="control-card"><div className="card-title"><ArrowUpRight size={20}/><h2>Four screens. One moment.</h2></div><p>Open or copy the dedicated links for your event.</p><div className="screen-links">{(['main','qr','bypass','audience'] as const).map(item=><div key={item}><a href={links[item]}><span>{item==='qr'?'QR ONLY':item.toUpperCase()}</span><small>{origin?new URL(links[item],origin).href:links[item]}</small></a><button aria-label={`Copy ${item} link`} onClick={()=>copy(origin?new URL(links[item],origin).href:links[item])}><Copy size={16}/></button></div>)}</div></section><section className="control-card rehearsal-card"><div className="card-title"><RotateCcw size={20}/><h2>Another rehearsal?</h2></div><p>Start with fresh energy and a new code. Everyone can activate again.</p><button className="button danger" disabled={busy||!online} onClick={()=>setReset(true)}>Reset experience <RotateCcw size={16}/></button><button className="text-button" disabled={busy} onClick={()=>action('logout')}>Lock bypass controls <LockKeyhole size={14}/></button></section></div></>}</section>}

    {!online&&state&&<div className="offline-banner" role="status"><Radio size={14}/> Connection interrupted · Reconnecting automatically</div>}
    {!online&&!state&&<div className="loading-status" role="status">Connecting to the launch…</div>}
    {(error||notice)&&<div className={`toast ${error?'toast-error':''}`} role={error?'alert':'status'}><span>{error||notice}</span><button aria-label="Dismiss notification" onClick={()=>{setError('');setNotice('');}}><X size={17}/></button></div>}
    {login&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="login-title" className="modal"><button className="modal-close" aria-label="Close" onClick={()=>setLogin(false)}><X size={20}/></button><div className="panel-icon"><ShieldCheck size={28}/></div><h2 id="login-title">Prepare the stage.</h2><p>Authorise this computer with the organiser key. Then the VIP can enter the six-digit code.</p><form onSubmit={async event=>{event.preventDefault();if(await action('login',{key})){setLogin(false);setKey('');setNotice('Stage armed. Ready for your moment.');}}}><label htmlFor="stage-key">ORGANISER KEY</label><input id="stage-key" type="password" value={key} onChange={event=>setKey(event.target.value)} autoComplete="current-password" required/><button className="button primary" disabled={busy||!online}>Arm the stage <ShieldCheck size={17}/></button></form></section></div>}
    {reset&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="modal"><h2 id="reset-title">Start a fresh rehearsal?</h2><p>This clears the energy, stops the launch, and generates a new VIP code. Your target and video settings are kept.</p><div className="control-actions"><button className="button secondary" onClick={()=>setReset(false)}>Keep this session</button><button className="button danger" disabled={busy} onClick={async()=>{if(await action('reset')){setReset(false);setNotice('Fresh rehearsal ready.');}}}>Reset now</button></div></section></div>}
    {launching&&view==='main'&&<LaunchSequence elapsed={elapsed} placeholder={false} bypassUrl={links.bypass}/>}
    {launching&&view==='main'&&!inVideo&&<button className="cinematic-sound" onClick={toggleSound} aria-pressed={sound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}SOUND {sound?'ON':'OFF'}</button>}
    {view==='main'&&<div className={inVideo?'video-stage':'preload-video'} aria-hidden={!inVideo}><video ref={video} src={playbackUrl} playsInline preload="auto" onEnded={()=>setVideoEnded(true)} onError={()=>setVideoError(true)} controls={inVideo&&(videoBlocked||videoError)}/>{inVideo&&videoBlocked&&!videoError&&<button className="button primary video-recovery" onClick={()=>video.current?.play().then(()=>setVideoBlocked(false)).catch(()=>setError('Click play again or check the video link.'))}><Play size={22}/>Play continuity video</button>}{inVideo&&videoError&&<div className="video-message"><h2>The video could not load.</h2><p>Update the video link in bypass controls.</p><a href={links.bypass} className="button secondary">Open bypass controls</a></div>}{inVideo&&videoEnded&&<div className="video-message"><HitsLogo/><span className="eyebrow">OFFICIALLY LAUNCHED</span><h2>The future starts with us.</h2><a href={links.bypass} className="text-button">Back to bypass controls <ArrowUpRight size={14}/></a></div>}</div>}
  </main>;
}
