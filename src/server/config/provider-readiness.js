import { localJobQueue } from "../providers/queue/local-job-queue.provider.js";
import { memoryRateLimitStore } from "../providers/rate-limit/memory-rate-limit-store.js";
import { localStorageProvider } from "../providers/storage/local-storage.provider.js";
import { getDefaultJobQueue } from "../services/job-queue.service.js";
import { getDefaultRateLimitStore } from "../services/rate-limit.service.js";
import { getDefaultStorageProvider } from "../services/storage.service.js";

const RUNTIME_PROFILES = new Set(["single-instance", "distributed"]);

export function getProviderReadiness({
  profile = "single-instance",
  storageProvider = getDefaultStorageProvider(),
  jobQueue = getDefaultJobQueue(),
  rateLimitStore = getDefaultRateLimitStore()
} = {}) {
  const normalizedProfile = String(profile || "").trim().toLowerCase();
  if (!RUNTIME_PROFILES.has(normalizedProfile)) {
    throw new Error("SAAS_RUNTIME_PROFILE must be single-instance or distributed.");
  }

  const providers = {
    storage: providerId(storageProvider, localStorageProvider, "local-storage"),
    jobQueue: providerId(jobQueue, localJobQueue, "local-job-queue"),
    rateLimit: providerId(rateLimitStore, memoryRateLimitStore, "memory-rate-limit")
  };
  const limitations = [];
  if (storageProvider === localStorageProvider) limitations.push("local storage is not shared across instances");
  if (jobQueue === localJobQueue) limitations.push("local job queue is not durable or shared across instances");
  if (rateLimitStore === memoryRateLimitStore) limitations.push("memory rate limit state is not shared across instances");
  const blockers = normalizedProfile === "distributed" ? limitations : [];

  return {
    profile: normalizedProfile,
    ready: blockers.length === 0,
    providers,
    limitations,
    blockers
  };
}

export function assertProviderReadiness(options = {}) {
  const readiness = getProviderReadiness(options);
  if (!readiness.ready) {
    throw new Error(`Provider readiness failed for ${readiness.profile}: ${readiness.blockers.join("; ")}.`);
  }
  return readiness;
}

function providerId(provider, localProvider, localId) {
  if (provider === localProvider) return localId;
  return String(provider?.id || "custom");
}
