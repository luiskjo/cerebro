/**
 * Cut-down substitution suggestions.
 *
 * When one length runs short while a longer one of the same stock sits in
 * surplus, the longer piece can often be cut to cover it. This proposes those
 * swaps and never applies them: only the person on site knows whether the
 * surplus is really spare, whether the cut-off is usable, and whether the
 * engineer will accept a spliced member.
 */

import type { AppState, Material } from '../types';
import type { MaterialRollup } from './rollup';

/** Minimum pieces of shortage worth proposing a cut for. */
export const MIN_SHORTAGE = 1;

/** Surplus must exceed the shortage cover by this margin to stay genuinely spare. */
export const SURPLUS_RESERVE = 0;

export interface SubstitutionSuggestion {
  id: string;
  fromMaterialId: string;
  toMaterialId: string;
  from: Material;
  to: Material;
  /** Shortfall being covered, in pieces of the short material. */
  shortageQty: number;
  /** Short pieces obtainable from one surplus piece. */
  yieldPerPiece: number;
  /** Surplus pieces consumed. */
  qtyFrom: number;
  /** Short pieces produced. */
  qtyTo: number;
  /** Surplus available before the cut. */
  surplusAvailable: number;
  /** Waste per cut piece, in inches. */
  dropPerPieceIn: number;
  rationale: string;
}

/**
 * Two materials are interchangeable stock only if the cross-section, species,
 * grade and treatment all agree — a PT 2x6 cannot stand in for an untreated
 * 2x4, however much of it is lying about.
 */
export function isCompatibleStock(a: Material, b: Material): boolean {
  if (a.id === b.id) return false;
  if (a.group !== 'Lumber' || b.group !== 'Lumber') return false;
  if (a.treatment !== b.treatment) return false;
  if (!a.nominal || !b.nominal || a.nominal !== b.nominal) return false;
  if (a.lengthIn === undefined || b.lengthIn === undefined) return false;
  if ((a.species ?? '') !== (b.species ?? '')) return false;
  if ((a.grade ?? '') !== (b.grade ?? '')) return false;
  return true;
}

/**
 * Pair predicted shortages against predicted surpluses of longer, otherwise
 * identical stock. Each shortage draws on the shortest surplus that covers it,
 * which keeps the longest lengths free for work that genuinely needs them.
 */
export function buildSubstitutionSuggestions(
  state: AppState,
  rollups: MaterialRollup[],
): SubstitutionSuggestion[] {
  const tolerance = state.project.shortageTolerance;
  const byId = new Map(rollups.map((r) => [r.materialId, r]));

  const shortages = rollups
    .filter((r) => r.predictedBalance < -Math.max(MIN_SHORTAGE, tolerance))
    .sort((a, b) => a.predictedBalance - b.predictedBalance);

  // Surplus is tracked as it is consumed so one spare pile is not promised twice.
  const surplusPool = new Map<string, number>();
  for (const r of rollups) {
    if (r.predictedBalance > Math.max(MIN_SHORTAGE, tolerance)) {
      surplusPool.set(r.materialId, r.predictedBalance - SURPLUS_RESERVE);
    }
  }

  const decided = new Set(
    state.substitutions
      .filter((s) => s.status !== 'suggested')
      .map((s) => `${s.fromMaterialId}->${s.toMaterialId}`),
  );

  const suggestions: SubstitutionSuggestion[] = [];

  for (const shortage of shortages) {
    let remaining = Math.abs(shortage.predictedBalance);
    const target = shortage.material;
    if (target.lengthIn === undefined) continue;

    const donors = [...surplusPool.keys()]
      .map((id) => byId.get(id))
      .filter((r): r is MaterialRollup => Boolean(r))
      .filter((r) => isCompatibleStock(r.material, target))
      // Only longer stock can be cut down, and the shortest sufficient donor first.
      .filter((r) => (r.material.lengthIn ?? 0) >= target.lengthIn!)
      .sort((a, b) => (a.material.lengthIn ?? 0) - (b.material.lengthIn ?? 0));

    for (const donor of donors) {
      if (remaining <= 0) break;
      const available = surplusPool.get(donor.materialId) ?? 0;
      if (available <= 0) continue;

      const donorLength = donor.material.lengthIn!;
      const yieldPerPiece = Math.floor(donorLength / target.lengthIn!);
      if (yieldPerPiece < 1) continue;

      const piecesNeeded = Math.ceil(remaining / yieldPerPiece);
      const qtyFrom = Math.min(piecesNeeded, Math.floor(available));
      if (qtyFrom <= 0) continue;

      const qtyTo = qtyFrom * yieldPerPiece;
      const key = `${donor.materialId}->${shortage.materialId}`;
      if (decided.has(key)) continue;

      suggestions.push({
        id: key,
        fromMaterialId: donor.materialId,
        toMaterialId: shortage.materialId,
        from: donor.material,
        to: target,
        shortageQty: Math.abs(shortage.predictedBalance),
        yieldPerPiece,
        qtyFrom,
        qtyTo,
        surplusAvailable: available,
        dropPerPieceIn: donorLength - yieldPerPiece * target.lengthIn!,
        rationale: `${qtyFrom} × ${donor.material.description} cuts to ${qtyTo} × ${target.description} (${yieldPerPiece} per piece, ${(donorLength - yieldPerPiece * target.lengthIn!).toFixed(2)}" drop each).`,
      });

      surplusPool.set(donor.materialId, available - qtyFrom);
      remaining -= qtyTo;
    }
  }

  return suggestions;
}
