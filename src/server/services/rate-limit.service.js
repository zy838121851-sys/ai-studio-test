import { memoryRateLimitStore } from "../providers/rate-limit/memory-rate-limit-store.js";

export function getDefaultRateLimitStore() {
  return memoryRateLimitStore;
}

export function hitRateLimitBucket(store, key, now, windowMs) {
  return store.hit(key, now, windowMs);
}

export function resetRateLimitBucket(store, key) {
  return store.reset(key);
}

export function getRateLimitBucketTtl(store, key, now) {
  return store.ttl(key, now);
}
