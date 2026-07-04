import { localJobQueue } from "../providers/queue/local-job-queue.provider.js";

export function getDefaultJobQueue() {
  return localJobQueue;
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
