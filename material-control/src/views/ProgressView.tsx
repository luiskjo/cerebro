import { useState } from 'react';
import { Card, DataTable, Field, Bar, Modal, Stat, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { newId } from '../store';
import { pct, qty } from '../format';
import type { AreaRollup, MaterialRollup } from '../engine';

/**
 * Progress and inventory are deliberately captured together: usage is derived
 * from `delivered − counted`, so a count taken without a matching progress
 * figure produces a burn rate measured against the wrong denominator.
 */
export default function ProgressView() {
  const { areaRollups, rollups, state, dispatch, materialById } = useStore();
  const [walking, setWalking] = useState(false);

  const counted = rollups.filter((r) => r.countedQty !== undefined).length;
  const trackable = rollups.filter((r) => r.deliveredQty > 0).length;
  const latestCount = [...state.inventoryCounts].sort((a, b) => b.date.localeCompare(a.date))[0];

  const areaColumns: Column<AreaRollup>[] = [
    {
      key: 'area',
      header: 'Section · level',
      render: (r) => (
        <>
          <div className="t-strong">
            {r.area.section} · {r.area.level}
          </div>
          <div className="sub">
            {r.lineCount} materials · planned start {r.area.plannedStart ?? '—'}
          </div>
        </>
      ),
    },
    {
      key: 'progress',
      header: 'Percent built',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={r.area.progressPct}
            aria-label={`Progress for ${r.area.section} ${r.area.level}`}
            style={{ width: 150, accentColor: 'var(--blue)' }}
            onChange={(e) =>
              dispatch({
                type: 'progress/record',
                entry: {
                  id: newId('pr'),
                  areaId: r.area.id,
                  date: state.project.today,
                  pct: Number(e.target.value),
                },
              })
            }
          />
          <span className="t-strong" style={{ minWidth: 42 }}>
            {pct(r.area.progressPct)}
          </span>
        </div>
      ),
    },
    { key: 'delivered', header: 'Delivered', render: (r) => <Bar pct={r.deliveredPct} label={pct(r.deliveredPct)} /> },
    {
      key: 'seq',
      header: 'Build order',
      align: 'right',
      render: (r) => (
        <input
          className="inline"
          type="number"
          min={1}
          aria-label={`Build order for ${r.area.section} ${r.area.level}`}
          value={r.area.sequence}
          onChange={(e) =>
            dispatch({ type: 'area/update', id: r.area.id, patch: { sequence: Number(e.target.value) || 1 } })
          }
        />
      ),
    },
  ];

  const countColumns: Column<MaterialRollup>[] = [
    {
      key: 'material',
      header: 'Material',
      render: (r) => (
        <>
          <div className="t-strong">{r.material.description}</div>
          <div className="sub">{r.material.group}</div>
        </>
      ),
    },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (r) => qty(r.deliveredQty) },
    {
      key: 'counted',
      header: 'Counted on hand',
      align: 'right',
      render: (r) =>
        r.countedQty === undefined ? (
          <span style={{ color: 'var(--text3)' }}>never counted</span>
        ) : (
          <>
            <div className="t-strong">{qty(r.countedQty)}</div>
            <div className="sub">{r.countedOn}</div>
          </>
        ),
    },
    {
      key: 'used',
      header: 'Implied used',
      align: 'right',
      render: (r) =>
        r.impliedUsedQty === undefined ? <span style={{ color: 'var(--text3)' }}>—</span> : qty(r.impliedUsedQty),
    },
    {
      key: 'expected',
      header: 'Expected by progress',
      align: 'right',
      render: (r) => qty(Math.round(r.expectedUsedQty)),
    },
  ];

  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Average built" value={pct(areaRollups.reduce((s, a) => s + a.progressPct, 0) / Math.max(1, areaRollups.length))} sub="across all sections" color="var(--green)" />
        <Stat label="Counted" value={`${counted}/${trackable}`} sub="delivered materials with a count" color="var(--blue)" />
        <Stat label="Last count" value={latestCount?.date ?? '—'} sub="most recent inventory walk" color="var(--purple)" />
        <Stat label="Sections" value={String(areaRollups.length)} sub="section and level combinations" />
      </div>

      <Card
        title="Section progress"
        note="Move the slider as each section is framed. Every change is recorded with the date, and the usage forecast recalculates immediately."
        actions={
          <button className="btn-primary" onClick={() => setWalking(true)} disabled={state.materials.length === 0}>
            ＋ Record inventory count
          </button>
        }
      >
        <DataTable
          columns={areaColumns}
          rows={areaRollups}
          getKey={(r) => r.area.id}
          minWidth={760}
          empty="No sections yet. Import a takeoff to create them."
        />
      </Card>

      <Card
        title="Inventory counts"
        note="What was physically on the ground at the last count. The difference between delivered and counted is what the crew actually used — the number no one enters by hand and everything downstream depends on."
      >
        <DataTable
          columns={countColumns}
          rows={rollups.filter((r) => r.deliveredQty > 0).sort((a, b) => a.material.description.localeCompare(b.material.description))}
          getKey={(r) => r.materialId}
          minWidth={780}
          rowClass={(r) => (r.countedQty === undefined ? 'row-warn' : undefined)}
          empty="Nothing has been delivered yet, so there is nothing to count."
        />
      </Card>

      {state.inventoryCounts.length > 0 && (
        <Card title="Count history">
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (c) => c.date },
              {
                key: 'material',
                header: 'Material',
                render: (c) => materialById.get(c.materialId)?.description ?? c.materialId,
              },
              { key: 'qty', header: 'On hand', align: 'right', render: (c) => qty(c.qty) },
              { key: 'note', header: 'Note', render: (c) => c.note ?? '—' },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (c) => (
                  <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'inventory/delete', id: c.id })}>
                    Remove
                  </button>
                ),
              },
            ]}
            rows={[...state.inventoryCounts].sort((a, b) => b.date.localeCompare(a.date))}
            getKey={(c) => c.id}
            minWidth={680}
          />
        </Card>
      )}

      {walking && <CountWalkModal onClose={() => setWalking(false)} />}
    </div>
  );
}

/** One dialog that captures a count and the matching progress figure together. */
function CountWalkModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, rollups } = useStore();
  const [date, setDate] = useState(state.project.today);
  const [note, setNote] = useState('Weekly count with progress walk');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, number>>(
    Object.fromEntries(state.areas.map((a) => [a.id, a.progressPct])),
  );

  const countable = rollups
    .filter((r) => r.deliveredQty > 0)
    .sort((a, b) => a.material.description.localeCompare(b.material.description));

  const entered = Object.values(counts).filter((v) => v.trim() !== '').length;

  function save() {
    for (const [materialId, raw] of Object.entries(counts)) {
      if (raw.trim() === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      dispatch({
        type: 'inventory/add',
        count: { id: newId('ic'), date, materialId, qty: value, note: note.trim() || undefined },
      });
    }
    for (const area of state.areas) {
      const next = progress[area.id];
      if (next !== undefined && next !== area.progressPct) {
        dispatch({
          type: 'progress/record',
          entry: { id: newId('pr'), areaId: area.id, date, pct: next, note: note.trim() || undefined },
        });
      }
    }
    onClose();
  }

  return (
    <Modal
      title="Inventory count and progress walk"
      subtitle="Record both together. A count without a matching progress figure measures the burn rate against the wrong denominator."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={entered === 0}>
            Save {entered} count{entered === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="frow">
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        <div className="section-h">Section progress</div>
        <div className="frow">
          {state.areas.map((area) => (
            <Field key={area.id} label={`${area.section} · ${area.level}`}>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={progress[area.id] ?? 0}
                onChange={(e) =>
                  setProgress((prev) => ({
                    ...prev,
                    [area.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
              />
            </Field>
          ))}
        </div>

        <div className="section-h">On-hand counts — leave blank to skip a material</div>
        <div className="tw" style={{ maxHeight: 300, overflowY: 'auto' }}>
          <table className="t">
            <thead>
              <tr>
                <th>Material</th>
                <th className="num">Delivered</th>
                <th className="num">Last count</th>
                <th className="num">On hand now</th>
              </tr>
            </thead>
            <tbody>
              {countable.map((r) => (
                <tr key={r.materialId}>
                  <td>
                    <div className="t-strong">{r.material.description}</div>
                    <div className="sub">{r.material.unit}</div>
                  </td>
                  <td className="num">{qty(r.deliveredQty)}</td>
                  <td className="num">{r.countedQty === undefined ? '—' : qty(r.countedQty)}</td>
                  <td className="num">
                    <input
                      className="inline"
                      type="number"
                      min={0}
                      aria-label={`On hand for ${r.material.description}`}
                      value={counts[r.materialId] ?? ''}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [r.materialId]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
