import test from "node:test";
import assert from "node:assert/strict";

function getOverdueDays(po, referenceDate = new Date()) {
  if (!po.expectedDeliveryDate) return 0;
  if (!["Pending", "Approved", "In Transit", "In transit"].includes(po.status)) return 0;
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const expected = new Date(po.expectedDeliveryDate);
  expected.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - expected.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

test("getOverdueDays identifies overdue open orders across valid status variants", () => {
  const ref = new Date("2026-11-08T12:00:00Z");

  // Overdue In Transit
  assert.equal(
    getOverdueDays({ status: "In Transit", expectedDeliveryDate: "2026-11-04" }, ref),
    4
  );

  // Overdue Approved
  assert.equal(
    getOverdueDays({ status: "Approved", expectedDeliveryDate: "2026-11-06" }, ref),
    2
  );

  // Future delivery
  assert.equal(
    getOverdueDays({ status: "In Transit", expectedDeliveryDate: "2026-11-12" }, ref),
    0
  );

  // Delivered or Cancelled orders are never overdue
  assert.equal(
    getOverdueDays({ status: "Delivered", expectedDeliveryDate: "2026-11-01" }, ref),
    0
  );
  assert.equal(
    getOverdueDays({ status: "Cancelled", expectedDeliveryDate: "2026-11-01" }, ref),
    0
  );
});

test("PO summary aggregation tallies open orders, transit orders, and status distribution", () => {
  const mockOrders = [
    { poNumber: "PO-001", status: "Delivered" },
    { poNumber: "PO-002", status: "Delivered" },
    { poNumber: "PO-003", status: "Partially Delivered" },
    { poNumber: "PO-004", status: "In Transit" },
    { poNumber: "PO-005", status: "Pending" },
  ];

  const openOrders = mockOrders.filter((po) =>
    ["Pending", "Approved", "In Transit", "In transit"].includes(po.status)
  ).length;
  const inTransitOrders = mockOrders.filter((po) =>
    ["In Transit", "In transit"].includes(po.status)
  ).length;

  const statusMap = {};
  for (const po of mockOrders) {
    statusMap[po.status] = (statusMap[po.status] || 0) + 1;
  }

  assert.equal(openOrders, 2);
  assert.equal(inTransitOrders, 1);
  assert.equal(statusMap["Delivered"], 2);
  assert.equal(statusMap["Partially Delivered"], 1);
  assert.equal(statusMap["In Transit"], 1);
  assert.equal(statusMap["Pending"], 1);
});

