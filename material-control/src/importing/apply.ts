/**
 * Turning imported rows into state.
 *
 * The one interesting decision here is material identity. Every incoming
 * description is parsed to a canonical signature; rows that reduce to the same
 * signature attach to the same material regardless of how they were typed, and
 * every raw string is kept as an alias. Descriptions that do not reduce
 * identically become separate materials and are offered to the user for
 * correlation rather than being guessed at.
 */

import type {
  AppState,
  Area,
  Material,
  Order,
  OrderKind,
  OrderLine,
  TakeoffLine,
  Unit,
  Vendor,
} from '../types';
import { classifyMaterial } from '../engine/classify';
import { parseMaterial } from '../engine/naming';
import { newId } from '../store';
import { toDate, toNumber, type MappingField, type SheetData } from './workbook';

export interface ImportSummary {
  rowsRead: number;
  rowsSkipped: number;
  materialsCreated: number;
  materialsMatched: number;
  areasCreated: number;
  linesCreated: number;
  ordersCreated: number;
  vendorsCreated: number;
  warnings: string[];
}

function emptySummary(): ImportSummary {
  return {
    rowsRead: 0,
    rowsSkipped: 0,
    materialsCreated: 0,
    materialsMatched: 0,
    areasCreated: 0,
    linesCreated: 0,
    ordersCreated: 0,
    vendorsCreated: 0,
    warnings: [],
  };
}

type Mapping = Partial<Record<MappingField, string>>;

function cell(row: Record<string, string | number>, mapping: Mapping, field: MappingField): string {
  const column = mapping[field];
  if (!column) return '';
  return String(row[column] ?? '').trim();
}

interface UpsertResult {
  material: Material;
  created: boolean;
}

/**
 * Find the material a description refers to, or create it.
 *
 * Matching is on the canonical signature, so `2x4x10 (PET 116 5/8") DF#2` and
 * `2x4x116 5/8" DF2` land on the same record. When `preferDescription` is set —
 * which it is for orders — the vendor's wording becomes the display name, since
 * that is the language purchasing and receiving actually run in.
 */
export function upsertMaterial(
  materials: Material[],
  rawDescription: string,
  options: { unit?: Unit; preferDescription?: boolean } = {},
): UpsertResult {
  const parsed = parseMaterial(rawDescription);
  const existing = materials.find((m) => m.canonicalKey === parsed.canonicalKey);

  if (existing) {
    if (!existing.aliases.includes(rawDescription)) existing.aliases.push(rawDescription);
    if (options.preferDescription && existing.description !== rawDescription) {
      // The takeoff wording is preserved before the vendor's wording takes over.
      if (!existing.takeoffDescription) existing.takeoffDescription = existing.description;
      existing.description = rawDescription;
    }
    return { material: existing, created: false };
  }

  const classification = classifyMaterial(parsed);
  const material: Material = {
    id: newId('mat'),
    description: rawDescription,
    aliases: [rawDescription],
    canonicalKey: parsed.canonicalKey,
    group: classification.group,
    subgroup: classification.subgroup,
    unit: options.unit ?? classification.unit,
    nominal: parsed.nominal,
    lengthIn: parsed.lengthIn,
    species: parsed.species,
    grade: parsed.grade,
    treatment: parsed.treatment,
  };
  materials.push(material);
  return { material, created: true };
}

function findOrCreateArea(areas: Area[], section: string, level: string): { area: Area; created: boolean } {
  const existing = areas.find(
    (a) => a.section.toLowerCase() === section.toLowerCase() && a.level.toLowerCase() === level.toLowerCase(),
  );
  if (existing) return { area: existing, created: false };
  const area: Area = {
    id: newId('area'),
    section,
    level,
    sequence: areas.length + 1,
    progressPct: 0,
  };
  areas.push(area);
  return { area, created: true };
}

function findOrCreateVendor(vendors: Vendor[], name: string): { vendor: Vendor; created: boolean } {
  const existing = vendors.find((v) => v.name.toLowerCase() === name.toLowerCase());
  if (existing) return { vendor: existing, created: false };
  const vendor: Vendor = { id: newId('ven'), name, contact: '', phone: '' };
  vendors.push(vendor);
  return { vendor, created: true };
}

export const TAKEOFF_FIELDS: MappingField[] = ['description', 'qty', 'unit', 'section', 'level', 'note'];
export const ORDER_FIELDS: MappingField[] = [
  'description',
  'qty',
  'unitCost',
  'orderNumber',
  'vendor',
  'date',
  'kind',
  'unit',
];

/** Import a takeoff sheet, creating areas and materials as needed. */
export function applyTakeoffImport(state: AppState, sheet: SheetData, mapping: Mapping): {
  state: AppState;
  summary: ImportSummary;
} {
  const summary = emptySummary();
  if (!mapping.description || !mapping.qty) {
    summary.warnings.push('A description column and a quantity column are both required.');
    return { state, summary };
  }

  const materials = state.materials.map((m) => ({ ...m, aliases: [...m.aliases] }));
  const areas = [...state.areas];
  const takeoffLines = [...state.takeoffLines];

  for (const row of sheet.rows) {
    summary.rowsRead += 1;
    const description = cell(row, mapping, 'description');
    const qty = toNumber(row[mapping.qty]);

    if (!description || qty === 0) {
      summary.rowsSkipped += 1;
      continue;
    }

    const section = cell(row, mapping, 'section') || 'Unassigned';
    const level = cell(row, mapping, 'level') || '—';
    const unitText = cell(row, mapping, 'unit').toUpperCase();
    const unit = (['EA', 'LF', 'SF', 'SHT', 'LB', 'BX', 'ROLL', 'GAL'] as Unit[]).includes(unitText as Unit)
      ? (unitText as Unit)
      : undefined;

    const { material, created } = upsertMaterial(materials, description, { unit });
    if (created) summary.materialsCreated += 1;
    else summary.materialsMatched += 1;

    const areaResult = findOrCreateArea(areas, section, level);
    if (areaResult.created) summary.areasCreated += 1;

    const line: TakeoffLine = {
      id: newId('tk'),
      areaId: areaResult.area.id,
      materialId: material.id,
      qty,
      rawDescription: description,
      note: cell(row, mapping, 'note') || undefined,
    };
    takeoffLines.push(line);
    summary.linesCreated += 1;
  }

  return { state: { ...state, materials, areas, takeoffLines }, summary };
}

export interface OrderImportDefaults {
  kind: OrderKind;
  vendorName: string;
  number: string;
  date: string;
}

/**
 * Import a purchase-order or change-order sheet.
 *
 * Rows are grouped into orders by number and vendor, so one sheet can carry a
 * whole buyout. Order wording wins over takeoff wording on any material they
 * share, which is the correlation direction the user asked for.
 */
export function applyOrderImport(
  state: AppState,
  sheet: SheetData,
  mapping: Mapping,
  defaults: OrderImportDefaults,
): { state: AppState; summary: ImportSummary } {
  const summary = emptySummary();
  if (!mapping.description || !mapping.qty) {
    summary.warnings.push('A description column and a quantity column are both required.');
    return { state, summary };
  }

  const materials = state.materials.map((m) => ({ ...m, aliases: [...m.aliases] }));
  const vendors = [...state.vendors];
  const orders = state.orders.map((o) => ({ ...o, lines: [...o.lines] }));

  for (const row of sheet.rows) {
    summary.rowsRead += 1;
    const description = cell(row, mapping, 'description');
    const qty = toNumber(row[mapping.qty]);
    if (!description || qty === 0) {
      summary.rowsSkipped += 1;
      continue;
    }

    const kindText = cell(row, mapping, 'kind').toUpperCase();
    const kind: OrderKind = kindText.startsWith('CO') ? 'CO' : kindText.startsWith('PO') ? 'PO' : defaults.kind;
    const number = cell(row, mapping, 'orderNumber') || defaults.number;
    const vendorName = cell(row, mapping, 'vendor') || defaults.vendorName;
    const date = mapping.date ? toDate(row[mapping.date], defaults.date) : defaults.date;

    if (!number || !vendorName) {
      summary.rowsSkipped += 1;
      summary.warnings.push(`Row skipped — no order number or vendor for "${description}".`);
      continue;
    }

    const vendorResult = findOrCreateVendor(vendors, vendorName);
    if (vendorResult.created) summary.vendorsCreated += 1;

    const { material, created } = upsertMaterial(materials, description, { preferDescription: true });
    if (created) summary.materialsCreated += 1;
    else summary.materialsMatched += 1;

    let order = orders.find((o) => o.number === number && o.vendorId === vendorResult.vendor.id);
    if (!order) {
      order = {
        id: newId('ord'),
        kind,
        number,
        vendorId: vendorResult.vendor.id,
        date,
        status: 'open',
        lines: [],
      } satisfies Order;
      orders.push(order);
      summary.ordersCreated += 1;
    }

    const line: OrderLine = {
      id: newId('ol'),
      materialId: material.id,
      qty,
      unitCost: mapping.unitCost ? toNumber(row[mapping.unitCost]) : 0,
      rawDescription: description,
    };
    order.lines.push(line);
    summary.linesCreated += 1;
  }

  return { state: { ...state, materials, vendors, orders }, summary };
}
