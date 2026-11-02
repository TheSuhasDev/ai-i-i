import AppError from "../utils/AppError.js";

/**
 * Sliding-window in-memory rate limiter middleware.
 * Capped per IP address with standard Retry-After headers.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many requests from this IP, please try again later",
} = {}) {
  const store = new Map();

  const sweep = () => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) store.delete(key);
      else store.set(key, valid);
    }
  };

  const timer = setInterval(sweep, windowMs);
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "global";
    const now = Date.now();
    const timestamps = (store.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      const oldest = timestamps[0];
      const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader("Retry-After", resetSeconds);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil((oldest + windowMs) / 1000));
      return next(new AppError(`${message}. Retry after ${resetSeconds}s.`, 429));
    }

    timestamps.push(now);
    store.set(key, timestamps);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", max - timestamps.length);
    next();
  };
}

