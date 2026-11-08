import test from "node:test";
import assert from "node:assert/strict";

function calculateStockStatus(currentStock, lowThreshold = 50) {
  if (currentStock === 0) return { status: "Stockout", tone: "status-critical" };
  if (currentStock < lowThreshold) return { status: "Low Stock", tone: "status-warning" };
  return { status: "Healthy", tone: "status-healthy" };
}

function calculateFillPercentage(currentStock, maxCapacity = 500) {
  const stock = Number(currentStock) || 0;
  return Math.max(0, Math.min(100, Math.round((stock / maxCapacity) * 100)));
}

test("calculateStockStatus properly categorizes zero, low, and healthy stock", () => {
  assert.deepEqual(calculateStockStatus(0), { status: "Stockout", tone: "status-critical" });
  assert.deepEqual(calculateStockStatus(15), { status: "Low Stock", tone: "status-warning" });
  assert.deepEqual(calculateStockStatus(49), { status: "Low Stock", tone: "status-warning" });
  assert.deepEqual(calculateStockStatus(50), { status: "Healthy", tone: "status-healthy" });
  assert.deepEqual(calculateStockStatus(500), { status: "Healthy", tone: "status-healthy" });
});

test("calculateFillPercentage handles bounds and invalid values safely", () => {
  assert.equal(calculateFillPercentage(250, 500), 50);
  assert.equal(calculateFillPercentage(0, 500), 0);
  assert.equal(calculateFillPercentage(600, 500), 100);
  assert.equal(calculateFillPercentage(-10, 500), 0);
  assert.equal(calculateFillPercentage(null, 500), 0);
});

test("inventory summary aggregation computes total stock, transit units, and stockouts accurately", () => {
  const mockInventory = [
    { product: "P001", currentStock: 350, inTransitQty: 50 },
    { product: "P002", currentStock: 0, inTransitQty: 100 },
    { product: "P003", currentStock: 120, inTransitQty: 0 },
    { product: "P004", currentStock: 0, inTransitQty: 0 },
  ];

  const totalStock = mockInventory.reduce((s, r) => s + r.currentStock, 0);
  const totalInTransit = mockInventory.reduce((s, r) => s + r.inTransitQty, 0);
  const stockouts = mockInventory.filter((r) => r.currentStock === 0).length;

  assert.equal(totalStock, 470);
  assert.equal(totalInTransit, 150);
  assert.equal(stockouts, 2);
});

