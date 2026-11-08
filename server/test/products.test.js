import test from "node:test";
import assert from "node:assert/strict";

function calculateMargin(price, cost) {
  if (typeof price === "number" && price > 0 && typeof cost === "number") {
    return Math.round(((price - cost) / price) * 100);
  }
  return 0;
}

function marginPillClass(marginPct) {
  if (marginPct < 0) return "status-critical";
  if (marginPct < 30) return "status-warning";
  return "status-healthy";
}

test("calculateMargin handles standard, zero cost, and negative margins accurately", () => {
  // P001: price 350, cost 252.47 -> ((350 - 252.47) / 350) * 100 = 27.86% -> 28%
  assert.equal(calculateMargin(350, 252.47), 28);
  assert.equal(marginPillClass(28), "status-warning");

  // High margin item (e.g. 50%)
  assert.equal(calculateMargin(100, 50), 50);
  assert.equal(marginPillClass(50), "status-healthy");

  // Zero cost promotional item (must not evaluate to 0% due to falsy check)
  assert.equal(calculateMargin(100, 0), 100);
  assert.equal(marginPillClass(100), "status-healthy");

  // Loss-leader or negative margin (cost > price)
  assert.equal(calculateMargin(100, 120), -20);
  assert.equal(marginPillClass(-20), "status-critical");

  // Zero or null price
  assert.equal(calculateMargin(0, 50), 0);
  assert.equal(calculateMargin(null, 50), 0);
  assert.equal(calculateMargin(100, null), 0);
});

test("product catalog summary aggregation produces correct counts and averages", () => {
  const mockProducts = [
    { code: "P001", category: "Electronics", leadTimeDays: 5, isActive: true },
    { code: "P002", category: "Electronics", leadTimeDays: 7, isActive: true },
    { code: "P003", category: "Appliances", leadTimeDays: 14, isActive: false },
    { code: "P004", category: "Appliances", leadTimeDays: 10, isActive: true },
  ];

  const total = mockProducts.length;
  const activeCount = mockProducts.filter((p) => p.isActive !== false).length;
  const avgLeadTime = Math.round((mockProducts.reduce((s, p) => s + p.leadTimeDays, 0) / total) * 10) / 10;

  const categoryMap = {};
  for (const p of mockProducts) {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  }

  assert.equal(total, 4);
  assert.equal(activeCount, 3);
  assert.equal(avgLeadTime, 9.0);
  assert.equal(categoryMap["Electronics"], 2);
  assert.equal(categoryMap["Appliances"], 2);
});

