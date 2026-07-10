import { localJobQueue } from "../providers/queue/local-job-queue.provider.js";

const JOB_QUEUE_PROVIDER_METHODS = ["scheduleUnique", "isActive"];
let defaultJobQueue = localJobQueue;

export function getDefaultJobQueue() {
  return defaultJobQueue;
}

export function setDefaultJobQueue(provider) {
  for (const method of JOB_QUEUE_PROVIDER_METHODS) {
    if (typeof provider?.[method] !== "function") {
      throw new TypeError(`Job queue provider must implement ${method}()`);
    }
  }
  defaultJobQueue = provider;
  return defaultJobQueue;
}

export function resetDefaultJobQueue() {
  defaultJobQueue = localJobQueue;
  return defaultJobQueue;
}

export function createJobQueueKey(...parts) {
  return parts.map((part) => String(part ?? "")).join(":");
}

export function scheduleUniqueJob(key, task) {
  return getDefaultJobQueue().scheduleUnique(key, task);
}

export function isJobActive(key) {
  return getDefaultJobQueue().isActive(key);
}
