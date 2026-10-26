import type { Metadata } from 'next';
import './globals.css';
import './technology.css';
import './glitch.css';
import './showcase.css';
import './viewport.css';
import './themes.css';
import './launch-effects.css';
import './audio-controls.css';
import './bypass.css';
import ThemeProvider from './ui/ThemeProvider';
export const metadata: Metadata = {
  title: 'HITS × IUIC | Ignite the extraordinary',
  description: 'The audience-powered launch of Hussein Innovation & Talent Symposium at Universiti Tun Hussein Onn Malaysia.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
