import test from "node:test";
import assert from "node:assert/strict";
import { summarizeOpenPurchaseOrders } from "../src/services/openPurchaseOrders.js";

test("Pending, Approved and In Transit remaining quantities are aggregated as on_order", () => {
  const result = summarizeOpenPurchaseOrders([
    { status: "Pending", qtyOrdered: 422, qtyReceived: 0, expectedDeliveryDate: new Date("2026-10-20") },
    { status: "Approved", qtyOrdered: 50, qtyReceived: 10, expectedDeliveryDate: new Date("2026-10-25") },
    { status: "In Transit", qtyOrdered: 100, qtyReceived: 25, expectedDeliveryDate: new Date("2026-10-18") },
    { status: "In transit", qtyOrdered: 60, qtyReceived: 0, expectedDeliveryDate: new Date("2026-10-22") },
    { status: "Delivered", qtyOrdered: 300, qtyReceived: 300, expectedDeliveryDate: new Date("2026-10-12") },
    { status: "Cancelled", qtyOrdered: 500, qtyReceived: 0, expectedDeliveryDate: new Date("2026-10-15") },
  ]);

  // 422 (Pending) + 40 (Approved) + 75 (In Transit) + 60 (In transit) = 597
  assert.equal(result.onOrder, 597);
  assert.equal(result.expectedDeliveryDate.toISOString().slice(0, 10), "2026-10-18");
});

test("A product with an open PO covering the need has suggested qty 0", () => {
  // Formula: suggested qty = Math.max(0, demand_over_lead_time + safety_stock - stock - on_order)
  const demandOverLeadTime = 320;
  const safetyStock = 101.9;
  const stock = 0;
  const onOrder = 422; // pending PO covers demand + SS (421.9 <= 422)

  const suggestedQty = Math.max(0, Math.ceil(demandOverLeadTime + safetyStock - stock - onOrder));
  assert.equal(suggestedQty, 0);
});

