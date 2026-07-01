import { createLocalJobQueue } from "../src/server/providers/queue/local-job-queue.provider.js";
import { isJobActive, scheduleUniqueJob } from "../src/server/services/job-queue.service.js";

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

console.log("Job queue provider checks passed.");
