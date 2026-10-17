import { Fingerprint, Check } from 'lucide-react';
import { HitsLogo } from './Brand';

export default function AccessUnlock() {
  return <section className="cinematic access-unlock" role="status" aria-label="Energy target reached. Opening VIP access panel.">
    <div className="unlock-rings" aria-hidden="true"><i/><i/><i/></div>
    <div className="unlock-shutter left" aria-hidden="true"/><div className="unlock-shutter right" aria-hidden="true"/>
    <div className="unlock-copy">
      <HitsLogo className="unlock-brand"/>
      <span className="eyebrow"><Check size={16}/> COLLECTIVE ENERGY · 100%</span>
      <div className="unlock-fingerprint"><Fingerprint size={58} strokeWidth={1}/><i/></div>
      <h2>Access <em>unlocked.</em></h2>
      <p>The room has powered the future.<br/>Your moment begins now.</p>
      <div className="unlock-load" aria-hidden="true"><i/></div>
      <span className="unlock-caption">OPENING THE VIP LAUNCH CONSOLE</span>
    </div>
  </section>;
}
