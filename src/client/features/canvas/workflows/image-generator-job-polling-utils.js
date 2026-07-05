import {
  getFailedGeneratorJobError,
  getGeneratorResultUrls,
  getMissingGeneratorResultError
} from "./image-generator-result-utils.js";

export function buildGeneratorRateLimitProgressPayload(lastPayload = {}, payload = {}) {
  return {
    ...lastPayload,
    status: "running",
    rateLimited: true,
    message: payload?.message || "Waiting for job status"
  };
}

export function isTerminalGeneratorJobStatus(status = "") {
  return ["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(status);
}

export function getTerminalGeneratorJobResult(lastPayload = {}, expectedType = "image") {
  if (lastPayload.status !== "succeeded") {
    return {
      retryMissingUrl: false,
      error: getFailedGeneratorJobError(lastPayload)
    };
  }
  const resultUrls = getGeneratorResultUrls(lastPayload, expectedType);
  return {
    retryMissingUrl: !resultUrls.length,
    error: resultUrls.length ? null : getMissingGeneratorResultError(lastPayload, expectedType)
  };
}

export function buildInitialGeneratorJobPayload(jobId = "", fallback = {}) {
  return { jobId, ...fallback };
}

export function mergeGeneratorJobPayload(fallback = {}, payload = {}) {
  return { ...fallback, ...payload };
}

export function buildGeneratorMissingUrlProgressPayload(lastPayload = {}, expectedType = "image") {
  return {
    ...lastPayload,
    status: "running",
    message: expectedType === "video" ? "Waiting for saved video URL" : "Waiting for saved image URL"
  };
}

export function getMissingGeneratorUrlRetryState({
  terminalResult = {},
  missingUrlAttempts = 0,
  missingUrlRetries = 4
} = {}) {
  const nextAttempts = terminalResult?.retryMissingUrl
    ? missingUrlAttempts + 1
    : missingUrlAttempts;
  return {
    nextAttempts,
    shouldRetry: Boolean(terminalResult?.retryMissingUrl && nextAttempts <= missingUrlRetries)
  };
}

export function getTerminalGeneratorJobPollDecision({
  lastPayload = {},
  expectedType = "image",
  missingUrlAttempts = 0,
  missingUrlRetries = 4
} = {}) {
  const terminalResult = getTerminalGeneratorJobResult(lastPayload, expectedType);
  const retryState = getMissingGeneratorUrlRetryState({
    terminalResult,
    missingUrlAttempts,
    missingUrlRetries
  });
  return {
    terminalResult,
    missingUrlAttempts: retryState.nextAttempts,
    shouldRetryMissingUrl: retryState.shouldRetry,
    error: terminalResult.error || null
  };
}

export function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}

export function getGeneratorJobRequestError(payload = {}, status = 0) {
  return new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${status}`);
}

export function getGeneratorJobStatusPath(jobId = "") {
  return `/api/ai/jobs/${encodeURIComponent(jobId)}`;
}

export function delayGeneratorJobPoll(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForImageGenerationJob(jobId, {
  attempts = 180,
  delayMs = 2000,
  onProgress = null,
  fallback = {},
  expectedType = "image",
  missingUrlRetries = 4,
  fetchFn = globalThis.fetch,
  logJobPoll = () => {}
} = {}) {
  let lastPayload = buildInitialGeneratorJobPayload(jobId, fallback);
  let missingUrlAttempts = 0;
  for (let index = 0; index < attempts; index += 1) {
    await delayGeneratorJobPoll(delayMs);
    const response = await fetchFn(getGeneratorJobStatusPath(jobId), {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
      onProgress?.(buildGeneratorRateLimitProgressPayload(lastPayload, payload));
      await delayGeneratorJobPoll(retryDelay);
      continue;
    }
    if (!response.ok) throw getGeneratorJobRequestError(payload, response.status);
    lastPayload = mergeGeneratorJobPayload(fallback, payload);
    logJobPoll(lastPayload);
    if (isTerminalGeneratorJobStatus(payload?.status)) {
      const decision = getTerminalGeneratorJobPollDecision({
        lastPayload,
        expectedType,
        missingUrlAttempts,
        missingUrlRetries
      });
      missingUrlAttempts = decision.missingUrlAttempts;
      if (decision.shouldRetryMissingUrl) {
        onProgress?.(buildGeneratorMissingUrlProgressPayload(lastPayload, expectedType));
        continue;
      }
      if (decision.error) throw decision.error;
      return lastPayload;
    }
    onProgress?.(payload);
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}
