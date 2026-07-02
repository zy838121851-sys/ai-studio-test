import {
  delay,
  waitForAIJob,
  waitForTripo3DTask
} from "../src/client/features/workspace/chat/workflows/prompt-job-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalFetch = globalThis.fetch;

try {
  await delay(0);

  const runningProgress = [];
  const aiSuccessCalls = mockFetchSequence([
    makeJsonResponse(200, { jobId: "job-1", status: "running", progress: 25 }),
    makeJsonResponse(200, { jobId: "job-1", status: "succeeded", imageUrl: "/uploads/a.png" })
  ]);
  const aiSuccess = await waitForAIJob("job 1", {
    attempts: 2,
    delayMs: 0,
    onProgress: (payload) => runningProgress.push(payload)
  });
  assert(aiSuccess.imageUrl === "/uploads/a.png", "AI job polling should return succeeded payloads");
  assert(aiSuccessCalls[0].url === "/api/ai/jobs/job%201", "AI job polling should encode job ids");
  assert(aiSuccessCalls[0].options.credentials === "include", "AI job polling should include credentials");
  assert(runningProgress.length === 1 && runningProgress[0].status === "running", "AI job polling should report running progress");

  const rateLimitedProgress = [];
  mockFetchSequence([
    makeJsonResponse(429, { message: "Slow down" }, { retryAfter: "0" }),
    makeJsonResponse(200, { jobId: "rate", status: "succeeded" })
  ]);
  const rateLimited = await waitForAIJob("rate", {
    attempts: 2,
    delayMs: 0,
    onProgress: (payload) => rateLimitedProgress.push(payload)
  });
  assert(rateLimited.status === "succeeded", "AI job polling should continue after rate limits");
  assert(rateLimitedProgress[0].rateLimited === true, "AI job polling should report rate limits");
  assert(rateLimitedProgress[0].message === "Slow down", "AI job polling should preserve rate-limit message");

  let httpError = null;
  mockFetchSequence([
    makeJsonResponse(500, {
      failureMessage: "Provider failed",
      failureCode: "PROVIDER_FAILED",
      stage: "provider"
    })
  ]);
  try {
    await waitForAIJob("bad", { attempts: 1, delayMs: 0 });
  } catch (error) {
    httpError = error;
  }
  assert(httpError?.message === "Provider failed", "AI job polling should throw HTTP failure messages");
  assert(httpError.status === 500, "AI job polling should preserve HTTP status");
  assert(httpError.failureCode === "PROVIDER_FAILED", "AI job polling should preserve failure code");
  assert(httpError.failureMessage === "Provider failed", "AI job polling should preserve failure message");
  assert(httpError.stage === "provider", "AI job polling should preserve failure stage");

  let saveFailedError = null;
  mockFetchSequence([
    makeJsonResponse(200, {
      status: "save_failed",
      errorCode: "SAVE_FAILED",
      errorMessage: "Output save failed"
    })
  ]);
  try {
    await waitForAIJob("save", { attempts: 1, delayMs: 0 });
  } catch (error) {
    saveFailedError = error;
  }
  assert(saveFailedError?.failureCode === "SAVE_FAILED", "AI job terminal failures should preserve error codes");
  assert(saveFailedError.failureMessage === "Output save failed", "AI job terminal failures should preserve error messages");
  assert(saveFailedError.stage === "outputPersist", "AI job save failures should map to outputPersist");

  mockFetchSequence([
    makeJsonResponse(200, { jobId: "slow", status: "running" })
  ]);
  let timeoutError = null;
  try {
    await waitForAIJob("slow", { attempts: 1, delayMs: 0 });
  } catch (error) {
    timeoutError = error;
  }
  assert(timeoutError?.message === "Generation is still running. Job ID: slow", "AI job polling should use last job id in timeout");

  let missingTaskError = null;
  try {
    await waitForTripo3DTask("", { attempts: 1, delayMs: 0 });
  } catch (error) {
    missingTaskError = error;
  }
  assert(missingTaskError?.message === "Missing 3D task id", "3D task polling should require a task id");

  const tripoProgress = [];
  const tripoSuccessCalls = mockFetchSequence([
    makeJsonResponse(200, { status: "running", progress: 40 }),
    makeJsonResponse(200, { status: "success", modelUrl: "/uploads/model.glb" })
  ]);
  const tripoSuccess = await waitForTripo3DTask("task 1", {
    attempts: 2,
    delayMs: 0,
    onProgress: (payload) => tripoProgress.push(payload)
  });
  assert(tripoSuccess.taskId === "task 1", "3D task polling should backfill task id");
  assert(tripoSuccess.modelUrl === "/uploads/model.glb", "3D task polling should return success payloads");
  assert(tripoSuccessCalls[0].url === "/api/ai/3d/tasks/task%201", "3D task polling should encode task ids");
  assert(tripoProgress.length === 2, "3D task polling should report each response to progress");

  let tripoHttpError = null;
  mockFetchSequence([
    makeJsonResponse(502, {
      message: "3D unavailable",
      errorCode: "TRIPO_DOWN"
    })
  ]);
  try {
    await waitForTripo3DTask("down", { attempts: 1, delayMs: 0 });
  } catch (error) {
    tripoHttpError = error;
  }
  assert(tripoHttpError?.message === "3D unavailable", "3D task polling should throw HTTP failure messages");
  assert(tripoHttpError.status === 502, "3D task polling should preserve HTTP status");
  assert(tripoHttpError.failureCode === "TRIPO_DOWN", "3D task polling should preserve failure code");
  assert(tripoHttpError.failureMessage === "3D unavailable", "3D task polling should preserve failure message");
  assert(tripoHttpError.stage === "jobPoll", "3D task polling should use jobPoll stage for HTTP errors");

  let tripoFailedError = null;
  mockFetchSequence([
    makeJsonResponse(200, {
      status: "banned",
      errorCode: "BANNED",
      errorMessage: "Content rejected"
    })
  ]);
  try {
    await waitForTripo3DTask("banned", { attempts: 1, delayMs: 0 });
  } catch (error) {
    tripoFailedError = error;
  }
  assert(tripoFailedError?.message === "Content rejected", "3D terminal failures should use error messages");
  assert(tripoFailedError.failureCode === "BANNED", "3D terminal failures should preserve error codes");
  assert(tripoFailedError.failureMessage === "Content rejected", "3D terminal failures should preserve failure messages");
  assert(tripoFailedError.stage === "jobPoll", "3D terminal failures should use jobPoll stage");

  mockFetchSequence([
    makeJsonResponse(200, { taskId: "slow-3d", status: "running" })
  ]);
  let tripoTimeoutError = null;
  try {
    await waitForTripo3DTask("slow-3d", { attempts: 1, delayMs: 0 });
  } catch (error) {
    tripoTimeoutError = error;
  }
  assert(tripoTimeoutError?.message === "3D 模型生成超时，请稍后在任务日志中查看结果。", "3D task polling should preserve timeout copy");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Prompt job utility checks passed.");

function mockFetchSequence(responses = []) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (!responses.length) throw new Error(`Unexpected fetch: ${url}`);
    return responses.shift();
  };
  return calls;
}

function makeJsonResponse(status, payload = {}, { retryAfter = "" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name === "Retry-After" ? retryAfter : "";
      }
    },
    async json() {
      return payload;
    }
  };
}
