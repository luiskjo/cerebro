import { useState } from 'react';
import { Card, DataTable, Field, Modal, Pill, Bar, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { newId } from '../store';
import { outstandingForArea, type DropRollup } from '../engine';
import { pct, qty } from '../format';
import type { Drop, DropStatus } from '../types';

const STATUSES: DropStatus[] = ['planned', 'requested', 'partial', 'delivered', 'cancelled'];

export default function DropsView() {
  const { dropRollups, state, dispatch, areaById } = useStore();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(dropRollups[0]?.drop.id ?? null);

  const columns: Column<DropRollup>[] = [
    {
      key: 'drop',
      header: 'Drop',
      render: (d) => (
        <>
          <div className="t-strong">{d.drop.name}</div>
          <div className="sub">{d.areaLabel}</div>
        </>
      ),
    },
    { key: 'date', header: 'Planned', render: (d) => d.drop.plannedDate ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <select
          className="select"
          style={{ width: 130 }}
          value={d.drop.status}
          aria-label={`Status for ${d.drop.name}`}
          onChange={(e) => dispatch({ type: 'drop/update', id: d.drop.id, patch: { status: e.target.value as DropStatus } })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'derived',
      header: 'Actual',
      render: (d) =>
        d.isLate ? (
          <Pill tone="red">Overdue</Pill>
        ) : d.derivedStatus === 'delivered' ? (
          <Pill tone="green">Delivered</Pill>
        ) : d.derivedStatus === 'partial' ? (
          <Pill tone="amber">Part delivered</Pill>
        ) : (
          <Pill tone="grey">Not delivered</Pill>
        ),
    },
    { key: 'lines', header: 'Lines', align: 'right', render: (d) => d.lines.length },
    { key: 'qty', header: 'Planned qty', align: 'right', render: (d) => qty(d.plannedTotal) },
    { key: 'progress', header: 'Delivered', render: (d) => <Bar pct={d.deliveredPct} label={pct(d.deliveredPct)} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => setExpanded(expanded === d.drop.id ? null : d.drop.id)}>
            {expanded === d.drop.id ? 'Hide' : 'Open'}
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'drop/delete', id: d.drop.id })}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  const open = dropRollups.find((d) => d.drop.id === expanded);

  return (
    <div className="stack">
      <Card
        title="Section delivery drops"
        note="A drop is a staged release for one section and level, so the site receives what the next stretch of work needs instead of the whole package. Quantities are proposed from what that area still needs — takeoff less what has already landed there, less what other open drops already promised — so re-planning never double-orders."
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)} disabled={state.areas.length === 0}>
            ＋ Plan a drop
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={dropRollups}
          getKey={(d) => d.drop.id}
          minWidth={980}
          rowClass={(d) => (d.isLate ? 'row-crit' : d.derivedStatus === 'delivered' ? 'row-ok' : undefined)}
          empty="No drops planned yet."
        />
      </Card>

      {open && (
        <Card title={`${open.drop.name} — ${open.areaLabel}`}>
          {open.drop.note && <div className="note" style={{ marginBottom: 12 }}>{open.drop.note}</div>}
          <DataTable
            columns={[
              {
                key: 'material',
                header: 'Material',
                render: (l) => <span className="t-strong">{l.material?.description ?? l.materialId}</span>,
              },
              { key: 'planned', header: 'Planned', align: 'right', render: (l) => `${qty(l.plannedQty)} ${l.material?.unit ?? ''}` },
              { key: 'delivered', header: 'Delivered', align: 'right', render: (l) => qty(l.deliveredQty) },
              {
                key: 'outstanding',
                header: 'Outstanding',
                align: 'right',
                render: (l) =>
                  l.outstandingQty > 0 ? (
                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{qty(l.outstandingQty)}</span>
                  ) : (
                    <Pill tone="green">Complete</Pill>
                  ),
              },
              { key: 'pct', header: 'Progress', render: (l) => <Bar pct={l.deliveredPct} label={pct(l.deliveredPct)} /> },
            ]}
            rows={open.lines}
            getKey={(l) => l.materialId}
            minWidth={680}
            empty="No lines on this drop."
          />
        </Card>
      )}

      {creating && <PlanDropModal onClose={() => setCreating(false)} />}
      {state.areas.length === 0 && (
        <div className="note">Import a takeoff first — drops are planned against a section's outstanding quantity.</div>
      )}
      {areaById.size === 0 && null}
    </div>
  );
}

function PlanDropModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, materialById } = useStore();
  const [areaId, setAreaId] = useState(state.areas[0]?.id ?? '');
  const [plannedDate, setPlannedDate] = useState(state.project.today);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});

  const area = state.areas.find((a) => a.id === areaId);
  const outstanding = areaId ? outstandingForArea(state, areaId) : new Map<string, number>();
  const rows = [...outstanding.entries()]
    .map(([materialId, remaining]) => ({ materialId, material: materialById.get(materialId), remaining }))
    .filter((r) => r.material)
    .sort((a, b) => (a.material!.description > b.material!.description ? 1 : -1));

  const chosen = Object.entries(selected).filter(([, q]) => q > 0);

  function toggleAll() {
    if (chosen.length === rows.length) setSelected({});
    else setSelected(Object.fromEntries(rows.map((r) => [r.materialId, r.remaining])));
  }

  return (
    <Modal
      title="Plan a section drop"
      subtitle="Quantities default to what this section still needs. Trim them to match what will fit on a truck or what the crew can stage."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!areaId || chosen.length === 0}
            onClick={() => {
              const drop: Drop = {
                id: newId('drop'),
                areaId,
                name: name.trim() || `${area?.section} · ${area?.level} drop`,
                plannedDate,
                status: 'planned',
                note: note.trim() || undefined,
                lines: chosen.map(([materialId, plannedQty]) => ({
                  id: newId('dpl'),
                  materialId,
                  plannedQty,
                })),
              };
              dispatch({ type: 'drop/add', drop });
              onClose();
            }}
          >
            Create drop ({chosen.length} lines)
          </button>
        </>
      }
    >
      <div className="form">
        <div className="frow">
          <Field label="Section · level">
            <select
              className="select"
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                setSelected({});
              }}
            >
              {state.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.section} · {a.level}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Planned date">
            <input className="input" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
          </Field>
          <Field label="Name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={area ? `${area.section} · ${area.level} drop` : 'Drop name'}
            />
          </Field>
        </div>

        <div className="toolbar">
          <span className="section-h" style={{ margin: 0 }}>
            Still needed at this section
          </span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={toggleAll}>
            {chosen.length === rows.length && rows.length > 0 ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            Nothing outstanding here — the takeoff for this section is already delivered or promised on another drop.
          </div>
        ) : (
          <div className="tw" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 34 }}></th>
                  <th>Material</th>
                  <th className="num">Still needed</th>
                  <th className="num">On this drop</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.materialId}>
                    <td>
                      <input
                        type="checkbox"
                        className="check"
                        aria-label={`Include ${r.material!.description}`}
                        checked={(selected[r.materialId] ?? 0) > 0}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [r.materialId]: e.target.checked ? r.remaining : 0,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div className="t-strong">{r.material!.description}</div>
                      <div className="sub">{r.material!.group}</div>
                    </td>
                    <td className="num">
                      {qty(r.remaining)} {r.material!.unit}
                    </td>
                    <td className="num">
                      <input
                        className="inline"
                        type="number"
                        min={0}
                        aria-label={`Quantity of ${r.material!.description}`}
                        value={selected[r.materialId] ?? 0}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [r.materialId]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Field label="Note">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Crane time, staging, access constraints…" />
        </Field>
      </div>
    </Modal>
  );
}
