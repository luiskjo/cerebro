import { useState } from 'react';
import { Card, DataTable, Field, Modal, Pill, Stat, Bar, type Column } from '../components/ui';
import { useStore } from '../StoreProvider';
import { newId } from '../store';
import { money, moneyShort, pct } from '../format';
import type { OrderBalance, VendorBalance, MaterialRollup } from '../engine';

export default function CostView() {
  const { vendorBalances, orderBalances, rollups, state, dispatch, summary } = useStore();
  const [paying, setPaying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const overCommitment = rollups.filter((r) => r.flags.some((f) => f.kind === 'cost-over-commitment'));

  const vendorColumns: Column<VendorBalance>[] = [
    {
      key: 'vendor',
      header: 'Vendor',
      render: (v) => (
        <>
          <div className="t-strong">{v.vendor.name}</div>
          <div className="sub">
            {v.orderCount} order{v.orderCount === 1 ? '' : 's'}
            {v.vendor.contact ? ` · ${v.vendor.contact}` : ''}
          </div>
        </>
      ),
    },
    { key: 'po', header: 'PO value', align: 'right', render: (v) => money(v.poValue) },
    {
      key: 'co',
      header: 'CO value',
      align: 'right',
      render: (v) =>
        v.coValue === 0 ? (
          <span style={{ color: 'var(--text3)' }}>—</span>
        ) : (
          <span style={{ color: v.coValue < 0 ? 'var(--red)' : 'var(--green)' }}>{money(v.coValue)}</span>
        ),
    },
    { key: 'committed', header: 'Committed', align: 'right', render: (v) => <span className="t-strong">{money(v.committed)}</span> },
    { key: 'received', header: 'Received', align: 'right', render: (v) => money(v.received) },
    {
      key: 'progress',
      header: 'Drawn down',
      render: (v) => <Bar pct={v.committed > 0 ? (v.received / v.committed) * 100 : 0} label={v.committed > 0 ? pct((v.received / v.committed) * 100) : '—'} />,
    },
    { key: 'paid', header: 'Paid', align: 'right', render: (v) => money(v.paid) },
    {
      key: 'due',
      header: 'Owed now',
      align: 'right',
      render: (v) => (
        <span style={{ color: v.dueNow > 0 ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
          {v.dueNow < 0 ? `${money(Math.abs(v.dueNow))} prepaid` : money(v.dueNow)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Left to receive',
      align: 'right',
      render: (v) =>
        v.overCommitted ? <Pill tone="red">Over commitment</Pill> : money(v.remainingCommitment),
    },
  ];

  const orderColumns: Column<OrderBalance>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (o) => (
        <>
          <div className="t-strong">
            <Pill tone={o.order.kind === 'CO' ? 'purple' : 'blue'}>{o.order.kind}</Pill> {o.order.number}
          </div>
          <div className="sub">
            {o.vendorName} · {o.order.date}
            {o.order.description ? ` · ${o.order.description}` : ''}
          </div>
        </>
      ),
    },
    { key: 'lines', header: 'Lines', align: 'right', render: (o) => o.lineCount },
    { key: 'committed', header: 'Committed', align: 'right', render: (o) => money(o.committed) },
    { key: 'received', header: 'Received', align: 'right', render: (o) => money(o.received) },
    { key: 'progress', header: 'Drawn down', render: (o) => <Bar pct={o.receivedPct} label={pct(o.receivedPct)} /> },
    { key: 'paid', header: 'Paid', align: 'right', render: (o) => money(o.paid) },
    {
      key: 'due',
      header: 'Owed now',
      align: 'right',
      render: (o) => (
        <span style={{ color: o.dueNow > 0.5 ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
          {money(o.dueNow)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '',
      render: (o) => (o.overCommitted ? <Pill tone="red">Over</Pill> : null),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <button className="btn btn-sm" onClick={() => setExpanded(expanded === o.order.id ? null : o.order.id)}>
          {expanded === o.order.id ? 'Hide' : 'Lines'}
        </button>
      ),
    },
  ];

  const materialColumns: Column<MaterialRollup>[] = [
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
    { key: 'committed', header: 'Committed', align: 'right', render: (r) => money(r.committedCost) },
    { key: 'received', header: 'Received value', align: 'right', render: (r) => money(r.receivedCost) },
    {
      key: 'over',
      header: 'Over commitment',
      align: 'right',
      render: (r) => (
        <span style={{ color: 'var(--red)', fontWeight: 700 }}>{money(r.receivedCost - r.committedCost)}</span>
      ),
    },
  ];

  const openOrder = orderBalances.find((o) => o.order.id === expanded);

  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Committed" value={moneyShort(summary.committedCost)} sub="POs and COs issued" color="var(--blue)" />
        <Stat label="Received" value={moneyShort(summary.receivedCost)} sub="value delivered to site" color="var(--purple)" />
        <Stat label="Paid" value={moneyShort(summary.paidAmount)} sub="cash out the door" color="var(--green)" />
        <Stat
          label="Owed now"
          value={moneyShort(summary.receivedCost - summary.paidAmount)}
          sub="received but not yet paid"
          color={summary.receivedCost - summary.paidAmount > 0 ? 'var(--amber)' : 'var(--green)'}
        />
        <Stat
          label="Left to receive"
          value={moneyShort(summary.committedCost - summary.receivedCost)}
          sub="committed but not delivered"
        />
      </div>

      <div className="note">
        <strong>Committed</strong> is the value of every purchase and change order, credits included.{' '}
        <strong>Received</strong> is material actually delivered, priced at the order rate.{' '}
        <strong>Paid</strong> is cash that has left. What you owe today is received minus paid; what is left
        to spend is committed minus received.
      </div>

      {overCommitment.length > 0 && (
        <Card title="Materials received beyond their commitment">
          <DataTable
            columns={materialColumns}
            rows={overCommitment}
            getKey={(r) => r.materialId}
            minWidth={620}
            rowClass={() => 'row-crit'}
          />
        </Card>
      )}

      <Card
        title="Vendor balances"
        actions={
          <button className="btn-primary" onClick={() => setPaying(true)} disabled={state.vendors.length === 0}>
            ＋ Record payment
          </button>
        }
      >
        <DataTable
          columns={vendorColumns}
          rows={vendorBalances}
          getKey={(v) => v.vendor.id}
          minWidth={1000}
          rowClass={(v) => (v.overCommitted ? 'row-crit' : undefined)}
          empty="No vendors with orders yet."
        />
      </Card>

      <Card title="Purchase and change orders">
        <DataTable
          columns={orderColumns}
          rows={orderBalances}
          getKey={(o) => o.order.id}
          minWidth={1000}
          rowClass={(o) => (o.overCommitted ? 'row-crit' : undefined)}
          empty="No orders yet."
        />
      </Card>

      {openOrder && (
        <Card title={`${openOrder.order.kind} ${openOrder.order.number} — lines`}>
          <DataTable
            columns={[
              {
                key: 'material',
                header: 'Material',
                render: (l) => state.materials.find((m) => m.id === l.materialId)?.description ?? l.materialId,
              },
              { key: 'qty', header: 'Quantity', align: 'right', render: (l) => l.qty.toLocaleString() },
              { key: 'unit', header: 'Unit cost', align: 'right', render: (l) => money(l.unitCost, 2) },
              { key: 'total', header: 'Line total', align: 'right', render: (l) => money(l.qty * l.unitCost) },
            ]}
            rows={openOrder.order.lines}
            getKey={(l) => l.id}
            minWidth={560}
          />
        </Card>
      )}

      {state.payments.length > 0 && (
        <Card title="Payments">
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (p) => p.date },
              {
                key: 'vendor',
                header: 'Vendor',
                render: (p) => state.vendors.find((v) => v.id === p.vendorId)?.name ?? p.vendorId,
              },
              {
                key: 'order',
                header: 'Against',
                render: (p) => state.orders.find((o) => o.id === p.orderId)?.number ?? '— vendor account —',
              },
              { key: 'ref', header: 'Reference', render: (p) => p.reference ?? '—' },
              { key: 'amount', header: 'Amount', align: 'right', render: (p) => money(p.amount) },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (p) => (
                  <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'payment/delete', id: p.id })}>
                    Remove
                  </button>
                ),
              },
            ]}
            rows={[...state.payments].sort((a, b) => b.date.localeCompare(a.date))}
            getKey={(p) => p.id}
            minWidth={720}
          />
        </Card>
      )}

      {paying && <PaymentModal onClose={() => setPaying(false)} />}
    </div>
  );
}

function PaymentModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id ?? '');
  const [orderId, setOrderId] = useState('');
  const [date, setDate] = useState(state.project.today);
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState('');

  const vendorOrders = state.orders.filter((o) => o.vendorId === vendorId && o.status !== 'void');

  return (
    <Modal
      title="Record a payment"
      subtitle="Payments booked against a specific order show on that order's balance; payments left on the vendor account still reduce what the vendor is owed overall."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!vendorId || amount === 0}
            onClick={() => {
              dispatch({
                type: 'payment/add',
                payment: {
                  id: newId('pay'),
                  vendorId,
                  orderId: orderId || undefined,
                  date,
                  amount,
                  reference: reference.trim() || undefined,
                },
              });
              onClose();
            }}
          >
            Record payment
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
              {state.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Against order">
            <select className="select" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">— vendor account —</option>
              {vendorOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kind} {o.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount">
            <input
              className="input"
              type="number"
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Reference">
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque or ACH number" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
