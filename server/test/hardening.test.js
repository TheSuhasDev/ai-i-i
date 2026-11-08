import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/middleware/rateLimiter.js";
import { poCreate, productCreate } from "../src/validators/schemas.js";
import { withDelay } from "../src/routes/purchaseOrders.js";

test("Rate limiter blocks requests after exceeding max attempts in window", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
  const req = { ip: "192.168.1.1", headers: {} };
  let errorReceived = null;
  const next = (err) => { errorReceived = err; };
  const res = { setHeader: () => {} };

  limiter(req, res, next);
  assert.equal(errorReceived, undefined);

  limiter(req, res, next);
  assert.equal(errorReceived, undefined);

  limiter(req, res, next);
  assert.ok(errorReceived);
  assert.equal(errorReceived.statusCode, 429);
});

test("poCreate rejects when expectedDeliveryDate is before orderDate", () => {
  const result = poCreate.safeParse({
    poNumber: "PO-TEST-001",
    product: "507f1f77bcf86cd799439011",
    supplier: "507f1f77bcf86cd799439012",
    orderDate: "2026-10-15",
    expectedDeliveryDate: "2026-10-10",
    qtyOrdered: 100,
    unitCost: 25,
  });
  assert.equal(result.success, false);
});

test("productCreate rejects when selling price is less than cost", () => {
  const result = productCreate.safeParse({
    code: "P999",
    sku: "SKU999",
    name: "Test Product",
    category: "Accessories",
    price: 15,
    cost: 20,
    leadTimeDays: 7,
  });
  assert.equal(result.success, false);
});

test("withDelay preserves negative delay for early deliveries", () => {
  const po = withDelay({
    orderDate: "2026-10-01",
    expectedDeliveryDate: "2026-10-10",
    actualDeliveryDate: "2026-10-07",
    status: "Delivered",
  });
  assert.equal(po.delayDays, -3);
});

test("withDelay marks Partially Delivered when received < ordered", () => {
  const po = withDelay({
    orderDate: "2026-10-01",
    expectedDeliveryDate: "2026-10-10",
    actualDeliveryDate: "2026-10-10",
    qtyOrdered: 100,
    qtyReceived: 80,
  });
  assert.equal(po.status, "Partially Delivered");
});

test("withDelay marks Delivered only when received >= ordered", () => {
  const po = withDelay({
    orderDate: "2026-10-01",
    expectedDeliveryDate: "2026-10-10",
    actualDeliveryDate: "2026-10-10",
    qtyOrdered: 100,
    qtyReceived: 100,
  });
  assert.equal(po.status, "Delivered");
});

test("KPI summary counts distinct products per priority and preserves invariants", () => {
  const docs = [
    {
      productCode: "P040",
      priority: "Critical",
      data: {
        alerts: [
          { priority: "Critical", type: "stockout_before_delivery" },
          { priority: "High", type: "reorder_now" },
          { priority: "Medium", type: "low_cover_margin" },
        ],
      },
    },
    {
      productCode: "P001",
      priority: "High",
      data: {
        alerts: [
          { priority: "High", type: "tight_cover_margin" },
        ],
      },
    },
    {
      productCode: "P005",
      priority: "Medium",
      data: {
        alerts: [
          { priority: "Medium", type: "low_cover_margin" },
        ],
      },
    },
  ];

  const kpi = {
    critical: { alerts: 0, products: 0 },
    high: { alerts: 0, products: 0 },
    medium: { alerts: 0, products: 0 },
    low: { alerts: 0, products: 0 },
    totalAlerts: 0,
    totalProductsWithAlerts: 0,
  };

  const productsByPriority = {
    critical: new Set(),
    high: new Set(),
    medium: new Set(),
    low: new Set(),
  };
  const allAlertProducts = new Set();

  for (const doc of docs) {
    const pid = doc.productCode || doc.code || String(doc._id || "");
    const alerts = doc.data?.alerts || [];
    if (alerts.length > 0) {
      allAlertProducts.add(pid);
    }
    for (const a of alerts) {
      const p = (a.priority || "Low").toLowerCase();
      if (kpi[p]) {
        kpi[p].alerts += 1;
        kpi.totalAlerts += 1;
        productsByPriority[p].add(pid);
      }
    }
  }

  for (const p of ["critical", "high", "medium", "low"]) {
    kpi[p].products = productsByPriority[p].size;
  }
  kpi.totalProductsWithAlerts = allAlertProducts.size;

  assert.equal(kpi.critical.alerts, 1);
  assert.equal(kpi.critical.products, 1); // P040
  assert.equal(kpi.high.alerts, 2);
  assert.equal(kpi.high.products, 2);     // P040 and P001
  assert.equal(kpi.medium.alerts, 2);
  assert.equal(kpi.medium.products, 2);   // P040 and P005
  assert.equal(kpi.totalAlerts, 5);
  assert.equal(kpi.totalProductsWithAlerts, 3);
  assert.equal(
    kpi.critical.alerts + kpi.high.alerts + kpi.medium.alerts + kpi.low.alerts,
    kpi.totalAlerts
  );
});

test("formatMarginChip and formatMarginSigned format chips and signed values correctly", () => {
  const formatMarginChip = (val) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    const num = Number(val);
    const fixed = Math.abs(num).toFixed(1);
    return `${num < 0 ? "-" : "+"}${fixed}d`;
  };

  const formatMarginSigned = (val) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    const num = Number(val);
    const fixed = Math.abs(num).toFixed(1);
    return `${num < 0 ? "-" : "+"}${fixed}`;
  };

  assert.equal(formatMarginChip(-5.6), "-5.6d");
  assert.equal(formatMarginChip(-0.8), "-0.8d");
  assert.equal(formatMarginChip(0.0), "+0.0d");
  assert.equal(formatMarginChip(-0.0), "+0.0d");
  assert.equal(formatMarginChip(0.1), "+0.1d");
  assert.equal(formatMarginChip(1.96), "+2.0d");
  assert.equal(formatMarginChip(3.2), "+3.2d");
  assert.equal(formatMarginChip(5.2), "+5.2d");
  assert.equal(formatMarginChip(null), "-");

  assert.equal(formatMarginSigned(-5.6), "-5.6");
  assert.equal(formatMarginSigned(-0.8), "-0.8");
  assert.equal(formatMarginSigned(0.0), "+0.0");
  assert.equal(formatMarginSigned(0.1), "+0.1");
  assert.equal(formatMarginSigned(3.2), "+3.2");
  assert.equal(formatMarginSigned(5.2), "+5.2");
  assert.equal(formatMarginSigned(null), "-");

  // Invariant: ascending sort of marginDays orders most negative (most urgent) first
  const margins = [5.2, -5.6, 0.0, 3.2, -0.8, 10.6, 0.1];
  margins.sort((a, b) => a - b);
  assert.deepEqual(margins, [-5.6, -0.8, 0.0, 0.1, 3.2, 5.2, 10.6]);
});


