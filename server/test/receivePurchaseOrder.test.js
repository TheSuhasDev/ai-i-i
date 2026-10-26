import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import "../src/models/Inventory.js";
import { calculateReceiptDelta, applyReceipt } from "../src/models/PurchaseOrder.js";

test("calculateReceiptDelta sets qtyReceived to qtyOrdered when status is Delivered and qtyReceived is 0", () => {
  const po = { status: "Delivered", qtyOrdered: 75, qtyReceived: 0 };
  const { targetReceived, delta } = calculateReceiptDelta(po, 0);
  assert.equal(targetReceived, 75);
  assert.equal(delta, 75);
});

test("calculateReceiptDelta calculates positive increase when qtyReceived increases", () => {
  const po = { status: "In Transit", qtyOrdered: 100, qtyReceived: 40 };
  const { targetReceived, delta } = calculateReceiptDelta(po, 15);
  assert.equal(targetReceived, 40);
  assert.equal(delta, 25);
});

test("calculateReceiptDelta is idempotent on repeated saves with same qtyReceived", () => {
  const po = { status: "Delivered", qtyOrdered: 50, qtyReceived: 50 };
  const { targetReceived, delta } = calculateReceiptDelta(po, 50);
  assert.equal(targetReceived, 50);
  assert.equal(delta, 0);
});

test("calculateReceiptDelta returns 0 delta when qtyReceived decreases", () => {
  const po = { status: "In Transit", qtyOrdered: 100, qtyReceived: 20 };
  const { delta } = calculateReceiptDelta(po, 30);
  assert.equal(delta, 0);
});

test("applyReceipt adds delta to Inventory.currentStock and updates snapshotDate", async () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const updates = [];

  const Inventory = mongoose.model("Inventory");
  const originalUpdateOne = Inventory.updateOne;
  Inventory.updateOne = async (query, update) => {
    updates.push({ query, update });
    return { acknowledged: true, modifiedCount: 1 };
  };

  const PO = mongoose.model("PurchaseOrder");
  const originalFind = PO.find;
  PO.find = () => ({
    select: () => [],
  });

  try {
    const po = {
      product: dummyProductId,
      status: "Delivered",
      qtyOrdered: 60,
      qtyReceived: 0,
    };
    const { targetReceived, delta } = await applyReceipt(po, 0);
    assert.equal(targetReceived, 60);
    assert.equal(delta, 60);
    assert.equal(po.qtyReceived, 60);
    assert.ok(updates.length >= 1);
    const stockUpdate = updates[0];
    assert.deepEqual(stockUpdate.query, { product: dummyProductId });
    assert.equal(stockUpdate.update.$inc.currentStock, 60);
    assert.ok(stockUpdate.update.$set.snapshotDate instanceof Date);

    // Second call with previous received = 60 is idempotent
    const updatesLen = updates.length;
    const second = await applyReceipt(po, 60);
    assert.equal(second.delta, 0);
    // Any subsequent update should only be inTransit sync, no stock increment
    const newUpdates = updates.slice(updatesLen);
    assert.ok(!newUpdates.some((u) => u.update.$inc));
  } finally {
    Inventory.updateOne = originalUpdateOne;
    PO.find = originalFind;
  }
});
