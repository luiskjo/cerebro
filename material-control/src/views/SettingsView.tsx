import { useRef, useState } from 'react';
import { Card, DataTable, Field, NumberField, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { exportJson, newId, parseImport } from '../store';
import { qty } from '../format';
import type { Area, Vendor } from '../types';

export default function SettingsView() {
  const { state, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function download() {
    const blob = new Blob([exportJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `material-control-${state.project.today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function runImport(raw: string) {
    const result = parseImport(raw);
    if (!result.ok || !result.state) {
      setMessage({ ok: false, text: result.error ?? 'Import failed.' });
      return;
    }
    dispatch({ type: 'state/replace', state: result.state });
    setMessage({ ok: true, text: 'Project restored.' });
    setText('');
  }

  const areaColumns: Column<Area>[] = [
    {
      key: 'section',
      header: 'Section',
      render: (a) => (
        <input
          className="input"
          value={a.section}
          aria-label={`Section name for ${a.id}`}
          onChange={(e) => dispatch({ type: 'area/update', id: a.id, patch: { section: e.target.value } })}
        />
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (a) => (
        <input
          className="input"
          value={a.level}
          aria-label={`Level name for ${a.id}`}
          onChange={(e) => dispatch({ type: 'area/update', id: a.id, patch: { level: e.target.value } })}
        />
      ),
    },
    {
      key: 'start',
      header: 'Planned start',
      render: (a) => (
        <input
          className="input"
          type="date"
          value={a.plannedStart ?? ''}
          aria-label={`Planned start for ${a.section} ${a.level}`}
          onChange={(e) => dispatch({ type: 'area/update', id: a.id, patch: { plannedStart: e.target.value || undefined } })}
        />
      ),
    },
    {
      key: 'seq',
      header: 'Order',
      align: 'right',
      render: (a) => (
        <input
          className="inline"
          type="number"
          min={1}
          aria-label={`Build order for ${a.section} ${a.level}`}
          value={a.sequence}
          onChange={(e) => dispatch({ type: 'area/update', id: a.id, patch: { sequence: Number(e.target.value) || 1 } })}
        />
      ),
    },
    {
      key: 'lines',
      header: 'Takeoff lines',
      align: 'right',
      render: (a) => state.takeoffLines.filter((l) => l.areaId === a.id).length,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (confirm(`Delete ${a.section} · ${a.level} and its takeoff, drops and progress?`)) {
              dispatch({ type: 'area/delete', id: a.id });
            }
          }}
        >
          Delete
        </button>
      ),
    },
  ];

  const vendorColumns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Vendor',
      render: (v) => (
        <input
          className="input"
          value={v.name}
          aria-label={`Name for vendor ${v.id}`}
          onChange={(e) => dispatch({ type: 'vendor/update', id: v.id, patch: { name: e.target.value } })}
        />
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (v) => (
        <input
          className="input"
          value={v.contact}
          aria-label={`Contact for ${v.name}`}
          onChange={(e) => dispatch({ type: 'vendor/update', id: v.id, patch: { contact: e.target.value } })}
        />
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (v) => (
        <input
          className="input"
          value={v.phone}
          aria-label={`Phone for ${v.name}`}
          onChange={(e) => dispatch({ type: 'vendor/update', id: v.id, patch: { phone: e.target.value } })}
        />
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (v) => state.orders.filter((o) => o.vendorId === v.id).length,
    },
    {
      key: 'deliveries',
      header: 'Tickets',
      align: 'right',
      render: (v) => state.deliveries.filter((d) => d.vendorId === v.id).length,
    },
  ];

  return (
    <div className="stack">
      <Card title="Project">
        <div className="form">
          <div className="frow">
            <Field label="Project name">
              <input
                className="input"
                value={state.project.name}
                onChange={(e) => dispatch({ type: 'project/update', patch: { name: e.target.value } })}
              />
            </Field>
            <Field label="Reference date" hint="Everything time-based is measured from here.">
              <input
                className="input"
                type="date"
                value={state.project.today}
                onChange={(e) => dispatch({ type: 'project/update', patch: { today: e.target.value } })}
              />
            </Field>
            <NumberField
              label="Burn-rate tolerance (%)"
              value={state.project.usageTolerancePct}
              onChange={(usageTolerancePct) => dispatch({ type: 'project/update', patch: { usageTolerancePct } })}
              hint="How far usage may deviate from progress before it is flagged."
            />
            <NumberField
              label="Shortage tolerance"
              value={state.project.shortageTolerance}
              onChange={(shortageTolerance) => dispatch({ type: 'project/update', patch: { shortageTolerance } })}
              hint="Over/short quantities below this are treated as noise."
            />
          </div>
        </div>
      </Card>

      <Card
        title="Sections and levels"
        actions={
          <button
            className="btn"
            onClick={() =>
              dispatch({
                type: 'area/add',
                area: {
                  id: newId('area'),
                  section: 'New section',
                  level: 'Level 1',
                  sequence: state.areas.length + 1,
                  progressPct: 0,
                },
              })
            }
          >
            ＋ Add section
          </button>
        }
      >
        <DataTable
          columns={areaColumns}
          rows={[...state.areas].sort((a, b) => a.sequence - b.sequence)}
          getKey={(a) => a.id}
          minWidth={860}
          empty="No sections yet. Import a takeoff with section and level columns to create them automatically."
        />
      </Card>

      <Card
        title="Vendors"
        actions={
          <button
            className="btn"
            onClick={() =>
              dispatch({
                type: 'vendor/add',
                vendor: { id: newId('ven'), name: 'New vendor', contact: '', phone: '' },
              })
            }
          >
            ＋ Add vendor
          </button>
        }
      >
        <DataTable
          columns={vendorColumns}
          rows={state.vendors}
          getKey={(v) => v.id}
          minWidth={780}
          empty="No vendors yet."
        />
      </Card>

      <Card
        title="Data"
        note="Everything lives in this browser. Export before switching machines, and keep a copy after each import."
      >
        <div className="toolbar">
          <button className="btn" onClick={download}>
            ⭳ Export project
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⭱ Restore from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) runImport(await file.text());
              e.target.value = '';
            }}
          />
          <div className="spacer" />
          <button
            className="btn"
            onClick={() => {
              if (confirm('Replace everything with the Aspen Ridge demo project?')) {
                dispatch({ type: 'state/reset', mode: 'seed' });
                setMessage({ ok: true, text: 'Demo project loaded.' });
              }
            }}
          >
            Load demo project
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Clear all materials, takeoff, orders, deliveries and progress?')) {
                dispatch({ type: 'state/reset', mode: 'empty' });
                setMessage({ ok: true, text: 'Started an empty project.' });
              }
            }}
          >
            Start empty
          </button>
        </div>

        <Field label="Or paste an export" hint="JSON produced by the export button above.">
          <textarea
            className="textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMessage(null);
            }}
            placeholder='{ "version": 1, "project": { … } }'
          />
        </Field>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="btn" disabled={!text.trim()} onClick={() => runImport(text)}>
            Restore from text
          </button>
          {message && (
            <span style={{ fontSize: 11.5, color: message.ok ? 'var(--green)' : 'var(--red)' }}>{message.text}</span>
          )}
        </div>
      </Card>

      <Card title="Totals">
        <DataTable
          columns={[
            { key: 'k', header: 'Record', render: (r: { k: string; v: number }) => r.k },
            { key: 'v', header: 'Count', align: 'right', render: (r) => qty(r.v) },
          ]}
          rows={[
            { k: 'Materials', v: state.materials.length },
            { k: 'Takeoff lines', v: state.takeoffLines.length },
            { k: 'Orders', v: state.orders.length },
            { k: 'Delivery tickets', v: state.deliveries.length },
            { k: 'Drops', v: state.drops.length },
            { k: 'Inventory counts', v: state.inventoryCounts.length },
            { k: 'Progress entries', v: state.progressEntries.length },
            { k: 'Payments', v: state.payments.length },
          ]}
          getKey={(r) => r.k}
          minWidth={320}
        />
      </Card>
    </div>
  );
}
