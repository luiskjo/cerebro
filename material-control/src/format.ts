/** Display formatting helpers. Presentation only — no business logic here. */

export function money(value: number, decimals = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Compact money for KPI tiles: $48.2k, $1.3M. */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function qty(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US');
}

export function pct(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function signedPct(value: number, decimals = 0): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function signedMoney(value: number): string {
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${money(Math.abs(value))}`;
}
