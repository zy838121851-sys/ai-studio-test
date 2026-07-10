import { readFileSync } from "node:fs";
import {
  assertProviderReadiness,
  getProviderReadiness
} from "../src/server/config/provider-readiness.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const singleInstance = getProviderReadiness();
assert(singleInstance.profile === "single-instance", "Provider readiness should default to single-instance");
assert(singleInstance.ready === true, "Current local providers should support single-instance deployments");
assert(singleInstance.providers.storage === "local-storage", "Provider readiness should identify local storage");
assert(singleInstance.providers.jobQueue === "local-job-queue", "Provider readiness should identify the local job queue");
assert(singleInstance.providers.rateLimit === "memory-rate-limit", "Provider readiness should identify memory rate limiting");
assert(singleInstance.limitations.length === 3, "Single-instance readiness should disclose all scaling limitations");
assert(singleInstance.blockers.length === 0, "Single-instance readiness should not turn disclosed limitations into blockers");

const distributed = getProviderReadiness({ profile: "distributed" });
assert(distributed.ready === false, "Current local providers should block distributed deployments");
assert(distributed.blockers.length === 3, "Distributed readiness should report every unshared provider");

let distributedError = null;
try {
  assertProviderReadiness({ profile: "distributed" });
} catch (error) {
  distributedError = error;
}
assert(distributedError?.message.includes("local storage is not shared"), "Distributed readiness errors should identify local storage");
assert(distributedError?.message.includes("local job queue is not durable"), "Distributed readiness errors should identify the local queue");
assert(distributedError?.message.includes("memory rate limit state is not shared"), "Distributed readiness errors should identify memory rate limiting");

const distributedProviders = {
  storageProvider: { id: "object-storage" },
  jobQueue: { id: "durable-queue" },
  rateLimitStore: { id: "redis-rate-limit" }
};
const distributedReady = assertProviderReadiness({
  profile: "distributed",
  ...distributedProviders
});
assert(distributedReady.ready === true, "Non-local providers should allow distributed readiness");
assert(distributedReady.providers.storage === "object-storage", "Readiness should preserve custom storage ids");
assert(distributedReady.providers.jobQueue === "durable-queue", "Readiness should preserve custom queue ids");
assert(distributedReady.providers.rateLimit === "redis-rate-limit", "Readiness should preserve custom rate limit ids");

let invalidProfileError = null;
try {
  getProviderReadiness({ profile: "cluster" });
} catch (error) {
  invalidProfileError = error;
}
assert(
  invalidProfileError?.message === "SAAS_RUNTIME_PROFILE must be single-instance or distributed.",
  "Provider readiness should reject unknown runtime profiles"
);

const runtimeConfig = readFileSync("src/server/config/runtime.js", "utf8");
assert(runtimeConfig.includes("assertProviderReadiness"), "Runtime validation should enforce provider readiness");
assert(runtimeConfig.includes("SAAS_RUNTIME_PROFILE"), "Runtime validation should read the SaaS runtime profile");

console.log("Provider readiness checks passed.");
