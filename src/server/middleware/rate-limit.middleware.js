const buckets = new Map();

function clientKey(req, namespace) {
  return `${namespace}:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

export function createRateLimiter({
  namespace,
  windowMs,
  max,
  message = "Too many requests"
}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req, namespace);
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count <= max) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ message });
  };
}
