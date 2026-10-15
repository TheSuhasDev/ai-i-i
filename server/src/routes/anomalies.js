import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mlService from "../services/mlService.js";

const router = Router();
router.use(protect);

// GET /api/anomalies?days=90&productCode=P001&limit=200
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const params = {
      days: Math.min(Math.max(parseInt(req.query.days) || 90, 7), 730),
      limit: Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 1000),
    };
    if (typeof req.query.productCode === "string" && req.query.productCode) {
      params.product_id = req.query.productCode.toUpperCase();
    }
        if (typeof req.query.type === "string" && req.query.type) params.type = req.query.type;
    res.json({ success: true, data: await mlService.anomalies(params) });
  })
);

export default router;