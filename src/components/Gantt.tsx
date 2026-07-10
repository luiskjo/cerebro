import type { GanttPhase } from '../data/mockData';

export default function Gantt({ weeks, phases }: { weeks: string[]; phases: GanttPhase[] }) {
  return (
    <div className="card">
      <div className="gantt-wrap">
        <div className="gantt-head">
          {weeks.map((w) => (
            <div className="gantt-wk" key={w}>{w}</div>
          ))}
        </div>
        {phases.map((phase) => (
          <div key={phase.phase}>
            <div className="phase-sep">{phase.phase}</div>
            {phase.rows.map((row) => (
              <div className="g-row" key={row.label}>
                <div className="g-label">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.dotColor, flexShrink: 0 }} />
                  {row.label}
                </div>
                <div className="g-track">
                  {row.todayLeft !== undefined && <div className="g-today" style={{ left: `${row.todayLeft}%` }} />}
                  <div className="g-bar" style={{ left: `${row.barLeft}%`, width: `${row.barWidth}%`, background: row.barColor }}>
                    {row.barText}
                  </div>
                  {row.baseLeft !== undefined && (
                    <div
                      className="g-base"
                      style={{ left: `${row.baseLeft}%`, width: `${row.baseWidth}%`, background: row.baseColor }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Complete', color: 'var(--green)' },
          { label: 'On track', color: 'var(--blue)' },
          { label: 'At risk', color: 'var(--amber)' },
          { label: 'Critical / delayed', color: 'var(--red)' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
            <div style={{ width: 18, height: 8, borderRadius: 2, background: l.color }} />
            {l.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
          <div style={{ width: 18, height: 4, borderRadius: 2, background: 'var(--blue)', opacity: 0.4 }} />
          Baseline
        </div>
      </div>
    </div>
  );
}
