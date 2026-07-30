/**
 * State container.
 *
 * The reducer is pure and exported on its own so it can be tested without React
 * or a DOM. Persistence is a thin localStorage wrapper behind a version gate —
 * swapping it for an API client later touches only this file.
 */

import type {
  AppState,
  Area,
  Delivery,
  Drop,
  InventoryCount,
  Material,
  Order,
  Payment,
  ProgressEntry,
  ProjectSettings,
  Substitution,
  TakeoffLine,
  Vendor,
} from './types';
import { mergeMaterials, pairKey } from './engine/matching';
import { createSeedState, createEmptyState, STATE_VERSION } from './seed';

export const STORAGE_KEY = 'material-control.v1';

let idCounter = 0;

export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export type Action =
  | { type: 'project/update'; patch: Partial<ProjectSettings> }
  | { type: 'vendor/add'; vendor: Vendor }
  | { type: 'vendor/update'; id: string; patch: Partial<Vendor> }
  | { type: 'material/update'; id: string; patch: Partial<Material> }
  | { type: 'material/delete'; id: string }
  | { type: 'material/merge'; keepId: string; dropId: string }
  | { type: 'match/accept'; takeoffMaterialId: string; orderMaterialId: string }
  | { type: 'match/reject'; aId: string; bId: string }
  | { type: 'area/add'; area: Area }
  | { type: 'area/update'; id: string; patch: Partial<Area> }
  | { type: 'area/delete'; id: string }
  | { type: 'takeoff/add'; line: TakeoffLine }
  | { type: 'takeoff/update'; id: string; patch: Partial<TakeoffLine> }
  | { type: 'takeoff/delete'; id: string }
  | { type: 'order/add'; order: Order }
  | { type: 'order/update'; id: string; patch: Partial<Order> }
  | { type: 'order/delete'; id: string }
  | { type: 'delivery/add'; delivery: Delivery }
  | { type: 'delivery/update'; id: string; patch: Partial<Delivery> }
  | { type: 'delivery/delete'; id: string }
  | { type: 'drop/add'; drop: Drop }
  | { type: 'drop/update'; id: string; patch: Partial<Drop> }
  | { type: 'drop/delete'; id: string }
  | { type: 'inventory/add'; count: InventoryCount }
  | { type: 'inventory/delete'; id: string }
  | { type: 'progress/record'; entry: ProgressEntry }
  | { type: 'payment/add'; payment: Payment }
  | { type: 'payment/delete'; id: string }
  | { type: 'substitution/decide'; substitution: Substitution }
  | { type: 'state/replace'; state: AppState }
  | { type: 'state/reset'; mode: 'seed' | 'empty' };

function patchById<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>): T[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'project/update':
      return { ...state, project: { ...state.project, ...action.patch } };

    case 'vendor/add':
      return { ...state, vendors: [...state.vendors, action.vendor] };
    case 'vendor/update':
      return { ...state, vendors: patchById(state.vendors, action.id, action.patch) };

    case 'material/update':
      return { ...state, materials: patchById(state.materials, action.id, action.patch) };

    case 'material/delete':
      // Every reference goes with it, or the reports would carry dangling ids.
      return {
        ...state,
        materials: state.materials.filter((m) => m.id !== action.id),
        takeoffLines: state.takeoffLines.filter((l) => l.materialId !== action.id),
        orders: state.orders.map((o) => ({ ...o, lines: o.lines.filter((l) => l.materialId !== action.id) })),
        deliveries: state.deliveries.map((d) => ({
          ...d,
          lines: d.lines.filter((l) => l.materialId !== action.id),
        })),
        drops: state.drops.map((d) => ({ ...d, lines: d.lines.filter((l) => l.materialId !== action.id) })),
        inventoryCounts: state.inventoryCounts.filter((c) => c.materialId !== action.id),
        substitutions: state.substitutions.filter(
          (s) => s.fromMaterialId !== action.id && s.toMaterialId !== action.id,
        ),
      };

    case 'material/merge':
      return mergeMaterials(state, action.keepId, action.dropId);

    case 'match/accept':
      // The order material survives, so the takeoff adopts the vendor's wording.
      return mergeMaterials(state, action.orderMaterialId, action.takeoffMaterialId);

    case 'match/reject': {
      const key = pairKey(action.aId, action.bId);
      if (state.rejectedMatches.includes(key)) return state;
      return { ...state, rejectedMatches: [...state.rejectedMatches, key] };
    }

    case 'area/add':
      return { ...state, areas: [...state.areas, action.area] };
    case 'area/update':
      return { ...state, areas: patchById(state.areas, action.id, action.patch) };
    case 'area/delete':
      return {
        ...state,
        areas: state.areas.filter((a) => a.id !== action.id),
        takeoffLines: state.takeoffLines.filter((l) => l.areaId !== action.id),
        drops: state.drops.filter((d) => d.areaId !== action.id),
        progressEntries: state.progressEntries.filter((p) => p.areaId !== action.id),
      };

    case 'takeoff/add':
      return { ...state, takeoffLines: [...state.takeoffLines, action.line] };
    case 'takeoff/update':
      return { ...state, takeoffLines: patchById(state.takeoffLines, action.id, action.patch) };
    case 'takeoff/delete':
      return { ...state, takeoffLines: state.takeoffLines.filter((l) => l.id !== action.id) };

    case 'order/add':
      return { ...state, orders: [...state.orders, action.order] };
    case 'order/update':
      return { ...state, orders: patchById(state.orders, action.id, action.patch) };
    case 'order/delete':
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.id),
        // Tickets keep their vendor but lose the order link rather than vanishing.
        deliveries: state.deliveries.map((d) =>
          d.orderId === action.id ? { ...d, orderId: undefined } : d,
        ),
        payments: state.payments.map((p) => (p.orderId === action.id ? { ...p, orderId: undefined } : p)),
      };

    case 'delivery/add':
      return { ...state, deliveries: [...state.deliveries, action.delivery] };
    case 'delivery/update':
      return { ...state, deliveries: patchById(state.deliveries, action.id, action.patch) };
    case 'delivery/delete':
      return { ...state, deliveries: state.deliveries.filter((d) => d.id !== action.id) };

    case 'drop/add':
      return { ...state, drops: [...state.drops, action.drop] };
    case 'drop/update':
      return { ...state, drops: patchById(state.drops, action.id, action.patch) };
    case 'drop/delete':
      return {
        ...state,
        drops: state.drops.filter((d) => d.id !== action.id),
        deliveries: state.deliveries.map((d) => ({
          ...d,
          lines: d.lines.map((l) => (l.dropId === action.id ? { ...l, dropId: undefined } : l)),
        })),
      };

    case 'inventory/add':
      return { ...state, inventoryCounts: [...state.inventoryCounts, action.count] };
    case 'inventory/delete':
      return { ...state, inventoryCounts: state.inventoryCounts.filter((c) => c.id !== action.id) };

    case 'progress/record':
      // Progress is both a history entry and the area's current figure.
      return {
        ...state,
        progressEntries: [...state.progressEntries, action.entry],
        areas: patchById(state.areas, action.entry.areaId, { progressPct: action.entry.pct }),
      };

    case 'payment/add':
      return { ...state, payments: [...state.payments, action.payment] };
    case 'payment/delete':
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) };

    case 'substitution/decide': {
      const existing = state.substitutions.find((s) => s.id === action.substitution.id);
      return {
        ...state,
        substitutions: existing
          ? patchById(state.substitutions, action.substitution.id, action.substitution)
          : [...state.substitutions, action.substitution],
      };
    }

    case 'state/replace':
      return action.state;
    case 'state/reset':
      return action.mode === 'seed' ? createSeedState() : createEmptyState();

    default:
      return state;
  }
}

const REQUIRED_ARRAYS: (keyof AppState)[] = [
  'vendors',
  'materials',
  'areas',
  'takeoffLines',
  'orders',
  'deliveries',
  'drops',
  'inventoryCounts',
  'progressEntries',
  'payments',
  'substitutions',
  'rejectedMatches',
];

export function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppState>;
  if (candidate.version !== STATE_VERSION) return false;
  if (!candidate.project || typeof candidate.project.today !== 'string') return false;
  return REQUIRED_ARRAYS.every((key) => Array.isArray(candidate[key]));
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return createSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : createSeedState();
  } catch {
    // A corrupt entry must never stop the app from opening.
    return createSeedState();
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
  }
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export interface ImportResult {
  ok: boolean;
  state?: AppState;
  error?: string;
}

export function parseImport(text: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isValidState(parsed)) {
      return { ok: false, error: `Not a valid Material Control export (expected version ${STATE_VERSION}).` };
    }
    return { ok: true, state: parsed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not parse JSON.' };
  }
}
