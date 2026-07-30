/**
 * Domain model for Material Control.
 *
 * Dates are plain 'YYYY-MM-DD' calendar strings. Nothing in the engine reads the
 * system clock — the reference date lives on the project record and is passed
 * into every calculation, which keeps the whole system deterministic.
 */

export type Unit = 'EA' | 'LF' | 'SF' | 'SHT' | 'LB' | 'BX' | 'ROLL' | 'GAL';

export const UNITS: Unit[] = ['EA', 'LF', 'SF', 'SHT', 'LB', 'BX', 'ROLL', 'GAL'];

/** Top-level material families. */
export type MaterialGroup =
  | 'Lumber'
  | 'Sheathing'
  | 'WRB'
  | 'Siding'
  | 'Firewall'
  | 'Hardware'
  | 'Other';

export const MATERIAL_GROUPS: MaterialGroup[] = [
  'Lumber',
  'Sheathing',
  'WRB',
  'Siding',
  'Firewall',
  'Hardware',
  'Other',
];

export type LumberSubgroup =
  | 'Studs'
  | 'FRT Studs'
  | 'Regular Lumber'
  | 'PT Lumber'
  | 'FRT Lumber'
  | 'EWP';

export type SheathingSubgroup = 'Regular Sheathing' | 'FRT Sheathing' | 'PT Sheathing';

export type MaterialSubgroup = LumberSubgroup | SheathingSubgroup | 'None';

/** Only Lumber and Sheathing carry subgroups; everything else is 'None'. */
export const SUBGROUPS_BY_GROUP: Record<MaterialGroup, MaterialSubgroup[]> = {
  Lumber: ['Studs', 'FRT Studs', 'Regular Lumber', 'PT Lumber', 'FRT Lumber', 'EWP'],
  Sheathing: ['Regular Sheathing', 'FRT Sheathing', 'PT Sheathing'],
  WRB: ['None'],
  Siding: ['None'],
  Firewall: ['None'],
  Hardware: ['None'],
  Other: ['None'],
};

/** Chemical treatment, which makes two otherwise identical sticks different materials. */
export type Treatment = 'NONE' | 'PT' | 'FRT';

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
}

/**
 * A canonical material.
 *
 * Takeoffs and purchase orders describe the same stick of lumber differently —
 * `2x4x10 (PET 116 5/8") DF#2` against `2x4x116 5/8" DF2`. Both raw strings end
 * up in `aliases` on a single Material whose `description` follows the purchase
 * order wording, so ordering, receiving and reporting all speak the vendor's
 * language.
 */
export interface Material {
  id: string;
  /** Display name. Adopts the purchase-order wording once a match is confirmed. */
  description: string;
  /** Original takeoff wording, kept so the estimate stays traceable. */
  takeoffDescription?: string;
  /** Every raw string ever seen for this material, from any source. */
  aliases: string[];
  /** Parsed signature used for automatic correlation. */
  canonicalKey: string;
  group: MaterialGroup;
  subgroup: MaterialSubgroup;
  unit: Unit;
  /** Nominal cross-section, e.g. '2x4'. */
  nominal?: string;
  /** True length in inches, e.g. 116.625 for a 116-5/8" precision-end-trimmed stud. */
  lengthIn?: number;
  species?: string;
  grade?: string;
  treatment: Treatment;
  note?: string;
}

/**
 * A section-and-level pair — the grain at which takeoff, progress, drops and
 * delivery attribution all work.
 */
export interface Area {
  id: string;
  section: string;
  level: string;
  /** Build order. Drives drop sequencing and the usage forecast. */
  sequence: number;
  plannedStart?: string;
  /** Percent framed, updated by the user alongside each inventory count. */
  progressPct: number;
  note?: string;
}

export interface TakeoffLine {
  id: string;
  areaId: string;
  materialId: string;
  qty: number;
  /** The string as it appeared in the takeoff, before correlation. */
  rawDescription: string;
  note?: string;
}

export type OrderKind = 'PO' | 'CO';
export type OrderStatus = 'open' | 'closed' | 'void';

export interface OrderLine {
  id: string;
  materialId: string;
  /** Negative on a change order that credits material back. */
  qty: number;
  unitCost: number;
  rawDescription: string;
}

export interface Order {
  id: string;
  kind: OrderKind;
  /** PO or CO number as issued. */
  number: string;
  vendorId: string;
  date: string;
  status: OrderStatus;
  description?: string;
  lines: OrderLine[];
}

export interface DeliveryLine {
  id: string;
  materialId: string;
  qty: number;
  /** Which area the material was dropped at, when known. */
  areaId?: string;
  /** The planned drop this ticket fulfils, when it was called off one. */
  dropId?: string;
}

export interface Delivery {
  id: string;
  vendorId: string;
  /** The order this ticket ships against. Vendors are limited to those with an order. */
  orderId?: string;
  bolNumber: string;
  date: string;
  lines: DeliveryLine[];
  note?: string;
}

export type DropStatus = 'planned' | 'requested' | 'partial' | 'delivered' | 'cancelled';

export interface DropLine {
  id: string;
  materialId: string;
  plannedQty: number;
}

/**
 * A staged release of material to one area — so the site only receives what the
 * next stretch of work needs rather than the whole package at once.
 */
export interface Drop {
  id: string;
  areaId: string;
  name: string;
  plannedDate?: string;
  status: DropStatus;
  lines: DropLine[];
  note?: string;
}

/** A physical count of what is on the ground, taken with a progress update. */
export interface InventoryCount {
  id: string;
  date: string;
  materialId: string;
  qty: number;
  note?: string;
}

/** Progress snapshot, recorded at the same moment as the inventory count. */
export interface ProgressEntry {
  id: string;
  areaId: string;
  date: string;
  pct: number;
  note?: string;
}

export interface Payment {
  id: string;
  vendorId: string;
  orderId?: string;
  date: string;
  amount: number;
  reference?: string;
}

export type SubstitutionStatus = 'suggested' | 'accepted' | 'declined';

/**
 * Using surplus long stock in lieu of a short item by cutting it down.
 * Always proposed, never applied automatically.
 */
export interface Substitution {
  id: string;
  /** Surplus material being cut. */
  fromMaterialId: string;
  /** Short material being covered. */
  toMaterialId: string;
  /** Pieces of the surplus material consumed. */
  qtyFrom: number;
  /** Pieces of the short material produced. */
  qtyTo: number;
  status: SubstitutionStatus;
  note?: string;
  decidedOn?: string;
}

export interface ProjectSettings {
  name: string;
  /** Reference date for every time-based calculation. */
  today: string;
  /** Percentage points of burn-rate deviation tolerated before flagging. */
  usageTolerancePct: number;
  /** Quantity below which an over/short prediction is treated as noise. */
  shortageTolerance: number;
}

export interface AppState {
  version: number;
  project: ProjectSettings;
  vendors: Vendor[];
  materials: Material[];
  areas: Area[];
  takeoffLines: TakeoffLine[];
  orders: Order[];
  deliveries: Delivery[];
  drops: Drop[];
  inventoryCounts: InventoryCount[];
  progressEntries: ProgressEntry[];
  payments: Payment[];
  substitutions: Substitution[];
  /**
   * Correlation pairs the user has explicitly rejected, keyed `a|b` with the
   * ids sorted, so a declined suggestion never comes back.
   */
  rejectedMatches: string[];
}
