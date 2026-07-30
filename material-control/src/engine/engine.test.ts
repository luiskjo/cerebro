/**
 * End-to-end assertions over the seeded Aspen Ridge project.
 *
 * These pin the whole pipeline — import wording, correlation, coverage,
 * deliveries, counts, progress, prediction, drops and cost — to a scenario a
 * person can reason about, so a regression anywhere shows up as a wrong answer.
 */

import { describe, expect, it } from 'vitest';
import { createSeedState } from '../seed';
import { reducer } from '../store';
import {
  buildMatchProposals,
  buildSubstitutionSuggestions,
  findOrphans,
  isCompatibleStock,
  materialDeliveryProgress,
  mergeMaterials,
  orderBalances,
  outstandingForArea,
  rollupAreas,
  rollupDrops,
  rollupMaterials,
  scorePair,
  summarize,
  vendorBalances,
} from './index';

const state = createSeedState();
const rollups = rollupMaterials(state);
const byId = new Map(rollups.map((r) => [r.materialId, r]));

describe('quantity reconciliation', () => {
  it('sums the takeoff across sections and levels', () => {
    // 420 + 445 + 450 across Building A levels 1 to 3.
    expect(byId.get('m-stud116')!.takeoffQty).toBe(1315);
  });

  it('nets change orders against purchase orders', () => {
    const cedar = byId.get('m-cedar')!;
    expect(cedar.poQty).toBe(40);
    expect(cedar.coQty).toBe(-40);
    expect(cedar.orderedQty).toBe(0);
  });

  it('counts a change order as real supply when it adds scope', () => {
    const stud92 = byId.get('m-stud92')!;
    expect(stud92.poQty).toBe(0);
    expect(stud92.coQty).toBe(810);
    expect(stud92.orderedQty).toBe(810);
  });

  it('sums deliveries across tickets', () => {
    expect(byId.get('m-stud116')!.deliveredQty).toBe(1200);
  });
});

describe('usage prediction', () => {
  const stud = () => byId.get('m-stud116')!;

  it('derives usage from delivered minus counted rather than asking for it', () => {
    expect(stud().countedQty).toBe(320);
    expect(stud().impliedUsedQty).toBe(880);
  });

  it('weights expected usage by each section’s progress', () => {
    // 420×100% + 445×65% + 450×10%
    expect(stud().expectedUsedQty).toBeCloseTo(754.25, 2);
    expect(stud().overallProgressPct).toBeCloseTo(57.36, 1);
  });

  it('projects total usage from the burn rate', () => {
    expect(stud().projectedTotalUsage).toBeCloseTo(1534.2, 0);
  });

  it('forecasts a shortage even though more was bought than the takeoff called for', () => {
    // The interesting case: over-bought on paper, still short in practice.
    expect(stud().purchaseGap).toBe(85);
    expect(stud().predictedBalance).toBeLessThan(-100);
    expect(stud().flags.map((f) => f.kind)).toContain('predicted-short');
    expect(stud().flags.map((f) => f.kind)).toContain('burn-high');
  });

  it('reports the burn rate as a percentage over expectation', () => {
    expect(stud().usageVariancePct).toBeCloseTo(16.7, 1);
  });

  it('does not extrapolate from a barely-started section', () => {
    // With no progress there is no burn rate, so the takeoff stands.
    const fresh = rollupMaterials({
      ...state,
      areas: state.areas.map((a) => ({ ...a, progressPct: 0 })),
    });
    const stud116 = fresh.find((r) => r.materialId === 'm-stud116')!;
    expect(stud116.projectedTotalUsage).toBe(stud116.takeoffQty);
  });

  it('leaves usage undefined when nothing has been counted', () => {
    expect(byId.get('m-siding')!.impliedUsedQty).toBeUndefined();
  });
});

describe('coverage flags', () => {
  it('flags takeoff material with no order at all', () => {
    // The OSB the takeoff names has not been correlated to the PO wording yet.
    expect(byId.get('m-osb-tk')!.flags.map((f) => f.kind)).toContain('no-order');
  });

  it('flags an order with no takeoff behind it as excess rather than a shortage', () => {
    const kinds = byId.get('m-osb-po')!.flags.map((f) => f.kind);
    expect(kinds).not.toContain('purchase-short');
  });

  it('does not flag material that is properly covered', () => {
    const kinds = byId.get('m-subfloor')!.flags.map((f) => f.kind);
    expect(kinds).not.toContain('no-order');
    expect(kinds).not.toContain('purchase-short');
  });
});

describe('correlation', () => {
  const proposals = buildMatchProposals(state);

  it('proposes every uncorrelated takeoff item', () => {
    expect(proposals).toHaveLength(3);
  });

  it('pairs hardware on a shared catalogue number', () => {
    const hardware = proposals.find((p) => p.takeoffMaterialId === 'm-hdu5-tk')!;
    expect(hardware.orderMaterialId).toBe('m-hdu5-po');
    expect(hardware.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('pairs an abbreviation with its expansion', () => {
    const osb = proposals.find((p) => p.takeoffMaterialId === 'm-osb-tk')!;
    expect(osb.orderMaterialId).toBe('m-osb-po');
  });

  it('is less confident when the grade disagrees', () => {
    const joist = proposals.find((p) => p.takeoffMaterialId === 'm-2x10-tk')!;
    expect(joist.orderMaterialId).toBe('m-2x10-po');
    expect(joist.confidence).toBeLessThan(0.8);
  });

  it('never pairs across treatments', () => {
    const plain = state.materials.find((m) => m.id === 'm-osb-po')!;
    const frt = state.materials.find((m) => m.id === 'm-frtosb')!;
    expect(scorePair(plain, frt)).toBeUndefined();
  });

  it('sorts the most confident proposal first', () => {
    const scores = proposals.map((p) => p.confidence);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('closes the coverage gap once the user accepts a match', () => {
    const merged = reducer(state, {
      type: 'match/accept',
      takeoffMaterialId: 'm-osb-tk',
      orderMaterialId: 'm-osb-po',
    });
    const after = rollupMaterials(merged).find((r) => r.materialId === 'm-osb-po')!;

    // Takeoff 160+170+175+150+155 = 810 now sits against the 700 ordered.
    expect(after.takeoffQty).toBe(810);
    expect(after.orderedQty).toBe(700);
    expect(after.flags.map((f) => f.kind)).toContain('purchase-short');
    expect(merged.materials.some((m) => m.id === 'm-osb-tk')).toBe(false);
  });

  it('keeps the purchase-order wording and files the takeoff wording as an alias', () => {
    const merged = mergeMaterials(state, 'm-osb-po', 'm-osb-tk');
    const survivor = merged.materials.find((m) => m.id === 'm-osb-po')!;
    expect(survivor.description).toBe('7/16" OSB Sheathing 4\'x8\'');
    expect(survivor.aliases).toContain('7/16 OSB SHTG 4x8');
  });

  it('does not propose a pair the user has rejected', () => {
    const rejected = reducer(state, { type: 'match/reject', aId: 'm-hdu5-tk', bId: 'm-hdu5-po' });
    expect(buildMatchProposals(rejected).some((p) => p.takeoffMaterialId === 'm-hdu5-tk')).toBe(false);
  });
});

describe('substitutions', () => {
  const suggestions = buildSubstitutionSuggestions(state, rollups);

  it('offers surplus 20-footers to cover the stud shortage', () => {
    const cut = suggestions.find((s) => s.toMaterialId === 'm-stud116')!;
    expect(cut.fromMaterialId).toBe('m-2x4x20');
    // 240" of stock yields two 116-5/8" studs with 6.75" of drop.
    expect(cut.yieldPerPiece).toBe(2);
    expect(cut.dropPerPieceIn).toBeCloseTo(6.75, 2);
    expect(cut.qtyTo).toBeGreaterThanOrEqual(cut.shortageQty);
  });

  it('only pairs identical section, species, grade and treatment', () => {
    const stock = (id: string) => state.materials.find((m) => m.id === id)!;
    expect(isCompatibleStock(stock('m-2x4x20'), stock('m-stud116'))).toBe(true);
    expect(isCompatibleStock(stock('m-2x4x20'), stock('m-stud92'))).toBe(false); // SPF vs DF
    expect(isCompatibleStock(stock('m-2x4x20'), stock('m-pt2x6'))).toBe(false); // treated, wrong section
  });

  it('never proposes cutting short stock into long stock', () => {
    for (const s of suggestions) {
      expect(s.from.lengthIn!).toBeGreaterThanOrEqual(s.to.lengthIn!);
    }
  });

  it('does not promise the same surplus twice', () => {
    const consumed = suggestions
      .filter((s) => s.fromMaterialId === 'm-2x4x20')
      .reduce((sum, s) => sum + s.qtyFrom, 0);
    expect(consumed).toBeLessThanOrEqual(byId.get('m-2x4x20')!.predictedBalance);
  });

  it('stops proposing once the user has decided', () => {
    const first = suggestions[0];
    const decided = {
      ...state,
      substitutions: [
        {
          id: first.id,
          fromMaterialId: first.fromMaterialId,
          toMaterialId: first.toMaterialId,
          qtyFrom: first.qtyFrom,
          qtyTo: first.qtyTo,
          status: 'declined' as const,
        },
      ],
    };
    expect(buildSubstitutionSuggestions(decided, rollupMaterials(decided)).some((s) => s.id === first.id)).toBe(
      false,
    );
  });
});

describe('cleanup', () => {
  it('suggests deleting material bought and then fully credited', () => {
    const orphans = findOrphans(state);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].material.id).toBe('m-cedar');
    expect(orphans[0].reason).toBe('fully-credited');
  });

  it('never suggests deleting something still in the takeoff', () => {
    const ids = findOrphans(state).map((o) => o.material.id);
    for (const line of state.takeoffLines) expect(ids).not.toContain(line.materialId);
  });

  it('removes every reference when a material is deleted', () => {
    const after = reducer(state, { type: 'material/delete', id: 'm-stud116' });
    expect(after.takeoffLines.some((l) => l.materialId === 'm-stud116')).toBe(false);
    expect(after.orders.some((o) => o.lines.some((l) => l.materialId === 'm-stud116'))).toBe(false);
    expect(after.deliveries.some((d) => d.lines.some((l) => l.materialId === 'm-stud116'))).toBe(false);
    expect(after.inventoryCounts.some((c) => c.materialId === 'm-stud116')).toBe(false);
  });
});

describe('drops and delivery tracking', () => {
  const drops = rollupDrops(state);

  it('derives a drop as delivered once its lines are received against it', () => {
    const delivered = drops.find((d) => d.drop.id === 'd-a2')!;
    expect(delivered.deliveredPct).toBeCloseTo(100, 5);
    expect(delivered.derivedStatus).toBe('delivered');
  });

  it('marks an undelivered drop past its planned date as late', () => {
    const late = drops.find((d) => d.drop.id === 'd-a3')!;
    expect(late.isLate).toBe(true);
    expect(late.deliveredPct).toBe(0);
  });

  it('plans against what a section still needs, not its whole takeoff', () => {
    // Level 1 took 600 studs of its 420 takeoff, so nothing is outstanding.
    const outstanding = outstandingForArea(state, 'a-a1');
    expect(outstanding.has('m-stud116')).toBe(false);
    // Level 3 has had nothing delivered but already has an open drop for 450.
    expect(outstandingForArea(state, 'a-a3').get('m-stud116')).toBeUndefined();
  });

  it('excludes a drop from its own outstanding calculation when re-planning', () => {
    const withoutOwn = outstandingForArea(state, 'a-a3', 'd-a3');
    expect(withoutOwn.get('m-stud116')).toBe(450);
  });

  it('reports delivery progress per material and per section', () => {
    const progress = materialDeliveryProgress(state).find((p) => p.materialId === 'm-stud116')!;
    expect(progress.takeoffQty).toBe(1315);
    expect(progress.deliveredQty).toBe(1200);
    const level1 = progress.byArea.find((a) => a.label.includes('Level 1'))!;
    expect(level1.deliveredQty).toBe(600);
    expect(level1.takeoffQty).toBe(420);
  });

  it('separates yard stock that was never assigned to a section', () => {
    const yard = materialDeliveryProgress(state).find((p) => p.materialId === 'm-2x4x20')!;
    expect(yard.unallocatedQty).toBe(300);
  });

  it('rolls delivery percentages up per section', () => {
    const areas = rollupAreas(state);
    expect(areas.map((a) => a.area.id)).toEqual(['a-a1', 'a-a2', 'a-a3', 'a-b1', 'a-b2']);
    expect(areas[4].deliveredPct).toBe(0);
  });
});

describe('cost', () => {
  const vendors = vendorBalances(state);
  const orders = orderBalances(state);

  it('separates committed, received and paid', () => {
    const pls = vendors.find((v) => v.vendor.id === 'v-pls')!;
    expect(pls.committed).toBeGreaterThan(0);
    expect(pls.received).toBeLessThan(pls.committed);
    expect(pls.paid).toBe(32000);
    expect(pls.dueNow).toBeCloseTo(pls.received - pls.paid, 6);
    expect(pls.remainingCommitment).toBeCloseTo(pls.committed - pls.received, 6);
  });

  it('nets a credit change order against the vendor’s commitment', () => {
    const bmc = vendors.find((v) => v.vendor.id === 'v-bmc')!;
    expect(bmc.coValue).toBe(-1840); // 40 × $46 credited back
  });

  it('never receives more value than an order committed, in the seeded data', () => {
    // Credit-only change orders commit a negative amount and receive nothing
    // against them, so the comparison only means something for real purchases.
    for (const order of orders.filter((o) => o.committed > 0)) {
      expect(order.received, order.order.number).toBeLessThanOrEqual(order.committed + 0.01);
    }
  });

  it('does not treat a credit change order as over-committed', () => {
    const credit = orders.find((o) => o.order.number === 'CO-101')!;
    expect(credit.committed).toBeLessThan(0);
    expect(credit.received).toBe(0);
    expect(credit.overCommitted).toBe(false);
  });

  it('prices received value at the order rate', () => {
    // 1200 studs delivered against PO-2201 at $5.10.
    const po = orders.find((o) => o.order.number === 'PO-2201')!;
    expect(po.received).toBeGreaterThanOrEqual(1200 * 5.1);
  });

  it('flags a material received beyond its commitment', () => {
    const over = {
      ...state,
      deliveries: [
        ...state.deliveries,
        {
          id: 'dl-over',
          vendorId: 'v-fst',
          orderId: 'o-2203',
          bolNumber: 'FST-OVER',
          date: '2026-07-01',
          lines: [{ id: 'dl-over-1', materialId: 'm-h25a', qty: 900 }],
        },
      ],
    };
    const tie = rollupMaterials(over).find((r) => r.materialId === 'm-h25a')!;
    expect(tie.flags.map((f) => f.kind)).toContain('cost-over-commitment');
    expect(tie.flags.map((f) => f.kind)).toContain('over-delivered');
  });
});

describe('project summary', () => {
  const summary = summarize(state, rollups, buildMatchProposals(state).length);

  it('reports percentages inside a sane range', () => {
    expect(summary.deliveredPct).toBeGreaterThan(0);
    expect(summary.deliveredPct).toBeLessThanOrEqual(100);
    expect(summary.progressPct).toBeCloseTo(35, 0);
  });

  it('counts the outstanding correlations', () => {
    expect(summary.unmatchedCount).toBe(3);
  });

  it('counts materials that are short one way or another', () => {
    expect(summary.shortMaterials).toBeGreaterThan(0);
  });
});

describe('data integrity of the seed', () => {
  it('points every line at a real material, area and vendor', () => {
    const materialIds = new Set(state.materials.map((m) => m.id));
    const areaIds = new Set(state.areas.map((a) => a.id));
    const vendorIds = new Set(state.vendors.map((v) => v.id));
    const orderIds = new Set(state.orders.map((o) => o.id));

    for (const line of state.takeoffLines) {
      expect(materialIds.has(line.materialId), line.id).toBe(true);
      expect(areaIds.has(line.areaId), line.id).toBe(true);
    }
    for (const order of state.orders) {
      expect(vendorIds.has(order.vendorId), order.number).toBe(true);
      for (const line of order.lines) expect(materialIds.has(line.materialId), line.id).toBe(true);
    }
    for (const delivery of state.deliveries) {
      expect(vendorIds.has(delivery.vendorId), delivery.bolNumber).toBe(true);
      if (delivery.orderId) expect(orderIds.has(delivery.orderId), delivery.bolNumber).toBe(true);
      for (const line of delivery.lines) {
        expect(materialIds.has(line.materialId), line.id).toBe(true);
        if (line.areaId) expect(areaIds.has(line.areaId), line.id).toBe(true);
      }
    }
  });

  it('only lets vendors with an order appear on a delivery', () => {
    for (const delivery of state.deliveries) {
      expect(state.orders.some((o) => o.vendorId === delivery.vendorId), delivery.bolNumber).toBe(true);
    }
  });

  it('never counts more on hand than was delivered', () => {
    for (const rollup of rollups) {
      if (rollup.countedQty === undefined) continue;
      expect(rollup.countedQty, rollup.material.description).toBeLessThanOrEqual(rollup.deliveredQty);
    }
  });
});

describe('alert noise control', () => {
  it('does not repeat a shortage as a forecast when nothing was ordered', () => {
    // The arithmetic shortage and the forecast shortage are the same fact.
    const kinds = byId.get('m-osb-tk')!.flags.map((f) => f.kind);
    expect(kinds).toContain('no-order');
    expect(kinds).not.toContain('predicted-short');
  });

  it('still forecasts a shortage when something was ordered', () => {
    expect(byId.get('m-stud116')!.flags.map((f) => f.kind)).toContain('predicted-short');
  });
});

describe('forecast guards', () => {
  it('does not project zero usage for material delivered but not yet touched', () => {
    // 130 delivered, 130 counted, nothing consumed. Projecting the burn rate
    // would forecast zero total usage and call the whole delivery surplus.
    const joistStud = byId.get('m-stud104')!;
    expect(joistStud.impliedUsedQty).toBe(0);
    expect(joistStud.projectedTotalUsage).toBe(joistStud.takeoffQty);
    expect(joistStud.predictedBalance).toBe(joistStud.orderedQty - joistStud.takeoffQty);
  });
});
