import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // S1..S8 (matches CSV supplier_id)
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);