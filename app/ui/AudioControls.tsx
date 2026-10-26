'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Music2, SlidersHorizontal } from 'lucide-react';
import { MAX_SFX_VOLUME, parseAudioSettings, type AudioSettings } from '@/lib/audio-settings';

export default function AudioControls({ settings, online, onSaved }: { settings: AudioSettings; online: boolean; onSaved: (settings: AudioSettings) => void }) {
  const [mix, setMix] = useState(settings);
  const [customTrack, setCustomTrack] = useState(Boolean(settings.musicUrl));
  const [trackUrl, setTrackUrl] = useState(settings.musicUrl);
  const [status, setStatus] = useState('Changes sync to the main and QR displays.');
  const [error, setError] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const draft = useRef(settings);
  const dirty = useRef(false);
  const trackDirty = useRef(false);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!mounted.current || dirty.current) return;
      draft.current = settings;
      setMix(settings);
      if (!trackDirty.current) {
        setCustomTrack(Boolean(settings.musicUrl));
        setTrackUrl(settings.musicUrl);
      }
    });
  }, [settings]);

  function save(next: AudioSettings, version: number) {
    queue.current = queue.current.then(async () => {
      if (!mounted.current || version !== revision.current) return;
      setStatus('Saving sound settings…');
      try {
        const response = await fetch('/api/event', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'audio-settings', audioSettings: next }),
          signal: AbortSignal.timeout(12000),
        });
        const result = await response.json() as { error?: string; audioSettings?: unknown };
        if (!response.ok) throw new Error(result.error || 'Sound settings could not be saved.');
        const saved = parseAudioSettings(result.audioSettings);
        if (!saved) throw new Error('The saved sound settings could not be confirmed. Please retry.');
        if (mounted.current) onSaved(saved);
        if (mounted.current && version === revision.current) {
          dirty.current = false;
          setSaveFailed(false);
          setError('');
          setStatus('Saved · updating connected displays.');
        }
      } catch (failure) {
        if (mounted.current && version === revision.current) {
          setError(failure instanceof Error ? failure.message : 'Sound settings could not be saved.');
          setSaveFailed(true);
          setStatus('Changes have not been saved.');
        }
      }
    });
  }

  function update(patch: Partial<AudioSettings>, immediate = false) {
    const next = { ...draft.current, ...patch };
    draft.current = next;
    dirty.current = true;
    const version = ++revision.current;
    setMix(next);
    setError('');
    setSaveFailed(false);
    setStatus('Sound settings changed…');
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (immediate) save(next, version);
    else timer.current = setTimeout(() => { timer.current = null; save(next, version); }, 350);
  }

  function flush() {
    if (!dirty.current || !timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    save(draft.current, revision.current);
  }

  return <section className="control-card audio-controls" aria-labelledby="audio-controls-title">
    <div className="card-title"><SlidersHorizontal size={20}/><h2 id="audio-controls-title">Balance the sound.</h2></div>
    <p>Keep the music under the action. Adjust the mix here while the audience connects.</p>
    <div className="audio-mixer">
      <div className="audio-channel">
        <label htmlFor="music-volume"><Music2 size={16}/> Waiting music <output htmlFor="music-volume">{mix.musicVolume}%</output></label>
        <input id="music-volume" type="range" min="0" max="100" step="1" value={mix.musicVolume} disabled={!online}
          onChange={event => update({ musicVolume: Number(event.target.value) })} onPointerUp={flush} onKeyUp={flush} onBlur={flush}/>
        <div className="audio-scale"><span>Mute</span><span>Full volume</span></div>
      </div>
      <div className="audio-channel">
        <label htmlFor="sfx-volume"><SlidersHorizontal size={16}/> Sound effects <output htmlFor="sfx-volume">{mix.sfxVolume}%</output></label>
        <input id="sfx-volume" type="range" min="0" max={MAX_SFX_VOLUME} step="1" value={mix.sfxVolume} disabled={!online}
          onChange={event => update({ sfxVolume: Number(event.target.value) })} onPointerUp={flush} onKeyUp={flush} onBlur={flush}/>
        <div className="audio-scale"><span>Mute</span><span>{MAX_SFX_VOLUME}% boost</span></div>
      </div>
    </div>
    <form className="audio-track-form" onSubmit={event => {
      event.preventDefault();
      setSaveFailed(false);
      const musicUrl = customTrack ? trackUrl.trim() : '';
      if (customTrack && !musicUrl) { setError('Enter a direct audio link first.'); return; }
      if (!parseAudioSettings({ ...draft.current, musicUrl })) {
        setError('Use a direct HTTPS audio link or a /media/ audio path.'); return;
      }
      trackDirty.current = false;
      update({ musicUrl }, true);
    }}>
      <div className="audio-track-field"><label htmlFor="waiting-track">WAITING TRACK</label>
        <select id="waiting-track" value={customTrack ? 'custom' : 'default'} disabled={!online} onChange={event => { trackDirty.current = true; setCustomTrack(event.target.value === 'custom'); }}>
          <option value="default">The Final Ascent</option><option value="custom">Custom audio link</option>
        </select>
      </div>
      {customTrack && <div className="audio-track-field audio-url-field"><label htmlFor="waiting-track-url">AUDIO LINK</label>
        <input id="waiting-track-url" type="text" value={trackUrl} maxLength={2048} placeholder="https://…/music.mp3" disabled={!online}
          onChange={event => { trackDirty.current = true; setTrackUrl(event.target.value); }}/>
      </div>}
      <button className="button secondary" disabled={!online}>Apply track <Check size={16}/></button>
    </form>
    <small>Volume changes save automatically. Track changes use Apply track. The launch video keeps its own audio.</small>
    <div className={`audio-save-status ${error ? 'has-error' : ''}`} role={error ? 'alert' : 'status'}>
      <span>{error || status}</span>
      {saveFailed && <button type="button" className="text-button" disabled={!online} onClick={() => update({}, true)}>Retry saving</button>}
    </div>
  </section>;
}
