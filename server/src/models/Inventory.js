import mongoose from "mongoose";

// One document per product: the current stock snapshot.
const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    currentStock: { type: Number, required: true, min: 0 },
    inTransitQty: { type: Number, default: 0, min: 0 },
    snapshotDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);