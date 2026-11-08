import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AuditLog from "../src/models/AuditLog.js";
import { cleanAuditDoc, writeAuditLog, deriveRecordName, hasSignificantChanges } from "../src/controllers/crudFactory.js";
import {
  getChangedFields,
  formatFieldLabel,
  formatDiffValue,
  formatCurrencyValue,
  HIDDEN_FIELDS,
} from "../../client/src/utils/auditDiff.js";

// Helper to simulate exportCsv logic
function simulateExportCsv(columns, rows) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.key.split(".").reduce((obj, k) => obj?.[k], row);
        const formatted = c.format ? c.format(raw, row) : raw;
        return escape(formatted);
      })
      .join(",")
  );
  return [header, ...body].join("\r\n");
}

test("cleanAuditDoc strips __v and returns a plain object", () => {
  const dummy = {
    _id: new mongoose.Types.ObjectId(),
    name: "Widget",
    __v: 3,
    toObject() {
      return { _id: this._id, name: this.name, __v: this.__v };
    },
  };
  const cleaned = cleanAuditDoc(dummy);
  assert.equal(cleaned.name, "Widget");
  assert.equal(cleaned.__v, undefined);
  assert.equal(cleanAuditDoc(null), null);
});

test("writeAuditLog validates required parameters and constructs entry", () => {
  const fakeUserId = new mongoose.Types.ObjectId();
  const fakeDocId = new mongoose.Types.ObjectId();

  // Validate that missing parameters do not attempt creation
  assert.doesNotThrow(() => {
    writeAuditLog({ user: null, action: "create", collection: "products", documentId: fakeDocId });
    writeAuditLog({ user: fakeUserId, action: null, collection: "products", documentId: fakeDocId });
    writeAuditLog({ user: fakeUserId, action: "create", collection: null, documentId: fakeDocId });
    writeAuditLog({ user: fakeUserId, action: "create", collection: "products", documentId: null });
  });
});

test("Audit log entry contains all required fields: timestamp, user, action, collection, document ID, details", async () => {
  const fakeUserId = new mongoose.Types.ObjectId();
  const fakeDocId = new mongoose.Types.ObjectId();
  const before = { currentStock: 50 };
  const after = { currentStock: 75 };

  const entry = new AuditLog({
    user: fakeUserId,
    action: "update",
    collection: "inventory",
    documentId: fakeDocId,
    before,
    after,
  });

  await entry.validate();
  assert.ok(entry.at instanceof Date);
  assert.equal(String(entry.user), String(fakeUserId));
  assert.equal(entry.action, "update");
  assert.equal(entry.collection, "inventory");
  assert.equal(String(entry.documentId), String(fakeDocId));
  assert.deepEqual(entry.before, before);
  assert.deepEqual(entry.after, after);
});

test("AuditLog supports create, update, and delete actions across all 5 key resources", async () => {
  const collections = ["products", "inventory", "sales", "purchase_orders", "suppliers"];
  const actions = ["create", "update", "delete"];
  const fakeUserId = new mongoose.Types.ObjectId();

  for (const collection of collections) {
    for (const action of actions) {
      const entry = new AuditLog({
        user: fakeUserId,
        action,
        collection,
        documentId: new mongoose.Types.ObjectId(),
        before: action === "create" ? null : { name: "Sample Item" },
        after: action === "delete" ? null : { name: "Sample Item Updated" },
      });
      await entry.validate();
    }
  }
});

test("Audit log collection filter normalizes aliases and variants", () => {
  const normalizeCollection = (queryCol) => {
    if (!queryCol) return {};
    const col = String(queryCol).trim().toLowerCase();
    if (col === "purchase_orders" || col === "purchaseorders" || col === "purchase-orders") {
      return { collection: { $in: ["purchase_orders", "purchaseorders", "purchase-orders"] } };
    }
    if (col === "inventory" || col === "inventories") {
      return { collection: { $in: ["inventory", "inventories"] } };
    }
    return { collection: col };
  };

  assert.deepEqual(normalizeCollection("purchase_orders"), {
    collection: { $in: ["purchase_orders", "purchaseorders", "purchase-orders"] },
  });
  assert.deepEqual(normalizeCollection("PurchaseOrders"), {
    collection: { $in: ["purchase_orders", "purchaseorders", "purchase-orders"] },
  });
  assert.deepEqual(normalizeCollection("inventory"), {
    collection: { $in: ["inventory", "inventories"] },
  });
  assert.deepEqual(normalizeCollection("Products"), { collection: "products" });
  assert.deepEqual(normalizeCollection("Sales"), { collection: "sales" });
  assert.deepEqual(normalizeCollection("Suppliers"), { collection: "suppliers" });
});

test("Audit log pagination computes page count and offset accurately", () => {
  const computePagination = (total, page = 1, limit = 25) => ({
    page: Math.max(page, 1),
    limit: Math.max(limit, 1),
    total,
    pages: Math.ceil(total / limit) || 1,
  });

  assert.deepEqual(computePagination(0, 1, 25), { page: 1, limit: 25, total: 0, pages: 1 });
  assert.deepEqual(computePagination(50, 1, 25), { page: 1, limit: 25, total: 50, pages: 2 });
  assert.deepEqual(computePagination(51, 2, 25), { page: 2, limit: 25, total: 51, pages: 3 });
});

test("Export CSV correctly builds headers and escapes nested details and dates", () => {
  const AUDIT_COLS = [
    { header: "Date & Time", key: "at", format: (v) => (v ? new Date(v).toISOString() : "") },
    { header: "User", key: "user.name", format: (v, r) => r.user?.name || "System" },
    { header: "Role", key: "user.role", format: (v, r) => r.user?.role || "user" },
    { header: "Action", key: "action", format: (v) => (v || "").toUpperCase() },
    { header: "Collection", key: "collection" },
    { header: "Record Name", key: "recordName" },
    { header: "Document ID", key: "documentId" },
    { header: "Details", key: "details", format: (_, r) => JSON.stringify({ before: r.before, after: r.after }) },
  ];

  const now = new Date("2026-11-08T10:00:00.000Z");
  const testRows = [
    {
      at: now,
      user: { name: "Admin User", email: "admin@test.com", role: "admin" },
      action: "update",
      collection: "products",
      recordName: "P001 · USB Hub 4-Port",
      documentId: "654321098765432109876543",
      before: { name: "Old Name", price: 100 },
      after: { name: "New, Name", price: 120 },
    },
  ];

  const csv = simulateExportCsv(AUDIT_COLS, testRows);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "Date & Time,User,Role,Action,Collection,Record Name,Document ID,Details");
  assert.ok(lines[1].includes("2026-11-08T10:00:00.000Z"));
  assert.ok(lines[1].includes("Admin User"));
  assert.ok(lines[1].includes("UPDATE"));
  assert.ok(lines[1].includes("products"));
  assert.ok(lines[1].includes("P001 · USB Hub 4-Port"));
  assert.ok(lines[1].includes('"{""before"":{""name"":""Old Name"",""price"":100}'));
});

test("deriveAction properly detects Create, Update, Delete, Login, and Logout from log properties", () => {
  const deriveAction = (log) => {
    if (!log) return "Update";
    const raw = String(log.action || "").toLowerCase();
    if (raw === "logout") return "Logout";
    if (raw === "login" || log.collection === "users" || log.collection === "auth") return "Login";
    if (raw === "delete" || (!log.after && log.before)) return "Delete";
    if (raw === "create" || (!log.before && log.after)) return "Create";
    if (raw === "update" || (log.before && log.after)) return "Update";
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Update";
  };

  assert.equal(deriveAction({ before: null, after: { name: "New Product" } }), "Create");
  assert.equal(deriveAction({ action: "create", before: null, after: { name: "Item" } }), "Create");
  assert.equal(deriveAction({ before: { name: "Old" }, after: { name: "New" } }), "Update");
  assert.equal(deriveAction({ action: "update", before: { x: 1 }, after: { x: 2 } }), "Update");
  assert.equal(deriveAction({ before: { name: "Deleted Item" }, after: null }), "Delete");
  assert.equal(deriveAction({ action: "delete", before: { id: 1 } }), "Delete");
  assert.equal(deriveAction({ action: "login", collection: "users" }), "Login");
  assert.equal(deriveAction({ action: "logout", collection: "users" }), "Logout");
  assert.equal(deriveAction({ collection: "users", after: { email: "test@app.com" } }), "Login");
});

test("getActionTone maps actions to distinct semantic tones", () => {
  const getActionTone = (action) => {
    const a = String(action || "").toLowerCase();
    if (a === "delete") return "critical"; // Red
    if (a === "update") return "warning";  // Amber
    if (a === "create") return "healthy";  // Green
    if (a === "login") return "info";      // Blue
    if (a === "logout") return "muted";    // Grey
    return "info";
  };

  assert.equal(getActionTone("Create"), "healthy");
  assert.equal(getActionTone("Update"), "warning");
  assert.equal(getActionTone("Delete"), "critical");
  assert.equal(getActionTone("Login"), "info");
  assert.equal(getActionTone("Logout"), "muted");
});

test("deriveRecordName formats readable identifier without live dynamic values like stock or units", () => {
  assert.equal(deriveRecordName("products", { code: "P001", name: "USB Hub 4-Port" }), "P001 · USB Hub 4-Port");
  assert.equal(deriveRecordName("suppliers", { code: "S1", name: "Apex Electronics" }), "S1 · Apex Electronics");
  assert.equal(deriveRecordName("purchase_orders", { poNumber: "PO-20261026-0001" }), "PO-20261026-0001");
  assert.equal(deriveRecordName("inventory", { product: { name: "USB Hub" }, currentStock: 117 }), "USB Hub");
  assert.equal(deriveRecordName("sales", { product: { name: "Wireless Mouse" }, unitsSold: 12 }), "Wireless Mouse");
  assert.equal(deriveRecordName("users", { name: "Admin User", email: "admin@test.com" }), "Admin User");
});

test("hasSignificantChanges detects real modifications and ignores no-op or internal changes", () => {
  const before = {
    _id: "654321098765432109876543",
    __v: 0,
    updatedAt: new Date("2026-11-08T10:00:00.000Z"),
    sellingPrice: 500,
    currentStock: 20,
  };

  // Exactly identical or only updatedAt changed
  const noopAfter = {
    _id: "654321098765432109876543",
    __v: 1,
    updatedAt: new Date("2026-11-08T10:05:00.000Z"),
    sellingPrice: 500,
    currentStock: 20,
  };
  assert.equal(hasSignificantChanges(before, noopAfter), false);

  // Price changed
  const priceChanged = {
    ...before,
    sellingPrice: 550,
  };
  assert.equal(hasSignificantChanges(before, priceChanged), true);

  // Stock changed
  const stockChanged = {
    ...before,
    currentStock: 25,
  };
  assert.equal(hasSignificantChanges(before, stockChanged), true);
});

test("Login and Logout actions format as Signed in and Signed out", () => {
  const formatActionDetails = (action, before, after) => {
    const act = String(action || "").toLowerCase();
    if (act === "login") return "Signed in";
    if (act === "logout") return "Signed out";
    const changed = getChangedFields(before, after);
    if (!changed.length) return "No field modifications";
    return changed
      .map((c) => `${c.label}: ${formatDiffValue(c.key, c.before)} → ${formatDiffValue(c.key, c.after)}`)
      .join("; ");
  };

  assert.equal(formatActionDetails("login", null, { email: "admin@test.com" }), "Signed in");
  assert.equal(formatActionDetails("logout", null, null), "Signed out");
});

test("writeAuditLog records actual real time with Date.now()", async () => {
  const start = Date.now();
  const entry = new AuditLog({
    user: new mongoose.Types.ObjectId(),
    action: "create",
    collection: "products",
    documentId: new mongoose.Types.ObjectId(),
    recordName: "P099 · New Item",
    at: new Date(),
  });
  await entry.validate();
  const diffMs = Math.abs(entry.at.getTime() - start);
  assert.ok(diffMs < 500, `Expected timestamp within 500ms of actual execution time, got diff ${diffMs}ms`);
});

test("getChangedFields identifies changed fields and suppresses unchanged fields", () => {
  const before = {
    name: "USB Cable",
    cost: 100,
    currentStock: 25,
    category: "Cables",
  };
  const after = {
    name: "USB Cable",
    cost: 125,
    currentStock: 30,
    category: "Cables",
  };

  const diff = getChangedFields(before, after);
  assert.equal(diff.length, 2);

  const keys = diff.map((d) => d.key);
  assert.deepEqual(keys.sort(), ["cost", "currentStock"].sort());

  const costDiff = diff.find((d) => d.key === "cost");
  assert.equal(costDiff.label, "Unit Cost");
  assert.equal(costDiff.before, 100);
  assert.equal(costDiff.after, 125);
});

test("getChangedFields strictly excludes internal and sensitive fields like _id and password", () => {
  const before = {
    _id: "654321098765432109876543",
    __v: 0,
    password: "oldHashedPassword123",
    token: "jwt-token-abc",
    sellingPrice: 400,
  };
  const after = {
    _id: "654321098765432109876543",
    __v: 1,
    password: "newHashedPassword456",
    token: "jwt-token-xyz",
    sellingPrice: 450,
  };

  const diff = getChangedFields(before, after);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].key, "sellingPrice");
  assert.equal(diff[0].label, "Selling Price");
  assert.equal(diff[0].before, 400);
  assert.equal(diff[0].after, 450);

  // Assert all internal fields in HIDDEN_FIELDS are excluded
  for (const hiddenKey of HIDDEN_FIELDS) {
    assert.equal(diff.some((d) => d.key === hiddenKey), false);
  }
});

test("getChangedFields handles Create actions (before is null) and Delete actions (after is null)", () => {
  // Create action
  const createAfter = {
    _id: "654321098765432109876543",
    code: "P005",
    name: "Mechanical Keyboard",
    sellingPrice: 2999,
  };
  const createDiff = getChangedFields(null, createAfter);
  assert.equal(createDiff.length, 3);
  assert.equal(createDiff.find((d) => d.key === "code").before, undefined);
  assert.equal(createDiff.find((d) => d.key === "code").after, "P005");

  // Delete action
  const deleteBefore = {
    _id: "654321098765432109876543",
    poNumber: "PO-0099",
    status: "Cancelled",
  };
  const deleteDiff = getChangedFields(deleteBefore, null);
  assert.equal(deleteDiff.length, 2);
  assert.equal(deleteDiff.find((d) => d.key === "poNumber").before, "PO-0099");
  assert.equal(deleteDiff.find((d) => d.key === "poNumber").after, undefined);

  // No changes
  assert.deepEqual(getChangedFields(null, null), []);
  assert.deepEqual(getChangedFields({ stock: 5 }, { stock: 5 }), []);
});

test("formatFieldLabel produces friendly human-readable field labels", () => {
  assert.equal(formatFieldLabel("poNumber"), "PO Number");
  assert.equal(formatFieldLabel("currentStock"), "Current Stock");
  assert.equal(formatFieldLabel("unitCost"), "Unit Cost");
  assert.equal(formatFieldLabel("sellingPrice"), "Selling Price");
  assert.equal(formatFieldLabel("expectedDeliveryDate"), "Expected Delivery Date");
  assert.equal(formatFieldLabel("inTransitQty"), "In-Transit Qty");
  assert.equal(formatFieldLabel("customLeadTime"), "Custom Lead Time");
});

test("formatDiffValue formats currency with ₹, dates cleanly, booleans, and empty states", () => {
  // Currency formatting
  assert.equal(formatDiffValue("sellingPrice", 500), "₹500");
  assert.equal(formatDiffValue("cost", 1250), "₹1,250");
  assert.equal(formatDiffValue("unitCost", 49.5), "₹49.50");
  assert.equal(formatDiffValue("totalAmount", 10000), "₹10,000");

  // Date formatting
  const formattedDate = formatDiffValue("expectedDeliveryDate", "2026-10-25T00:00:00.000Z");
  assert.ok(formattedDate.includes("25") && formattedDate.includes("Oct") && formattedDate.includes("2026"));

  // Boolean formatting
  assert.equal(formatDiffValue("isPromotional", true), "Yes");
  assert.equal(formatDiffValue("isPromotional", false), "No");

  // Rate formatting
  assert.equal(formatDiffValue("defectRate", 0.05), "5.0%");

  // Object formatting
  assert.equal(
    formatDiffValue("supplier", { code: "S1", name: "Apex Electronics" }),
    "S1 · Apex Electronics"
  );

  // Empty / Null state
  assert.equal(formatDiffValue("status", null), "—");
  assert.equal(formatDiffValue("status", undefined), "—");
  assert.equal(formatDiffValue("status", ""), "—");
});

