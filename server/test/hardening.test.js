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

