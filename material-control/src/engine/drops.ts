/**
 * Section delivery drops.
 *
 * Sending a whole framing package to site at once buries the crew and invites
 * damage and theft. A drop is a staged release for one area — section and level
 * — so only the material the next stretch of work needs comes through the gate.
 *
 * A drop is planned against what that area still needs, not against its whole
 * takeoff, so re-planning after a partial delivery never double-orders.
 */

import type { AppState, Drop, DropStatus, Material } from '../types';

export interface DropLineStatus {
  materialId: string;
  material?: Material;
  plannedQty: number;
  deliveredQty: number;
  outstandingQty: number;
  deliveredPct: number;
}

export interface DropRollup {
  drop: Drop;
  areaLabel: string;
  lines: DropLineStatus[];
  plannedTotal: number;
  deliveredTotal: number;
  deliveredPct: number;
  /** Status implied by the receipts, which may differ from the stored one. */
  derivedStatus: DropStatus;
  isLate: boolean;
}

function sum<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((total, row) => total + fn(row), 0);
}

export function areaLabel(state: AppState, areaId: string): string {
  const area = state.areas.find((a) => a.id === areaId);
  return area ? `${area.section} · ${area.level}` : 'Unassigned';
}

/**
 * Quantity still needed at an area: takeoff less everything already delivered
 * there, less what other open drops have already committed.
 */
export function outstandingForArea(
  state: AppState,
  areaId: string,
  excludeDropId?: string,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const line of state.takeoffLines.filter((l) => l.areaId === areaId)) {
    result.set(line.materialId, (result.get(line.materialId) ?? 0) + line.qty);
  }

  for (const delivery of state.deliveries) {
    for (const line of delivery.lines.filter((l) => l.areaId === areaId)) {
      result.set(line.materialId, (result.get(line.materialId) ?? 0) - line.qty);
    }
  }

  for (const drop of state.drops) {
    if (drop.areaId !== areaId) continue;
    if (drop.id === excludeDropId) continue;
    if (drop.status === 'cancelled' || drop.status === 'delivered') continue;
    for (const line of drop.lines) {
      result.set(line.materialId, (result.get(line.materialId) ?? 0) - line.plannedQty);
    }
  }

  // Only positive remainders are worth putting on a truck.
  for (const [materialId, qty] of [...result]) {
    if (qty <= 0) result.delete(materialId);
  }

  return result;
}

export function rollupDrops(state: AppState): DropRollup[] {
  const materialById = new Map(state.materials.map((m) => [m.id, m]));

  return [...state.drops]
    .sort((a, b) => (a.plannedDate ?? '9999').localeCompare(b.plannedDate ?? '9999'))
    .map((drop) => {
      const lines: DropLineStatus[] = drop.lines.map((line) => {
        const deliveredQty = sum(
          state.deliveries.flatMap((d) =>
            d.lines.filter((l) => l.dropId === drop.id && l.materialId === line.materialId),
          ),
          (l) => l.qty,
        );
        return {
          materialId: line.materialId,
          material: materialById.get(line.materialId),
          plannedQty: line.plannedQty,
          deliveredQty,
          outstandingQty: Math.max(0, line.plannedQty - deliveredQty),
          deliveredPct: line.plannedQty > 0 ? (deliveredQty / line.plannedQty) * 100 : 100,
        };
      });

      const plannedTotal = sum(lines, (l) => l.plannedQty);
      const deliveredTotal = sum(lines, (l) => Math.min(l.deliveredQty, l.plannedQty));
      const deliveredPct = plannedTotal > 0 ? (deliveredTotal / plannedTotal) * 100 : 0;

      let derivedStatus: DropStatus = drop.status;
      if (drop.status !== 'cancelled') {
        if (deliveredPct >= 99.95) derivedStatus = 'delivered';
        else if (deliveredTotal > 0) derivedStatus = 'partial';
        else derivedStatus = drop.status === 'delivered' ? 'planned' : drop.status;
      }

      return {
        drop,
        areaLabel: areaLabel(state, drop.areaId),
        lines,
        plannedTotal,
        deliveredTotal,
        deliveredPct,
        derivedStatus,
        isLate: Boolean(
          drop.plannedDate &&
            drop.plannedDate < state.project.today &&
            derivedStatus !== 'delivered' &&
            derivedStatus !== 'cancelled',
        ),
      };
    });
}

export interface MaterialDeliveryProgress {
  materialId: string;
  material: Material;
  takeoffQty: number;
  deliveredQty: number;
  deliveredPct: number;
  remainingQty: number;
  /** Delivery progress broken out per area. */
  byArea: { areaId: string; label: string; takeoffQty: number; deliveredQty: number; deliveredPct: number }[];
  /** Delivered without an area recorded — cannot be attributed to a section. */
  unallocatedQty: number;
}

/**
 * Delivery progress per material, in total and per section, which is what tells
 * the user what is still owed and lets them chase the right supplier.
 */
export function materialDeliveryProgress(state: AppState): MaterialDeliveryProgress[] {
  const areas = [...state.areas].sort((a, b) => a.sequence - b.sequence);

  return state.materials
    .map((material) => {
      const takeoffLines = state.takeoffLines.filter((l) => l.materialId === material.id);
      const takeoffQty = sum(takeoffLines, (l) => l.qty);
      const deliveryLines = state.deliveries.flatMap((d) =>
        d.lines.filter((l) => l.materialId === material.id),
      );
      const deliveredQty = sum(deliveryLines, (l) => l.qty);

      const byArea = areas
        .map((area) => {
          const areaTakeoff = sum(takeoffLines.filter((l) => l.areaId === area.id), (l) => l.qty);
          const areaDelivered = sum(deliveryLines.filter((l) => l.areaId === area.id), (l) => l.qty);
          return {
            areaId: area.id,
            label: `${area.section} · ${area.level}`,
            takeoffQty: areaTakeoff,
            deliveredQty: areaDelivered,
            deliveredPct: areaTakeoff > 0 ? (areaDelivered / areaTakeoff) * 100 : 0,
          };
        })
        .filter((row) => row.takeoffQty > 0 || row.deliveredQty > 0);

      return {
        materialId: material.id,
        material,
        takeoffQty,
        deliveredQty,
        deliveredPct: takeoffQty > 0 ? (deliveredQty / takeoffQty) * 100 : deliveredQty > 0 ? 100 : 0,
        remainingQty: Math.max(0, takeoffQty - deliveredQty),
        byArea,
        unallocatedQty: sum(deliveryLines.filter((l) => !l.areaId), (l) => l.qty),
      };
    })
    .filter((row) => row.takeoffQty > 0 || row.deliveredQty > 0);
}
