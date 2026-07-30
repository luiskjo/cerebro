/**
 * Calendar-date helpers. Dates are plain 'YYYY-MM-DD' strings and are treated as
 * UTC midnight so arithmetic never drifts across daylight-saving boundaries.
 */

const MS_PER_DAY = 86_400_000;

export function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

export function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * MS_PER_DAY);
}

/** Whole days from `a` to `b`. Negative when `b` is before `a`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / MS_PER_DAY);
}

export function minDate(dates: string[]): string | undefined {
  return dates.length ? dates.reduce((a, b) => (toUtc(b) < toUtc(a) ? b : a)) : undefined;
}

export function maxDate(dates: string[]): string | undefined {
  return dates.length ? dates.reduce((a, b) => (toUtc(b) > toUtc(a) ? b : a)) : undefined;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-06-10' -> 'Jun 10'. Year is appended only when it differs from `refIso`. */
export function formatDate(iso: string | undefined, refIso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const label = `${MONTHS[(m ?? 1) - 1]} ${d}`;
  if (refIso && refIso.slice(0, 4) !== String(y)) return `${label} ${y}`;
  return label;
}

/** Human phrasing for a day offset: 'in 5d', 'today', '3d ago'. */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  return days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`;
}
