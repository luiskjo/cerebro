import { useRef, useState } from 'react';
import { Card, DataTable, Field, Pill } from '../components/ui';
import { useStore } from '../StoreProvider';
import {
  parseWorkbook,
  guessMapping,
  type MappingField,
  type SheetData,
  type WorkbookData,
} from '../importing/workbook';
import {
  applyOrderImport,
  applyTakeoffImport,
  ORDER_FIELDS,
  TAKEOFF_FIELDS,
  type ImportSummary,
} from '../importing/apply';
import type { OrderKind } from '../types';

type Kind = 'takeoff' | 'order';

const FIELD_LABEL: Record<MappingField, string> = {
  description: 'Material description',
  qty: 'Quantity',
  unit: 'Unit',
  section: 'Section / building',
  level: 'Level / floor',
  unitCost: 'Unit cost',
  orderNumber: 'PO / CO number',
  vendor: 'Vendor',
  date: 'Date',
  kind: 'PO or CO',
  note: 'Note',
};

const REQUIRED: MappingField[] = ['description', 'qty'];

export default function ImportView() {
  const { state, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<Kind>('takeoff');
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [mapping, setMapping] = useState<Partial<Record<MappingField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [defaultKind, setDefaultKind] = useState<OrderKind>('PO');
  const [defaultVendor, setDefaultVendor] = useState('');
  const [defaultNumber, setDefaultNumber] = useState('');
  const [defaultDate, setDefaultDate] = useState(state.project.today);

  const fields = kind === 'takeoff' ? TAKEOFF_FIELDS : ORDER_FIELDS;
  const sheet: SheetData | undefined = workbook?.sheets.find((s) => s.name === sheetName);

  async function onFile(file: File) {
    setError(null);
    setSummary(null);
    try {
      const data = await file.arrayBuffer();
      const parsed = parseWorkbook(data, file.name);
      if (parsed.sheets.length === 0) {
        setError('No readable sheets found in that file.');
        return;
      }
      const first = parsed.sheets[0];
      setWorkbook(parsed);
      setSheetName(first.name);
      setMapping(guessMapping(first.headers, fields));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  }

  function selectSheet(name: string) {
    setSheetName(name);
    const next = workbook?.sheets.find((s) => s.name === name);
    if (next) setMapping(guessMapping(next.headers, fields));
  }

  function switchKind(next: Kind) {
    setKind(next);
    setSummary(null);
    const nextFields = next === 'takeoff' ? TAKEOFF_FIELDS : ORDER_FIELDS;
    if (sheet) setMapping(guessMapping(sheet.headers, nextFields));
  }

  const missing = REQUIRED.filter((f) => !mapping[f]);
  const canImport = Boolean(sheet) && missing.length === 0;

  function runImport() {
    if (!sheet) return;
    const result =
      kind === 'takeoff'
        ? applyTakeoffImport(state, sheet, mapping)
        : applyOrderImport(state, sheet, mapping, {
            kind: defaultKind,
            vendorName: defaultVendor.trim(),
            number: defaultNumber.trim(),
            date: defaultDate,
          });
    dispatch({ type: 'state/replace', state: result.state });
    setSummary(result.summary);
  }

  const previewRows = sheet?.rows.slice(0, 8) ?? [];

  return (
    <div className="stack">
      <Card
        title="Import files"
        note={
          <>
            Takeoffs, purchase orders and change orders all import from Excel or CSV. Nothing assumes a fixed
            template — the columns are guessed from the headers and you confirm them before anything is
            committed. Descriptions that reduce to the same signature merge automatically; the rest go to the
            Correlation tab.
          </>
        }
      >
        <div className="toolbar">
          <div className="chiprow">
            <button className={`chip${kind === 'takeoff' ? ' active' : ''}`} onClick={() => switchKind('takeoff')}>
              Material takeoff
            </button>
            <button className={`chip${kind === 'order' ? ' active' : ''}`} onClick={() => switchKind('order')}>
              Purchase / change orders
            </button>
          </div>
          <div className="spacer" />
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>
            ⭱ Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {error && <div className="note" style={{ color: 'var(--red)' }}>{error}</div>}

        {!workbook && (
          <div className="empty">
            {kind === 'takeoff'
              ? 'Choose a takeoff workbook. It should have one row per material with a quantity, and ideally columns for the section and level.'
              : 'Choose a purchase-order or change-order workbook. It should have one row per line with a quantity and unit cost, plus the PO/CO number and vendor.'}
          </div>
        )}

        {workbook && sheet && (
          <div className="form">
            <div className="frow">
              <Field label="File">
                <input className="input" value={workbook.fileName} readOnly />
              </Field>
              <Field label="Sheet">
                <select className="select" value={sheetName} onChange={(e) => selectSheet(e.target.value)}>
                  {workbook.sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rows.length} rows)
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="section-h">Map columns</div>
            <div className="frow">
              {fields.map((field) => (
                <Field
                  key={field}
                  label={`${FIELD_LABEL[field]}${REQUIRED.includes(field) ? ' *' : ''}`}
                >
                  <select
                    className="select"
                    value={mapping[field] ?? ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
                  >
                    <option value="">— not in this file —</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>

            {kind === 'order' && (
              <>
                <div className="section-h">Defaults for rows that do not carry their own values</div>
                <div className="frow">
                  <Field label="Document type">
                    <select className="select" value={defaultKind} onChange={(e) => setDefaultKind(e.target.value as OrderKind)}>
                      <option value="PO">Purchase order</option>
                      <option value="CO">Change order</option>
                    </select>
                  </Field>
                  <Field label="PO / CO number">
                    <input className="input" value={defaultNumber} onChange={(e) => setDefaultNumber(e.target.value)} placeholder="PO-2201" />
                  </Field>
                  <Field label="Vendor">
                    <input
                      className="input"
                      list="vendor-list"
                      value={defaultVendor}
                      onChange={(e) => setDefaultVendor(e.target.value)}
                      placeholder="Pacific Lumber Supply"
                    />
                    <datalist id="vendor-list">
                      {state.vendors.map((v) => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Date">
                    <input className="input" type="date" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            <div className="section-h">Preview — first {previewRows.length} rows</div>
            <div className="tw">
              <table className="t" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    {fields
                      .filter((f) => mapping[f])
                      .map((f) => (
                        <th key={f}>{FIELD_LABEL[f]}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {fields
                        .filter((f) => mapping[f])
                        .map((f) => (
                          <td key={f}>{String(row[mapping[f]!] ?? '')}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="toolbar" style={{ marginTop: 8 }}>
              {missing.length > 0 && (
                <span style={{ fontSize: 11.5, color: 'var(--red)' }}>
                  Map {missing.map((f) => FIELD_LABEL[f]).join(' and ')} to continue.
                </span>
              )}
              <div className="spacer" />
              <button className="btn-primary" onClick={runImport} disabled={!canImport}>
                Import {sheet.rows.length} rows
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="note" style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 6 }}>
              <Pill tone="green">Imported</Pill>
            </div>
            {summary.rowsRead} rows read, {summary.rowsSkipped} skipped, {summary.linesCreated} lines created.{' '}
            {summary.materialsCreated} new materials, {summary.materialsMatched} matched to existing ones
            {summary.areasCreated > 0 ? `, ${summary.areasCreated} sections created` : ''}
            {summary.ordersCreated > 0 ? `, ${summary.ordersCreated} orders created` : ''}
            {summary.vendorsCreated > 0 ? `, ${summary.vendorsCreated} vendors created` : ''}.
            {summary.warnings.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18, color: 'var(--amber)' }}>
                {summary.warnings.slice(0, 6).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card title="What is already loaded">
        <DataTable
          columns={[
            { key: 'k', header: 'Record', render: (r: { k: string; v: number }) => r.k },
            { key: 'v', header: 'Count', align: 'right', render: (r) => r.v.toLocaleString() },
          ]}
          rows={[
            { k: 'Materials', v: state.materials.length },
            { k: 'Sections and levels', v: state.areas.length },
            { k: 'Takeoff lines', v: state.takeoffLines.length },
            { k: 'Purchase orders', v: state.orders.filter((o) => o.kind === 'PO').length },
            { k: 'Change orders', v: state.orders.filter((o) => o.kind === 'CO').length },
            { k: 'Vendors', v: state.vendors.length },
            { k: 'Delivery tickets', v: state.deliveries.length },
          ]}
          getKey={(r) => r.k}
          minWidth={320}
        />
      </Card>
    </div>
  );
}
