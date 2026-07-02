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

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
