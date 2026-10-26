export type AudioSettings = { musicVolume: number; sfxVolume: number; musicUrl: string };

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = Object.freeze({ musicVolume: 25, sfxVolume: 100, musicUrl: '' });

/** Validate the complete operator payload without coercing missing or string values. */
export function parseAudioSettings(value: unknown): AudioSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { musicVolume, sfxVolume, musicUrl } = value as Record<string, unknown>;
  if (typeof musicVolume !== 'number' || !Number.isInteger(musicVolume) || musicVolume < 0 || musicVolume > 100 ||
      typeof sfxVolume !== 'number' || !Number.isInteger(sfxVolume) || sfxVolume < 0 || sfxVolume > 100 ||
      typeof musicUrl !== 'string' || musicUrl.length > 2048) return null;
  const url = musicUrl.trim();
  if (url) {
    if (/[\\\u0000-\u0020\u007f]/.test(url) || url.includes('#')) return null;
    const local = url.startsWith('/media/');
    if (!local && !/^https:\/\//i.test(url)) return null;
    try {
      const parsed = new URL(url, 'https://hits.invalid');
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) return null;
      if (local) {
        const decodedPath = decodeURIComponent(parsed.pathname);
        if (!parsed.pathname.startsWith('/media/') || parsed.pathname.length <= 7 || /[\\\u0000-\u001f\u007f]/.test(decodedPath) ||
            decodedPath.split('/').some(segment => segment === '.' || segment === '..')) return null;
      }
    } catch { return null; }
  }
  return { musicVolume, sfxVolume, musicUrl: url };
}

/** Older snapshots and databases without a saved setting retain the built-in mix. */
export function readAudioSettings(value: unknown): AudioSettings {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return { ...DEFAULT_AUDIO_SETTINGS }; }
  }
  return parseAudioSettings(value) || { ...DEFAULT_AUDIO_SETTINGS };
}
