import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Metric } from '../data/mockData';

interface MetricGridProps {
  metrics: Metric[];
  columns?: number;
}

export default function MetricGrid({ metrics, columns }: MetricGridProps) {
  const navigate = useNavigate();
  const style: CSSProperties | undefined = columns ? { gridTemplateColumns: `repeat(${columns},1fr)` } : undefined;

  return (
    <div className="metrics" style={style}>
      {metrics.map((m) => (
        <div
          className="metric"
          key={m.label}
          onClick={m.navigateTo ? () => navigate(m.navigateTo!) : undefined}
          style={{ cursor: m.navigateTo ? 'pointer' : 'default' }}
        >
          {m.icon && (
            <div className="metric-icon" style={{ background: m.iconBg }}>
              {m.icon}
            </div>
          )}
          <div className="metric-label">{m.label}</div>
          <div className="metric-val" style={{ color: m.valueColor }}>
            {m.value}
          </div>
          <div className="metric-trend" style={{ color: m.trendColor }}>
            {m.trend}
          </div>
          {m.barPct !== undefined && (
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${m.barPct}%`, background: m.barColor }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
