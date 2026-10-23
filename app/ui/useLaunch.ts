'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LaunchView = 'main' | 'qr' | 'bypass' | 'audience';
export type LaunchLinks = Record<LaunchView, string>;
export type EventState = {
  epoch: string; quota: number; total: number; audience: number; boost?: number;
  paused: boolean; phase: string; code?: string; launchedAt: number | null;
  videoUrl: string; activated: boolean; operator: boolean; serverTime: number;
  configured: boolean; links?: LaunchLinks;
};
export const LOCAL_LINKS: LaunchLinks = { main: '/', qr: '/qr', bypass: '/bypass', audience: '/audience' };
export const SEQUENCE_SECONDS = 22;

export function useLaunch(view: LaunchView) {
  const [state, setState] = useState<EventState | null>(null);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const offset = useRef(0);
  const active = useRef(false);
  const version = useRef(0);

  const receive = useCallback((value: EventState) => {
    offset.current = value.serverTime - Date.now();
    let locallyActivated = false;
    if (view === 'audience') {
      try { locallyActivated = localStorage.getItem(`hits-activated:${value.epoch}`) === '1'; } catch {}
    }
    setState(previous => ({
      ...value,
      activated: value.activated || locallyActivated || Boolean(previous?.epoch === value.epoch && previous.activated),
    }));
    setOnline(true);
  }, [view]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    let run = 0;
    let controller: AbortController | null = null;
    const endpoint = view === 'audience' ? '/api/event?view=audience' : '/api/event';
    const baseDelay = view === 'main' ? 1000 : view === 'audience' ? 4000 : 2000;
    const poll = async () => {
      const currentRun = ++run;
      if (!active.current) {
        const requestVersion = version.current;
        try {
          const requestController = new AbortController();
          controller = requestController;
          const timeout = window.setTimeout(() => requestController.abort(), 8000);
          const response = await fetch(endpoint, { cache: view === 'audience' ? 'default' : 'no-store', signal: requestController.signal }).finally(() => window.clearTimeout(timeout));
          if (!response.ok) throw new Error('Connection unavailable');
          const value = await response.json() as EventState;
          if (!stopped && requestVersion === version.current) { failures = 0; receive(value); }
        } catch { if (!stopped) { failures++; setOnline(false); } }
      }
      const hiddenDelay = document.hidden ? Math.max(baseDelay, 15000) : baseDelay;
      const retryDelay = Math.min(30000, hiddenDelay * Math.max(1, 2 ** failures));
      if (!stopped && currentRun === run) timer = setTimeout(poll, retryDelay);
    };
    const resume = () => { if (!stopped && !document.hidden && navigator.onLine) { run++; clearTimeout(timer); controller?.abort(); void poll(); } };
    const disconnect = () => setOnline(false);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    window.addEventListener('offline', disconnect);
    void poll();
    return () => { stopped = true; run++; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); window.removeEventListener('offline', disconnect); };
  }, [receive, view]);

  async function action(name: string, extra: Record<string, unknown> = {}): Promise<EventState | boolean> {
    if (active.current) return false;
    active.current = true;
    version.current++;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name, ...extra }), signal: AbortSignal.timeout(12000),
      });
      const result = await response.json() as EventState & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      if (result.epoch) {
        if (view === 'audience' && name === 'activate' && result.activated) {
          try { localStorage.setItem(`hits-activated:${result.epoch}`, '1'); } catch {}
        }
        receive(result);
        return result;
      } else {
        const next = await fetch('/api/event', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!next.ok) throw new Error('Saved. Reconnecting to the event…');
        const nextState = await next.json() as EventState;
        receive(nextState);
        return nextState;
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The connection was interrupted. Please retry.');
      return false;
    } finally { active.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (state?.phase !== 'launching' || !state.launchedAt) { queueMicrotask(() => setElapsed(0)); return; }
    const started = state.launchedAt;
    const update = () => setElapsed(Math.min(SEQUENCE_SECONDS, Math.max(0, (Date.now() + offset.current - started) / 1000)));
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 250);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [state?.phase, state?.launchedAt]);

  const progress = state ? Math.min(1, state.total / state.quota) : 0;
  return { state, online, busy, error, setError, elapsed, progress, action, links: state?.links || LOCAL_LINKS };
}
