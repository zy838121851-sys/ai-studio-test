import { localJobQueue } from "../providers/queue/local-job-queue.provider.js";

export function scheduleUniqueJob(key, task) {
  return localJobQueue.scheduleUnique(key, task);
}

export function isJobActive(key) {
  return localJobQueue.isActive(key);
}
