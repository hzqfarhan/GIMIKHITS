import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'HITS × IUIC | Ignite the extraordinary',
  description: 'The audience-powered launch of Hussein Innovation & Talent Symposium at Universiti Tun Hussein Onn Malaysia.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
