import { postJson } from "../api-client.js";

export const serverAPIProvider = {
  async analyzeImage(input = {}) {
    return postJson("/api/analyze-image", input);
  },

  async generateImage(input = {}) {
    const result = await postJson("/api/ai/generate", input);
    if (result?.imageUrl || result?.videoUrl || !result?.jobId) return result;
    return waitForGenerationJob(result.jobId, { fallback: result });
  },

  async generateSuggestions(context = {}) {
    const canvasState = context.canvasState || context;
    return postJson("/api/canvas-agent", {
      canvasState,
      model: context.model
    });
  },

  async extractPrompt(input = {}) {
    return postJson("/api/extract-image-text", input);
  }
};

async function waitForGenerationJob(jobId, {
  attempts = 180,
  delayMs = 2000,
  fallback = {},
  missingUrlRetries = 4
} = {}) {
  let lastPayload = { jobId, ...fallback };
  let missingUrlAttempts = 0;
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      await delay(getRetryAfterDelayMs(response, delayMs * 2));
      continue;
    }
    if (!response.ok) throw new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
    lastPayload = { ...fallback, ...payload };
    if (["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(payload?.status)) {
      if (payload.status !== "succeeded") throw new Error(payload.failureMessage || payload.errorMessage || payload.error || payload.status);
      const imageUrl = getResultImageUrl(lastPayload);
      const videoUrl = getResultVideoUrl(lastPayload);
      if (!imageUrl && !videoUrl) {
        missingUrlAttempts += 1;
        if (missingUrlAttempts <= missingUrlRetries) continue;
        throw new Error(lastPayload.failureMessage || lastPayload.errorMessage || lastPayload.error || "Generation completed without an output URL");
      }
      return { ...lastPayload, imageUrl, videoUrl };
    }
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

function getResultImageUrl(result = {}) {
  if (result.imageUrl) return result.imageUrl;
  if (Array.isArray(result.imageUrls) && result.imageUrls[0]) return result.imageUrls[0];
  const output = findOutput(result, "image");
  return output?.url || "";
}

function getResultVideoUrl(result = {}) {
  if (result.videoUrl) return result.videoUrl;
  if (Array.isArray(result.videoUrls) && result.videoUrls[0]) return result.videoUrls[0];
  const output = findOutput(result, "video");
  return output?.url || "";
}

function findOutput(result = {}, expectedType = "image") {
  return Array.isArray(result.outputs)
    ? result.outputs.find((item) => {
      const type = String(item?.type || "").toLowerCase();
      const mimeType = String(item?.mimeType || item?.mime_type || "").toLowerCase();
      if (!item?.url) return false;
      if (expectedType === "video") return type === "video" || mimeType.startsWith("video/");
      return type === "image" || mimeType.startsWith("image/") || (!type && !mimeType);
    })
    : null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}
