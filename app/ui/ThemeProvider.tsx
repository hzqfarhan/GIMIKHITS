'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'purple' | 'hits-light' | 'hits-dark';
const validTheme = (value: string | null): value is Theme => ['purple', 'hits-light', 'hits-dark'].includes(value ?? '');
const ThemeContext = createContext<{theme: Theme; setTheme: (theme: Theme) => void}>({theme: 'purple', setTheme: () => {}});
export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({children}: {children: ReactNode}) {
  const [theme, updateTheme] = useState<Theme>('purple');
  useEffect(() => {
    try { const saved = localStorage.getItem('hits-theme'); if (validTheme(saved)) updateTheme(saved); } catch {}
    const sync = (event: StorageEvent) => { if (event.key === 'hits-theme' && validTheme(event.newValue)) updateTheme(event.newValue); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function setTheme(value: Theme) {
    updateTheme(value);
    try { localStorage.setItem('hits-theme', value); } catch {}
  }
  return <ThemeContext.Provider value={{theme, setTheme}}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  return <div className="theme-toolbar"><span>CHOOSE YOUR ATMOSPHERE</span><div className="theme-toggle" role="group" aria-label="Website colour theme">
    {([['purple','Purple'],['hits-light','HITS Light'],['hits-dark','HITS Dark']] as const).map(([value,label]) => <button key={value} type="button" data-choice={value} aria-pressed={theme === value} onClick={() => setTheme(value)}><i aria-hidden="true"/>{label}</button>)}
  </div></div>;
}
