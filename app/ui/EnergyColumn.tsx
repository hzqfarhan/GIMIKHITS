type Props = { total: number; quota: number; paused?: boolean; loaded: boolean };

export default function EnergyColumn({ total, quota, paused, loaded }: Props) {
  const progress = Math.min(1, Math.max(0, total / Math.max(1, quota)));
  const percent = Math.floor(progress * 100);
  return <aside className={`energy-column ${paused ? 'is-paused' : ''}`} aria-label="Live collective energy">
    <span className="energy-column-title">COLLECTIVE<br/>ENERGY</span>
    <strong className="energy-column-percent">{loaded ? percent : '—'}<small>%</small></strong>
    <div className="energy-column-gauge">
      <div className="energy-column-scale" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
      <div className="energy-column-track" role="progressbar" aria-label="Activation target" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={loaded ? Math.min(total, quota) : undefined} aria-valuetext={loaded ? `${percent}% charged, ${total} of ${quota} activations` : 'Connecting'}>
        <div className="energy-column-fill" style={{height:`${progress * 100}%`}}><span/><i/></div>
        <div className="energy-column-segments" aria-hidden="true"/>
      </div>
    </div>
    <div className="energy-column-count"><b>{loaded ? total : '—'}</b><span>/ {quota}</span></div>
    <span className="energy-column-status">{!loaded ? 'CONNECTING' : progress >= 1 ? 'CORE CHARGED' : paused ? 'ON HOLD' : 'LIVE ACTIVATIONS'}</span>
  </aside>;
}
