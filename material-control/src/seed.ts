/**
 * Seed dataset — the framing package for Aspen Ridge Apartments.
 *
 * Built to exercise every path in the system rather than to look tidy:
 *
 *  - takeoff and purchase-order wording that already correlated automatically
 *    (`2x4x10 (PET 116 5/8") DF#2` against `2x4x116 5/8" DF2`)
 *  - wording that cannot be proven identical and is waiting on the user
 *  - studs forecast short despite being over-bought, because the crew is
 *    burning faster than progress accounts for
 *  - surplus 20' stock that can be cut to cover that shortage
 *  - material bought in preconstruction and fully credited on a change order
 *  - a drop past its planned date, and one fully delivered
 */

import type {
  AppState,
  Area,
  Delivery,
  Drop,
  InventoryCount,
  Material,
  MaterialGroup,
  MaterialSubgroup,
  Order,
  OrderKind,
  ProgressEntry,
  TakeoffLine,
  Treatment,
  Unit,
  Vendor,
} from './types';
import { parseMaterial } from './engine/naming';

export const STATE_VERSION = 1;

const TODAY = '2026-07-15';

const vendors: Vendor[] = [
  { id: 'v-pls', name: 'Pacific Lumber Supply', contact: 'Marcus Hale', phone: '(503) 555-0198' },
  { id: 'v-bmc', name: 'Builders Material Co', contact: 'Dana Ortiz', phone: '(503) 555-0142' },
  { id: 'v-fst', name: 'FastenPro Supply', contact: 'Priya Raman', phone: '(971) 555-0110' },
  { id: 'v-bsi', name: 'Barrier Systems Inc', contact: 'Tom Beaudry', phone: '(360) 555-0176' },
];

/** [id, description, group, subgroup, unit, takeoffDescription?] */
type MaterialSpec = [string, string, MaterialGroup, MaterialSubgroup, Unit, string?];

const materialSpecs: MaterialSpec[] = [
  // Already correlated — the purchase-order wording won, takeoff wording kept.
  ['m-stud116', '2x4x116 5/8" DF2', 'Lumber', 'Studs', 'EA', '2x4x10 (PET 116 5/8") DF#2'],
  ['m-stud104', '2x6x104 5/8" DF2', 'Lumber', 'Studs', 'EA', '2x6x9 (PET 104 5/8") DF#2'],
  ['m-stud92', '2x4x92-5/8" SPF Stud', 'Lumber', 'Studs', 'EA', '2x4x92 5/8 SPF STUD'],

  ['m-2x4x16', "2x4x16' DF2", 'Lumber', 'Regular Lumber', 'EA'],
  ['m-2x6x16', "2x6x16' DF2", 'Lumber', 'Regular Lumber', 'EA'],
  ['m-2x4x20', "2x4x20' DF2", 'Lumber', 'Regular Lumber', 'EA'],
  ['m-2x10-po', "2x10x16' DF#2", 'Lumber', 'Regular Lumber', 'EA'],
  // Takeoff-only, grade reads DF#1 — needs a human to confirm the correlation.
  ['m-2x10-tk', '2x10x16 DF#1', 'Lumber', 'Regular Lumber', 'EA'],

  ['m-pt2x6', "2x6x16' PT DF2", 'Lumber', 'PT Lumber', 'EA'],
  ['m-frt2x4', "2x4x10' DF2 FRT", 'Lumber', 'FRT Lumber', 'EA'],
  ['m-lvl', '1-3/4"x11-7/8" LVL', 'Lumber', 'EWP', 'EA'],

  // Sheathing — the takeoff and the purchase order word this differently and
  // neither reduces to a dimensional key, so it waits on the user.
  ['m-osb-po', '7/16" OSB Sheathing 4\'x8\'', 'Sheathing', 'Regular Sheathing', 'SHT'],
  ['m-osb-tk', '7/16 OSB SHTG 4x8', 'Sheathing', 'Regular Sheathing', 'SHT'],
  ['m-subfloor', '23/32" T&G OSB Subfloor 4\'x8\'', 'Sheathing', 'Regular Sheathing', 'SHT'],
  ['m-frtosb', '7/16" FRT OSB Sheathing 4\'x8\'', 'Sheathing', 'FRT Sheathing', 'SHT'],

  ['m-wrb', "Tyvek CommercialWrap 9'x150'", 'WRB', 'None', 'ROLL'],
  ['m-siding', 'Hardie Plank Lap Siding 8-1/4"', 'Siding', 'None', 'EA'],
  ['m-shaftliner', '1" Type X Shaftliner Gypsum 24"x10\'', 'Firewall', 'None', 'SHT'],

  ['m-hdu5-po', 'HDU5-SDS2.5 Holdown', 'Hardware', 'None', 'EA'],
  ['m-hdu5-tk', 'SIMPSON HDU5-SDS2.5', 'Hardware', 'None', 'EA'],
  ['m-hanger', 'LUS28 Joist Hanger', 'Hardware', 'None', 'EA'],
  ['m-h25a', 'H2.5A Hurricane Tie', 'Hardware', 'None', 'EA'],
  ['m-sds', 'SDS25300 Structural Screw 100ct', 'Hardware', 'None', 'BX'],

  // Bought in preconstruction, then fully credited when the elevation changed.
  ['m-cedar', "2x8x16' Cedar Fascia", 'Lumber', 'Regular Lumber', 'EA'],
];

const materials: Material[] = materialSpecs.map(
  ([id, description, group, subgroup, unit, takeoffDescription]) => {
    const parsed = parseMaterial(description);
    return {
      id,
      description,
      takeoffDescription,
      aliases: takeoffDescription ? [description, takeoffDescription] : [description],
      canonicalKey: parsed.canonicalKey,
      group,
      subgroup,
      unit,
      nominal: parsed.nominal,
      lengthIn: parsed.lengthIn,
      species: parsed.species,
      grade: parsed.grade,
      treatment: parsed.treatment as Treatment,
    };
  },
);

const areas: Area[] = [
  { id: 'a-a1', section: 'Building A', level: 'Level 1', sequence: 1, plannedStart: '2026-04-06', progressPct: 100 },
  { id: 'a-a2', section: 'Building A', level: 'Level 2', sequence: 2, plannedStart: '2026-05-18', progressPct: 65 },
  { id: 'a-a3', section: 'Building A', level: 'Level 3', sequence: 3, plannedStart: '2026-07-06', progressPct: 10 },
  { id: 'a-b1', section: 'Building B', level: 'Level 1', sequence: 4, plannedStart: '2026-08-10', progressPct: 0 },
  { id: 'a-b2', section: 'Building B', level: 'Level 2', sequence: 5, plannedStart: '2026-09-14', progressPct: 0 },
];

/** [areaId, materialId, qty] */
const takeoffTable: [string, string, number][] = [
  ['a-a1', 'm-stud116', 420], ['a-a1', 'm-2x4x16', 90], ['a-a1', 'm-osb-tk', 160],
  ['a-a1', 'm-2x10-tk', 18], ['a-a1', 'm-hanger', 95], ['a-a1', 'm-wrb', 5],
  ['a-a1', 'm-sds', 12], ['a-a1', 'm-hdu5-tk', 8], ['a-a1', 'm-subfloor', 100],

  ['a-a2', 'm-stud116', 445], ['a-a2', 'm-2x4x16', 95], ['a-a2', 'm-osb-tk', 170],
  ['a-a2', 'm-2x10-tk', 20], ['a-a2', 'm-hanger', 100], ['a-a2', 'm-wrb', 5],
  ['a-a2', 'm-subfloor', 105], ['a-a2', 'm-hdu5-tk', 8],

  ['a-a3', 'm-stud116', 450], ['a-a3', 'm-stud104', 120], ['a-a3', 'm-2x4x16', 98],
  ['a-a3', 'm-2x6x16', 40], ['a-a3', 'm-osb-tk', 175], ['a-a3', 'm-subfloor', 108],
  ['a-a3', 'm-hanger', 104], ['a-a3', 'm-wrb', 5], ['a-a3', 'm-lvl', 60],

  ['a-b1', 'm-stud92', 380], ['a-b1', 'm-2x4x16', 88], ['a-b1', 'm-osb-tk', 150],
  ['a-b1', 'm-pt2x6', 30], ['a-b1', 'm-subfloor', 96], ['a-b1', 'm-hanger', 90],
  ['a-b1', 'm-siding', 220], ['a-b1', 'm-frt2x4', 60], ['a-b1', 'm-frtosb', 40],
  ['a-b1', 'm-shaftliner', 85],

  ['a-b2', 'm-stud92', 395], ['a-b2', 'm-2x4x16', 92], ['a-b2', 'm-osb-tk', 155],
  ['a-b2', 'm-subfloor', 100], ['a-b2', 'm-hanger', 94], ['a-b2', 'm-siding', 230],
  ['a-b2', 'm-h25a', 180], ['a-b2', 'm-shaftliner', 88],
];

const takeoffLines: TakeoffLine[] = takeoffTable.map(([areaId, materialId, qty], i) => ({
  id: `tk-${String(i + 1).padStart(3, '0')}`,
  areaId,
  materialId,
  qty,
  rawDescription: materials.find((m) => m.id === materialId)?.takeoffDescription
    ?? materials.find((m) => m.id === materialId)?.description
    ?? materialId,
}));

/** [orderId, kind, number, vendorId, date, [ [materialId, qty, unitCost], ... ] ] */
type OrderSpec = [string, OrderKind, string, string, string, [string, number, number][], string?];

const orderSpecs: OrderSpec[] = [
  ['o-2201', 'PO', 'PO-2201', 'v-pls', '2026-04-02', [
    ['m-stud116', 1400, 5.1],
    ['m-stud104', 130, 7.85],
    ['m-2x4x16', 470, 11.9],
    ['m-2x6x16', 45, 20.4],
    ['m-2x10-po', 40, 37.5],
    ['m-2x4x20', 300, 15.2],
  ], 'Building A framing lumber buyout.'],

  ['o-2202', 'PO', 'PO-2202', 'v-bmc', '2026-04-10', [
    ['m-osb-po', 700, 17.85],
    ['m-subfloor', 520, 41.2],
    ['m-frtosb', 45, 34.6],
  ], 'Panel package.'],

  ['o-2203', 'PO', 'PO-2203', 'v-fst', '2026-04-18', [
    ['m-hanger', 500, 2.95],
    ['m-h25a', 200, 0.92],
    ['m-sds', 15, 62],
    ['m-hdu5-po', 20, 51],
  ], 'Connectors and fasteners.'],

  ['o-2204', 'PO', 'PO-2204', 'v-bsi', '2026-05-05', [
    ['m-wrb', 18, 142],
    ['m-siding', 480, 9.75],
    ['m-shaftliner', 180, 28.4],
  ], 'Envelope and firewall.'],

  ['o-2205', 'PO', 'PO-2205', 'v-pls', '2026-05-20', [
    ['m-pt2x6', 34, 24.9],
    ['m-frt2x4', 70, 18.6],
    ['m-lvl', 60, 96],
  ], 'Treated, fire-retardant and engineered wood.'],

  ['o-2206', 'PO', 'PO-2206', 'v-bmc', '2026-03-15', [
    ['m-cedar', 40, 46],
  ], 'Preconstruction cedar fascia.'],

  ['o-co101', 'CO', 'CO-101', 'v-bmc', '2026-06-02', [
    ['m-cedar', -40, 46],
  ], 'Cedar fascia deleted — elevation revised to fibre cement.'],

  ['o-co102', 'CO', 'CO-102', 'v-pls', '2026-06-20', [
    ['m-stud92', 810, 5.35],
  ], 'Building B stud package added.'],
];

const orders: Order[] = orderSpecs.map(([id, kind, number, vendorId, date, lines, description]) => ({
  id,
  kind,
  number,
  vendorId,
  date,
  status: 'open',
  description,
  lines: lines.map(([materialId, qty, unitCost], i) => ({
    id: `${id}-l${i + 1}`,
    materialId,
    qty,
    unitCost,
    rawDescription: materials.find((m) => m.id === materialId)?.description ?? materialId,
  })),
}));

const drops: Drop[] = [
  {
    id: 'd-a2',
    areaId: 'a-a2',
    name: 'Building A · Level 2 — panel drop',
    plannedDate: '2026-06-12',
    status: 'planned',
    lines: [
      { id: 'd-a2-1', materialId: 'm-osb-po', plannedQty: 360 },
      { id: 'd-a2-2', materialId: 'm-subfloor', plannedQty: 210 },
    ],
  },
  {
    id: 'd-a3',
    areaId: 'a-a3',
    name: 'Building A · Level 3 — framing drop',
    plannedDate: '2026-07-10',
    status: 'requested',
    note: 'Called off with the yard, no confirmed truck yet.',
    lines: [
      { id: 'd-a3-1', materialId: 'm-stud116', plannedQty: 450 },
      { id: 'd-a3-2', materialId: 'm-2x4x16', plannedQty: 98 },
      { id: 'd-a3-3', materialId: 'm-subfloor', plannedQty: 108 },
      { id: 'd-a3-4', materialId: 'm-lvl', plannedQty: 60 },
    ],
  },
  {
    id: 'd-b1',
    areaId: 'a-b1',
    name: 'Building B · Level 1 — first drop',
    plannedDate: '2026-08-03',
    status: 'planned',
    lines: [
      { id: 'd-b1-1', materialId: 'm-stud92', plannedQty: 380 },
      { id: 'd-b1-2', materialId: 'm-2x4x16', plannedQty: 88 },
      { id: 'd-b1-3', materialId: 'm-subfloor', plannedQty: 96 },
      { id: 'd-b1-4', materialId: 'm-shaftliner', plannedQty: 85 },
    ],
  },
];

/** [id, vendorId, orderId, bol, date, [ [materialId, qty, areaId?, dropId?], ... ] ] */
type DeliverySpec = [string, string, string, string, string, [string, number, string?, string?][], string?];

const deliverySpecs: DeliverySpec[] = [
  ['dl-1', 'v-pls', 'o-2201', 'PLS-44120', '2026-04-28', [
    ['m-stud116', 600, 'a-a1'],
    ['m-2x4x16', 190, 'a-a1'],
    ['m-2x4x20', 300],
  ], 'Yard stock 20-footers staged at the laydown area.'],

  ['dl-2', 'v-bmc', 'o-2202', 'BMC-77301', '2026-04-30', [
    ['m-osb-po', 340, 'a-a1'],
    ['m-subfloor', 210, 'a-a1'],
  ]],

  ['dl-3', 'v-fst', 'o-2203', 'FST-9912', '2026-05-06', [
    ['m-hanger', 300, 'a-a1'],
    ['m-sds', 15, 'a-a1'],
    ['m-hdu5-po', 20, 'a-a1'],
  ]],

  ['dl-4', 'v-pls', 'o-2201', 'PLS-44655', '2026-06-10', [
    ['m-stud116', 600, 'a-a2'],
    ['m-2x4x16', 150, 'a-a2'],
    ['m-stud104', 130, 'a-a3'],
  ]],

  ['dl-5', 'v-bmc', 'o-2202', 'BMC-78240', '2026-06-12', [
    ['m-osb-po', 360, 'a-a2', 'd-a2'],
    ['m-subfloor', 210, 'a-a2', 'd-a2'],
  ], 'Level 2 panel drop, complete.'],

  ['dl-6', 'v-bsi', 'o-2204', 'BSI-3320', '2026-06-25', [
    ['m-wrb', 10, 'a-a2'],
    ['m-shaftliner', 90, 'a-b1'],
  ]],
];

const deliveries: Delivery[] = deliverySpecs.map(([id, vendorId, orderId, bolNumber, date, lines, note]) => ({
  id,
  vendorId,
  orderId,
  bolNumber,
  date,
  note,
  lines: lines.map(([materialId, qty, areaId, dropId], i) => ({
    id: `${id}-l${i + 1}`,
    materialId,
    qty,
    areaId,
    dropId,
  })),
}));

/** Counts taken on the same walk as the progress update. */
const countTable: [string, number][] = [
  ['m-stud116', 320],
  ['m-2x4x16', 170],
  ['m-subfloor', 240],
  ['m-hanger', 130],
  ['m-2x4x20', 300],
  ['m-wrb', 2],
  ['m-stud104', 130],
  ['m-osb-po', 120],
];

const inventoryCounts: InventoryCount[] = countTable.map(([materialId, qty], i) => ({
  id: `ic-${i + 1}`,
  date: '2026-07-14',
  materialId,
  qty,
  note: 'Weekly count with progress walk',
}));

const progressEntries: ProgressEntry[] = areas
  .filter((a) => a.progressPct > 0)
  .map((area, i) => ({
    id: `pr-${i + 1}`,
    areaId: area.id,
    date: '2026-07-14',
    pct: area.progressPct,
    note: 'Weekly progress walk',
  }));

export function createSeedState(): AppState {
  return {
    version: STATE_VERSION,
    project: {
      name: 'Aspen Ridge Apartments — Framing',
      today: TODAY,
      usageTolerancePct: 10,
      shortageTolerance: 5,
    },
    vendors,
    materials,
    areas,
    takeoffLines,
    orders,
    deliveries,
    drops,
    inventoryCounts,
    progressEntries,
    payments: [
      { id: 'pay-1', vendorId: 'v-pls', orderId: 'o-2201', date: '2026-05-15', amount: 32000, reference: 'ACH 88213' },
      { id: 'pay-2', vendorId: 'v-bmc', orderId: 'o-2202', date: '2026-05-20', amount: 18000, reference: 'ACH 88240' },
      { id: 'pay-3', vendorId: 'v-fst', orderId: 'o-2203', date: '2026-06-01', amount: 2200, reference: 'CHK 4471' },
    ],
    substitutions: [],
    rejectedMatches: [],
  };
}

export function createEmptyState(): AppState {
  return {
    version: STATE_VERSION,
    project: {
      name: 'New project',
      today: TODAY,
      usageTolerancePct: 10,
      shortageTolerance: 5,
    },
    vendors: [],
    materials: [],
    areas: [],
    takeoffLines: [],
    orders: [],
    deliveries: [],
    drops: [],
    inventoryCounts: [],
    progressEntries: [],
    payments: [],
    substitutions: [],
    rejectedMatches: [],
  };
}
