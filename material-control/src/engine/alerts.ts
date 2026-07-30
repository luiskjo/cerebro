/**
 * Alerts.
 *
 * One ranked list of everything that needs a decision, drawn from every part of
 * the system. Each entry states the consequence rather than the condition —
 * "purchased quantity is 110 SHT below the takeoff" is a fact, "Level 3 stops
 * when the panels run out" is a decision.
 */

import type { AppState } from '../types';
import type { MaterialRollup } from './rollup';
import type { DropRollup } from './drops';
import type { MatchProposal } from './matching';
import type { OrphanSuggestion } from './hygiene';
import type { SubstitutionSuggestion } from './substitution';
import type { VendorBalance } from './cost';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  detail: string;
  /** Tab the user should open to act on it. */
  view: string;
}

const RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export interface AlertInput {
  state: AppState;
  rollups: MaterialRollup[];
  dropRollups: DropRollup[];
  proposals: MatchProposal[];
  orphans: OrphanSuggestion[];
  substitutions: SubstitutionSuggestion[];
  vendorBalances: VendorBalance[];
}

export function buildAlerts({
  state,
  rollups,
  dropRollups,
  proposals,
  orphans,
  substitutions,
  vendorBalances,
}: AlertInput): Alert[] {
  const alerts: Alert[] = [];

  for (const rollup of rollups) {
    for (const flag of rollup.flags) {
      // Excess is only interesting where a substitution can use it up, and that
      // gets its own alert below.
      if (flag.kind === 'predicted-excess' || flag.kind === 'purchase-excess') continue;
      alerts.push({
        id: `${flag.kind}-${rollup.materialId}`,
        severity: flag.severity,
        category:
          flag.kind === 'cost-over-commitment'
            ? 'Cost'
            : flag.kind.startsWith('burn')
              ? 'Usage'
              : flag.kind === 'over-delivered'
                ? 'Deliveries'
                : 'Coverage',
        title: `${rollup.material.description} — ${flag.message}`,
        detail: buildContext(rollup),
        view: flag.kind.startsWith('burn') || flag.kind === 'predicted-short' ? 'prediction' : 'coverage',
      });
    }
  }

  if (proposals.length > 0) {
    alerts.push({
      id: 'match-pending',
      severity: 'warning',
      category: 'Correlation',
      title: `${proposals.length} takeoff item${proposals.length === 1 ? '' : 's'} not yet correlated to a purchase order`,
      detail:
        'Until these are confirmed, the same material is counted twice — once as an unpurchased takeoff line and once as an unused order. Coverage, drops and cost all read wrong.',
      view: 'matching',
    });
  }

  for (const drop of dropRollups.filter((d) => d.isLate)) {
    alerts.push({
      id: `drop-late-${drop.drop.id}`,
      severity: 'warning',
      category: 'Drops',
      title: `${drop.drop.name} — planned ${drop.drop.plannedDate}, ${drop.deliveredPct.toFixed(0)}% delivered`,
      detail: `${drop.areaLabel} is waiting on ${drop.lines.filter((l) => l.outstandingQty > 0).length} line item(s). Confirm a truck date with the vendor.`,
      view: 'tracking',
    });
  }

  for (const vendor of vendorBalances.filter((v) => v.overCommitted)) {
    alerts.push({
      id: `vendor-over-${vendor.vendor.id}`,
      severity: 'critical',
      category: 'Cost',
      title: `${vendor.vendor.name} — received value exceeds the commitment`,
      detail: `Committed ${vendor.committed.toFixed(0)}, received ${vendor.received.toFixed(0)}. Raise a change order or reject the overage before invoicing.`,
      view: 'cost',
    });
  }

  if (substitutions.length > 0) {
    alerts.push({
      id: 'substitutions-available',
      severity: 'info',
      category: 'Substitution',
      title: `${substitutions.length} shortage${substitutions.length === 1 ? '' : 's'} could be covered from surplus stock`,
      detail: substitutions
        .slice(0, 2)
        .map((s) => s.rationale)
        .join(' '),
      view: 'prediction',
    });
  }

  if (orphans.length > 0) {
    alerts.push({
      id: 'orphans-present',
      severity: 'info',
      category: 'Cleanup',
      title: `${orphans.length} material${orphans.length === 1 ? '' : 's'} with no live order, delivery or takeoff`,
      detail:
        'Usually material bought early and credited back on a change order. Review and delete so it stops appearing in reports.',
      view: 'materials',
    });
  }

  const unassigned = state.deliveries.flatMap((d) => d.lines.filter((l) => !l.areaId)).length;
  if (unassigned > 0) {
    alerts.push({
      id: 'unassigned-deliveries',
      severity: 'info',
      category: 'Deliveries',
      title: `${unassigned} delivery line${unassigned === 1 ? '' : 's'} not assigned to a section`,
      detail:
        'These count toward site inventory but cannot be credited to a section, so per-section delivery percentages read low.',
      view: 'deliveries',
    });
  }

  return alerts.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

/** One line of supporting numbers, so an alert can be judged without leaving it. */
function buildContext(rollup: MaterialRollup): string {
  const unit = rollup.material.unit;
  const parts = [
    `Takeoff ${round(rollup.takeoffQty)} ${unit}`,
    `ordered ${round(rollup.orderedQty)}`,
    `delivered ${round(rollup.deliveredQty)}`,
  ];
  if (rollup.countedQty !== undefined) parts.push(`on hand ${round(rollup.countedQty)}`);
  if (rollup.impliedUsedQty !== undefined) {
    parts.push(`used ${round(rollup.impliedUsedQty)} against ${round(rollup.expectedUsedQty)} expected`);
  }
  parts.push(`${rollup.overallProgressPct.toFixed(0)}% built`);
  return `${parts.join(' · ')}.`;
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString('en-US');
}
