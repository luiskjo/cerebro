import { Card, DataTable, Pill, Stat, Bar, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { moneyShort, pct } from '../format';
import type { AreaRollup } from '../engine';

export default function OverviewView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { summary, alerts, areaRollups, state } = useStore();

  const areaColumns: Column<AreaRollup>[] = [
    {
      key: 'area',
      header: 'Section · Level',
      render: (r) => (
        <>
          <div className="t-strong">
            {r.area.section} · {r.area.level}
          </div>
          <div className="sub">{r.lineCount} materials in the takeoff</div>
        </>
      ),
    },
    {
      key: 'progress',
      header: 'Built',
      render: (r) => <Bar pct={r.progressPct} label={pct(r.progressPct)} />,
    },
    {
      key: 'delivered',
      header: 'Delivered',
      render: (r) => <Bar pct={r.deliveredPct} label={pct(r.deliveredPct)} />,
    },
    {
      key: 'status',
      header: '',
      render: (r) =>
        r.progressPct >= 100 ? (
          <Pill tone="green">Complete</Pill>
        ) : r.progressPct > 0 ? (
          <Pill tone="blue">In progress</Pill>
        ) : (
          <Pill tone="grey">Not started</Pill>
        ),
    },
  ];

  const overBudget = summary.receivedCost > summary.committedCost;

  return (
    <div className="stack">
      <div className="stats">
        <Stat
          label="Takeoff value"
          value={moneyShort(summary.takeoffValue)}
          sub={`${summary.materialCount} materials tracked`}
        />
        <Stat
          label="Committed"
          value={moneyShort(summary.committedCost)}
          sub="value of POs and COs issued"
          color="var(--blue)"
        />
        <Stat
          label="Received"
          value={moneyShort(summary.receivedCost)}
          sub={`${moneyShort(summary.paidAmount)} paid to date`}
          color={overBudget ? 'var(--red)' : 'var(--purple)'}
        />
        <Stat
          label="Delivered"
          value={pct(summary.deliveredPct)}
          sub="of takeoff, by value"
          color="var(--blue)"
          pct={summary.deliveredPct}
        />
        <Stat
          label="Built"
          value={pct(summary.progressPct)}
          sub="average across sections"
          color="var(--green)"
          pct={summary.progressPct}
        />
        <Stat
          label="Needs attention"
          value={String(summary.criticalFlags)}
          sub={`${summary.shortMaterials} materials short · ${summary.unmatchedCount} uncorrelated`}
          color={summary.criticalFlags > 0 ? 'var(--red)' : 'var(--green)'}
        />
      </div>

      <Card title={`What needs a decision · ${state.project.today}`}>
        {alerts.length === 0 ? (
          <div className="empty">Nothing outstanding. Every material is covered, correlated and on track.</div>
        ) : (
          alerts.map((alert) => (
            <div className={`alert a-${alert.severity}`} key={alert.id}>
              <div className={`a-dot d-${alert.severity}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="a-cat">{alert.category}</div>
                <div className="a-title">{alert.title}</div>
                <div className="a-detail">{alert.detail}</div>
              </div>
              <button className="a-act" onClick={() => onNavigate(alert.view)}>
                Open
              </button>
            </div>
          ))
        )}
      </Card>

      <Card title="Sections and levels">
        <DataTable
          columns={areaColumns}
          rows={areaRollups}
          getKey={(r) => r.area.id}
          minWidth={620}
          empty="No sections yet. Import a takeoff to create them."
        />
      </Card>
    </div>
  );
}
