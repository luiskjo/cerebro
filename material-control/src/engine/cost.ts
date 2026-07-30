/**
 * Vendor and order cost balances.
 *
 * Three different numbers get loosely called "cost" on a job, and confusing them
 * is how vendors get overpaid:
 *
 *   committed  — the value of every PO and CO issued, credits included
 *   received   — the value of material actually delivered, at the order price
 *   paid       — cash that has left the door
 *
 * What is owed today is `received − paid`. What is left to spend is
 * `committed − received`.
 */

import type { AppState, Order, Vendor } from '../types';
import { isLiveOrder } from './rollup';

export interface OrderBalance {
  order: Order;
  vendorName: string;
  committed: number;
  received: number;
  paid: number;
  /** Delivered but not yet paid for. */
  dueNow: number;
  /** Still to be delivered against this order. */
  remainingCommitment: number;
  receivedPct: number;
  /** Received value has run past what was committed. */
  overCommitted: boolean;
  lineCount: number;
}

export interface VendorBalance {
  vendor: Vendor;
  orderCount: number;
  poValue: number;
  coValue: number;
  committed: number;
  received: number;
  paid: number;
  dueNow: number;
  remainingCommitment: number;
  overCommitted: boolean;
}

function sum<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((total, row) => total + fn(row), 0);
}

/**
 * Value delivered against one order.
 *
 * Tickets that name the order are attributed to it directly. Tickets that only
 * name the vendor are attributed to that vendor's orders that carry the
 * material, oldest first, so a general delivery draws down the oldest
 * commitment rather than being double-counted or dropped.
 */
export function receivedValueByOrder(state: AppState): Map<string, number> {
  const result = new Map<string, number>();
  const liveOrders = state.orders.filter(isLiveOrder);
  for (const order of liveOrders) result.set(order.id, 0);

  // Remaining quantity each order can still absorb, per material.
  const capacity = new Map<string, Map<string, number>>();
  for (const order of liveOrders) {
    const perMaterial = new Map<string, number>();
    for (const line of order.lines) {
      if (line.qty > 0) perMaterial.set(line.materialId, (perMaterial.get(line.materialId) ?? 0) + line.qty);
    }
    capacity.set(order.id, perMaterial);
  }

  const priceOn = (orderId: string, materialId: string): number =>
    liveOrders.find((o) => o.id === orderId)?.lines.find((l) => l.materialId === materialId)?.unitCost ?? 0;

  const sortedDeliveries = [...state.deliveries].sort((a, b) => a.date.localeCompare(b.date));

  for (const delivery of sortedDeliveries) {
    for (const line of delivery.lines) {
      if (delivery.orderId && capacity.has(delivery.orderId)) {
        const price = priceOn(delivery.orderId, line.materialId);
        result.set(delivery.orderId, (result.get(delivery.orderId) ?? 0) + line.qty * price);
        const perMaterial = capacity.get(delivery.orderId)!;
        perMaterial.set(line.materialId, (perMaterial.get(line.materialId) ?? 0) - line.qty);
        continue;
      }

      // No order named — spread across this vendor's orders, oldest first.
      let remaining = line.qty;
      const candidates = liveOrders
        .filter((o) => o.vendorId === delivery.vendorId)
        .filter((o) => o.lines.some((l) => l.materialId === line.materialId && l.qty > 0))
        .sort((a, b) => a.date.localeCompare(b.date));

      for (const order of candidates) {
        if (remaining <= 0) break;
        const perMaterial = capacity.get(order.id)!;
        const room = perMaterial.get(line.materialId) ?? 0;
        if (room <= 0) continue;
        const applied = Math.min(room, remaining);
        result.set(order.id, (result.get(order.id) ?? 0) + applied * priceOn(order.id, line.materialId));
        perMaterial.set(line.materialId, room - applied);
        remaining -= applied;
      }

      // Anything left over is an over-delivery; price it on the newest order.
      if (remaining > 0 && candidates.length > 0) {
        const last = candidates[candidates.length - 1];
        result.set(last.id, (result.get(last.id) ?? 0) + remaining * priceOn(last.id, line.materialId));
      }
    }
  }

  return result;
}

export function orderBalances(state: AppState): OrderBalance[] {
  const received = receivedValueByOrder(state);
  const vendorById = new Map(state.vendors.map((v) => [v.id, v]));

  return state.orders
    .filter(isLiveOrder)
    .map((order) => {
      const committed = sum(order.lines, (l) => l.qty * l.unitCost);
      const receivedValue = received.get(order.id) ?? 0;
      const paid = sum(state.payments.filter((p) => p.orderId === order.id), (p) => p.amount);
      return {
        order,
        vendorName: vendorById.get(order.vendorId)?.name ?? 'Unknown vendor',
        committed,
        received: receivedValue,
        paid,
        dueNow: receivedValue - paid,
        remainingCommitment: committed - receivedValue,
        receivedPct: committed !== 0 ? (receivedValue / committed) * 100 : 0,
        overCommitted: committed > 0 && receivedValue > committed * 1.001,
        lineCount: order.lines.length,
      };
    })
    .sort((a, b) => b.order.date.localeCompare(a.order.date));
}

export function vendorBalances(state: AppState): VendorBalance[] {
  const balances = orderBalances(state);

  return state.vendors
    .map((vendor) => {
      const vendorOrders = balances.filter((b) => b.order.vendorId === vendor.id);
      const committed = sum(vendorOrders, (b) => b.committed);
      const received = sum(vendorOrders, (b) => b.received);

      // Payments booked against the vendor rather than a specific order still count.
      const paid = sum(state.payments.filter((p) => p.vendorId === vendor.id), (p) => p.amount);

      return {
        vendor,
        orderCount: vendorOrders.length,
        poValue: sum(vendorOrders.filter((b) => b.order.kind === 'PO'), (b) => b.committed),
        coValue: sum(vendorOrders.filter((b) => b.order.kind === 'CO'), (b) => b.committed),
        committed,
        received,
        paid,
        dueNow: received - paid,
        remainingCommitment: committed - received,
        overCommitted: committed > 0 && received > committed * 1.001,
      };
    })
    .filter((row) => row.orderCount > 0 || row.paid !== 0)
    .sort((a, b) => b.committed - a.committed);
}
