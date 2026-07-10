import { createLocalJobQueue } from "../src/server/providers/queue/local-job-queue.provider.js";
import {
  createJobQueueKey,
  getDefaultJobQueue,
  isJobActive,
  resetDefaultJobQueue,
  setDefaultJobQueue,
  scheduleUniqueJob
} from "../src/server/services/job-queue.service.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createDeferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const queue = createLocalJobQueue();
const defaultQueue = getDefaultJobQueue();
assert(defaultQueue?.scheduleUnique, "Job queue service should expose a default queue with scheduleUnique");
assert(defaultQueue?.isActive, "Job queue service should expose a default queue with isActive");
assert(createJobQueueKey("user-1", "job-1") === "user-1:job-1", "Job queue service should format scoped keys");
assert(createJobQueueKey("user-1", "", "job-1") === "user-1::job-1", "Job queue service should preserve key parts");

let invalidCalls = 0;

assert(queue.scheduleUnique("", () => {
  invalidCalls += 1;
}) === false, "Blank keys should not schedule jobs");

assert(queue.scheduleUnique("job:invalid", null) === false, "Non-function tasks should not schedule jobs");
assert(invalidCalls === 0, "Invalid scheduled tasks should not run");

const heldJob = createDeferred();
let firstCalls = 0;
let duplicateCalls = 0;

assert(queue.scheduleUnique("job:1", async () => {
  firstCalls += 1;
  await heldJob.promise;
}) === true, "First job for a key should schedule");

await tick();

assert(firstCalls === 1, "Scheduled jobs should start asynchronously");
assert(queue.isActive("job:1") === true, "Running jobs should be active");

assert(queue.scheduleUnique("job:1", () => {
  duplicateCalls += 1;
}) === false, "Duplicate active jobs should not schedule");

await tick();

assert(duplicateCalls === 0, "Duplicate active jobs should not run");

let independentCalls = 0;

assert(queue.scheduleUnique("job:2", () => {
  independentCalls += 1;
}) === true, "Different keys should schedule independently");

await tick();

assert(independentCalls === 1, "Independent key task should run");
assert(queue.isActive("job:2") === false, "Completed independent jobs should be inactive");

heldJob.resolve();
await tick();
await tick();

assert(queue.isActive("job:1") === false, "Completed jobs should release their active key");

let rescheduledCalls = 0;

assert(queue.scheduleUnique("job:1", () => {
  rescheduledCalls += 1;
}) === true, "Released keys should schedule again");

await tick();

assert(rescheduledCalls === 1, "Rescheduled jobs should run");
assert(queue.isActive("job:1") === false, "Completed rescheduled jobs should be inactive");

let serviceCalls = 0;
assert(scheduleUniqueJob("service:job", () => {
  serviceCalls += 1;
}) === true, "Job queue service should schedule through the provider");

await tick();

assert(serviceCalls === 1, "Job queue service scheduled tasks should run");
assert(isJobActive("service:job") === false, "Job queue service should expose active state");

const injectedCalls = [];
const injectedQueue = {
  scheduleUnique(key, task) {
    injectedCalls.push({ key, task });
    return true;
  },
  isActive(key) {
    return key === "injected:active";
  }
};
setDefaultJobQueue(injectedQueue);
assert(getDefaultJobQueue() === injectedQueue, "Job queue services should support provider replacement");
assert(scheduleUniqueJob("injected:job", () => {}) === true, "Job queue services should schedule through injected providers");
assert(injectedCalls[0]?.key === "injected:job", "Job queue services should preserve scheduled keys");
assert(typeof injectedCalls[0]?.task === "function", "Job queue services should preserve scheduled tasks");
assert(isJobActive("injected:active") === true, "Job queue services should read active state from injected providers");
resetDefaultJobQueue();
assert(getDefaultJobQueue() === defaultQueue, "Job queue services should restore the local provider");

let invalidProviderError = null;
try {
  setDefaultJobQueue({ scheduleUnique() {} });
} catch (error) {
  invalidProviderError = error;
}
assert(
  invalidProviderError?.message === "Job queue provider must implement isActive()",
  "Job queue services should reject incomplete providers"
);
resetDefaultJobQueue();

console.log("Job queue provider checks passed.");
