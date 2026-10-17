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
    setState(value);
    setOnline(true);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!active.current) {
        const requestVersion = version.current;
        try {
          const response = await fetch('/api/event', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error('Connection unavailable');
          const value = await response.json() as EventState;
          if (!stopped && requestVersion === version.current) receive(value);
        } catch { if (!stopped) setOnline(false); }
      }
      if (!stopped) timer = setTimeout(poll, view === 'audience' ? 2500 : 1000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
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
    if (state?.phase !== 'launching' || !state.launchedAt) { setElapsed(0); return; }
    const started = state.launchedAt;
    const update = () => setElapsed(Math.max(0, (Date.now() + offset.current - started) / 1000));
    update();
    const timer = setInterval(update, 60);
    return () => clearInterval(timer);
  }, [state?.phase, state?.launchedAt]);

  const progress = state ? Math.min(1, state.total / state.quota) : 0;
  return { state, online, busy, error, setError, elapsed, progress, action, links: state?.links || LOCAL_LINKS };
}
