export function createMemoryRateLimitStore() {
  const buckets = new Map();

  return {
    hit(key, now, windowMs) {
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs };
        buckets.set(key, next);
        return next;
      }

      current.count += 1;
      return current;
    }
  };
}

export const memoryRateLimitStore = createMemoryRateLimitStore();
