import mongoose from "mongoose";

// Latest ML result per product. The full response is in `data`; the other fields are for filtering and sorting.
const insightSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    productCode: { type: String, required: true, index: true },
    asOf: { type: Date, required: true },
    priority: { type: String, enum: ["Critical", "High", "Medium", "Low"], index: true },
    healthScore: Number,
    healthStatus: { type: String, enum: ["Critical", "Warning", "Healthy"], index: true },
    riskPct: Number,
    orderQty: Number,
    daysOfCover: Number,
    marginDays: Number,
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Insight", insightSchema);