/**
 * Reading takeoff and order workbooks.
 *
 * Every estimator lays a spreadsheet out differently, so nothing here assumes a
 * fixed template. Files are read into plain rows, the likely column mapping is
 * guessed from the headers, and the user confirms or corrects it before
 * anything is committed.
 */

import * as XLSX from 'xlsx';

export interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface WorkbookData {
  fileName: string;
  sheets: SheetData[];
}

/** Header rows are often preceded by a title block, so find the real one. */
function findHeaderRow(grid: unknown[][]): number {
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(grid.length, 15);
  for (let i = 0; i < limit; i += 1) {
    const row = grid[i] ?? [];
    const filled = row.filter((cell) => String(cell ?? '').trim().length > 0).length;
    const texty = row.filter((cell) => typeof cell === 'string' && cell.trim().length > 1).length;
    const score = filled + texty;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function parseWorkbook(data: ArrayBuffer, fileName: string): WorkbookData {
  const workbook = XLSX.read(data, { type: 'array' });

  const sheets: SheetData[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' });
    if (grid.length === 0) return { name, headers: [], rows: [] };

    const headerIndex = findHeaderRow(grid);
    const rawHeaders = (grid[headerIndex] ?? []).map((cell, i) => {
      const label = String(cell ?? '').trim();
      return label || `Column ${i + 1}`;
    });

    // Duplicate headers would silently overwrite each other.
    const seen = new Map<string, number>();
    const headers = rawHeaders.map((label) => {
      const count = seen.get(label) ?? 0;
      seen.set(label, count + 1);
      return count === 0 ? label : `${label} (${count + 1})`;
    });

    const rows = grid
      .slice(headerIndex + 1)
      .map((row) => {
        const record: Record<string, string | number> = {};
        headers.forEach((header, i) => {
          const cell = row?.[i];
          record[header] = typeof cell === 'number' ? cell : String(cell ?? '').trim();
        });
        return record;
      })
      .filter((record) => Object.values(record).some((v) => String(v).trim().length > 0));

    return { name, headers, rows };
  });

  return { fileName, sheets: sheets.filter((s) => s.headers.length > 0) };
}

/** Coerce a spreadsheet cell to a number, tolerating `$`, commas and `(123)`. */
export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const text = String(value).trim();
  const negative = /^\(.*\)$/.test(text);
  const cleaned = text.replace(/[()$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

/** Excel serial dates and common text formats to 'YYYY-MM-DD'. */
export function toDate(value: string | number | undefined, fallback: string): string {
  if (typeof value === 'number' && value > 0) {
    // Excel's day 1 is 1900-01-01, with the well-known 1900 leap-year offset.
    const ms = Math.round((value - 25569) * 86_400_000);
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (text && !Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return fallback;
}

export type MappingField =
  | 'description'
  | 'qty'
  | 'unit'
  | 'section'
  | 'level'
  | 'unitCost'
  | 'orderNumber'
  | 'vendor'
  | 'date'
  | 'kind'
  | 'note';

/** Header keywords for each field, best hint first. */
const HINTS: Record<MappingField, string[]> = {
  description: ['description', 'material', 'item', 'product', 'commodity', 'desc'],
  qty: ['qty', 'quantity', 'count', 'pieces', 'pcs', 'ordered', 'amount ordered'],
  unit: ['unit', 'uom', 'u/m', 'measure'],
  section: ['section', 'building', 'bldg', 'area', 'zone', 'phase'],
  level: ['level', 'floor', 'story', 'storey', 'lvl'],
  unitCost: ['unit cost', 'unit price', 'price', 'cost', 'rate', 'each'],
  orderNumber: ['po', 'po#', 'po number', 'co', 'co#', 'order', 'order number', 'number'],
  vendor: ['vendor', 'supplier', 'seller', 'company'],
  date: ['date', 'order date', 'issued'],
  kind: ['type', 'kind', 'po/co', 'doc type', 'document'],
  note: ['note', 'notes', 'comment', 'remarks'],
};

/**
 * Guess which column feeds which field.
 *
 * Exact header matches win over partial ones so a `Unit Cost` column is never
 * claimed by the `Unit` field, and each column is used at most once.
 */
export function guessMapping(headers: string[], fields: MappingField[]): Partial<Record<MappingField, string>> {
  const mapping: Partial<Record<MappingField, string>> = {};
  const taken = new Set<string>();

  const scoreFor = (header: string, field: MappingField): number => {
    const h = header.toLowerCase().trim();
    const hints = HINTS[field];
    for (let i = 0; i < hints.length; i += 1) {
      const hint = hints[i];
      if (h === hint) return 1000 - i;
      if (h.replace(/[^a-z0-9]/g, '') === hint.replace(/[^a-z0-9]/g, '')) return 900 - i;
    }
    for (let i = 0; i < hints.length; i += 1) {
      if (h.includes(hints[i])) return 500 - i - h.length;
    }
    return -1;
  };

  // Resolve the strongest header/field pairing first, then work down.
  const candidates: { field: MappingField; header: string; score: number }[] = [];
  for (const field of fields) {
    for (const header of headers) {
      const score = scoreFor(header, field);
      if (score > 0) candidates.push({ field, header, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    if (mapping[candidate.field] || taken.has(candidate.header)) continue;
    mapping[candidate.field] = candidate.header;
    taken.add(candidate.header);
  }

  return mapping;
}
