'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, AudioLines, Check, ChevronRight, Copy, Expand, Fingerprint, KeyRound, LockKeyhole, Pause, Play, Radio, RotateCcw, ShieldCheck, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react';
import QRCode from 'qrcode';
import Core from './Core';

type State={epoch:string;quota:number;total:number;audience:number;boost?:number;paused:boolean;phase:string;code?:string;launchedAt:number|null;videoUrl:string;activated:boolean;operator:boolean;serverTime:number;configured:boolean};
type View='stage'|'audience'|'control';
const programs=[{name:'IUIC',title:'International Undergraduate Innovation Competition',file:'IUIC.png'},{name:'HDSC',title:'Hussein Digital Skills Competition',file:'HDSC.png'},{name:'Suara Cendekia',title:'Suara Cendekia',file:'SUARACENDEKIA.png'},{name:'SUTERA',title:'SUTERA',file:'SUTERA.png'},{name:'UI Festival',title:'UI Festival',file:'UIFEST26.png'}];
export default function LaunchExperience({view}:{view:View}) {
  const [state,setState]=useState<State|null>(null);
  const [online,setOnline]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [origin,setOrigin]=useState('');
  const [qr,setQr]=useState('');
  const [login,setLogin]=useState(false);
  const [key,setKey]=useState('');
  const [code,setCode]=useState('');
  const [quota,setQuota]=useState('100');
  const [videoUrl,setVideoUrl]=useState('');
  const [focus,setFocus]=useState(false);
  const [reset,setReset]=useState(false);
  const [sound,setSound]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [videoBlocked,setVideoBlocked]=useState(false);
  const [videoError,setVideoError]=useState(false);
  const [videoEnded,setVideoEnded]=useState(false);
  const video=useRef<HTMLVideoElement>(null);
  const audio=useRef<AudioContext|null>(null);
  const offset=useRef(0);
  const epoch=useRef('');
  const settingsLoaded=useRef(false);
  const inFlight=useRef(false);
  const requestVersion=useRef(0);
  useEffect(()=>{
    if(!login&&!reset)return;
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')||[]);
    focusable()[0]?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setLogin(false);setReset(false);}
      if(e.key==='Tab'){
        const nodes=focusable(),first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);previous?.focus()};
  },[login,reset]);
  const sync=useCallback((data:State)=>{
    if(epoch.current!==data.epoch){setCode('');setVideoBlocked(false);setVideoError(false);setVideoEnded(false);epoch.current=data.epoch;}
    offset.current=data.serverTime-Date.now();setState(data);setOnline(true);
    if(!settingsLoaded.current){setQuota(String(data.quota));setVideoUrl(data.videoUrl);settingsLoaded.current=true;}
  },[]);
  useEffect(()=>{
    setOrigin(window.location.origin);
    QRCode.toDataURL(`${window.location.origin}/activate`,{width:240,margin:2,errorCorrectionLevel:'M',color:{dark:'#15102b',light:'#ffffff'}}).then(setQr).catch(()=>setNotice('Open the audience link to join.'));
    let stopped=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      if(!inFlight.current){
        const version=requestVersion.current;
        try{const r=await fetch('/api/event',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error();const data=await r.json() as State;if(!stopped&&version===requestVersion.current)sync(data);}
        catch{if(!stopped)setOnline(false);}
      }
      if(!stopped)timer=setTimeout(poll,view==='audience'?3000:1200);
    };void poll();return()=>{stopped=true;clearTimeout(timer)};
  },[sync,view]);
  async function action(action:string,extra:Record<string,unknown>={}) {
    if(inFlight.current)return false;
    inFlight.current=true;requestVersion.current++;setBusy(true);setError('');setNotice('');
    try{
      const r=await fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(12000)});
      const result=await r.json() as State & {error?:string};if(!r.ok)throw new Error(result.error||'Please try again.');
      if(result.epoch)sync(result);else{const next=await fetch('/api/event',{cache:'no-store'});if(!next.ok)throw new Error('Please reconnect.');sync(await next.json() as State);}
      return true;
    }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please try again.');return false;}
    finally{inFlight.current=false;setBusy(false);}
  }
  useEffect(()=>{
    if(state?.phase!=='launching'||!state.launchedAt){setElapsed(0);return;}
    const launchedAt=state.launchedAt;
    const update=()=>setElapsed(Math.max(0,(Date.now()+offset.current-launchedAt)/1000));update();
    const timer=setInterval(update,80);return()=>clearInterval(timer);
  },[state?.phase,state?.launchedAt]);
  const inVideo=state?.phase==='launching'&&elapsed>=10;
  useEffect(()=>{
    if(inVideo&&state?.videoUrl&&view==='stage'&&video.current){
      const v=video.current;v.play().then(()=>setVideoBlocked(false)).catch(()=>setVideoBlocked(true));
    }
  },[inVideo,state?.videoUrl,view]);
  useEffect(()=>{
    if(state?.phase!=='launching'||!sound||!audio.current)return;
    const ctx=audio.current;const oscillator=ctx.createOscillator();const gain=ctx.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(90,ctx.currentTime);oscillator.frequency.exponentialRampToValueAtTime(500,ctx.currentTime+3);
    gain.gain.setValueAtTime(.01,ctx.currentTime);gain.gain.linearRampToValueAtTime(.12,ctx.currentTime+1);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+4);
    oscillator.connect(gain).connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+4);
    return()=>{try{oscillator.stop()}catch{}};
  },[state?.phase,sound]);
  const progress=state?Math.min(1,state.total/state.quota):0;
  const ready=state?.phase==='ready';
  const launching=state?.phase==='launching';
  const audienceUrl=`${origin}/activate`;
  async function enableSound(){
    if(!sound){audio.current ||= new AudioContext();await audio.current.resume();}
    setSound(!sound);
  }
  async function fullscreen(){
    setFocus(!focus);
    try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{setNotice('Focus mode enabled. Use your browser fullscreen shortcut if needed.');}
  }
  async function launch(e:React.FormEvent){
    e.preventDefault();if(audio.current)await audio.current.resume();
    // Prime media from the VIP's click so the handoff can retain audio playback permission.
    if(video.current&&state?.videoUrl){try{await video.current.play();video.current.pause();video.current.currentTime=0;}catch{}}
    await action('launch',{code});
  }
  return <main className={`experience view-${view} ${focus?'focus-mode':''} ${launching&&view==='stage'?'sequence-active':''}`}>
    <div className="ambient-grid" aria-hidden="true"/>
    <header className="header">
      <a className="wordmark" href="/" aria-label="HITS × IUIC home"><span className="brand-symbol"><i/><i/><i/></span><span>HITS <b>×</b> IUIC<small>UNIVERSITI TUN HUSSEIN ONN MALAYSIA</small></span></a>
      <nav aria-label="Experience views"><a className={view==='stage'?'active':''} href="/">The launch</a><a className={view==='audience'?'active':''} href="/activate">Participate <ArrowUpRight size={13}/></a><a className={view==='control'?'active':''} href="/control" aria-label="Organiser control"><ShieldCheck size={16}/><span className="control-nav-text">Control room</span></a></nav>
      <span className={`connection ${online?'connected':''}`}><i/>{online?'LIVE CONNECTION':state?'RECONNECTING':'CONNECTING'}</span>
    </header>
    {view==='stage'&&<>
      <div className="event-strap"><span>HUSSEIN INNOVATION & TALENT SYMPOSIUM</span><span className="strap-right">FIVE PLATFORMS. ONE EXTRAORDINARY FUTURE.</span></div>
      <section className="stage-layout">
        <div className="stage-copy"><div className="eyebrow"><span className="tiny-line"/> THE OFFICIAL LAUNCH</div>
          <h1>{ready?<>The future<br/>is <em>unlocked.</em></>:<>Ignite the<br/><em>extraordinary.</em></>}</h1>
          <p>{ready?'The energy is here. The moment is yours. Enter the access code to launch a new chapter.':'A room full of ideas. A future without limits. Together, we bring it to life.'}</p>
          <div className="live-pill"><Radio size={14}/>{state?.paused?'ACTIVATIONS PAUSED':ready?'CORE FULLY CHARGED':'WAITING FOR YOUR ENERGY'}<span/></div>
          <div className="stage-steps"><span className="done">01 <b>Connect</b></span><ChevronRight size={13}/><span className={ready?'done':''}>02 <b>Activate</b></span><ChevronRight size={13}/><span>03 <b>Ignite</b></span></div>
        </div>
        <div className="reactor-area"><div className="reactor-coordinate coord-top">COLLECTIVE ENERGY CORE <span>01 / HITS</span></div><Core progress={progress}/><div className="core-label"><span className="core-dot"/>{ready?'IGNITION READY':'EVERY CONNECTION COUNTS'}</div><span className="reactor-side-label">THINK · CREATE · TRANSFORM</span></div>
        <aside className={`join-panel ${ready?'ready-panel':''}`}>
          <span className="panel-index">{ready?'02 / AUTHORISE':'01 / CONNECT'}</span>
          {ready?<><div className="panel-icon"><KeyRound size={22}/></div><h2>Your moment<br/>to ignite.</h2><p>VIP access code</p><div className="revealed-code" aria-label={`Access code ${state?.code}`}>{state?.code}</div>
            <form onSubmit={launch}><label htmlFor="vip-code">ENTER ACCESS CODE</label><input id="vip-code" className="code-input" inputMode="numeric" pattern="[0-9]{6}" autoComplete="off" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000" required/><button className="button primary" disabled={busy||!online||!state?.operator||code.length!==6}>Ignite the launch <ArrowRight size={16}/></button></form>
            {!state?.operator&&<button className="text-button" onClick={()=>setLogin(true)}>Prepare stage to enable launch <KeyRound size={12}/></button>}
          </>:<><h2>Be part of<br/>the beginning.</h2><p>Scan. Connect. Activate.</p><div className="qr-frame">{qr?<img src={qr} alt="Scan this QR code to join the launch"/>:<span>Preparing QR…</span>}<i className="qr-corner tl"/><i className="qr-corner br"/></div><a className="join-link" href="/activate" target="_blank" rel="noreferrer">Join the launch <ArrowUpRight size={15}/></a><div className="one-tap"><Fingerprint size={16}/><span>One tap. One spark.<br/><b>A future powered by you.</b></span></div></>}
        </aside>
      </section>
      <section className="energy-panel" aria-label="Audience activation progress"><div className="energy-meta"><div className="eyebrow"><Zap size={15}/> {ready?'ENERGY TARGET REACHED':'POWERING THE NEXT CHAPTER'}</div><span>{ready?'AWAITING VIP AUTHORISATION':state?.paused?'ON STANDBY':'AUDIENCE ACTIVATION IN PROGRESS'}</span></div><div className="energy-content"><strong key={state?.total}>{state?.total.toLocaleString()??'—'}<small> / {state?.quota.toLocaleString()??'100'}</small></strong><div className="energy-track-block"><div className="energy-track" role="progressbar" aria-label="Launch energy" aria-valuenow={state?.total||0} aria-valuemin={0} aria-valuemax={state?.quota||100}><div style={{width:`${progress*100}%`}}/></div><div className="track-labels"><span>COLLECTIVE ENERGY</span><span>{Math.floor(progress*100)}% CHARGED</span></div></div><div className="energy-caption"><span className="pulse-star">✦</span><span>{ready?'The next chapter awaits.':'Every activation brings'}<br/><b>{ready?'Let’s make it extraordinary.':'us closer to the extraordinary.'}</b></span></div></div></section>
      <ProgramStrip/>
      <footer className="stage-footer"><span>INNOVATION MEETS POSSIBILITY.</span><div><button onClick={enableSound} aria-label={sound?'Mute launch audio':'Enable launch audio'}>{sound?<Volume2 size={14}/>:<VolumeX size={14}/>}<span>{sound?'Sound on':'Sound off'}</span></button><button onClick={fullscreen}><Expand size={14}/><span>{focus?'Exit focus':'Focus mode'}</span></button><button onClick={()=>state?.operator?setNotice('Stage is armed. The VIP can launch when the core is charged.'):setLogin(true)}><span className={state?.operator?'armed-dot':'unarmed-dot'}/>{state?.operator?'Stage armed':'Prepare stage'}</button></div></footer>
    </>}
    {view==='audience'&&<section className="audience-layout"><div className="eyebrow"><Sparkles size={14}/> YOUR ENERGY. OUR FUTURE.</div><h1>{state?.activated?<>You are<br/><em>the spark.</em></>:launching?<>A new chapter.<br/><em>Starts now.</em></>:<>Great things<br/><em>start with you.</em></>}</h1><p>{state?.activated?'Your activation is part of something extraordinary. Keep your eyes on the main screen.':launching?'You helped bring this moment to life. Watch the main screen for the official launch.':'Join the room. Charge the core. Help launch the next chapter of HITS × IUIC.'}</p><div className="audience-core"><Core progress={progress}/></div><button className={`activate-button ${state?.activated?'activated':''}`} disabled={busy||!online||!state||state.activated||state.paused||state.phase!=='collecting'} onClick={()=>action('activate')}><span>{state?.activated?<Check size={31}/>:<Fingerprint size={34}/>}</span>{busy?'Connecting your spark…':state?.activated?'You’re activated':launching?'The future is here':ready?'Core fully charged':state?.paused?'Standing by':'Activate the future'}{!state?.activated&&<ArrowRight size={19}/>}</button><div className="audience-progress"><span><b>{state?.total??'—'}</b> / {state?.quota??100} activations</span><span>{Math.floor(progress*100)}%</span><div><i style={{width:`${progress*100}%`}}/></div></div><small className="audience-note">{state?.activated?'ONE SPARK. LASTING POSSIBILITIES.':'ONE ACTIVATION PER BROWSER · NO SIGN-UP NEEDED'}</small><a className="audience-stage-link" href="/">View the main screen <ArrowUpRight size={13}/></a><div className="mobile-programs">IUIC <i/> HDSC <i/> SUARA CENDEKIA <i/> SUTERA <i/> UI FESTIVAL</div></section>}
    {view==='control'&&<section className="control-layout"><div className="control-heading"><div><div className="eyebrow"><ShieldCheck size={15}/> ORGANISER ACCESS</div><h1>Behind the <em>moment.</em></h1><p>The room sets the energy. You set the pace.</p></div><a href="/" className="button secondary" target="_blank" rel="noreferrer">Open stage <ArrowUpRight size={16}/></a></div>
      {!state?.operator?<div className="control-login"><div className="panel-icon"><LockKeyhole size={27}/></div><h2>Welcome to the control room.</h2><p>Enter your organiser key to manage the live launch.</p><form onSubmit={async e=>{e.preventDefault();if(await action('login',{key})){setKey('');setNotice('Control room connected.');}}}><label htmlFor="control-key">ORGANISER KEY</label><input id="control-key" type="password" value={key} onChange={e=>setKey(e.target.value)} required placeholder="Your private organiser key" autoComplete="current-password"/><button disabled={busy||!online} className="button primary">Enter control room <ArrowRight size={16}/></button></form><small>Use the private key in your project’s CONTROL-ACCESS.txt.</small></div>:<>
        <div className="control-stats"><div><span>LAUNCH STATUS</span><strong className="stat-status"><i/>{launching?'Sequence running':ready?'Ready to ignite':state.paused?'Paused':'Collecting energy'}</strong></div><div><span>AUDIENCE ACTIVATIONS</span><strong>{state.audience}</strong></div><div><span>ORGANISER BOOST</span><strong>+{state.boost??0}</strong></div><div><span>ENERGY TARGET</span><strong>{state.total}<small> / {state.quota}</small></strong></div></div>
        <div className="control-grid"><section className="control-card"><div className="card-title"><Zap size={19}/><h2>Keep the energy moving.</h2></div><p>Add a controlled boost if the room needs a little help.</p><div className="control-meter"><i style={{width:`${progress*100}%`}}/></div><div className="boost-buttons">{[1,5,10,25].map(n=><button key={n} disabled={busy||launching||ready||!online} onClick={()=>action('boost',{value:n})}>+{n}<Zap size={13}/></button>)}</div><div className="control-actions"><button className="button secondary" disabled={busy||launching||!online} onClick={()=>action('pause')}>{state.paused?<Play size={15}/>:<Pause size={15}/>} {state.paused?'Resume audience':'Pause audience'}</button><button className="button primary" disabled={busy||launching||ready||!online} onClick={()=>action('unlock')}>Complete charge <ArrowRight size={16}/></button></div><small>Boosts are capped at the target. The VIP still enters the launch code.</small>{ready&&<div className="control-code">VIP ACCESS CODE <strong>{state.code}</strong></div>}</section>
        <section className="control-card"><div className="card-title"><Radio size={19}/><h2>Launch settings.</h2></div><form onSubmit={async e=>{e.preventDefault();if(await action('settings',{value:Number(quota),videoUrl}))setNotice('Launch settings saved.');}}><label htmlFor="quota">ACTIVATION TARGET</label><input id="quota" type="number" min="1" max="100000" value={quota} onChange={e=>setQuota(e.target.value)} required disabled={launching}/><label htmlFor="video">CONTINUITY VIDEO</label><input id="video" type="text" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="HTTPS video link, or leave empty" disabled={launching}/><small>Leave empty for the cinematic placeholder. Use a direct MP4 link for the final video.</small><button className="button secondary" disabled={busy||launching||!online}>Save settings <Check size={15}/></button></form></section>
        <section className="control-card"><div className="card-title"><ArrowUpRight size={19}/><h2>Connect the room.</h2></div><p>Share this audience link or display the QR on stage.</p><div className="copy-field"><span>{audienceUrl}</span><button aria-label="Copy audience link" onClick={async()=>{try{await navigator.clipboard.writeText(audienceUrl);setNotice('Audience link copied.');}catch{setNotice(`Audience link: ${audienceUrl}`);}}}><Copy size={16}/></button></div><div className="run-checklist"><span><Check size={14}/> Prepare the stage computer with your organiser key</span><span><Check size={14}/> Enable sound and enter fullscreen on stage</span><span><Check size={14}/> Test the video and venue internet before doors open</span></div></section>
        <section className="control-card rehearsal-card"><div className="card-title"><RotateCcw size={19}/><h2>Ready for another rehearsal?</h2></div><p>Reset energy and generate a fresh code. Audience browsers can activate again.</p><button className="button danger" disabled={busy||!online} onClick={()=>setReset(true)}>Reset the experience <RotateCcw size={15}/></button><button className="text-button" disabled={busy} onClick={()=>action('logout')}>Lock control room <LockKeyhole size={13}/></button></section></div>
      </>}
    </section>}
    {!online&&state&&<div className="offline-banner" role="status"><Radio size={14}/> Connection interrupted · Reconnecting automatically</div>}
    {!online&&!state&&<div className="loading-status" role="status">Connecting to the launch…</div>}
    {(error||notice)&&<div className={`toast ${error?'toast-error':''}`} role={error?'alert':'status'}><span>{error||notice}</span><button aria-label="Dismiss notification" onClick={()=>{setError('');setNotice('')}}><X size={16}/></button></div>}
    {login&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="login-title" className="modal"><button className="modal-close" aria-label="Close" onClick={()=>setLogin(false)}><X size={19}/></button><div className="panel-icon"><ShieldCheck size={25}/></div><h2 id="login-title">Prepare the stage.</h2><p>Authorise this computer so the VIP can trigger the launch. Use your private organiser key.</p><form onSubmit={async e=>{e.preventDefault();if(await action('login',{key})){setLogin(false);setKey('');setNotice('Stage armed. Ready for your moment.');}}}><label htmlFor="stage-key">ORGANISER KEY</label><input autoFocus id="stage-key" type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="current-password" required/><button className="button primary" disabled={busy||!online}>Arm the stage <ShieldCheck size={16}/></button></form></section></div>}
    {reset&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="modal"><h2 id="reset-title">Start a fresh rehearsal?</h2><p>This clears every activation and boost, stops the launch, and generates a new VIP code. Your target and video settings are kept.</p><div className="control-actions"><button className="button secondary" onClick={()=>setReset(false)}>Keep this session</button><button className="button danger" disabled={busy} onClick={async()=>{if(await action('reset')){setReset(false);setNotice('New rehearsal ready.');}}}>Reset now</button></div></section></div>}
    {launching&&view==='stage'&&<div className={`launch-overlay ${inVideo?'video-phase':''}`}>
      {!inVideo?<><div className="sequence-orbit"><Core progress={1} ignition/></div><div className="sequence-copy"><span className="eyebrow">{elapsed<3?'AUTHORISATION CONFIRMED':elapsed<6?'CONNECTING IDEAS. UNLOCKING POSSIBILITIES.':'THE NEXT CHAPTER BEGINS IN'}</span><h2 key={elapsed<3?'verified':elapsed<6?'ignite':Math.ceil(10-elapsed)}>{elapsed<3?'Access granted.':elapsed<6?'Igniting the future.':String(Math.max(1,Math.ceil(10-elapsed))).padStart(2,'0')}</h2><div className="sequence-line"/></div></>:state.videoUrl?<><video ref={video} className="continuity-video" src={state.videoUrl} playsInline preload="auto" onEnded={()=>setVideoEnded(true)} onError={()=>setVideoError(true)} controls={videoBlocked||videoError}/>{videoBlocked&&!videoError&&<button className="button primary video-recovery" onClick={()=>video.current?.play().then(()=>setVideoBlocked(false)).catch(()=>setError('Playback needs another click or a supported video file.'))}><Play size={20}/> Play continuity video</button>}{videoError&&<div className="video-message"><h2>The video could not load.</h2><p>Check the video link in the control room.</p><a href="/control" className="button secondary">Open control room</a></div>}{videoEnded&&<div className="video-message"><div className="eyebrow">THE NEXT CHAPTER IS HERE</div><h2>HITS <em>×</em> IUIC</h2><p>Innovation. Talent. Infinite possibilities.</p></div>}</>:<div className="video-placeholder"><span className="placeholder-label"><Play size={12}/> CONTINUITY VIDEO PLACEHOLDER</span><div className="eyebrow">OFFICIALLY LAUNCHED</div><h2>HITS <em>×</em> IUIC</h2><p>Innovation. Talent.<br/><span>Infinite possibilities.</span></p><div className="placeholder-line"/><span className="placeholder-university">UNIVERSITI TUN HUSSEIN ONN MALAYSIA</span><div className="placeholder-programs">{programs.map(p=><span key={p.name}>{p.name}</span>)}</div><a href="/control" className="placeholder-control">Back to control room <ArrowUpRight size={13}/></a></div>}
      {!inVideo&&state.videoUrl&&<video ref={video} className="preload-video" src={state.videoUrl} playsInline preload="auto"/>}
    </div>}
    {!launching&&view==='stage'&&state?.videoUrl&&<video ref={video} className="preload-video" src={state.videoUrl} playsInline preload="auto"/>}
  </main>;
}
function ProgramStrip(){return <section className="program-strip" aria-label="HITS programmes"><div className="program-label"><img src="/logos/HITS.png" alt="Hussein Innovation & Talent Symposium"/><strong>One symposium.<br/>Five possibilities.</strong></div><div className="program-logos">{programs.map((p,i)=><div className="program" key={p.name}><span className={`program-logo logo-${i}`}><img src={`/logos/${p.file}`} alt={p.title}/></span><span>{p.name}</span></div>)}</div><span className="uthm-label">ROOTED IN TALENT.<br/><b>DRIVEN BY INNOVATION.</b></span></section>}

