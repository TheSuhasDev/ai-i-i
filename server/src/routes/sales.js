import { Router } from "express";
import Sale from "../models/Sale.js";
import AuditLog from "../models/AuditLog.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { saleCreate, saleUpdate } from "../validators/schemas.js";
import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ADMIN_ONLY = ["admin"];

const crud = makeCrud({
  Model: Sale,
  label: "Sale",
  auditCollection: "sales",
  populate: [{ path: "product", select: "code name category" }],
  filterFields: ["product", "promoFlag"],
  defaultSort: "-date",
  buildFilter: (q) => {
    const f = {};
    const from = typeof q.from === "string" && q.from ? new Date(q.from) : null;
    let to = typeof q.to === "string" && q.to ? new Date(q.to) : null;
    if (from || to) {
      f.date = {};
      if (from) f.date.$gte = from;
      if (to) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
          to = new Date(`${q.to}T23:59:59.999Z`);
        }
        f.date.$lte = to;
      }
    }
    return f;
  },
  buildSummary: async (filter, Model) => {
    const [totals, promoCount] = await Promise.all([
      Model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$unitsSold" },
            totalRevenue: { $sum: "$revenue" },
          },
        },
      ]),
      Model.countDocuments({ ...filter, promoFlag: true }),
    ]);

    return {
      totalUnits: totals[0]?.totalUnits || 0,
      totalRevenue: totals[0]?.totalRevenue || 0,
      promoCount,
    };
  },
  beforeCreate: (data) => ({ ...data, revenue: data.revenue ?? data.unitsSold * data.unitPrice }),
  beforeUpdate: (data, existing) => {
    if (data.revenue !== undefined) return data;
    if (data.unitsSold === undefined && data.unitPrice === undefined) return data;
    const units = data.unitsSold ?? existing.unitsSold;
    const price = data.unitPrice ?? existing.unitPrice;
    return { ...data, revenue: units * price };
  },
});

// Wrap CRUD handlers with audit logging for writes
function auditCreate(handler) {
  return asyncHandler(async (req, res, next) => {
    // Call the original handler, capture the response via a proxy
    const originalJson = res.json.bind(res);
    let captured;
    res.json = (body) => { captured = body; return originalJson(body); };
    await handler(req, res, next);
    if (captured?.success && captured?.data) {
      AuditLog.create({
        user: req.user._id,
        action: "create",
        collection: "sales",
        documentId: captured.data._id,
        before: null,
        after: { unitsSold: captured.data.unitsSold, unitPrice: captured.data.unitPrice, revenue: captured.data.revenue, date: captured.data.date },
      }).catch((e) => console.error("AuditLog create failed:", e));
    }
  });
}

function auditUpdate(handler) {
  return asyncHandler(async (req, res, next) => {
    const existing = await Sale.findById(req.params.id).lean();
    if (!existing) throw new AppError("Sale not found", 404);
    const before = { unitsSold: existing.unitsSold, unitPrice: existing.unitPrice, revenue: existing.revenue, date: existing.date };
    const originalJson = res.json.bind(res);
    let captured;
    res.json = (body) => { captured = body; return originalJson(body); };
    await handler(req, res, next);
    if (captured?.success && captured?.data) {
      AuditLog.create({
        user: req.user._id,
        action: "update",
        collection: "sales",
        documentId: captured.data._id,
        before,
        after: { unitsSold: captured.data.unitsSold, unitPrice: captured.data.unitPrice, revenue: captured.data.revenue, date: captured.data.date },
      }).catch((e) => console.error("AuditLog update failed:", e));
    }
  });
}

function auditDelete(handler) {
  return asyncHandler(async (req, res, next) => {
    const existing = await Sale.findById(req.params.id).lean();
    if (!existing) throw new AppError("Sale not found", 404);
    const before = { unitsSold: existing.unitsSold, unitPrice: existing.unitPrice, revenue: existing.revenue, date: existing.date };
    const docId = existing._id;
    await handler(req, res, next);
    AuditLog.create({
      user: req.user._id,
      action: "delete",
      collection: "sales",
      documentId: docId,
      before,
      after: null,
    }).catch((e) => console.error("AuditLog delete failed:", e));
  });
}

const router = Router();
router.use(protect);
router.get("/", crud.list);
router.get("/:id", crud.getOne);
router.post("/", authorize("admin", "manager", "staff"), validate(saleCreate), crud.create);
router.put("/:id", authorize("admin", "manager"), validate(saleUpdate), crud.update);
router.delete("/:id", authorize(...ADMIN_ONLY), crud.remove);

export default router;