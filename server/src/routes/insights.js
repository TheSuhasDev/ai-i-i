import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getInsight, getHistory, listInsights, refreshAll } from "../controllers/insightsController.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(listInsights));
router.post("/refresh", authorize("admin", "manager"), asyncHandler(refreshAll));
router.get("/:code/history", asyncHandler(getHistory));
router.get("/:code", asyncHandler(getInsight));

export default router;