import Image from 'next/image';

export const PROGRAMS = [
  { name: 'IUIC', title: 'International Undergraduate Innovation Competition', file: 'IUIC.png', signal: 'INNOVATION' },
  { name: 'HDSC', title: 'Hussein Digital Skills Competition', file: 'HDSC.png', signal: 'DIGITAL SKILLS' },
  { name: 'Suara Cendekia', title: 'Suara Cendekia', file: 'SUARACENDEKIA.png', signal: 'IDEAS' },
  { name: 'SUTERA', title: 'SUTERA', file: 'SUTERA.png', signal: 'EXPRESSION' },
  { name: 'UI Festival', title: 'UI Festival', file: 'UIFEST.png', signal: 'COMMUNITY' },
];

export function HitsLogo({ className = '', colour = false }: { className?: string; colour?: boolean }) {
  return <svg className={`hits-mark ${colour ? 'original-colour' : ''} ${className}`} viewBox="265 420 1040 560" role="img" aria-label="HITS — Hussein Innovation & Talent Symposium">
    <image href="/logos/optimized/HITS.webp" width="1563" height="1563" />
  </svg>;
}

export const LOGO_BOUNDS = ['248 478 1116 623', '242 569 1148 472', '152 503 1267 544', '342 271 1008 881', '190 498 1189 523'];
export function ProgramLogo({index, className = ''}: {index: number; className?: string}) {
  const program = PROGRAMS[index];
  return <svg className={`programme-mark ${className}`} viewBox={LOGO_BOUNDS[index]} preserveAspectRatio="xMidYMid meet" role="img" aria-label={program.title}><image href={`/logos/optimized/${program.file.replace('.png', '.webp')}`} width="1563" height="1563"/></svg>;
}

export function ProgramStrip() {
  return <section className="program-strip" aria-label="The five HITS programmes">
    <div className="program-strip-title"><span>FIVE PLATFORMS.</span><strong>One extraordinary future.</strong></div>
    <div className="program-list">{PROGRAMS.map((program, index) => <div className="program-item" key={program.name}>
      <span className={`program-logo program-logo-${index}`}><Image src={`/logos/optimized/${program.file.replace('.png', '.webp')}`} alt={program.title} width={48} height={45} /></span>
      <span>{program.name}</span>
    </div>)}</div>
    <div className="uthm-signature">UNIVERSITI TUN HUSSEIN<br/><b>ONN MALAYSIA</b></div>
  </section>;
}
