import { Router } from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import mlService from "../services/mlService.js";
import AppError from "../utils/AppError.js";

const schema = z.object({
  productCode: z.string().trim().min(1),
  demandPct: z.coerce.number().min(-90).max(300).default(0),
  extraDelayDays: z.coerce.number().int().min(0).max(30).default(0),
  stock: z.coerce.number().min(0).optional(),
  orderQty: z.coerce.number().min(0).default(0),
});

const router = Router();
router.use(protect);

// POST /api/simulator  -> before/after comparison for a what-if scenario (live MongoDB stock is the baseline)
router.post(
  "/",
  validate(schema),
  asyncHandler(async (req, res) => {
    const { productCode, demandPct, extraDelayDays, stock, orderQty } = req.body;
    const product = await Product.findOne({ code: productCode.toUpperCase() });
    if (!product) throw new AppError(`Unknown product ${productCode}`, 404);

    const inv = await Inventory.findOne({ product: product._id });
    const body = {
      product_id: product.code,
      demand_pct: demandPct,
      extra_delay_days: extraDelayDays,
      order_qty: orderQty,
    };
    if (inv) {
      body.base_stock = inv.currentStock;
      body.base_on_order = inv.inTransitQty;
    }
    if (stock !== undefined) body.stock = stock;

    res.json({ success: true, data: await mlService.simulate(body) });
  })
);

export default router;