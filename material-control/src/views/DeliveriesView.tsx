import { useMemo, useState } from 'react';
import { Card, DataTable, Field, Modal, NumberField, Pill, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { newId } from '../store';
import { money, qty } from '../format';
import type { Delivery, DeliveryLine } from '../types';

interface Row {
  delivery: Delivery;
  vendorName: string;
  orderNumber: string;
  lineCount: number;
  totalQty: number;
  value: number;
  areas: string;
}

type SortKey = 'date' | 'vendor' | 'bol' | 'value';

export default function DeliveriesView() {
  const { state, dispatch, vendorById, materialById, areaById } = useStore();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [descending, setDescending] = useState(true);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [creating, setCreating] = useState(false);

  const rows: Row[] = useMemo(() => {
    const unitCostFor = (materialId: string, orderId?: string) =>
      state.orders.find((o) => o.id === orderId)?.lines.find((l) => l.materialId === materialId)?.unitCost ??
      0;

    const mapped = state.deliveries.map((delivery) => {
      const areaCodes = [
        ...new Set(
          delivery.lines
            .map((l) => (l.areaId ? areaById.get(l.areaId) : undefined))
            .filter(Boolean)
            .map((a) => `${a!.section} ${a!.level}`),
        ),
      ];
      return {
        delivery,
        vendorName: vendorById.get(delivery.vendorId)?.name ?? 'Unknown vendor',
        orderNumber: state.orders.find((o) => o.id === delivery.orderId)?.number ?? '—',
        lineCount: delivery.lines.length,
        totalQty: delivery.lines.reduce((s, l) => s + l.qty, 0),
        value: delivery.lines.reduce((s, l) => s + l.qty * unitCostFor(l.materialId, delivery.orderId), 0),
        areas: areaCodes.length ? areaCodes.join(', ') : 'Unassigned',
      };
    });

    const term = search.trim().toLowerCase();
    const filtered = mapped.filter((row) => {
      if (vendorFilter !== 'all' && row.delivery.vendorId !== vendorFilter) return false;
      if (!term) return true;
      // Search covers the ticket, the vendor, the order and every material on it.
      const haystack = [
        row.delivery.bolNumber,
        row.vendorName,
        row.orderNumber,
        row.delivery.date,
        row.delivery.note ?? '',
        row.areas,
        ...row.delivery.lines.map((l) => materialById.get(l.materialId)?.description ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });

    const direction = descending ? -1 : 1;
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'vendor':
          return a.vendorName.localeCompare(b.vendorName) * direction;
        case 'bol':
          return a.delivery.bolNumber.localeCompare(b.delivery.bolNumber) * direction;
        case 'value':
          return (a.value - b.value) * direction;
        default:
          return a.delivery.date.localeCompare(b.delivery.date) * direction;
      }
    });
  }, [state, search, vendorFilter, sortKey, descending, vendorById, materialById, areaById]);

  // A vendor with no PO or CO cannot deliver — nothing was bought from them.
  const eligibleVendors = state.vendors.filter((v) => state.orders.some((o) => o.vendorId === v.id));

  const header = (label: string, key: SortKey) => (
    <button
      className="btn btn-sm"
      style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
      onClick={() => {
        if (sortKey === key) setDescending(!descending);
        else {
          setSortKey(key);
          setDescending(true);
        }
      }}
    >
      {label}
      {sortKey === key ? (descending ? ' ↓' : ' ↑') : ''}
    </button>
  );

  const columns: Column<Row>[] = [
    {
      key: 'bol',
      header: header('BOL', 'bol'),
      render: (r) => (
        <>
          <div className="t-strong">{r.delivery.bolNumber}</div>
          <div className="sub">{r.orderNumber}</div>
        </>
      ),
    },
    { key: 'date', header: header('Date', 'date'), render: (r) => r.delivery.date },
    { key: 'vendor', header: header('Vendor', 'vendor'), render: (r) => r.vendorName },
    { key: 'lines', header: 'Lines', align: 'right', render: (r) => r.lineCount },
    { key: 'qty', header: 'Total qty', align: 'right', render: (r) => qty(r.totalQty) },
    {
      key: 'areas',
      header: 'Section',
      render: (r) =>
        r.areas === 'Unassigned' ? <Pill tone="amber">Unassigned</Pill> : <span>{r.areas}</span>,
    },
    { key: 'value', header: header('Value', 'value'), align: 'right', render: (r) => money(r.value) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => setEditing(r.delivery)}>
            Open
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => dispatch({ type: 'delivery/delete', id: r.delivery.id })}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stack">
      <Card
        title="Delivery tickets"
        note="Every ticket carries a vendor, a BOL number, a date and the quantities received. Only vendors with a purchase or change order can appear, so a ticket can always be reconciled against a commitment."
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)} disabled={eligibleVendors.length === 0}>
            ＋ Log delivery
          </button>
        }
      >
        <div className="toolbar">
          <input
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Search BOL, vendor, PO, material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search deliveries"
          />
          <select
            className="select"
            style={{ maxWidth: 220 }}
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            aria-label="Filter by vendor"
          >
            <option value="all">All vendors</option>
            {eligibleVendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <div className="spacer" />
          <span style={{ fontSize: 11.5, color: 'var(--text2)' }}>
            {rows.length} of {state.deliveries.length} tickets
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.delivery.id}
          minWidth={900}
          rowClass={(r) => (r.areas === 'Unassigned' ? 'row-warn' : undefined)}
          empty={state.deliveries.length === 0 ? 'No deliveries logged yet.' : 'No tickets match this search.'}
        />
      </Card>

      {(creating || editing) && (
        <DeliveryModal
          delivery={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface DraftLine {
  key: string;
  materialId: string;
  qty: number;
  areaId: string;
  dropId: string;
}

function DeliveryModal({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const eligibleVendors = state.vendors.filter((v) => state.orders.some((o) => o.vendorId === v.id));

  const [vendorId, setVendorId] = useState(delivery?.vendorId ?? eligibleVendors[0]?.id ?? '');
  const [orderId, setOrderId] = useState(delivery?.orderId ?? '');
  const [bolNumber, setBolNumber] = useState(delivery?.bolNumber ?? '');
  const [date, setDate] = useState(delivery?.date ?? state.project.today);
  const [note, setNote] = useState(delivery?.note ?? '');
  const [lines, setLines] = useState<DraftLine[]>(
    delivery
      ? delivery.lines.map((l, i) => ({
          key: `k${i}`,
          materialId: l.materialId,
          qty: l.qty,
          areaId: l.areaId ?? '',
          dropId: l.dropId ?? '',
        }))
      : [{ key: 'k0', materialId: '', qty: 0, areaId: '', dropId: '' }],
  );

  // A ticket can only carry material that this vendor was actually bought from.
  const vendorOrders = state.orders.filter((o) => o.vendorId === vendorId && o.status !== 'void');
  const vendorMaterialIds = new Set(vendorOrders.flatMap((o) => o.lines.map((l) => l.materialId)));
  const selectableMaterials = state.materials
    .filter((m) => vendorMaterialIds.has(m.id))
    .sort((a, b) => a.description.localeCompare(b.description));

  const areaDrops = (areaId: string) =>
    state.drops.filter((d) => d.areaId === areaId && d.status !== 'cancelled');

  function update(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const valid = bolNumber.trim() && vendorId && lines.some((l) => l.materialId && l.qty !== 0);

  function save() {
    const payload: DeliveryLine[] = lines
      .filter((l) => l.materialId && l.qty !== 0)
      .map((l) => ({
        id: newId('dl'),
        materialId: l.materialId,
        qty: l.qty,
        areaId: l.areaId || undefined,
        dropId: l.dropId || undefined,
      }));

    if (delivery) {
      dispatch({
        type: 'delivery/update',
        id: delivery.id,
        patch: { vendorId, orderId: orderId || undefined, bolNumber: bolNumber.trim(), date, note: note.trim() || undefined, lines: payload },
      });
    } else {
      dispatch({
        type: 'delivery/add',
        delivery: {
          id: newId('del'),
          vendorId,
          orderId: orderId || undefined,
          bolNumber: bolNumber.trim(),
          date,
          note: note.trim() || undefined,
          lines: payload,
        },
      });
    }
    onClose();
  }

  return (
    <Modal
      title={delivery ? `Delivery ${delivery.bolNumber}` : 'Log a delivery'}
      subtitle="Assign each line to a section so per-section delivery percentages stay accurate. Leave it blank for yard stock."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!valid}>
            {delivery ? 'Save changes' : 'Record delivery'}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="frow">
          <Field label="Vendor">
            <select
              className="select"
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                setOrderId('');
              }}
            >
              {eligibleVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Against PO / CO">
            <select className="select" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">— not specified —</option>
              {vendorOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kind} {o.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="BOL number">
            <input className="input" value={bolNumber} onChange={(e) => setBolNumber(e.target.value)} placeholder="PLS-44120" />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="section-h">Materials on this ticket</div>
        {lines.map((line) => (
          <div className="frow" key={line.key} style={{ alignItems: 'end' }}>
            <Field label="Material">
              <select
                className="select"
                value={line.materialId}
                onChange={(e) => update(line.key, { materialId: e.target.value })}
              >
                <option value="">— select —</option>
                {selectableMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.description}
                  </option>
                ))}
              </select>
            </Field>
            <NumberField label="Quantity" value={line.qty} onChange={(qtyValue) => update(line.key, { qty: qtyValue })} />
            <Field label="Section · level">
              <select
                className="select"
                value={line.areaId}
                onChange={(e) => update(line.key, { areaId: e.target.value, dropId: '' })}
              >
                <option value="">— yard stock —</option>
                {state.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.section} · {a.level}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Against drop">
              <select
                className="select"
                value={line.dropId}
                disabled={!line.areaId}
                onChange={(e) => update(line.key, { dropId: e.target.value })}
              >
                <option value="">— none —</option>
                {areaDrops(line.areaId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="btn btn-danger"
              onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== line.key) : prev))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="btn"
          style={{ justifySelf: 'start' }}
          onClick={() => setLines((prev) => [...prev, { key: `k${Date.now()}`, materialId: '', qty: 0, areaId: '', dropId: '' }])}
        >
          ＋ Add line
        </button>

        <Field label="Note">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condition, short counts, staging location…" />
        </Field>

        {selectableMaterials.length === 0 && (
          <div className="note" style={{ color: 'var(--red)' }}>
            This vendor has no purchase or change order, so there is nothing to receive against.
          </div>
        )}
      </div>
    </Modal>
  );
}
