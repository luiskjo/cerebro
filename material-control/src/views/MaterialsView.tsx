import { useState } from 'react';
import { Card, DataTable, Pill, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { qty } from '../format';
import { MATERIAL_GROUPS, SUBGROUPS_BY_GROUP, UNITS, type MaterialGroup, type MaterialSubgroup, type Unit } from '../types';
import type { MaterialRollup, OrphanSuggestion, DuplicateSuggestion } from '../engine';

export default function MaterialsView() {
  const { rollups, orphans, duplicates, dispatch, state } = useStore();
  const [group, setGroup] = useState<MaterialGroup | 'All'>('All');
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const rows = rollups
    .filter((r) => group === 'All' || r.material.group === group)
    .filter((r) =>
      !term
        ? true
        : [r.material.description, ...r.material.aliases, r.material.takeoffDescription ?? '']
            .join(' ')
            .toLowerCase()
            .includes(term),
    )
    .sort(
      (a, b) =>
        a.material.group.localeCompare(b.material.group) ||
        a.material.subgroup.localeCompare(b.material.subgroup) ||
        a.material.description.localeCompare(b.material.description),
    );

  const columns: Column<MaterialRollup>[] = [
    {
      key: 'material',
      header: 'Material',
      render: (r) => (
        <>
          <div className="t-strong">{r.material.description}</div>
          {r.material.takeoffDescription && r.material.takeoffDescription !== r.material.description && (
            <div className="sub">takeoff wording: {r.material.takeoffDescription}</div>
          )}
          {r.material.aliases.length > 2 && (
            <div className="sub">{r.material.aliases.length} aliases on file</div>
          )}
        </>
      ),
    },
    {
      key: 'group',
      header: 'Group',
      render: (r) => (
        <select
          className="select"
          style={{ width: 120 }}
          value={r.material.group}
          aria-label={`Group for ${r.material.description}`}
          onChange={(e) => {
            const nextGroup = e.target.value as MaterialGroup;
            const allowed = SUBGROUPS_BY_GROUP[nextGroup];
            dispatch({
              type: 'material/update',
              id: r.materialId,
              patch: {
                group: nextGroup,
                subgroup: allowed.includes(r.material.subgroup) ? r.material.subgroup : allowed[0],
              },
            });
          }}
        >
          {MATERIAL_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'subgroup',
      header: 'Subgroup',
      render: (r) => {
        const options = SUBGROUPS_BY_GROUP[r.material.group];
        if (options.length === 1) return <span style={{ color: 'var(--text3)' }}>—</span>;
        return (
          <select
            className="select"
            style={{ width: 150 }}
            value={r.material.subgroup}
            aria-label={`Subgroup for ${r.material.description}`}
            onChange={(e) =>
              dispatch({
                type: 'material/update',
                id: r.materialId,
                patch: { subgroup: e.target.value as MaterialSubgroup },
              })
            }
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (r) => (
        <select
          className="select"
          style={{ width: 78 }}
          value={r.material.unit}
          aria-label={`Unit for ${r.material.description}`}
          onChange={(e) => dispatch({ type: 'material/update', id: r.materialId, patch: { unit: e.target.value as Unit } })}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'spec',
      header: 'Parsed',
      render: (r) => (
        <div className="sub" style={{ marginTop: 0 }}>
          {r.material.nominal ?? '—'}
          {r.material.lengthIn !== undefined ? ` × ${r.material.lengthIn}"` : ''}
          {r.material.species ? ` · ${r.material.species}${r.material.grade ?? ''}` : ''}
          {r.material.treatment !== 'NONE' ? ` · ${r.material.treatment}` : ''}
        </div>
      ),
    },
    { key: 'takeoff', header: 'Takeoff', align: 'right', render: (r) => qty(r.takeoffQty) },
    { key: 'ordered', header: 'Bought', align: 'right', render: (r) => qty(r.orderedQty) },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (r) => qty(r.deliveredQty) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            const used = r.takeoffQty !== 0 || r.orderedQty !== 0 || r.deliveredQty !== 0;
            if (used && !confirm(`${r.material.description} is referenced by takeoff, orders or deliveries. Delete it and everything that points at it?`)) return;
            dispatch({ type: 'material/delete', id: r.materialId });
          }}
        >
          Delete
        </button>
      ),
    },
  ];

  const orphanColumns: Column<OrphanSuggestion>[] = [
    {
      key: 'material',
      header: 'Material',
      render: (o) => (
        <>
          <div className="t-strong">{o.material.description}</div>
          <div className="sub">{o.explanation}</div>
        </>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (o) => (
        <Pill tone={o.reason === 'fully-credited' ? 'amber' : 'grey'}>
          {o.reason === 'fully-credited' ? 'Credited in full' : o.reason === 'order-only-void' ? 'Void orders only' : 'Never referenced'}
        </Pill>
      ),
    },
    { key: 'takeoff', header: 'Takeoff', align: 'right', render: (o) => qty(o.takeoffQty) },
    { key: 'ordered', header: 'Net bought', align: 'right', render: (o) => qty(o.orderedQty) },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (o) => qty(o.deliveredQty) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'material/delete', id: o.material.id })}>
          Delete
        </button>
      ),
    },
  ];

  const duplicateColumns: Column<DuplicateSuggestion>[] = [
    { key: 'a', header: 'Material', render: (d) => <span className="t-strong">{d.a.description}</span> },
    { key: 'b', header: 'Possible duplicate', render: (d) => <span className="t-strong">{d.b.description}</span> },
    { key: 'reason', header: 'Why', render: (d) => <span className="sub" style={{ marginTop: 0 }}>{d.reason}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'material/merge', keepId: d.a.id, dropId: d.b.id })}>
            Keep first
          </button>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'material/merge', keepId: d.b.id, dropId: d.a.id })}>
            Keep second
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stack">
      {orphans.length > 0 && (
        <Card
          title="Suggested deletions"
          note="These carry no takeoff, no live order and no delivery. Usually material bought in preconstruction and credited back in full on a change order. Nothing is deleted automatically."
        >
          <DataTable
            columns={orphanColumns}
            rows={orphans}
            getKey={(o) => o.material.id}
            minWidth={800}
            rowClass={() => 'row-warn'}
          />
        </Card>
      )}

      <Card title="Material catalog" note={`${state.materials.length} materials. Group and subgroup are set automatically on import and can be corrected here.`}>
        <div className="toolbar">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search descriptions and aliases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search materials"
          />
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
          minWidth={1180}
          empty="No materials yet. Import a takeoff or an order file to get started."
        />
      </Card>

      {duplicates.length > 0 && (
        <Card
          title="Possible duplicates"
          note="Catalog entries that look like the same product. Distinct from correlation, which pairs takeoff wording with purchase-order wording."
        >
          <DataTable columns={duplicateColumns} rows={duplicates} getKey={(d) => `${d.a.id}|${d.b.id}`} minWidth={820} />
        </Card>
      )}
    </div>
  );
}
