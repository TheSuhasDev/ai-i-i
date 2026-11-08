import { Router } from "express";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/Product.js";
import { makeCrud, writeAuditLog } from "../controllers/crudFactory.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { poCreate, poUpdate } from "../validators/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { computeAndStore } from "../controllers/insightsController.js";

const DAY = 86400000;

// delayDays = actual - expected delivery (negative = early). Matches the Day 2 definition.
export function withDelay(data, existing = {}) {
  const out = { ...data };

  // Fix PO order_date vs PO number date mismatch: keep poNumber date prefix in sync with orderDate
  const orderDateVal = out.orderDate !== undefined ? out.orderDate : existing.orderDate;
  const poNum = out.poNumber || existing.poNumber;
  if (orderDateVal && poNum && /^PO-\d{8}-/i.test(poNum)) {
    const dStr = new Date(orderDateVal).toISOString().slice(0, 10).replaceAll("-", "");
    out.poNumber = poNum.replace(/^PO-\d{8}-/i, `PO-${dStr}-`);
  }

  const actual = out.actualDeliveryDate !== undefined ? out.actualDeliveryDate : existing.actualDeliveryDate;
  const expected = out.expectedDeliveryDate ?? existing.expectedDeliveryDate;
  if (actual && expected) {
    if (out.delayDays === undefined) {
      const rawDelay = Math.round((new Date(actual) - new Date(expected)) / DAY);
      out.delayDays = rawDelay;
    }
  }

  const ordered = Number(out.qtyOrdered ?? existing.qtyOrdered ?? 0);
  const received = Number(out.qtyReceived ?? existing.qtyReceived ?? 0);

  if (out.status !== "Cancelled" && existing.status !== "Cancelled") {
    if (ordered > 0 && received >= ordered) {
      out.status = "Delivered";
      if (!out.actualDeliveryDate && !existing.actualDeliveryDate) {
        out.actualDeliveryDate = new Date();
      }
    } else if (ordered > 0 && received > 0 && received < ordered) {
      out.status = "Partially Delivered";
    } else if (actual && !out.status) {
      out.status = (received > 0 && received < ordered) ? "Partially Delivered" : "Delivered";
    }
  }

  if (out.status === "Delivered") {
    if (!out.qtyReceived || Number(out.qtyReceived) === 0) {
      if (ordered) out.qtyReceived = ordered;
    }
  }
  return out;
}

/**
 * Fire-and-forget insight recompute for the product on a PO.
 * Looks up the Product by _id or populated object, then calls computeAndStore.
 */
async function recomputeInsight(productIdOrObj) {
  try {
    const pid = productIdOrObj?._id ?? productIdOrObj;
    if (!pid) return;
    const product = await Product.findById(pid);
    if (product) await computeAndStore(product);
  } catch (err) {
    console.error("Post-PO insight recompute failed:", err);
  }
}

const crud = makeCrud({
  Model: PurchaseOrder,
  label: "Purchase order",
  auditCollection: "purchase_orders",
  populate: [
    { path: "product", select: "code name" },
    { path: "supplier", select: "code name" },
  ],
  searchFields: ["poNumber"],
  filterFields: ["product", "supplier", "status", "qualityIssue"],
  defaultSort: "-orderDate",
  beforeCreate: (data) => withDelay(data),
  beforeUpdate: (data, existing) => withDelay(data, existing),
  buildSummary: async (filter, Model) => {
    const today = new Date();
    const [openOrders, inTransitOrders, overdueCount, statusCounts] = await Promise.all([
      Model.countDocuments({
        ...filter,
        status: { $in: ["Pending", "Approved", "In Transit", "In transit"] },
      }),
      Model.countDocuments({
        ...filter,
        status: { $in: ["In Transit", "In transit"] },
      }),
      Model.countDocuments({
        ...filter,
        status: { $in: ["Pending", "Approved", "In Transit", "In transit"] },
        expectedDeliveryDate: { $lt: today },
      }),
      Model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      openOrders,
      inTransitOrders,
      overdueCount,
      statusDistribution: statusCounts.map((s) => ({
        status: s._id,
        count: s.count,
      })),
    };
  },
});

// Wrap crud.create to check duplicate open POs and trigger async insight recompute after creating a PO
const createWithInsight = asyncHandler(async (req, res, next) => {
  if (!req.body.confirmDuplicate && req.body.product) {
    const existingOpen = await PurchaseOrder.findOne({
      product: req.body.product,
      status: { $in: ["Pending", "Approved", "In Transit", "In transit"] },
    })
      .select("poNumber status qtyOrdered")
      .lean();
    if (existingOpen) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_OPEN_PO",
        message: `An open purchase order (${existingOpen.poNumber}, status: ${existingOpen.status}, qty: ${existingOpen.qtyOrdered}) already exists for this product. Confirm to proceed.`,
        existingPo: existingOpen,
      });
    }
  }

  const originalJson = res.json.bind(res);
  let productId;
  res.json = (body) => {
    if (body?.success && body?.data) productId = body.data.product?._id ?? body.data.product;
    return originalJson(body);
  };
  await crud.create(req, res, next);
  if (productId) recomputeInsight(productId);
});

// Wrap crud.update to trigger async insight recompute after update
const updateWithInsight = asyncHandler(async (req, res, next) => {
  const originalJson = res.json.bind(res);
  let productId;
  res.json = (body) => {
    if (body?.success && body?.data) productId = body.data.product?._id ?? body.data.product;
    return originalJson(body);
  };
  await crud.update(req, res, next);
  if (productId) recomputeInsight(productId);
});

// PATCH /api/purchase-orders/:id/cancel
// Allowed only for Pending or In Transit; triggers syncInTransit + insight recompute.
const cancelPO = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError("Purchase order not found", 404);
  if (!["Pending", "Approved", "In Transit", "In transit"].includes(po.status)) {
    throw new AppError(`Cannot cancel a purchase order with status '${po.status}'`, 400);
  }
  const before = po.toObject();
  po.status = "Cancelled";
  await po.save(); // post-save hook triggers syncInTransit
  const populated = await PurchaseOrder.findById(po._id)
    .populate("product", "code name")
    .populate("supplier", "code name");

  if (req.user?._id) {
    writeAuditLog({
      user: req.user._id,
      action: "update",
      collection: "purchase_orders",
      documentId: po._id,
      before,
      after: po.toObject(),
    });
  }

  res.json({ success: true, data: populated });
  recomputeInsight(po.product);
});

// DELETE /api/purchase-orders/:id
// Only allowed if status is Cancelled (and user is admin, enforced by authorize).
const deleteIfCancelled = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError("Purchase order not found", 404);
  if (po.status !== "Cancelled") {
    throw new AppError("Only cancelled purchase orders can be deleted", 400);
  }
  const before = po.toObject();
  await PurchaseOrder.findByIdAndDelete(req.params.id);

  if (req.user?._id) {
    writeAuditLog({
      user: req.user._id,
      action: "delete",
      collection: "purchase_orders",
      documentId: po._id,
      before,
      after: null,
    });
  }

  res.json({ success: true, message: "Purchase order deleted" });
});

const router = Router();
router.use(protect);
router.get("/", crud.list);
router.get("/:id", crud.getOne);
router.post("/", authorize("admin", "manager"), validate(poCreate), createWithInsight);
router.put("/:id", authorize("admin", "manager"), validate(poUpdate), updateWithInsight);
router.patch("/:id/cancel", authorize("admin", "manager"), cancelPO);
router.delete("/:id", authorize("admin"), deleteIfCancelled);

export default router;