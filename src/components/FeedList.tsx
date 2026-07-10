import type { FeedRowData } from '../data/mockData';

export default function FeedList({ rows }: { rows: FeedRowData[] }) {
  return (
    <>
      {rows.map((r, i) => (
        <div className="feed-row" key={r.main} style={i === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
          <div className="feed-ico" style={{ background: r.iconBg }}>
            {r.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div className="feed-main">{r.main}</div>
            <div className="feed-sub">{r.sub}</div>
          </div>
          <div className="feed-time" style={r.timeColor ? { color: r.timeColor, fontWeight: 600 } : undefined}>
            {r.time}
          </div>
        </div>
      ))}
    </>
  );
}
