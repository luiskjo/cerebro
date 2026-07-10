import type { RiskRow } from '../data/mockData';

export default function RiskList({ rows }: { rows: RiskRow[] }) {
  return (
    <>
      {rows.map((r, i) => (
        <div className="risk-row" key={r.label} style={i === rows.length - 1 ? { marginBottom: 0 } : undefined}>
          <div className="risk-label-row">
            <span className="risk-lbl">{r.label}</span>
            <span className="risk-sc" style={{ color: r.color }}>
              {r.score}
            </span>
          </div>
          <div className="risk-bar">
            <div className="risk-fill" style={{ width: `${r.score}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </>
  );
}
