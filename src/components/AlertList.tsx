import { useNavigate } from 'react-router-dom';
import type { AlertItemData } from '../data/mockData';

const variantClass: Record<AlertItemData['variant'], string> = {
  err: 'alert-err',
  warn: 'alert-warn',
  tip: 'alert-tip',
  ok: 'alert-ok',
};

const dotClass: Record<string, string> = { r: 'dot-r', a: 'dot-a', p: 'dot-p', g: 'dot-g' };

export default function AlertList({ items }: { items: AlertItemData[] }) {
  const navigate = useNavigate();

  return (
    <>
      {items.map((item, i) => (
        <div
          className={`alert-item ${variantClass[item.variant]}`}
          key={i}
          onClick={item.navigateTo ? () => navigate(item.navigateTo!) : undefined}
          style={{ cursor: item.navigateTo ? 'pointer' : 'default' }}
        >
          {item.dot && <div className={`alert-dot ${dotClass[item.dot]}`} />}
          <div style={{ flex: 1 }}>
            <div className="alert-main">{item.main}</div>
            {item.sub && <div className="alert-sub">{item.sub}</div>}
          </div>
          {item.action && (
            <button
              className={`alert-act ${item.action.colorClass}`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.action?.navigateTo) navigate(item.action.navigateTo);
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
      ))}
    </>
  );
}
