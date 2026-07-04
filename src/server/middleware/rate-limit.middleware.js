import { sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestClientAddress } from "../lib/route-request.js";
import {
  createRateLimitBucketKey,
  getDefaultRateLimitStore,
  getRateLimitRetryAfterSeconds,
  hitRateLimitBucket
} from "../services/rate-limit.service.js";

export function createRateLimiter({
  namespace,
  windowMs,
  max,
  message = "Too many requests",
  store = getDefaultRateLimitStore()
}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = createRateLimitBucketKey(namespace, getRequestClientAddress(req));
    const current = hitRateLimitBucket(store, key, now, windowMs);
    if (current.count <= max) {
      next();
      return;
    }

    const retryAfterSeconds = getRateLimitRetryAfterSeconds(current, now);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    sendErrorResponse(res, 429, message);
  };
}
