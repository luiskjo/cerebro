import { useState } from 'react';
import { Card, DataTable, Pill, Bar, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { money, pct, qty } from '../format';
import { MATERIAL_GROUPS, type MaterialGroup } from '../types';
import type { MaterialRollup } from '../engine';

type Filter = 'issues' | 'all' | 'ok';

export default function CoverageView() {
  const { rollups } = useStore();
  const [filter, setFilter] = useState<Filter>('issues');
  const [group, setGroup] = useState<MaterialGroup | 'All'>('All');

  const active = rollups.filter((r) => r.takeoffQty > 0 || r.orderedQty !== 0 || r.deliveredQty > 0);

  const rows = active
    .filter((r) => group === 'All' || r.material.group === group)
    .filter((r) => {
      const hasIssue = r.flags.some((f) => f.severity !== 'info');
      if (filter === 'issues') return hasIssue;
      if (filter === 'ok') return !hasIssue;
      return true;
    })
    .sort((a, b) => a.purchaseGap - b.purchaseGap);

  const columns: Column<MaterialRollup>[] = [
    {
      key: 'material',
      header: 'Material',
      render: (r) => (
        <>
          <div className="t-strong">{r.material.description}</div>
          <div className="sub">
            {r.material.group}
            {r.material.subgroup !== 'None' ? ` · ${r.material.subgroup}` : ''}
            {r.material.takeoffDescription ? ` · takeoff: ${r.material.takeoffDescription}` : ''}
          </div>
        </>
      ),
    },
    {
      key: 'takeoff',
      header: 'Takeoff',
      align: 'right',
      render: (r) => `${qty(r.takeoffQty)} ${r.material.unit}`,
    },
    {
      key: 'po',
      header: 'PO',
      align: 'right',
      render: (r) => qty(r.poQty),
    },
    {
      key: 'co',
      header: 'CO',
      align: 'right',
      render: (r) =>
        r.coQty === 0 ? (
          <span style={{ color: 'var(--text3)' }}>—</span>
        ) : (
          <span style={{ color: r.coQty < 0 ? 'var(--red)' : 'var(--green)' }}>
            {r.coQty > 0 ? '+' : ''}
            {qty(r.coQty)}
          </span>
        ),
    },
    {
      key: 'ordered',
      header: 'Net bought',
      align: 'right',
      render: (r) => <span className="t-strong">{qty(r.orderedQty)}</span>,
    },
    {
      key: 'gap',
      header: 'vs takeoff',
      align: 'right',
      render: (r) => {
        if (r.takeoffQty === 0) return <span style={{ color: 'var(--text3)' }}>no takeoff</span>;
        const color = r.purchaseGap < 0 ? 'var(--red)' : r.purchaseGap > 0 ? 'var(--amber)' : 'var(--green)';
        return (
          <span style={{ color, fontWeight: 700 }}>
            {r.purchaseGap > 0 ? '+' : ''}
            {qty(r.purchaseGap)}
          </span>
        );
      },
    },
    {
      key: 'delivered',
      header: 'Delivered',
      render: (r) => <Bar pct={r.deliveredPct} label={pct(r.deliveredPct)} />,
    },
    {
      key: 'committed',
      header: 'Committed',
      align: 'right',
      render: (r) => money(r.committedCost),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const critical = r.flags.find((f) => f.severity === 'critical');
        const warning = r.flags.find((f) => f.severity === 'warning');
        if (critical) return <Pill tone="red">{labelFor(critical.kind)}</Pill>;
        if (warning) return <Pill tone="amber">{labelFor(warning.kind)}</Pill>;
        if (r.takeoffQty === 0 && r.orderedQty > 0) return <Pill tone="grey">Not in takeoff</Pill>;
        return <Pill tone="green">Covered</Pill>;
      },
    },
  ];

  const shortCount = active.filter((r) =>
    r.flags.some((f) => f.kind === 'purchase-short' || f.kind === 'no-order'),
  ).length;

  return (
    <div className="stack">
      <Card
        title="Takeoff versus purchased"
        note={
          <>
            Net bought is purchase orders plus change orders, so a credit reduces coverage the way it should.
            {shortCount > 0 ? (
              <>
                {' '}
                <strong>
                  {shortCount} material{shortCount === 1 ? '' : 's'} the buy does not cover.
                </strong>{' '}
                Anything reading “not in takeoff” alongside a shortage is usually the same material under two
                names — check the Correlation tab first.
              </>
            ) : (
              ' Every material in the takeoff is covered by an order.'
            )}
          </>
        }
      >
        <div className="toolbar">
          <div className="chiprow">
            {(['issues', 'all', 'ok'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'issues' ? 'Needs attention' : f === 'all' ? 'All materials' : 'Covered'}
              </button>
            ))}
          </div>
          <div className="spacer" />
          <div className="chiprow">
            {(['All', ...MATERIAL_GROUPS] as (MaterialGroup | 'All')[]).map((g) => (
              <button key={g} className={`chip${group === g ? ' active' : ''}`} onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.materialId}
          minWidth={1020}
          rowClass={(r) =>
            r.flags.some((f) => f.severity === 'critical')
              ? 'row-crit'
              : r.flags.some((f) => f.severity === 'warning')
                ? 'row-warn'
                : undefined
          }
          empty={filter === 'issues' ? 'No coverage problems.' : 'No materials match this filter.'}
        />
      </Card>
    </div>
  );
}

function labelFor(kind: string): string {
  switch (kind) {
    case 'no-order':
      return 'No PO/CO';
    case 'purchase-short':
      return 'Under-bought';
    case 'predicted-short':
      return 'Forecast short';
    case 'over-delivered':
      return 'Over-delivered';
    case 'cost-over-commitment':
      return 'Over commitment';
    case 'burn-high':
      return 'Burning fast';
    default:
      return kind;
  }
}
