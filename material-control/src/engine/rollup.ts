/**
 * The reconciliation engine.
 *
 * Five quantities live in five different places on a job: what the takeoff
 * calls for, what was bought, what was delivered, what is physically on the
 * ground, and how much of the work is actually built. Everything expensive
 * hides in the gaps between them.
 *
 * Usage is never entered directly — it is *derived*. What the crew consumed is
 * `delivered − counted`, which is why the inventory count and the progress
 * update have to happen together. Comparing that derived usage against the
 * takeoff scaled by progress is what turns this from a ledger into a forecast.
 */

import type { AppState, Area, Material, Order } from '../types';

export type MaterialFlagKind =
  | 'no-order'
  | 'purchase-short'
  | 'purchase-excess'
  | 'predicted-short'
  | 'predicted-excess'
  | 'burn-high'
  | 'burn-low'
  | 'over-delivered'
  | 'cost-over-commitment';

export interface MaterialFlag {
  kind: MaterialFlagKind;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  qty?: number;
  amount?: number;
}

export interface MaterialRollup {
  materialId: string;
  material: Material;

  /** Quantity the takeoff calls for, across every area. */
  takeoffQty: number;
  /** Net bought — purchase orders plus change orders, which may credit back. */
  orderedQty: number;
  poQty: number;
  coQty: number;
  deliveredQty: number;

  /** Latest physical count, when one has been taken. */
  countedQty?: number;
  countedOn?: string;

  /** delivered − counted. The only honest measure of what was consumed. */
  impliedUsedQty?: number;
  /** Takeoff scaled by how much of each area is built. */
  expectedUsedQty: number;
  /** Weighted percent of this material's scope that is built. */
  overallProgressPct: number;
  /** Where usage lands at 100% if the current burn rate holds. */
  projectedTotalUsage: number;

  /** impliedUsed − expectedUsed. Positive means burning faster than building. */
  usageVariance?: number;
  usageVariancePct?: number;

  /** ordered − takeoff. Negative means the buy does not cover the estimate. */
  purchaseGap: number;
  /** ordered − projected usage. Negative predicts a shortage. */
  predictedBalance: number;

  remainingToDeliver: number;
  deliveredPct: number;

  committedCost: number;
  receivedCost: number;

  flags: MaterialFlag[];
}

export interface AreaMaterialRow {
  materialId: string;
  material: Material;
  takeoffQty: number;
  deliveredQty: number;
  plannedDropQty: number;
  remainingQty: number;
  deliveredPct: number;
}

export interface AreaRollup {
  area: Area;
  progressPct: number;
  lineCount: number;
  takeoffQty: number;
  deliveredQty: number;
  deliveredPct: number;
  rows: AreaMaterialRow[];
}

function sum<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((total, row) => total + fn(row), 0);
}

/** A voided order never counted; everything else does, including credits. */
export function isLiveOrder(order: Order): boolean {
  return order.status !== 'void';
}

/** Unit price for a material, most recent live order wins. */
export function latestUnitCost(state: AppState, materialId: string): number | undefined {
  const priced = state.orders
    .filter(isLiveOrder)
    .flatMap((o) => o.lines.filter((l) => l.materialId === materialId).map((l) => ({ date: o.date, cost: l.unitCost })))
    .sort((a, b) => a.date.localeCompare(b.date));
  return priced.length ? priced[priced.length - 1].cost : undefined;
}

export function rollupMaterials(state: AppState): MaterialRollup[] {
  const { materials, areas, takeoffLines, orders, deliveries, inventoryCounts, project } = state;
  const liveOrders = orders.filter(isLiveOrder);
  const areaById = new Map(areas.map((a) => [a.id, a]));

  return materials.map((material) => {
    const lines = takeoffLines.filter((l) => l.materialId === material.id);
    const takeoffQty = sum(lines, (l) => l.qty);

    const orderLines = liveOrders.flatMap((o) =>
      o.lines.filter((l) => l.materialId === material.id).map((l) => ({ order: o, line: l })),
    );
    const poQty = sum(orderLines.filter((r) => r.order.kind === 'PO'), (r) => r.line.qty);
    const coQty = sum(orderLines.filter((r) => r.order.kind === 'CO'), (r) => r.line.qty);
    const orderedQty = poQty + coQty;
    const committedCost = sum(orderLines, (r) => r.line.qty * r.line.unitCost);

    const deliveredQty = sum(
      deliveries.flatMap((d) => d.lines.filter((l) => l.materialId === material.id)),
      (l) => l.qty,
    );

    const unitCost = latestUnitCost(state, material.id) ?? 0;
    const receivedCost = deliveredQty * unitCost;

    // Latest count is the reference — earlier counts are superseded.
    const counts = inventoryCounts
      .filter((c) => c.materialId === material.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const latestCount = counts.length ? counts[counts.length - 1] : undefined;
    const countedQty = latestCount?.qty;
    const impliedUsedQty = countedQty !== undefined ? deliveredQty - countedQty : undefined;

    // Expected usage weights each area's takeoff by that area's progress.
    const expectedUsedQty = sum(lines, (l) => {
      const area = areaById.get(l.areaId);
      return l.qty * ((area?.progressPct ?? 0) / 100);
    });
    const overallProgressPct = takeoffQty > 0 ? (expectedUsedQty / takeoffQty) * 100 : 0;

    // A burn rate needs two things to mean anything: enough progress to divide
    // by, and some material actually consumed. Material delivered but untouched
    // would otherwise project zero total usage and read as a huge surplus.
    const hasBurnRate = impliedUsedQty !== undefined && impliedUsedQty > 0 && overallProgressPct >= 5;
    const projectedTotalUsage = hasBurnRate
      ? impliedUsedQty! / (overallProgressPct / 100)
      : takeoffQty;

    const usageVariance = impliedUsedQty !== undefined ? impliedUsedQty - expectedUsedQty : undefined;
    const usageVariancePct =
      usageVariance !== undefined && expectedUsedQty > 0 ? (usageVariance / expectedUsedQty) * 100 : undefined;

    const purchaseGap = orderedQty - takeoffQty;
    const predictedBalance = orderedQty - projectedTotalUsage;
    const remainingToDeliver = Math.max(0, takeoffQty - deliveredQty);

    const flags = buildFlags({
      material,
      takeoffQty,
      orderedQty,
      deliveredQty,
      purchaseGap,
      predictedBalance,
      usageVariancePct,
      committedCost,
      receivedCost,
      tolerance: project.shortageTolerance,
      usageTolerancePct: project.usageTolerancePct,
    });

    return {
      materialId: material.id,
      material,
      takeoffQty,
      orderedQty,
      poQty,
      coQty,
      deliveredQty,
      countedQty,
      countedOn: latestCount?.date,
      impliedUsedQty,
      expectedUsedQty,
      overallProgressPct,
      projectedTotalUsage,
      usageVariance,
      usageVariancePct,
      purchaseGap,
      predictedBalance,
      remainingToDeliver,
      deliveredPct: takeoffQty > 0 ? (deliveredQty / takeoffQty) * 100 : deliveredQty > 0 ? 100 : 0,
      committedCost,
      receivedCost,
      flags,
    };
  });
}

interface FlagInput {
  material: Material;
  takeoffQty: number;
  orderedQty: number;
  deliveredQty: number;
  purchaseGap: number;
  predictedBalance: number;
  usageVariancePct?: number;
  committedCost: number;
  receivedCost: number;
  tolerance: number;
  usageTolerancePct: number;
}

function buildFlags(input: FlagInput): MaterialFlag[] {
  const {
    material,
    takeoffQty,
    orderedQty,
    deliveredQty,
    purchaseGap,
    predictedBalance,
    usageVariancePct,
    committedCost,
    receivedCost,
    tolerance,
    usageTolerancePct,
  } = input;

  const flags: MaterialFlag[] = [];
  const unit = material.unit;

  // Nothing ordered at all is usually one of two things: a genuine purchasing
  // gap, or a material whose purchase order is filed under different wording
  // and has not been correlated yet. Either way it is the headline.
  const nothingOrdered = takeoffQty > 0 && orderedQty === 0;

  if (nothingOrdered) {
    flags.push({
      kind: 'no-order',
      severity: 'critical',
      message: `${takeoffQty} ${unit} in the takeoff with no PO or CO against it.`,
      qty: takeoffQty,
    });
  } else if (purchaseGap < -tolerance) {
    flags.push({
      kind: 'purchase-short',
      severity: 'critical',
      message: `Purchased quantity is ${Math.abs(purchaseGap).toFixed(0)} ${unit} below the takeoff.`,
      qty: Math.abs(purchaseGap),
    });
  } else if (purchaseGap > tolerance && takeoffQty > 0) {
    flags.push({
      kind: 'purchase-excess',
      severity: 'info',
      message: `Purchased ${purchaseGap.toFixed(0)} ${unit} more than the takeoff calls for.`,
      qty: purchaseGap,
    });
  }

  // With nothing ordered the shortage is arithmetic, not a forecast, and
  // repeating it just doubles the noise on every uncorrelated material.
  if (predictedBalance < -tolerance && !nothingOrdered) {
    flags.push({
      kind: 'predicted-short',
      severity: 'critical',
      message: `Forecast to run ${Math.abs(predictedBalance).toFixed(0)} ${unit} short at the current burn rate.`,
      qty: Math.abs(predictedBalance),
    });
  } else if (predictedBalance > tolerance && takeoffQty > 0) {
    flags.push({
      kind: 'predicted-excess',
      severity: 'info',
      message: `Forecast to finish with ${predictedBalance.toFixed(0)} ${unit} left over.`,
      qty: predictedBalance,
    });
  }

  if (usageVariancePct !== undefined && usageVariancePct > usageTolerancePct) {
    flags.push({
      kind: 'burn-high',
      severity: 'warning',
      message: `Using ${usageVariancePct.toFixed(0)}% more than progress accounts for.`,
    });
  } else if (usageVariancePct !== undefined && usageVariancePct < -usageTolerancePct) {
    flags.push({
      kind: 'burn-low',
      severity: 'info',
      message: `Using ${Math.abs(usageVariancePct).toFixed(0)}% less than progress accounts for — check the count.`,
    });
  }

  if (orderedQty > 0 && deliveredQty > orderedQty + tolerance) {
    flags.push({
      kind: 'over-delivered',
      severity: 'warning',
      message: `Received ${(deliveredQty - orderedQty).toFixed(0)} ${unit} more than was ordered.`,
      qty: deliveredQty - orderedQty,
    });
  }

  if (committedCost > 0 && receivedCost > committedCost * 1.001) {
    flags.push({
      kind: 'cost-over-commitment',
      severity: 'critical',
      message: `Received value exceeds the commitment by ${(receivedCost - committedCost).toFixed(0)}.`,
      amount: receivedCost - committedCost,
    });
  }

  return flags;
}

/** Takeoff and delivery broken down by area, for drop planning and tracking. */
export function rollupAreas(state: AppState): AreaRollup[] {
  const { areas, takeoffLines, deliveries, drops, materials } = state;
  const materialById = new Map(materials.map((m) => [m.id, m]));

  return [...areas]
    .sort((a, b) => a.sequence - b.sequence)
    .map((area) => {
      const lines = takeoffLines.filter((l) => l.areaId === area.id);
      const materialIds = [...new Set(lines.map((l) => l.materialId))];

      const rows: AreaMaterialRow[] = materialIds
        .map((materialId) => {
          const material = materialById.get(materialId);
          if (!material) return undefined;
          const takeoffQty = sum(lines.filter((l) => l.materialId === materialId), (l) => l.qty);
          const deliveredQty = sum(
            deliveries.flatMap((d) => d.lines.filter((l) => l.materialId === materialId && l.areaId === area.id)),
            (l) => l.qty,
          );
          const plannedDropQty = sum(
            drops
              .filter((d) => d.areaId === area.id && d.status !== 'cancelled')
              .flatMap((d) => d.lines.filter((l) => l.materialId === materialId)),
            (l) => l.plannedQty,
          );
          return {
            materialId,
            material,
            takeoffQty,
            deliveredQty,
            plannedDropQty,
            remainingQty: Math.max(0, takeoffQty - deliveredQty),
            deliveredPct: takeoffQty > 0 ? (deliveredQty / takeoffQty) * 100 : 0,
          };
        })
        .filter((r): r is AreaMaterialRow => Boolean(r))
        .sort((a, b) => a.material.description.localeCompare(b.material.description));

      const takeoffQty = sum(rows, (r) => r.takeoffQty);
      const deliveredQty = sum(rows, (r) => Math.min(r.deliveredQty, r.takeoffQty));

      return {
        area,
        progressPct: area.progressPct,
        lineCount: rows.length,
        takeoffQty,
        deliveredQty,
        deliveredPct: takeoffQty > 0 ? (deliveredQty / takeoffQty) * 100 : 0,
        rows,
      };
    });
}

export interface ProjectSummary {
  materialCount: number;
  takeoffValue: number;
  committedCost: number;
  receivedCost: number;
  paidAmount: number;
  deliveredPct: number;
  progressPct: number;
  criticalFlags: number;
  warningFlags: number;
  unmatchedCount: number;
  shortMaterials: number;
}

export function summarize(state: AppState, rollups: MaterialRollup[], unmatchedCount: number): ProjectSummary {
  const active = rollups.filter((r) => r.takeoffQty > 0 || r.orderedQty !== 0 || r.deliveredQty > 0);
  const takeoffValue = sum(active, (r) => r.takeoffQty * (latestUnitCost(state, r.materialId) ?? 0));
  const committedCost = sum(active, (r) => r.committedCost);
  const receivedCost = sum(active, (r) => r.receivedCost);

  // Delivery and progress are value-weighted so a truss package outranks screws.
  const deliverableValue = sum(active, (r) => r.takeoffQty * (latestUnitCost(state, r.materialId) ?? 0));
  const deliveredValue = sum(
    active,
    (r) => Math.min(r.deliveredQty, r.takeoffQty) * (latestUnitCost(state, r.materialId) ?? 0),
  );

  const areaWeight = state.areas.reduce((total, a) => total + a.progressPct, 0);

  return {
    materialCount: active.length,
    takeoffValue,
    committedCost,
    receivedCost,
    paidAmount: sum(state.payments, (p) => p.amount),
    deliveredPct: deliverableValue > 0 ? (deliveredValue / deliverableValue) * 100 : 0,
    progressPct: state.areas.length > 0 ? areaWeight / state.areas.length : 0,
    criticalFlags: sum(active, (r) => r.flags.filter((f) => f.severity === 'critical').length),
    warningFlags: sum(active, (r) => r.flags.filter((f) => f.severity === 'warning').length),
    unmatchedCount,
    shortMaterials: active.filter((r) =>
      r.flags.some((f) => f.kind === 'predicted-short' || f.kind === 'purchase-short' || f.kind === 'no-order'),
    ).length,
  };
}
