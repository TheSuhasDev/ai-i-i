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
    status: { type: String, enum: ["Pending", "In Transit", "Delivered", "Cancelled"], default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);