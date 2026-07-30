import { useState } from 'react';
import { Card, DataTable, Bar, Pill, Stat, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { pct, qty } from '../format';
import { MATERIAL_GROUPS, type MaterialGroup } from '../types';
import type { MaterialDeliveryProgress } from '../engine';

export default function TrackingView() {
  const { deliveryProgress, areaRollups, dropRollups, state } = useStore();
  const [group, setGroup] = useState<MaterialGroup | 'All'>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = deliveryProgress
    .filter((r) => group === 'All' || r.material.group === group)
    .sort((a, b) => a.deliveredPct - b.deliveredPct);

  const outstanding = deliveryProgress.filter((r) => r.remainingQty > 0).length;
  const complete = deliveryProgress.filter((r) => r.deliveredPct >= 99.5).length;
  const lateDrops = dropRollups.filter((d) => d.isLate).length;

  const columns: Column<MaterialDeliveryProgress>[] = [
    {
      key: 'material',
      header: 'Material',
      render: (r) => (
        <>
          <div className="t-strong">{r.material.description}</div>
          <div className="sub">
            {r.material.group}
            {r.material.subgroup !== 'None' ? ` · ${r.material.subgroup}` : ''}
          </div>
        </>
      ),
    },
    { key: 'takeoff', header: 'Takeoff', align: 'right', render: (r) => `${qty(r.takeoffQty)} ${r.material.unit}` },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (r) => qty(r.deliveredQty) },
    {
      key: 'remaining',
      header: 'Left to deliver',
      align: 'right',
      render: (r) => (
        <span style={{ color: r.remainingQty > 0 ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
          {qty(r.remainingQty)}
        </span>
      ),
    },
    {
      key: 'pct',
      header: 'Total delivered',
      render: (r) => <Bar pct={r.deliveredPct} label={pct(r.deliveredPct)} />,
    },
    {
      key: 'unallocated',
      header: 'Unassigned',
      align: 'right',
      render: (r) =>
        r.unallocatedQty > 0 ? <Pill tone="amber">{qty(r.unallocatedQty)}</Pill> : <span style={{ color: 'var(--text3)' }}>—</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button className="btn btn-sm" onClick={() => setExpanded(expanded === r.materialId ? null : r.materialId)}>
          {expanded === r.materialId ? 'Hide' : 'By section'}
        </button>
      ),
    },
  ];

  const open = rows.find((r) => r.materialId === expanded);

  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Fully delivered" value={`${complete}/${deliveryProgress.length}`} sub="materials complete" color="var(--green)" />
        <Stat label="Still owed" value={String(outstanding)} sub="materials with quantity outstanding" color="var(--amber)" />
        <Stat label="Late drops" value={String(lateDrops)} sub="past their planned date" color={lateDrops > 0 ? 'var(--red)' : 'var(--green)'} />
        <Stat label="Sections" value={String(areaRollups.length)} sub="section and level combinations" color="var(--blue)" />
      </div>

      <Card
        title="Delivery progress by material"
        note="Percentage delivered against the takeoff, in total and per section. Quantities marked unassigned arrived without a section on the ticket — they count toward site stock but not toward any section's percentage."
      >
        <div className="toolbar">
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
          minWidth={920}
          rowClass={(r) => (r.deliveredPct >= 99.5 ? 'row-ok' : r.deliveredPct < 50 ? 'row-warn' : undefined)}
          empty="Nothing in the takeoff yet."
        />
      </Card>

      {open && (
        <Card title={`${open.material.description} — by section`}>
          <DataTable
            columns={[
              { key: 'area', header: 'Section · level', render: (a) => a.label },
              { key: 'takeoff', header: 'Takeoff', align: 'right', render: (a) => qty(a.takeoffQty) },
              { key: 'delivered', header: 'Delivered', align: 'right', render: (a) => qty(a.deliveredQty) },
              {
                key: 'remaining',
                header: 'Outstanding',
                align: 'right',
                render: (a) => qty(Math.max(0, a.takeoffQty - a.deliveredQty)),
              },
              { key: 'pct', header: 'Delivered', render: (a) => <Bar pct={a.deliveredPct} label={pct(a.deliveredPct)} /> },
            ]}
            rows={open.byArea}
            getKey={(a) => a.areaId}
            minWidth={620}
            empty="Not assigned to any section yet."
          />
          {open.unallocatedQty > 0 && (
            <div className="note" style={{ marginTop: 12 }}>
              {qty(open.unallocatedQty)} {open.material.unit} arrived without a section on the ticket. Edit those
              deliveries to assign a section and the percentages above will pick it up.
            </div>
          )}
        </Card>
      )}

      <Card title="Drop status" note="Each staged release, and how much of it has actually landed.">
        <DataTable
          columns={[
            {
              key: 'drop',
              header: 'Drop',
              render: (d) => (
                <>
                  <div className="t-strong">{d.drop.name}</div>
                  <div className="sub">
                    {d.areaLabel} · planned {d.drop.plannedDate ?? '—'}
                  </div>
                </>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (d) =>
                d.derivedStatus === 'delivered' ? (
                  <Pill tone="green">Delivered</Pill>
                ) : d.derivedStatus === 'partial' ? (
                  <Pill tone="amber">Part delivered</Pill>
                ) : d.derivedStatus === 'cancelled' ? (
                  <Pill tone="grey">Cancelled</Pill>
                ) : d.isLate ? (
                  <Pill tone="red">Overdue</Pill>
                ) : (
                  <Pill tone="blue">{d.derivedStatus}</Pill>
                ),
            },
            { key: 'lines', header: 'Lines', align: 'right', render: (d) => d.lines.length },
            { key: 'planned', header: 'Planned qty', align: 'right', render: (d) => qty(d.plannedTotal) },
            { key: 'delivered', header: 'Delivered', render: (d) => <Bar pct={d.deliveredPct} label={pct(d.deliveredPct)} /> },
          ]}
          rows={dropRollups}
          getKey={(d) => d.drop.id}
          minWidth={760}
          rowClass={(d) => (d.isLate ? 'row-crit' : undefined)}
          empty="No drops planned yet."
        />
      </Card>

      {state.deliveries.length === 0 && (
        <div className="note">No delivery tickets logged yet, so every percentage above reads zero.</div>
      )}
    </div>
  );
}
