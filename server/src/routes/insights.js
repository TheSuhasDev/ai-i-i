import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getInsight, getHistory, getExplanation, listInsights, refreshAll } from "../controllers/insightsController.js";
import { advanceData } from "../scripts/advanceData.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(listInsights));
router.post("/refresh", authorize("admin", "manager"), asyncHandler(refreshAll));
router.post("/advance", authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const days = parseInt(req.body?.days, 10) || 1;
  const result = await advanceData(days);
  res.json({ success: true, ...result });
}));
router.get("/:code/history", asyncHandler(getHistory));
router.get("/:code/explain", asyncHandler(getExplanation));
router.get("/:code", asyncHandler(getInsight));

export default router;