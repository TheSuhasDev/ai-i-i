import { Router } from "express";
import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { supplierCreate, supplierUpdate } from "../validators/schemas.js";
import { crudRouter } from "./crudRouter.js";

const crud = makeCrud({
  Model: Supplier,
  label: "Supplier",
  searchFields: ["name", "code", "city"],
  filterFields: ["city"],
  defaultSort: "code",
});

// GET /api/suppliers/:id/deliveries
// Returns PO history for one supplier: poNumber, product, orderDate, expectedDeliveryDate,
// actualDeliveryDate, delayDays, qualityIssue, status — sorted newest first.
const getDeliveries = asyncHandler(async (req, res) => {
  let supplier = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    supplier = await Supplier.findById(req.params.id);
  }
  if (!supplier) {
    supplier = await Supplier.findOne({ code: req.params.id });
  }
  if (!supplier) throw new AppError("Supplier not found", 404);

  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100;
  const pos = await PurchaseOrder.find({ supplier: supplier._id })
    .select("poNumber product orderDate expectedDeliveryDate actualDeliveryDate delayDays qualityIssue status")
    .populate("product", "code name")
    .sort("-orderDate")
    .limit(limit)
    .lean();

  res.json({ success: true, supplier: { _id: supplier._id, code: supplier.code, name: supplier.name }, data: pos });
});

const baseCrudRouter = crudRouter(crud, { createSchema: supplierCreate, updateSchema: supplierUpdate });

// Add the deliveries sub-route
const router = Router();
router.use(protect);
router.get("/:id/deliveries", getDeliveries);
// Mount all standard CRUD routes after (/:id/deliveries must be registered before /:id to avoid misrouting)
router.use(baseCrudRouter);

export default router;