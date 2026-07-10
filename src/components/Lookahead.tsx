import type { LookaheadWeek } from '../data/mockData';

export default function Lookahead({ weeks }: { weeks: LookaheadWeek[] }) {
  return (
    <>
      {weeks.map((week) => (
        <div key={week.title}>
          <div className="la-wk-title">{week.title}</div>
          {week.rows.map((row) => (
            <div className={`la-row ${row.status}`} key={row.name}>
              <div className="la-dot" style={{ background: row.dotColor }} />
              <div style={{ flex: 1 }}>
                <div className="la-name">{row.name}</div>
                <div className="la-meta">{row.meta}</div>
              </div>
              <span className={`la-status ${row.statusClass}`}>{row.statusLabel}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
