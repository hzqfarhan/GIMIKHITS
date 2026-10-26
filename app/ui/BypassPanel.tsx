'use client';

import { ArrowRight, ArrowUpRight, Check, Copy, Music2, Pause, Play, QrCode, Radio, RotateCcw, Settings2, Zap } from 'lucide-react';
import type { AudioSettings } from '@/lib/audio-settings';
import type { EventState, LaunchLinks } from './useLaunch';
import AudioControls from './AudioControls';

type BypassPanelProps = {
  state: EventState | null;
  links: LaunchLinks;
  online: boolean;
  busy: boolean;
  boosting: boolean;
  launching: boolean;
  ready: boolean;
  displayTotal: number;
  quota: string;
  videoUrl: string;
  origin: string;
  audioSettings: AudioSettings;
  onBoost: (count: number) => Promise<void>;
  onCompleteCharge: () => Promise<void>;
  onTogglePause: () => void;
  onQuotaChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onSaveSettings: () => Promise<void>;
  onAudioSaved: (settings: AudioSettings) => void;
  onCopy: (value: string) => Promise<void>;
  onReset: () => void;
};

const screens = [
  { key: 'main', label: 'Main stage' },
  { key: 'qr', label: 'QR screen' },
  { key: 'bypass', label: 'Bypass' },
  { key: 'audience', label: 'Audience' },
] as const;

export default function BypassPanel({
  state, links, online, busy, boosting, launching, ready, displayTotal,
  quota, videoUrl, origin, audioSettings, onBoost, onCompleteCharge,
  onTogglePause, onQuotaChange, onVideoUrlChange, onSaveSettings,
  onAudioSaved, onCopy, onReset,
}: BypassPanelProps) {
  const target = state?.quota ?? 100;
  const progress = Math.min(1, Math.max(0, displayTotal / Math.max(1, target)));
  const percent = Math.floor(progress * 100);
  const eventStatus = launching ? 'Sequence running' : ready ? 'Ready to ignite' : state?.paused ? 'Paused' : 'Collecting energy';
  const energyDisabled = busy || boosting || launching || ready || !online;
  const connection = <span className={`connection ${online ? 'connected' : ''}`}><i/>{online ? 'LIVE CONNECTION' : 'CONNECTING'}</span>;

  return <>
    <header className="bypass-header">
      <a className="bypass-brand" href="https://seladevs.my" target="_blank" rel="noopener noreferrer" aria-label="Seladevs website">
        <span className="bypass-brand-mark">
          {/* Optimized from the official logo at seladevs.my. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/seladevs.webp" alt="" width={64} height={64}/>
        </span>
        <span className="bypass-brand-wordmark"><strong>SELADEVS</strong><small>LAUNCH CONTROL</small></span>
      </a>
      <div className="bypass-header-meta"><span>HITS · UTHM</span><span>LIVE LAUNCH</span></div>
    </header>

    <nav className="bypass-nav" aria-label="Event screens">
      {screens.map(({ key, label }) => <a key={key} href={links[key]} className={key === 'bypass' ? 'active' : ''} aria-current={key === 'bypass' ? 'page' : undefined}>
        {key === 'qr' && <QrCode size={15}/>}{label}{key !== 'bypass' && <ArrowUpRight size={13}/>}
      </a>)}
    </nav>

    <section className="control-room">
      <div className="bypass-heading">
        <div><span className="eyebrow">EVENT CONTROL</span><h1>Bypass <em>control.</em></h1><p>Keep the launch on cue.</p></div>
        {connection}
      </div>

      <section className="bypass-overview" aria-label="Live event overview">
        <div className="overview-heading"><span className="eyebrow">COLLECTIVE ENERGY</span><span className={`event-status-badge ${launching ? 'is-launching' : ready ? 'is-ready' : state?.paused ? 'is-paused' : ''}`}><i/>{eventStatus}</span></div>
        <div className="overview-progress">
          <div><span>TOTAL ENERGY</span><strong>{displayTotal}<small> / {target}</small></strong></div>
          <div className="overview-percent"><strong>{percent}<small>%</small></strong><span>OF TARGET</span></div>
        </div>
        <div className="smooth-meter overview-meter" role="progressbar" aria-label="Activation target" aria-valuemin={0} aria-valuemax={target} aria-valuenow={state ? Math.min(displayTotal, target) : undefined}><i style={{ width: `${progress * 100}%` }}/></div>
        <div className="bypass-metrics">
          <div><span>AUDIENCE</span><strong>{state?.audience ?? 0}</strong></div>
          <div><span>TEAM BOOST</span><strong>+{state?.boost ?? 0}</strong></div>
          <div><span>REMAINING</span><strong>{Math.max(0, target - displayTotal)}</strong></div>
        </div>
      </section>

      <div className="control-grid">
        <section id="energy-controls" className="control-card energy-controls" aria-labelledby="energy-controls-title">
          <span className="eyebrow">LIVE ENERGY</span>
          <div className="card-title"><Zap size={20}/><h2 id="energy-controls-title">Move the energy.</h2></div>
          <p>Add a boost when the room needs a little help.</p>
          <div className="boost-buttons">
            {[1, 5, 10, 25].map(value => <button key={value} type="button" disabled={energyDisabled} onClick={() => void onBoost(value)}>+{value}<Zap size={14}/></button>)}
          </div>
          <div className="control-actions">
            <button type="button" className="button secondary" disabled={busy || boosting || launching || !online} onClick={onTogglePause}>{state?.paused ? <Play size={16}/> : <Pause size={16}/>} {state?.paused ? 'Resume audience' : 'Pause audience'}</button>
            <button type="button" className="button primary" disabled={energyDisabled} onClick={() => void onCompleteCharge()}>{boosting ? 'Streaming energy…' : 'Complete charge'} <ArrowRight size={17}/></button>
          </div>
          <small>The VIP enters the code to begin the launch sequence.</small>
          {(ready || (Boolean(state?.code) && (state?.total ?? 0) >= target)) && <div className="control-code">VIP ACCESS CODE<strong>{state?.code}</strong></div>}
        </section>

        {state && <AudioControls settings={audioSettings} online={online} onSaved={onAudioSaved}/>}

        <section id="launch-settings" className="control-card launch-settings" aria-labelledby="launch-settings-title">
          <div className="card-title"><Settings2 size={20}/><h2 id="launch-settings-title">Launch settings.</h2></div>
          <p>Set the audience target and the film that follows the launch.</p>
          <form onSubmit={event => { event.preventDefault(); void onSaveSettings(); }}>
            <label htmlFor="quota">ACTIVATION TARGET</label>
            <input id="quota" type="number" min="1" max="100000" value={quota} onChange={event => onQuotaChange(event.target.value)} required disabled={launching}/>
            <label htmlFor="video">CONTINUITY VIDEO</label>
            <input id="video" type="text" value={videoUrl} onChange={event => onVideoUrlChange(event.target.value)} placeholder="HTTPS video link, or leave empty" disabled={launching}/>
            <small>Leave empty to play the official HITS launch film. Use a direct MP4 link to override it.</small>
            <button type="submit" className="button secondary" disabled={busy || launching || !online}>Save settings <Check size={16}/></button>
          </form>
        </section>

        <section className="control-card event-screens" aria-labelledby="event-screens-title">
          <div className="card-title"><Radio size={20}/><h2 id="event-screens-title">Event screens.</h2></div>
          <p>Open a screen or copy its link.</p>
          <div className="screen-links">
            {screens.map(({ key, label }) => {
              const url = origin ? new URL(links[key], origin).href : links[key];
              return <div key={key}>
                <a href={links[key]}><span>{label}</span><small>{url}</small></a>
                <button type="button" aria-label={`Copy ${label.toLowerCase()} link`} onClick={() => void onCopy(url)}><Copy size={16}/></button>
              </div>;
            })}
          </div>
        </section>

        <section className="control-card rehearsal-card" aria-labelledby="rehearsal-title">
          <div className="card-title"><RotateCcw size={20}/><h2 id="rehearsal-title">Another rehearsal?</h2></div>
          <p>Start with fresh energy and a new code. Everyone can activate again.</p>
          <button type="button" className="button danger" disabled={busy || !online} onClick={onReset}>Reset experience <RotateCcw size={16}/></button>
        </section>
      </div>
    </section>

    <nav className="bypass-bottom-nav" aria-label="Bypass controls">
      <a href="#energy-controls"><Zap size={18}/><span>Energy</span></a>
      <a href="#audio-controls-title"><Music2 size={18}/><span>Sound</span></a>
      <a href="#launch-settings"><Settings2 size={18}/><span>Settings</span></a>
    </nav>
  </>;
}
