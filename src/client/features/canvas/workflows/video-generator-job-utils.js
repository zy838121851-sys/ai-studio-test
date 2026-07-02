export const VIDEO_JOB_TERMINAL_STATUSES = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "timeout",
  "save_failed"
]);

export function isTerminalVideoJobStatus(status = "") {
  return VIDEO_JOB_TERMINAL_STATUSES.has(String(status || ""));
}

export function getResultVideoUrl(result = {}) {
  if (result.videoUrl) return result.videoUrl;
  if (Array.isArray(result.videoUrls) && result.videoUrls[0]) return result.videoUrls[0];
  if (Array.isArray(result.outputs)) {
    const output = result.outputs.find((item) => {
      const type = String(item?.type || "").toLowerCase();
      const mimeType = String(item?.mimeType || item?.mime_type || "").toLowerCase();
      return item?.url && (type === "video" || mimeType.startsWith("video/"));
    });
    if (output?.url) return output.url;
  }
  return "";
}

export function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}

export function createVideoGenerationPayload({
  model = "",
  prompt = "",
  images = [],
  videoOptions = {},
  defaultSize = "16:9"
} = {}) {
  return {
    model,
    prompt,
    images,
    size: videoOptions.size || defaultSize,
    videoOptions
  };
}

export async function postVideoJson(path, payload = {}, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.failureMessage || data.errorMessage || data.message || `Request failed: ${response.status}`);
  return data;
}

export async function waitForVideoJob(jobId, {
  attempts = 180,
  delayMs = 2000,
  fallback = {},
  onProgress = null,
  missingUrlRetries = 4,
  fetchImpl = globalThis.fetch
} = {}) {
  let lastPayload = { jobId, ...fallback };
  let missingUrlAttempts = 0;
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetchImpl(`/api/ai/jobs/${encodeURIComponent(jobId)}`, { credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      await delay(getRetryAfterDelayMs(response, delayMs * 2));
      continue;
    }
    if (!response.ok) throw new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
    lastPayload = { ...fallback, ...payload };
    onProgress?.(lastPayload);
    if (isTerminalVideoJobStatus(payload?.status)) {
      if (payload.status !== "succeeded") throw new Error(payload.failureMessage || payload.errorMessage || payload.error || payload.status);
      const videoUrl = getResultVideoUrl(lastPayload);
      if (!videoUrl) {
        missingUrlAttempts += 1;
        if (missingUrlAttempts <= missingUrlRetries) continue;
        throw new Error(lastPayload.failureMessage || lastPayload.errorMessage || lastPayload.error || "Generation completed without a video URL");
      }
      return { ...lastPayload, videoUrl };
    }
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

export async function runVideoRequest({
  model,
  prompt,
  images = [],
  videoOptions = {},
  defaultSize = "16:9",
  onProgress = null,
  postJsonRequest = postVideoJson
} = {}) {
  const result = await postJsonRequest("/api/ai/generate", createVideoGenerationPayload({
    model,
    prompt,
    images,
    videoOptions,
    defaultSize
  }));
  if (result?.videoUrl || !result?.jobId) return result;
  return waitForVideoJob(result.jobId, { fallback: result, onProgress });
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
