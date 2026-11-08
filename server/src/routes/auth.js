import { Router } from "express";
import { register, login, logout, me, updateProfile } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { registerSchema, loginSchema } from "../validators/schemas.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts",
});

const router = Router();
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", protect, logout);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);

export default router;
