import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getInsight, listInsights, refreshAll } from "../controllers/insightsController.js";

const router = Router();
router.use(protect);
router.get("/", listInsights);
router.post("/refresh", authorize("admin", "manager"), refreshAll);
router.get("/:code", getInsight);

export default router;