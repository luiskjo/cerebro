import { useEffect, type CSSProperties, type ReactNode } from 'react';

export function Card({
  title,
  note,
  children,
  actions,
}: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card">
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: title ? 0 : 12 }}>
          {title && <div className="card-title" style={{ marginBottom: 0, flex: 1 }}>{title}</div>}
          {actions}
        </div>
      )}
      {title && <div style={{ height: 13 }} />}
      {note && <div className="card-note">{note}</div>}
      {children}
    </div>
  );
}

export type Tone = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'grey';

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill p-${tone}`}>{children}</span>;
}

/** Colour follows completeness: amber early, blue in progress, green done. */
export function Bar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 99.5 ? 'var(--green)' : clamped >= 55 ? 'var(--blue)' : 'var(--amber)';
  return (
    <div className="bar-wrap">
      <div className="bar" title={`${clamped.toFixed(0)}%`}>
        <div className="bar-fill" style={{ width: `${clamped}%`, background: color }} />
      </div>
      {label !== undefined && <span style={{ fontSize: 11 }}>{label}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  color,
  pct,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  color?: string;
  pct?: number;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-val" style={{ color: color ?? 'var(--text)' }}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
      {pct !== undefined && (
        <div className="stat-bar">
          <div
            className="stat-fill"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color ?? 'var(--blue)' }}
          />
        </div>
      )}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;
}

const alignClass = { left: '', right: 'num', center: 'center' } as const;

export function DataTable<T>({
  columns,
  rows,
  getKey,
  rowClass,
  empty = 'Nothing to show yet.',
  minWidth,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, i: number) => string;
  rowClass?: (row: T) => string | undefined;
  empty?: ReactNode;
  minWidth?: number;
}) {
  if (rows.length === 0) return <div className="empty">{empty}</div>;
  const style: CSSProperties | undefined = minWidth ? { minWidth } : undefined;
  return (
    <div className="tw">
      <table className="t" style={style}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={alignClass[c.align ?? 'left']}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getKey(row, i)} className={rowClass?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className={alignClass[c.align ?? 'left']}>
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="backdrop"
      onClick={(e) => {
        // Only a click on the backdrop itself dismisses.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

/** Numeric input that reads an empty box as 0 rather than NaN. */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="input"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
    </Field>
  );
}

export function InlineNumber({
  value,
  onChange,
  ariaLabel,
  step = 1,
  min = 0,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input
        className="inline"
        type="number"
        aria-label={ariaLabel}
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
      {suffix && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{suffix}</span>}
    </span>
  );
}
