import test from "node:test";
import assert from "node:assert/strict";

function groupAnomalies(rows) {
  const map = new Map();
  for (const a of rows) {
    const key = `${a.product_id}||${a.type}`;
    if (!map.has(key)) {
      map.set(key, { product_id: a.product_id, name: a.name, type: a.type, count: 0, latestDate: "", rows: [] });
    }
    const g = map.get(key);
    g.count += 1;
    if (!g.latestDate || a.date > g.latestDate) g.latestDate = a.date;
    g.rows.push(a);
  }
  const result = [...map.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  for (const g of result) {
    g.rows.sort((a, b) => b.date.localeCompare(a.date));
  }
  return result;
}

function anomalyTone(type) {
  if (type === "supplier_delay") return "status-critical";
  if (type === "stock_mismatch" || type === "zero_sales") return "status-warning";
  if (type === "sales_spike") return "status-info";
  return "status-info";
}

function getTopType(byType) {
  if (!byType || !Object.keys(byType).length) return null;
  return Object.entries(byType).reduce(
    (top, [t, count]) => (!top || count > top.count ? { type: t, count } : top),
    null
  )?.type;
}

test("groupAnomalies consolidates multiple occurrences and sorts rows chronologically descending", () => {
  const mockAnomalies = [
    { date: "2026-10-15", product_id: "P001", name: "USB Hub", type: "sales_spike", score: 0.62 },
    { date: "2026-10-25", product_id: "P001", name: "USB Hub", type: "sales_spike", score: 0.74 },
    { date: "2026-10-20", product_id: "P002", name: "Keyboard", type: "zero_sales", score: 0.58 },
  ];

  const grouped = groupAnomalies(mockAnomalies);
  assert.equal(grouped.length, 2);

  // Group 1 should be P001 sales_spike (latest date 2026-10-25)
  const g1 = grouped[0];
  assert.equal(g1.product_id, "P001");
  assert.equal(g1.type, "sales_spike");
  assert.equal(g1.count, 2);
  assert.equal(g1.latestDate, "2026-10-25");
  assert.equal(g1.rows[0].date, "2026-10-25");
  assert.equal(g1.rows[1].date, "2026-10-15");

  // Group 2 should be P002 zero_sales (latest date 2026-10-20)
  const g2 = grouped[1];
  assert.equal(g2.product_id, "P002");
  assert.equal(g2.count, 1);
  assert.equal(g2.latestDate, "2026-10-20");
});

test("anomalyTone maps each anomaly type to its respective semantic tone", () => {
  assert.equal(anomalyTone("supplier_delay"), "status-critical");
  assert.equal(anomalyTone("stock_mismatch"), "status-warning");
  assert.equal(anomalyTone("zero_sales"), "status-warning");
  assert.equal(anomalyTone("sales_spike"), "status-info");
});

test("getTopType identifies the highest frequency anomaly category regardless of key order", () => {
  const byType = {
    sales_spike: 15,
    stock_mismatch: 66,
    zero_sales: 51,
  };
  assert.equal(getTopType(byType), "stock_mismatch");

  const singleType = { supplier_delay: 2 };
  assert.equal(getTopType(singleType), "supplier_delay");

  assert.equal(getTopType({}), null);
});

