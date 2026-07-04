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
    },

    reset(key) {
      buckets.delete(key);
    },

    ttl(key, now) {
      const current = buckets.get(key);
      if (!current) return 0;
      return Math.max(0, current.resetAt - now);
    }
  };
}

export const memoryRateLimitStore = createMemoryRateLimitStore();
