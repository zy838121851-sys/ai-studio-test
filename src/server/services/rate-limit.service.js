import { memoryRateLimitStore } from "../providers/rate-limit/memory-rate-limit-store.js";

const RATE_LIMIT_STORE_METHODS = ["increment", "reset", "ttl"];
let defaultRateLimitStore = memoryRateLimitStore;

export function getDefaultRateLimitStore() {
  return defaultRateLimitStore;
}

export function setDefaultRateLimitStore(store) {
  for (const method of RATE_LIMIT_STORE_METHODS) {
    if (typeof store?.[method] !== "function") {
      throw new TypeError(`Rate limit store must implement ${method}()`);
    }
  }
  defaultRateLimitStore = store;
  return defaultRateLimitStore;
}

export function resetDefaultRateLimitStore() {
  defaultRateLimitStore = memoryRateLimitStore;
  return defaultRateLimitStore;
}

export function createRateLimitBucketKey(namespace, clientAddress) {
  return `${namespace}:${clientAddress}`;
}

export function hitRateLimitBucket(store, key, now, windowMs) {
  return store.increment(key, now, windowMs);
}

export function resetRateLimitBucket(store, key) {
  return store.reset(key);
}

export function getRateLimitBucketTtl(store, key, now) {
  return store.ttl(key, now);
}

export function getRateLimitRetryAfterSeconds(bucket, now) {
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}
