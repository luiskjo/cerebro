/**
 * Catalog hygiene.
 *
 * Material bought during preconstruction and later credited back in full on a
 * change order leaves a record that nets to nothing — no live order, no
 * delivery, no takeoff. Those entries survive every import and quietly clutter
 * every report, so they are surfaced for deletion.
 *
 * Nothing is deleted automatically. Suggestions are reviewed and confirmed,
 * because a material that looks orphaned today may simply not have been imported
 * yet.
 */

import type { AppState, Material } from '../types';
import { isLiveOrder } from './rollup';
import { parseMaterial, stringSimilarity } from './naming';

export type OrphanReason = 'fully-credited' | 'never-referenced' | 'order-only-void';

export interface OrphanSuggestion {
  material: Material;
  reason: OrphanReason;
  explanation: string;
  takeoffQty: number;
  orderedQty: number;
  deliveredQty: number;
}

const REASON_TEXT: Record<OrphanReason, string> = {
  'fully-credited':
    'Purchased and then fully credited on a change order. Nothing was delivered and it is not in the takeoff.',
  'never-referenced': 'Not referenced by any takeoff line, order or delivery.',
  'order-only-void': 'Only appears on voided orders.',
};

/**
 * Materials that carry no live demand, supply or history.
 *
 * A material still in the takeoff is never an orphan even with nothing ordered —
 * that is a purchasing gap the coverage report is responsible for, not clutter.
 */
export function findOrphans(state: AppState): OrphanSuggestion[] {
  const liveOrders = state.orders.filter(isLiveOrder);

  return state.materials
    .map((material) => {
      const takeoffQty = state.takeoffLines
        .filter((l) => l.materialId === material.id)
        .reduce((sum, l) => sum + l.qty, 0);
      const orderedQty = liveOrders
        .flatMap((o) => o.lines.filter((l) => l.materialId === material.id))
        .reduce((sum, l) => sum + l.qty, 0);
      const deliveredQty = state.deliveries
        .flatMap((d) => d.lines.filter((l) => l.materialId === material.id))
        .reduce((sum, l) => sum + l.qty, 0);

      if (takeoffQty > 0 || deliveredQty > 0 || orderedQty > 0) return undefined;

      const appearsOnLiveOrder = liveOrders.some((o) => o.lines.some((l) => l.materialId === material.id));
      const appearsAnywhere =
        appearsOnLiveOrder || state.orders.some((o) => o.lines.some((l) => l.materialId === material.id));

      const reason: OrphanReason = appearsOnLiveOrder
        ? 'fully-credited'
        : appearsAnywhere
          ? 'order-only-void'
          : 'never-referenced';

      return {
        material,
        reason,
        explanation: REASON_TEXT[reason],
        takeoffQty,
        orderedQty,
        deliveredQty,
      };
    })
    .filter((row): row is OrphanSuggestion => Boolean(row));
}

export interface DuplicateSuggestion {
  a: Material;
  b: Material;
  similarity: number;
  reason: string;
}

/**
 * Near-identical catalog entries the user may want to merge by hand.
 *
 * Distinct from correlation: this looks for accidental duplicates within the
 * catalog rather than takeoff-to-order wording differences.
 */
export function findDuplicateCandidates(state: AppState, limit = 25): DuplicateSuggestion[] {
  const results: DuplicateSuggestion[] = [];
  const materials = state.materials;

  for (let i = 0; i < materials.length; i += 1) {
    for (let j = i + 1; j < materials.length; j += 1) {
      const a = materials[i];
      const b = materials[j];
      if (a.treatment !== b.treatment) continue;

      const pa = parseMaterial(a.description);
      const pb = parseMaterial(b.description);

      const sameDimensions =
        Boolean(pa.nominal && pa.nominal === pb.nominal) &&
        pa.lengthIn !== undefined &&
        pb.lengthIn !== undefined &&
        Math.abs(pa.lengthIn - pb.lengthIn) < 0.02;

      const similarity = stringSimilarity(a.description, b.description);
      if (!sameDimensions && similarity < 0.85) continue;

      results.push({
        a,
        b,
        similarity: sameDimensions ? Math.max(similarity, 0.9) : similarity,
        reason: sameDimensions
          ? `Same ${pa.nominal} at ${pa.lengthIn}" and same treatment`
          : `Descriptions ${Math.round(similarity * 100)}% alike`,
      });
    }
  }

  return results.sort((x, y) => y.similarity - x.similarity).slice(0, limit);
}
