const circuits = [
  'M0 145 H170 L225 200 H390 L450 260 H540',
  'M0 170 H155 L210 225 H375 L435 285 H515',
  'M0 640 H120 L190 570 H310 L370 510 H460',
  'M0 665 H132 L202 595 H325 L385 535 H440',
  'M1440 130 H1280 L1210 200 H1090 L1040 250 H930',
  'M1440 155 H1292 L1222 225 H1105 L1055 275 H955',
  'M1440 650 H1275 L1205 580 H1100 L1040 520 H950',
  'M1440 680 H1265 L1195 610 H1085 L1025 550 H975',
  'M210 0 V70 L270 130 V305',
  'M1240 900 V780 L1180 720 V625',
];

/** Decorative circuit board. SVG paths keep the data trails crisp at projector sizes. */
export default function TechBackground({cinematic=false}:{cinematic?:boolean}) {
  return <div className={`tech-background ${cinematic?'tech-cinematic':''}`} aria-hidden="true">
    <div className="tech-horizon"/><div className="tech-scan"/>
    <div className="glitch-bands"><i/><i/><i/></div><div className="digital-noise"/>
    <div className="spatial-debris">{Array.from({length:5},(_,i)=><div className={`debris-position debris-${i}`} key={i}><div className="glass-cube">{Array.from({length:6},(_,face)=><i key={face}/>)}</div><span/></div>)}</div>
    <svg className="tech-circuits" viewBox="0 0 1440 900" preserveAspectRatio="none">
      {circuits.map((path,index)=><g key={path} style={{'--trace-delay':`${-index*1.7}s`,'--trace-duration':`${9+index%4*2}s`} as React.CSSProperties}>
        <path className="circuit-base" d={path}/><path className="circuit-signal" d={path}/>
      </g>)}
      {[ [170,145],[390,200],[310,570],[460,510],[1280,130],[1090,200],[1100,580],[950,520],[270,305],[1180,625] ].map(([x,y],index)=><g className="circuit-node" key={index}><circle cx={x} cy={y} r="7"/><circle cx={x} cy={y} r="2"/></g>)}
    </svg>
    <div className="tech-strip strip-left"><i/><i/><i/></div><div className="tech-strip strip-right"><i/><i/><i/></div>
    <div className="tech-orbital orbital-one"/><div className="tech-orbital orbital-two"/>
    <div className="tech-edge-label edge-left">HITS / INNOVATION NETWORK / UTHM</div><div className="tech-edge-label edge-right">IDEAS CONNECT. POSSIBILITIES EXPAND.</div>
    <div className="tech-grain"/>
  </div>;
}
