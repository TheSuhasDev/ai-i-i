import { Router } from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { ask } from "../services/assistant.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map(); // user id -> request timestamps (in memory; Day 14 adds app-wide rate limiting)

function rateLimit(req, res, next) {
  const key = String(req.user._id);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return next(new AppError(`Limit reached: at most ${MAX_REQUESTS} questions every 10 minutes.`, 429));
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

// Plain text only: the client can never inject tool calls or tool results.
const schema = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
      .min(1)
      .max(20),
  })
  .refine((b) => b.messages[b.messages.length - 1].role === "user", {
    message: "The last message must be from the user",
    path: ["messages"],
  });

const router = Router();
router.use(protect);

router.get("/status", (req, res) => {
    res.json({ success: true, data: { configured: Boolean(process.env.LLM_API_KEY) } });
});

router.post(
  "/",
  rateLimit,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await ask(req.body.messages) });
  })
);

export default router;