import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import "../src/models/Inventory.js";
import { calculateInTransit, syncInTransit } from "../src/models/PurchaseOrder.js";

test("calculateInTransit sums remaining quantity for Pending and In Transit orders", () => {
  const orders = [
    { status: "Pending", qtyOrdered: 100, qtyReceived: 0 },
    { status: "In Transit", qtyOrdered: 50, qtyReceived: 0 },
  ];
  assert.equal(calculateInTransit(orders), 150);
});

test("calculateInTransit accounts for partial receipts", () => {
  const orders = [
    { status: "Pending", qtyOrdered: 100, qtyReceived: 25 },
    { status: "In Transit", qtyOrdered: 80, qtyReceived: 30 },
  ];
  assert.equal(calculateInTransit(orders), 75 + 50);
});

test("calculateInTransit excludes Cancelled and Delivered orders", () => {
  const orders = [
    { status: "Pending", qtyOrdered: 100, qtyReceived: 0 },
    { status: "In Transit", qtyOrdered: 50, qtyReceived: 10 },
    { status: "Delivered", qtyOrdered: 200, qtyReceived: 200 },
    { status: "Delivered", qtyOrdered: 150, qtyReceived: 0 },
    { status: "Cancelled", qtyOrdered: 300, qtyReceived: 0 },
    { status: "Cancelled", qtyOrdered: 50, qtyReceived: 20 },
  ];
  // Only Pending (100) + In Transit (40) = 140
  assert.equal(calculateInTransit(orders), 140);
});

test("calculateInTransit returns 0 when no open orders exist or over-received", () => {
  assert.equal(calculateInTransit([]), 0);
  assert.equal(calculateInTransit([{ status: "Pending", qtyOrdered: 10, qtyReceived: 15 }]), 0);
});

test("syncInTransit queries open POs and updates Inventory.inTransitQty", async () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  let updatedQuery = null;
  let updatedDoc = null;

  // Mock Inventory.updateOne
  const Inventory = mongoose.model("Inventory");
  const originalUpdateOne = Inventory.updateOne;
  Inventory.updateOne = async (query, update) => {
    updatedQuery = query;
    updatedDoc = update;
    return { acknowledged: true, modifiedCount: 1 };
  };

  // Mock PurchaseOrder.find
  const PO = mongoose.model("PurchaseOrder");
  const originalFind = PO.find;
  PO.find = () => ({
    select: () => [
      { status: "Pending", qtyOrdered: 60, qtyReceived: 10 },
      { status: "In Transit", qtyOrdered: 40, qtyReceived: 0 },
    ],
  });

  try {
    const total = await syncInTransit(dummyProductId);
    assert.equal(total, 90);
    assert.deepEqual(updatedQuery, { product: dummyProductId });
    assert.deepEqual(updatedDoc, { $set: { inTransitQty: 90 } });
  } finally {
    Inventory.updateOne = originalUpdateOne;
    PO.find = originalFind;
  }
});
