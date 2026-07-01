import { sendErrorResponse } from "../lib/http-error-response.js";
import { getDefaultRateLimitStore, hitRateLimitBucket } from "../services/rate-limit.service.js";

function clientKey(req, namespace) {
  return `${namespace}:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

export function createRateLimiter({
  namespace,
  windowMs,
  max,
  message = "Too many requests",
  store = getDefaultRateLimitStore()
}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req, namespace);
    const current = hitRateLimitBucket(store, key, now, windowMs);
    if (current.count <= max) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    sendErrorResponse(res, 429, message);
  };
}
