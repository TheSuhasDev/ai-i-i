import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["create", "update", "delete"], required: true },
  collection: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  at: { type: Date, default: Date.now },
}, { suppressReservedKeysWarning: true });

auditLogSchema.index({ collection: 1, documentId: 1 });
auditLogSchema.index({ user: 1, at: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
