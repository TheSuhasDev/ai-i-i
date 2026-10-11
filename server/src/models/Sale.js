import mongoose from "mongoose";

// One document per product per day.
const saleSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  date: { type: Date, required: true },
  unitsSold: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  revenue: { type: Number, required: true, min: 0 },
  promoFlag: { type: Boolean, default: false },
});

saleSchema.index({ product: 1, date: 1 }, { unique: true });

export default mongoose.model("Sale", saleSchema);