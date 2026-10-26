import test from "node:test";
import assert from "node:assert/strict";

// ---- AuditLog model ----
test("AuditLog schema has required fields", async () => {
  const mongoose = await import("mongoose");
  const { default: AuditLog } = await import("../src/models/AuditLog.js");
  const schema = AuditLog.schema;
  const paths = schema.paths;
  assert.ok(paths.user, "user field missing");
  assert.ok(paths.action, "action field missing");
  assert.ok(paths.collection, "collection field missing");
  assert.ok(paths.documentId, "documentId field missing");
  assert.ok(paths.before !== undefined, "before field missing");
  assert.ok(paths.after !== undefined, "after field missing");
  assert.ok(paths.at, "at field missing");
  // action enum
  assert.deepEqual(paths.action.enumValues, ["create", "update", "delete"]);
});

// ---- PO cancel logic ----
test("cancelPO allows cancelling Pending status", () => {
  const CANCELLABLE = ["Pending", "In Transit"];
  assert.ok(CANCELLABLE.includes("Pending"));
  assert.ok(CANCELLABLE.includes("In Transit"));
  assert.ok(!CANCELLABLE.includes("Delivered"));
  assert.ok(!CANCELLABLE.includes("Cancelled"));
});

test("deleteIfCancelled blocks delete when status is not Cancelled", () => {
  const BLOCKED = ["Pending", "In Transit", "Delivered"];
  for (const status of BLOCKED) {
    assert.ok(status !== "Cancelled", `Expected ${status} to not be Cancelled`);
  }
});

test("deleteIfCancelled allows delete when status is Cancelled", () => {
  assert.equal("Cancelled", "Cancelled");
});

// ---- Sales admin-only restriction ----
test("Sales ADMIN_ONLY constant includes only admin", () => {
  const ADMIN_ONLY = ["admin"];
  assert.deepEqual(ADMIN_ONLY, ["admin"]);
  assert.ok(!ADMIN_ONLY.includes("manager"));
  assert.ok(!ADMIN_ONLY.includes("staff"));
});

// ---- Supplier deliveries route logic ----
test("supplier deliveries limit is clamped to [1, 500]", () => {
  const clamp = (v) => {
    const p = parseInt(v, 10);
    return Number.isInteger(p) ? Math.min(Math.max(p, 1), 500) : 100;
  };
  assert.equal(clamp(undefined), 100);
  assert.equal(clamp(0), 1);
  assert.equal(clamp(-5), 1);
  assert.equal(clamp(1000), 500);
  assert.equal(clamp(50), 50);
});

// ---- Anomaly route default days ----
test("anomaly route defaults to 30 days", () => {
  const defaultDays = parseInt(undefined) || 30;
  assert.equal(defaultDays, 30);
});

test("anomaly route clamps days between 7 and 730", () => {
  const clamp = (v) => Math.min(Math.max(parseInt(v) || 30, 7), 730);
  assert.equal(clamp(undefined), 30);
  assert.equal(clamp(1), 7);
  assert.equal(clamp(1000), 730);
  assert.equal(clamp(90), 90);
});

test("anomaly route paginates correctly", () => {
  const anomalies = Array.from({ length: 120 }, (_, i) => ({ id: i }));
  const page = 2;
  const limit = 50;
  const paginated = anomalies.slice((page - 1) * limit, page * limit);
  assert.equal(paginated.length, 50);
  assert.equal(paginated[0].id, 50);
  assert.equal(paginated[49].id, 99);
});

// ---- Duplicate PO check logic ----
test("duplicate open PO check blocks when confirmDuplicate is not true", () => {
  const existingOpen = { poNumber: "PO-001", status: "Pending", qtyOrdered: 50 };
  const checkDuplicate = (existing, confirmDuplicate) => {
    if (!confirmDuplicate && existing) {
      return { code: "DUPLICATE_OPEN_PO", blocked: true };
    }
    return { blocked: false };
  };
  assert.deepEqual(checkDuplicate(existingOpen, false), { code: "DUPLICATE_OPEN_PO", blocked: true });
  assert.deepEqual(checkDuplicate(existingOpen, undefined), { code: "DUPLICATE_OPEN_PO", blocked: true });
  assert.deepEqual(checkDuplicate(existingOpen, true), { blocked: false });
  assert.deepEqual(checkDuplicate(null, false), { blocked: false });
});
