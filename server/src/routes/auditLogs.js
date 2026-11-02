import { Router } from "express";
import AuditLog from "../models/AuditLog.js";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(protect, authorize("admin"));

// GET /api/audit-logs?page=1&limit=50&collection=sales&action=create
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const filter = {};

    if (typeof req.query.collection === "string" && req.query.collection) {
      filter.collection = req.query.collection.toLowerCase();
    }
    if (typeof req.query.action === "string" && req.query.action) {
      filter.action = req.query.action.toLowerCase();
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user", "name email role")
        .sort("-at")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      data: logs,
    });
  })
);

export default router;
