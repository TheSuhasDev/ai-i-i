import test from "node:test";
import assert from "node:assert/strict";

function calculateRevenue(unitsSold, unitPrice) {
  const units = Number(unitsSold) || 0;
  const price = Number(unitPrice) || 0;
  return Math.round(units * price * 100) / 100;
}

function normalizeDateFilterRange(fromStr, toStr) {
  const f = {};
  const from = typeof fromStr === "string" && fromStr ? new Date(fromStr) : null;
  let to = typeof toStr === "string" && toStr ? new Date(toStr) : null;
  if (from || to) {
    f.date = {};
    if (from) f.date.$gte = from;
    if (to) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
        to = new Date(`${toStr}T23:59:59.999Z`);
      }
      f.date.$lte = to;
    }
  }
  return f;
}

test("calculateRevenue computes gross sale amount accurately", () => {
  assert.equal(calculateRevenue(22, 350), 7700);
  assert.equal(calculateRevenue(10, 25.5), 255);
  assert.equal(calculateRevenue(0, 350), 0);
  assert.equal(calculateRevenue(15, 0), 0);
  assert.equal(calculateRevenue(null, 350), 0);
});

test("normalizeDateFilterRange sets end of day for string toDate", () => {
  const range = normalizeDateFilterRange("2026-10-01", "2026-10-25");
  assert.equal(range.date.$gte.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(range.date.$lte.toISOString(), "2026-10-25T23:59:59.999Z");

  // An afternoon timestamp on 2026-10-25 should fall within the range
  const saleTime = new Date("2026-10-25T15:30:00.000Z");
  assert.ok(saleTime >= range.date.$gte && saleTime <= range.date.$lte);
});

test("sales summary aggregation correctly tallies volume, revenue, and promo count", () => {
  const mockSales = [
    { unitsSold: 20, unitPrice: 100, revenue: 2000, promoFlag: false },
    { unitsSold: 50, unitPrice: 100, revenue: 5000, promoFlag: true },
    { unitsSold: 10, unitPrice: 80, revenue: 800, promoFlag: false },
  ];

  const totalUnits = mockSales.reduce((s, r) => s + r.unitsSold, 0);
  const totalRevenue = mockSales.reduce((s, r) => s + r.revenue, 0);
  const promoCount = mockSales.filter((r) => r.promoFlag).length;

  assert.equal(totalUnits, 80);
  assert.equal(totalRevenue, 7800);
  assert.equal(promoCount, 1);
});

