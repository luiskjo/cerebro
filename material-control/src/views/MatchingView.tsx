import { Card, DataTable, Modal, Pill, type Column } from '../components/ui';
import { useState } from 'react';
import { useStore } from '../StoreProvider';
import { STRONG_MATCH, type MatchProposal } from '../engine';
import { qty } from '../format';

interface Row extends MatchProposal {
  takeoffText: string;
  orderText: string;
  takeoffQty: number;
  orderQty: number;
  unit: string;
}

export default function MatchingView() {
  const { proposals, state, dispatch, materialById } = useStore();
  const [manual, setManual] = useState(false);

  const rows: Row[] = proposals.map((p) => {
    const takeoff = materialById.get(p.takeoffMaterialId);
    const order = materialById.get(p.orderMaterialId);
    return {
      ...p,
      takeoffText: takeoff?.description ?? p.takeoffMaterialId,
      orderText: order?.description ?? p.orderMaterialId,
      takeoffQty: state.takeoffLines
        .filter((l) => l.materialId === p.takeoffMaterialId)
        .reduce((s, l) => s + l.qty, 0),
      orderQty: state.orders
        .flatMap((o) => o.lines.filter((l) => l.materialId === p.orderMaterialId))
        .reduce((s, l) => s + l.qty, 0),
      unit: order?.unit ?? takeoff?.unit ?? '',
    };
  });

  const columns: Column<Row>[] = [
    {
      key: 'takeoff',
      header: 'Takeoff wording',
      render: (r) => (
        <>
          <div className="t-strong">{r.takeoffText}</div>
          <div className="sub">
            {qty(r.takeoffQty)} {r.unit} in the takeoff
          </div>
        </>
      ),
    },
    { key: 'arrow', header: '', render: () => <span style={{ color: 'var(--text3)' }}>→</span> },
    {
      key: 'order',
      header: 'Purchase-order wording (kept)',
      render: (r) => (
        <>
          <div className="t-strong">{r.orderText}</div>
          <div className="sub">
            {qty(r.orderQty)} {r.unit} ordered
          </div>
        </>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (r) => (
        <>
          {r.confidence >= STRONG_MATCH ? (
            <Pill tone="green">{Math.round(r.confidence * 100)}% — likely</Pill>
          ) : r.confidence >= 0.75 ? (
            <Pill tone="amber">{Math.round(r.confidence * 100)}% — probable</Pill>
          ) : (
            <Pill tone="grey">{Math.round(r.confidence * 100)}% — check</Pill>
          )}
          <div className="sub">{r.reason}</div>
        </>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button
            className="btn btn-sm btn-ok"
            onClick={() =>
              dispatch({
                type: 'match/accept',
                takeoffMaterialId: r.takeoffMaterialId,
                orderMaterialId: r.orderMaterialId,
              })
            }
          >
            Same material
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => dispatch({ type: 'match/reject', aId: r.takeoffMaterialId, bId: r.orderMaterialId })}
          >
            Different
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stack">
      <Card
        title="Correlation review"
        note={
          <>
            Takeoffs and purchase orders describe the same stick differently. Descriptions that reduce to the
            same signature — <strong>2x4x10 (PET 116 5/8") DF#2</strong> and{' '}
            <strong>2x4x116 5/8" DF2</strong> — were merged automatically on import. What is left needs a
            person, because a wrong merge corrupts the takeoff, the drops and the cost report at once.
            Accepting a match keeps the <strong>purchase-order wording</strong> and files the takeoff wording
            as an alias.
          </>
        }
        actions={
          <button className="btn" onClick={() => setManual(true)}>
            Merge manually
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          minWidth={900}
          rowClass={(r) => (r.confidence >= STRONG_MATCH ? 'row-ok' : 'row-warn')}
          empty="Every takeoff item is correlated to a purchase order."
        />
      </Card>

      {manual && <ManualMergeModal onClose={() => setManual(false)} />}
    </div>
  );
}

/** Escape hatch for pairs the scorer never proposes. */
function ManualMergeModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const sorted = [...state.materials].sort((a, b) => a.description.localeCompare(b.description));
  const [dropId, setDropId] = useState(sorted[0]?.id ?? '');
  const [keepId, setKeepId] = useState(sorted[1]?.id ?? '');

  const drop = state.materials.find((m) => m.id === dropId);
  const keep = state.materials.find((m) => m.id === keepId);
  const valid = dropId && keepId && dropId !== keepId;

  return (
    <Modal
      title="Merge two materials"
      subtitle="Everything on the merged-away material — takeoff lines, order lines, deliveries, drops and counts — moves to the one you keep. This cannot be undone from here."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() => {
              dispatch({ type: 'material/merge', keepId, dropId });
              onClose();
            }}
          >
            Merge
          </button>
        </>
      }
    >
      <div className="form">
        <div className="frow">
          <label className="field">
            <span className="label">Merge this away</span>
            <select className="select" value={dropId} onChange={(e) => setDropId(e.target.value)}>
              {sorted.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.description}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Into this one (wording survives)</span>
            <select className="select" value={keepId} onChange={(e) => setKeepId(e.target.value)}>
              {sorted.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.description}
                </option>
              ))}
            </select>
          </label>
        </div>
        {valid && drop && keep && (
          <div className="note">
            <strong>{drop.description}</strong> ({drop.group} · {drop.subgroup}) will be folded into{' '}
            <strong>{keep.description}</strong> ({keep.group} · {keep.subgroup}).
            {drop.treatment !== keep.treatment && (
              <div style={{ color: 'var(--red)', marginTop: 6 }}>
                Warning: treatment differs ({drop.treatment} vs {keep.treatment}). These are usually different
                products.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
