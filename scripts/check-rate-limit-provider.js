import { createRateLimiter } from "../src/server/middleware/rate-limit.middleware.js";
import { createMemoryRateLimitStore } from "../src/server/providers/rate-limit/memory-rate-limit-store.js";
import {
  createRateLimitBucketKey,
  getDefaultRateLimitStore,
  getRateLimitBucketTtl,
  getRateLimitRetryAfterSeconds,
  hitRateLimitBucket,
  resetDefaultRateLimitStore,
  resetRateLimitBucket,
  setDefaultRateLimitStore
} from "../src/server/services/rate-limit.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

checkStoreWindowBehavior();
checkServiceStoreBehavior();
checkMiddlewareLimitResponse();
checkProviderReplacement();

console.log("Rate limit provider checks passed.");

function checkStoreWindowBehavior() {
  const store = createMemoryRateLimitStore();
  const first = store.hit("auth:127.0.0.1", 1000, 5000);
  assert(first.count === 1, "First hit should start a bucket");
  assert(first.resetAt === 6000, "First hit should set reset time");

  const second = store.hit("auth:127.0.0.1", 2000, 5000);
  assert(second.count === 2, "Second hit should increment the same bucket");
  assert(second.resetAt === 6000, "Second hit should preserve reset time");
  assert(store.ttl("auth:127.0.0.1", 3000) === 3000, "Store ttl should report remaining window time");

  const otherNamespace = store.hit("upload:127.0.0.1", 2000, 5000);
  assert(otherNamespace.count === 1, "Different keys should not share counters");

  store.reset("upload:127.0.0.1");
  assert(store.ttl("upload:127.0.0.1", 3000) === 0, "Store reset should clear a bucket");

  const reset = store.hit("auth:127.0.0.1", 6000, 5000);
  assert(reset.count === 1, "Window boundary should start a new bucket");
  assert(reset.resetAt === 11000, "New bucket should get a fresh reset time");
}

function checkServiceStoreBehavior() {
  const store = createMemoryRateLimitStore();
  const bucketKey = createRateLimitBucketKey("service", "127.0.0.1");
  assert(bucketKey === "service:127.0.0.1", "Rate limit service should format bucket keys");
  const first = hitRateLimitBucket(store, bucketKey, 1000, 3000);
  assert(first.count === 1, "Rate limit service should hit the provided store");
  assert(first.resetAt === 4000, "Rate limit service should preserve store reset behavior");
  assert(getRateLimitBucketTtl(store, bucketKey, 2500) === 1500, "Rate limit service should expose ttl");
  assert(getRateLimitRetryAfterSeconds(first, 2500) === 2, "Rate limit service should calculate Retry-After");
  assert(getRateLimitRetryAfterSeconds(first, 5000) === 1, "Rate limit service should keep Retry-After at least one second");
  resetRateLimitBucket(store, bucketKey);
  assert(getRateLimitBucketTtl(store, bucketKey, 2500) === 0, "Rate limit service should expose reset");

  const defaultStore = getDefaultRateLimitStore();
  assert(defaultStore?.increment, "Rate limit service should expose a default store with increment");
  assert(defaultStore?.hit, "Memory rate limit stores should preserve the hit compatibility alias");
  assert(defaultStore?.reset, "Rate limit service should expose a default store with reset");
  assert(defaultStore?.ttl, "Rate limit service should expose a default store with ttl");
}

function checkProviderReplacement() {
  const defaultStore = getDefaultRateLimitStore();
  const dynamicLimiter = createRateLimiter({
    namespace: "dynamic",
    windowMs: 2000,
    max: 1
  });
  let incrementCalls = 0;
  const injectedStore = {
    increment(key, now, windowMs) {
      incrementCalls += 1;
      return { count: 1, resetAt: now + windowMs, key };
    },
    reset() {},
    ttl() {
      return 0;
    }
  };

  setDefaultRateLimitStore(injectedStore);
  assert(getDefaultRateLimitStore() === injectedStore, "Rate limit services should support store replacement");
  const result = invokeLimiter(dynamicLimiter);
  assert(result.nextCalls === 1, "Existing limiters should resolve replaced default stores at request time");
  assert(incrementCalls === 1, "Existing limiters should increment through replaced stores");
  resetDefaultRateLimitStore();
  assert(getDefaultRateLimitStore() === defaultStore, "Rate limit services should restore the memory store");

  let invalidStoreError = null;
  try {
    setDefaultRateLimitStore({ increment() {}, reset() {} });
  } catch (error) {
    invalidStoreError = error;
  }
  assert(
    invalidStoreError?.message === "Rate limit store must implement ttl()",
    "Rate limit services should reject incomplete stores"
  );
  resetDefaultRateLimitStore();
}

function checkMiddlewareLimitResponse() {
  const store = createMemoryRateLimitStore();
  const limiter = createRateLimiter({
    namespace: "test",
    windowMs: 2000,
    max: 2,
    message: "Limited",
    store
  });
  const originalNow = Date.now;
  Date.now = () => 1000;
  try {
    const first = invokeLimiter(limiter);
    assert(first.nextCalls === 1, "First request should pass");
    assert(first.statusCode === 0, "First request should not set a response status");

    const second = invokeLimiter(limiter);
    assert(second.nextCalls === 1, "Second request should pass at the limit");

    const third = invokeLimiter(limiter);
    assert(third.nextCalls === 0, "Third request should be blocked");
    assert(third.statusCode === 429, "Blocked request should return 429");
    assert(third.headers["Retry-After"] === "2", "Blocked request should include Retry-After");
    assert(third.body?.message === "Limited", "Blocked request should keep configured message");
  } finally {
    Date.now = originalNow;
  }
}

function invokeLimiter(limiter) {
  let nextCalls = 0;
  const req = {
    ip: "127.0.0.1",
    socket: { remoteAddress: "ignored" }
  };
  const res = {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  limiter(req, res, () => {
    nextCalls += 1;
  });

  return {
    nextCalls,
    headers: res.headers,
    statusCode: res.statusCode,
    body: res.body
  };
}
