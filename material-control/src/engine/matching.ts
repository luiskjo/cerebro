/**
 * Correlating takeoff wording with purchase-order wording.
 *
 * Identical canonical signatures are merged silently at import. This module
 * handles the rest: descriptions that are probably the same material but cannot
 * be proven so. Each one becomes a proposal the user accepts or rejects, and
 * accepting rewrites the takeoff to the vendor's wording.
 *
 * Nothing here merges anything on its own. A wrong automatic merge corrupts the
 * takeoff, the drops and the cost report at once, so ambiguity always goes to a
 * person.
 */

import type { AppState, Material } from '../types';
import { parseMaterial, sharedPartNumbers, stringSimilarity } from './naming';

/** Below this, a pair is not worth showing. */
export const PROPOSAL_THRESHOLD = 0.6;

/** At or above this, the match is safe enough to pre-select in the review list. */
export const STRONG_MATCH = 0.85;

/** Lengths within this many inches are treated as the same cut. */
export const LENGTH_TOLERANCE_IN = 0.13;

export interface MatchProposal {
  id: string;
  /** Material carrying the takeoff wording. */
  takeoffMaterialId: string;
  /** Material carrying the purchase-order wording — the wording that survives. */
  orderMaterialId: string;
  confidence: number;
  reason: string;
}

/** Stable key for a pair, order-independent, used to remember rejections. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

export interface Provenance {
  inTakeoff: Set<string>;
  inOrders: Set<string>;
}

/** Which materials appear in the takeoff, in orders, or both. */
export function materialProvenance(state: AppState): Provenance {
  return {
    inTakeoff: new Set(state.takeoffLines.map((l) => l.materialId)),
    inOrders: new Set(state.orders.flatMap((o) => o.lines.map((l) => l.materialId))),
  };
}

interface Scored {
  confidence: number;
  reason: string;
}

/**
 * Score one candidate pair.
 *
 * Treatment is a hard gate: pressure-treated, fire-retardant and untreated
 * stock are different products no matter how alike the text reads, and merging
 * them would put the wrong material on a wall.
 */
export function scorePair(a: Material, b: Material): Scored | undefined {
  if (a.treatment !== b.treatment) return undefined;

  const pa = parseMaterial(a.description);
  const pb = parseMaterial(b.description);
  const similarity = stringSimilarity(a.description, b.description);

  const sameNominal = Boolean(pa.nominal && pb.nominal && pa.nominal === pb.nominal);
  const bothLengths = pa.lengthIn !== undefined && pb.lengthIn !== undefined;
  const lengthDelta = bothLengths ? Math.abs(pa.lengthIn! - pb.lengthIn!) : undefined;
  const sameLength = lengthDelta !== undefined && lengthDelta <= LENGTH_TOLERANCE_IN;

  if (sameNominal && sameLength) {
    const gradeA = `${pa.species ?? ''}${pa.grade ?? ''}`;
    const gradeB = `${pb.species ?? ''}${pb.grade ?? ''}`;
    if (gradeA && gradeB && gradeA !== gradeB) {
      // Same stick, different grade called out — plausible but a real difference.
      return { confidence: 0.72, reason: `Same ${pa.nominal} at ${pa.lengthIn}", grade reads ${gradeA} vs ${gradeB}` };
    }
    return {
      confidence: 0.95,
      reason: `Same ${pa.nominal} at ${pa.lengthIn}"${gradeA || gradeB ? `, grade ${gradeA || gradeB}` : ', grade only stated on one side'}`,
    };
  }

  // A nominal length against a trimmed length: 10' stock cut to 116-5/8".
  if (sameNominal && bothLengths && lengthDelta! <= 4) {
    return {
      confidence: 0.8,
      reason: `Same ${pa.nominal}, length differs by ${lengthDelta!.toFixed(3)}" — nominal vs trimmed`,
    };
  }

  // A shared catalogue number is stronger evidence than the surrounding words,
  // which is what carries hardware where one side names the manufacturer.
  const shared = sharedPartNumbers(a.description, b.description);
  if (shared.length > 0) {
    return { confidence: 0.82, reason: `Both reference part ${shared.join(', ')}` };
  }

  if (similarity >= 0.72) {
    return { confidence: Math.min(0.78, similarity), reason: `Descriptions ${Math.round(similarity * 100)}% alike` };
  }

  return undefined;
}

/**
 * Every unmatched takeoff material paired with the order material it most
 * likely refers to. One proposal per takeoff material — the best candidate.
 */
export function buildMatchProposals(state: AppState): MatchProposal[] {
  const { inTakeoff, inOrders } = materialProvenance(state);
  const rejected = new Set(state.rejectedMatches);
  const byId = new Map(state.materials.map((m) => [m.id, m]));

  // Materials seen only in the takeoff still need a purchase-order identity.
  const takeoffOnly = [...inTakeoff].filter((id) => !inOrders.has(id));
  const orderMaterials = [...inOrders].map((id) => byId.get(id)).filter((m): m is Material => Boolean(m));

  const proposals: MatchProposal[] = [];

  for (const takeoffId of takeoffOnly) {
    const takeoffMaterial = byId.get(takeoffId);
    if (!takeoffMaterial) continue;

    let best: { material: Material; scored: Scored } | undefined;
    for (const candidate of orderMaterials) {
      if (candidate.id === takeoffId) continue;
      if (rejected.has(pairKey(takeoffId, candidate.id))) continue;
      const scored = scorePair(takeoffMaterial, candidate);
      if (!scored || scored.confidence < PROPOSAL_THRESHOLD) continue;
      if (!best || scored.confidence > best.scored.confidence) best = { material: candidate, scored };
    }

    if (best) {
      proposals.push({
        id: pairKey(takeoffId, best.material.id),
        takeoffMaterialId: takeoffId,
        orderMaterialId: best.material.id,
        confidence: best.scored.confidence,
        reason: best.scored.reason,
      });
    }
  }

  return proposals.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Merge one material into another, moving every reference across.
 *
 * The surviving material keeps the purchase-order wording so ordering,
 * receiving and cost all speak the vendor's language, while the takeoff's
 * original wording is preserved on the record for traceability.
 */
export function mergeMaterials(state: AppState, keepId: string, dropId: string): AppState {
  if (keepId === dropId) return state;
  const keep = state.materials.find((m) => m.id === keepId);
  const drop = state.materials.find((m) => m.id === dropId);
  if (!keep || !drop) return state;

  const merged: Material = {
    ...keep,
    takeoffDescription: keep.takeoffDescription ?? drop.takeoffDescription ?? drop.description,
    aliases: [...new Set([...keep.aliases, ...drop.aliases, drop.description])],
    // Keep whichever side actually carries the detail.
    lengthIn: keep.lengthIn ?? drop.lengthIn,
    nominal: keep.nominal ?? drop.nominal,
    species: keep.species ?? drop.species,
    grade: keep.grade ?? drop.grade,
    note: keep.note ?? drop.note,
  };

  const swap = (id: string) => (id === dropId ? keepId : id);

  return {
    ...state,
    materials: state.materials.filter((m) => m.id !== dropId).map((m) => (m.id === keepId ? merged : m)),
    takeoffLines: state.takeoffLines.map((l) => ({ ...l, materialId: swap(l.materialId) })),
    orders: state.orders.map((o) => ({
      ...o,
      lines: o.lines.map((l) => ({ ...l, materialId: swap(l.materialId) })),
    })),
    deliveries: state.deliveries.map((d) => ({
      ...d,
      lines: d.lines.map((l) => ({ ...l, materialId: swap(l.materialId) })),
    })),
    drops: state.drops.map((d) => ({
      ...d,
      lines: d.lines.map((l) => ({ ...l, materialId: swap(l.materialId) })),
    })),
    inventoryCounts: state.inventoryCounts.map((c) => ({ ...c, materialId: swap(c.materialId) })),
    substitutions: state.substitutions.map((s) => ({
      ...s,
      fromMaterialId: swap(s.fromMaterialId),
      toMaterialId: swap(s.toMaterialId),
    })),
    rejectedMatches: state.rejectedMatches.filter((k) => !k.includes(dropId)),
  };
}
