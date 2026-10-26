import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    orderDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date, required: true },
    actualDeliveryDate: { type: Date, default: null },
    delayDays: { type: Number, default: null }, // negative = delivered early
    qtyOrdered: { type: Number, required: true, min: 1 },
    qtyReceived: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    qualityIssue: { type: Boolean, default: false },
    status: { type: String, enum: ["Pending", "Approved", "In Transit", "Delivered", "Cancelled"], default: "Pending" },
  },
  { timestamps: true }
);

export function calculateInTransit(orders) {
  if (!Array.isArray(orders)) return 0;
  return orders
    .filter((order) => {
      const status = order?.status;
      if (!status) return true;
      return !["Delivered", "Cancelled"].includes(status);
    })
    .reduce((sum, order) => {
      const remaining = Math.max(Number(order.qtyOrdered || 0) - Number(order.qtyReceived || 0), 0);
      return sum + remaining;
    }, 0);
}

export async function syncInTransit(productId) {
  if (!productId) return 0;
  try {
    const PO = mongoose.model("PurchaseOrder");
    const Inventory = mongoose.model("Inventory");

    const orders = await PO.find({
      product: productId,
      status: { $nin: ["Delivered", "Cancelled"] },
    }).select("qtyOrdered qtyReceived status");

    const inTransitQty = calculateInTransit(orders);

    await Inventory.updateOne(
      { product: productId },
      { $set: { inTransitQty } }
    );

    return inTransitQty;
  } catch (err) {
    console.error(`Failed to sync in-transit for product ${productId}:`, err);
    return 0;
  }
}

export function calculateReceiptDelta(po, prevQtyReceived = 0) {
  let targetReceived = Number(po.qtyReceived ?? 0);
  if (po.status === "Delivered" && targetReceived === 0) {
    targetReceived = Number(po.qtyOrdered || 0);
  }
  const delta = Math.max(targetReceived - Number(prevQtyReceived ?? 0), 0);
  return { targetReceived, delta };
}

export async function applyReceipt(po, prevQtyReceived = 0) {
  const { targetReceived, delta } = calculateReceiptDelta(po, prevQtyReceived);
  if (po.status === "Delivered" && (!po.qtyReceived || po.qtyReceived === 0)) {
    po.qtyReceived = targetReceived;
  }
  const productId = po.product?._id || po.product;
  if (delta > 0 && productId) {
    const Inventory = mongoose.model("Inventory");
    await Inventory.updateOne(
      { product: productId },
      {
        $inc: { currentStock: delta },
        $set: { snapshotDate: new Date() },
      }
    );
  }
  if (productId) {
    await syncInTransit(productId);
  }
  return { targetReceived, delta };
}

purchaseOrderSchema.post("init", function () {
  this._originalReceived = this.qtyReceived ?? 0;
});

purchaseOrderSchema.pre("save", function () {
  if (this.status === "Delivered" && (!this.qtyReceived || this.qtyReceived === 0)) {
    this.qtyReceived = this.qtyOrdered;
  }
  const prev = this._originalReceived ?? (this.isNew ? 0 : 0);
  const cur = this.qtyReceived ?? 0;
  this._receiptDelta = Math.max(cur - prev, 0);
});

purchaseOrderSchema.post("save", async function (doc) {
  try {
    const delta = doc._receiptDelta || 0;
    const productId = doc.product?._id || doc.product;
    if (delta > 0 && productId) {
      const Inventory = mongoose.model("Inventory");
      await Inventory.updateOne(
        { product: productId },
        {
          $inc: { currentStock: delta },
          $set: { snapshotDate: new Date() },
        }
      );
    }
    doc._originalReceived = doc.qtyReceived ?? 0;
    doc._receiptDelta = 0;

    if (productId) {
      await syncInTransit(productId);
    }
  } catch (err) {
    console.error("Failed in PurchaseOrder post('save') hook:", err);
  }
});

purchaseOrderSchema.post("findOneAndUpdate", async function (doc) {
  try {
    const productId = doc?.product?._id || doc?.product;
    if (productId) {
      await syncInTransit(productId);
    }
  } catch (err) {
    console.error("Failed in PurchaseOrder post('findOneAndUpdate') hook:", err);
  }
});

purchaseOrderSchema.post("findOneAndDelete", async function (doc) {
  try {
    const productId = doc?.product?._id || doc?.product;
    if (productId) {
      await syncInTransit(productId);
    }
  } catch (err) {
    console.error("Failed in PurchaseOrder post('findOneAndDelete') hook:", err);
  }
});

purchaseOrderSchema.post("deleteOne", { document: true, query: false }, async function (doc) {
  try {
    const productId = doc?.product?._id || doc?.product || this?.product?._id || this?.product;
    if (productId) {
      await syncInTransit(productId);
    }
  } catch (err) {
    console.error("Failed in PurchaseOrder post('deleteOne') hook:", err);
  }
});

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);