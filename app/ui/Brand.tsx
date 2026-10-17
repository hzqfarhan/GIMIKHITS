export const PROGRAMS = [
  { name: 'IUIC', title: 'International Undergraduate Innovation Competition', file: 'IUIC.png', signal: 'INNOVATION' },
  { name: 'HDSC', title: 'Hussein Digital Skills Competition', file: 'HDSC.png', signal: 'DIGITAL SKILLS' },
  { name: 'Suara Cendekia', title: 'Suara Cendekia', file: 'SUARACENDEKIA.png', signal: 'IDEAS' },
  { name: 'SUTERA', title: 'SUTERA', file: 'SUTERA.png', signal: 'EXPRESSION' },
  { name: 'UI Festival', title: 'UI Festival', file: 'UIFEST26.png', signal: 'COMMUNITY' },
];

export function HitsLogo({ className = '', colour = false }: { className?: string; colour?: boolean }) {
  return <svg className={`hits-mark ${colour ? 'original-colour' : ''} ${className}`} viewBox="265 420 1040 560" role="img" aria-label="HITS — Hussein Innovation & Talent Symposium">
    <image href="/logos/HITS.png" width="1563" height="1563" />
  </svg>;
}

export function ProgramStrip() {
  return <section className="program-strip" aria-label="The five HITS programmes">
    <div className="program-strip-title"><span>FIVE PLATFORMS.</span><strong>One extraordinary future.</strong></div>
    <div className="program-list">{PROGRAMS.map((program, index) => <div className="program-item" key={program.name}>
      <span className={`program-logo program-logo-${index}`}><img src={`/logos/${program.file}`} alt={program.title} /></span>
      <span>{program.name}</span>
    </div>)}</div>
    <div className="uthm-signature">UNIVERSITI TUN HUSSEIN<br/><b>ONN MALAYSIA</b></div>
  </section>;
}
