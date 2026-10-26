import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mlService from "../services/mlService.js";

const router = Router();
router.use(protect);

// GET /api/anomalies?days=30&productCode=P001&type=zero_sales&page=1&limit=50
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 7), 730);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
    const params = {
      days,
      limit: limit * page + 1, // fetch enough for server-side pagination
    };
    if (typeof req.query.productCode === "string" && req.query.productCode) {
      params.product_id = req.query.productCode.toUpperCase();
    }
    if (typeof req.query.type === "string" && req.query.type) params.type = req.query.type;

    const raw = await mlService.anomalies(params);

    // Server-side pagination on the full list
    const all = raw.anomalies ?? [];
    const total = raw.count ?? all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: {
        ...raw,
        anomalies: paginated,
        count: paginated.length,
        total,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

export default router;