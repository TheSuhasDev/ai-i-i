import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mlService from "../services/mlService.js";

const router = Router();
router.use(protect);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await mlService.supplierRisk() });
  })
);

export default router;