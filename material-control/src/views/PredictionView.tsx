import { useState } from 'react';
import { Card, DataTable, Pill, Stat, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { pct, qty, signedPct } from '../format';
import type { MaterialRollup, SubstitutionSuggestion } from '../engine';

export default function PredictionView() {
  const { rollups, substitutions, state, dispatch } = useStore();
  const [onlyIssues, setOnlyIssues] = useState(true);

  const active = rollups.filter((r) => r.takeoffQty > 0);
  const rows = active
    .filter((r) => !onlyIssues || r.flags.some((f) => f.kind === 'predicted-short' || f.kind.startsWith('burn')))
    .sort((a, b) => a.predictedBalance - b.predictedBalance);

  const shortCount = active.filter((r) => r.predictedBalance < -state.project.shortageTolerance).length;
  const excessCount = active.filter((r) => r.predictedBalance > state.project.shortageTolerance).length;
  const measured = active.filter((r) => r.impliedUsedQty !== undefined).length;

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
          </div>
        </>
      ),
    },
    { key: 'takeoff', header: 'Takeoff', align: 'right', render: (r) => `${qty(r.takeoffQty)} ${r.material.unit}` },
    { key: 'ordered', header: 'Bought', align: 'right', render: (r) => qty(r.orderedQty) },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (r) => qty(r.deliveredQty) },
    {
      key: 'onhand',
      header: 'On hand',
      align: 'right',
      render: (r) =>
        r.countedQty === undefined ? <span style={{ color: 'var(--text3)' }}>not counted</span> : qty(r.countedQty),
    },
    {
      key: 'used',
      header: 'Used',
      align: 'right',
      render: (r) =>
        r.impliedUsedQty === undefined ? (
          <span style={{ color: 'var(--text3)' }}>—</span>
        ) : (
          <>
            <div className="t-strong">{qty(r.impliedUsedQty)}</div>
            <div className="sub">vs {qty(Math.round(r.expectedUsedQty))} expected</div>
          </>
        ),
    },
    {
      key: 'progress',
      header: 'Built',
      align: 'right',
      render: (r) => pct(r.overallProgressPct),
    },
    {
      key: 'burn',
      header: 'Burn rate',
      align: 'right',
      render: (r) => {
        if (r.usageVariancePct === undefined) return <span style={{ color: 'var(--text3)' }}>—</span>;
        const over = r.usageVariancePct > state.project.usageTolerancePct;
        const under = r.usageVariancePct < -state.project.usageTolerancePct;
        return (
          <span style={{ color: over ? 'var(--red)' : under ? 'var(--blue)' : 'var(--green)', fontWeight: 600 }}>
            {signedPct(r.usageVariancePct)}
          </span>
        );
      },
    },
    {
      key: 'projected',
      header: 'Forecast usage',
      align: 'right',
      render: (r) => qty(Math.round(r.projectedTotalUsage)),
    },
    {
      key: 'balance',
      header: 'Over / short',
      align: 'right',
      render: (r) => {
        const short = r.predictedBalance < -state.project.shortageTolerance;
        const over = r.predictedBalance > state.project.shortageTolerance;
        return (
          <span style={{ color: short ? 'var(--red)' : over ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
            {r.predictedBalance > 0 ? '+' : ''}
            {qty(Math.round(r.predictedBalance))}
          </span>
        );
      },
    },
  ];

  const subColumns: Column<SubstitutionSuggestion>[] = [
    {
      key: 'from',
      header: 'Cut from surplus',
      render: (s) => (
        <>
          <div className="t-strong">{s.from.description}</div>
          <div className="sub">{qty(Math.round(s.surplusAvailable))} surplus forecast</div>
        </>
      ),
    },
    {
      key: 'to',
      header: 'To cover shortage',
      render: (s) => (
        <>
          <div className="t-strong">{s.to.description}</div>
          <div className="sub">{qty(Math.round(s.shortageQty))} short</div>
        </>
      ),
    },
    {
      key: 'yield',
      header: 'Yield',
      align: 'right',
      render: (s) => (
        <>
          <div className="t-strong">
            {s.qtyFrom} → {s.qtyTo}
          </div>
          <div className="sub">{s.yieldPerPiece} per piece</div>
        </>
      ),
    },
    {
      key: 'drop',
      header: 'Waste per cut',
      align: 'right',
      render: (s) => (
        <span style={{ color: s.dropPerPieceIn > 24 ? 'var(--amber)' : 'var(--text2)' }}>
          {s.dropPerPieceIn.toFixed(2)}"
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button
            className="btn btn-sm btn-ok"
            onClick={() =>
              dispatch({
                type: 'substitution/decide',
                substitution: {
                  id: s.id,
                  fromMaterialId: s.fromMaterialId,
                  toMaterialId: s.toMaterialId,
                  qtyFrom: s.qtyFrom,
                  qtyTo: s.qtyTo,
                  status: 'accepted',
                  decidedOn: state.project.today,
                  note: s.rationale,
                },
              })
            }
          >
            Approve
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              dispatch({
                type: 'substitution/decide',
                substitution: {
                  id: s.id,
                  fromMaterialId: s.fromMaterialId,
                  toMaterialId: s.toMaterialId,
                  qtyFrom: s.qtyFrom,
                  qtyTo: s.qtyTo,
                  status: 'declined',
                  decidedOn: state.project.today,
                },
              })
            }
          >
            Decline
          </button>
        </div>
      ),
    },
  ];

  const decided = state.substitutions.filter((s) => s.status !== 'suggested');

  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Forecast short" value={String(shortCount)} sub="materials predicted to run out" color={shortCount > 0 ? 'var(--red)' : 'var(--green)'} />
        <Stat label="Forecast excess" value={String(excessCount)} sub="materials predicted left over" color="var(--amber)" />
        <Stat label="Measured" value={`${measured}/${active.length}`} sub="materials with a physical count" color="var(--blue)" />
        <Stat label="Cut options" value={String(substitutions.length)} sub="surplus that could cover a shortage" color="var(--purple)" />
      </div>

      <Card
        title="Usage prediction"
        note={
          <>
            Usage is never typed in — it is derived. <strong>Used = delivered − counted on hand</strong>, which
            is why the inventory count and the progress update belong on the same walk. Comparing that against
            the takeoff scaled by progress gives the burn rate, and projecting the burn rate to 100% gives the
            forecast. A material can be over-bought against the takeoff and still forecast short if the crew is
            burning faster than the estimate allowed.
          </>
        }
        actions={
          <button className="btn" onClick={() => setOnlyIssues(!onlyIssues)}>
            {onlyIssues ? 'Show all materials' : 'Show only problems'}
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.materialId}
          minWidth={1120}
          rowClass={(r) =>
            r.predictedBalance < -state.project.shortageTolerance
              ? 'row-crit'
              : r.usageVariancePct !== undefined && r.usageVariancePct > state.project.usageTolerancePct
                ? 'row-warn'
                : undefined
          }
          empty={onlyIssues ? 'No shortages or unusual burn rates forecast.' : 'No takeoff loaded yet.'}
        />
      </Card>

      <Card
        title="Cut-down suggestions"
        note="Where surplus long stock of identical section, species, grade and treatment could be cut to cover a shortage. These are proposals only — approve them and the decision is recorded against the material."
      >
        <DataTable
          columns={subColumns}
          rows={substitutions}
          getKey={(s) => s.id}
          minWidth={900}
          empty="No surplus stock currently lines up against a shortage."
        />
        {decided.length > 0 && (
          <>
            <div className="section-h">Decided</div>
            {decided.map((s) => (
              <div key={s.id} style={{ fontSize: 11.5, color: 'var(--text2)', marginBottom: 6 }}>
                <Pill tone={s.status === 'accepted' ? 'green' : 'grey'}>{s.status}</Pill>{' '}
                {s.qtyFrom} → {s.qtyTo} on {s.decidedOn}
                <button
                  className="btn btn-sm btn-danger"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    dispatch({
                      type: 'substitution/decide',
                      substitution: { ...s, status: 'suggested', decidedOn: undefined },
                    })
                  }
                >
                  Reopen
                </button>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
