import {
  waitForImageGenerationJob
} from "../src/client/features/canvas/workflows/image-generator-job-polling-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createResponse({
  status = 200,
  ok = status >= 200 && status < 300,
  payload = {},
  retryAfter = ""
} = {}) {
  return {
    status,
    ok,
    headers: {
      get(name) {
        return String(name || "").toLowerCase() === "retry-after" ? retryAfter : "";
      }
    },
    async json() {
      return payload;
    }
  };
}

function createFetchSequence(responses = []) {
  const calls = [];
  return {
    calls,
    async fetchFn(path, options) {
      calls.push({ path, options });
      const next = responses.shift();
      if (!next) throw new Error("Unexpected fetch call");
      return createResponse(next);
    }
  };
}

const successSequence = createFetchSequence([
  { payload: { jobId: "job-1", status: "running", progress: 50 } },
  { payload: { jobId: "job-1", status: "succeeded", imageUrl: "/uploads/final.png" } }
]);
const progressPayloads = [];
const pollLogs = [];
const successResult = await waitForImageGenerationJob("job-1", {
  attempts: 3,
  delayMs: 0,
  fetchFn: successSequence.fetchFn,
  onProgress: (payload) => progressPayloads.push(payload),
  logJobPoll: (payload) => pollLogs.push(payload)
});
assert(successResult.imageUrl === "/uploads/final.png", "Polling should return terminal successful payloads with image URLs");
assert(progressPayloads.length === 1 && progressPayloads[0].status === "running", "Polling should forward non-terminal progress payloads");
assert(pollLogs.length === 2 && pollLogs[1].status === "succeeded", "Polling should log each accepted job payload");
assert(successSequence.calls[0].path === "/api/ai/jobs/job-1", "Polling should request encoded job status paths");
assert(successSequence.calls[0].options.credentials === "include", "Polling should preserve credentialed job status requests");

const rateLimitSequence = createFetchSequence([
  { status: 429, ok: false, retryAfter: "0", payload: { message: "Slow down" } },
  { payload: { jobId: "job-2", status: "succeeded", imageUrl: "/uploads/rate-limit.png" } }
]);
const rateLimitProgress = [];
const rateLimitResult = await waitForImageGenerationJob("job-2", {
  attempts: 3,
  delayMs: 0,
  fetchFn: rateLimitSequence.fetchFn,
  fallback: { jobId: "job-2", status: "queued" },
  onProgress: (payload) => rateLimitProgress.push(payload)
});
assert(rateLimitResult.imageUrl === "/uploads/rate-limit.png", "Polling should continue after rate-limit responses");
assert(rateLimitProgress[0].rateLimited === true, "Polling should emit rate-limit progress payloads");

const missingUrlSequence = createFetchSequence([
  { payload: { jobId: "job-3", status: "succeeded" } },
  { payload: { jobId: "job-3", status: "succeeded", imageUrl: "/uploads/late.png" } }
]);
const missingUrlProgress = [];
const missingUrlResult = await waitForImageGenerationJob("job-3", {
  attempts: 3,
  delayMs: 0,
  fetchFn: missingUrlSequence.fetchFn,
  missingUrlRetries: 4,
  onProgress: (payload) => missingUrlProgress.push(payload)
});
assert(missingUrlResult.imageUrl === "/uploads/late.png", "Polling should retry terminal jobs until saved URLs appear");
assert(missingUrlProgress[0].message === "Waiting for saved image URL", "Polling should report missing image URL retries");

let failedError = null;
try {
  await waitForImageGenerationJob("job-4", {
    attempts: 1,
    delayMs: 0,
    fetchFn: createFetchSequence([
      { payload: { jobId: "job-4", status: "failed", errorMessage: "provider failed" } }
    ]).fetchFn
  });
} catch (error) {
  failedError = error;
}
assert(failedError?.message === "provider failed", "Polling should surface terminal failed job errors");

let timeoutError = null;
try {
  await waitForImageGenerationJob("job-5", {
    attempts: 1,
    delayMs: 0,
    fetchFn: createFetchSequence([
      { payload: { jobId: "job-5", status: "running" } }
    ]).fetchFn
  });
} catch (error) {
  timeoutError = error;
}
assert(
  timeoutError?.message === "Generation is still running. Job ID: job-5",
  "Polling should preserve timeout copy"
);

console.log("Image generator job polling utility checks passed.");
