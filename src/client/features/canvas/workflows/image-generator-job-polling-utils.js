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

export function buildGeneratorMissingUrlProgressPayload(lastPayload = {}, expectedType = "image") {
  return {
    ...lastPayload,
    status: "running",
    message: expectedType === "video" ? "Waiting for saved video URL" : "Waiting for saved image URL"
  };
}

export function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}
