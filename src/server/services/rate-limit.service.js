import { memoryRateLimitStore } from "../providers/rate-limit/memory-rate-limit-store.js";

export function getDefaultRateLimitStore() {
  return memoryRateLimitStore;
}

export function hitRateLimitBucket(store, key, now, windowMs) {
  return store.hit(key, now, windowMs);
}
