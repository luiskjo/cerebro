import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface InsightBannerProps {
  label: string;
  time?: string;
  body: ReactNode;
  tags?: { label: string; navigateTo?: string }[];
  navigateTo?: string;
  cta?: string;
}

export default function InsightBanner({ label, time, body, tags, navigateTo, cta }: InsightBannerProps) {
  const navigate = useNavigate();

  return (
    <div
      className="insight-banner"
      onClick={navigateTo ? () => navigate(navigateTo) : undefined}
      style={{ cursor: navigateTo ? 'pointer' : 'default' }}
    >
      <div className="insight-top">
        <div className="insight-icon">🧠</div>
        <div>
          <div className="insight-label">{label}</div>
          {time && <div className="insight-time">{time}</div>}
        </div>
        {cta && (
          <div className="chip" style={{ marginLeft: 'auto', fontSize: 11 }}>
            {cta}
          </div>
        )}
      </div>
      <div className="insight-body">{body}</div>
      {tags && tags.length > 0 && (
        <div className="insight-tags">
          {tags.map((tag) => (
            <button
              className="itag"
              key={tag.label}
              onClick={(e) => {
                e.stopPropagation();
                if (tag.navigateTo) navigate(tag.navigateTo);
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
