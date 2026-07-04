import { getRetryAfterDelayMs } from "./prompt-error-utils.js";

export function shouldUseImmediateAIResult(result) {
  return Boolean(result.imageUrl || result.videoUrl || !result.jobId);
}

export function isAIJobRunningStatus(status = "") {
  return status === "queued" || status === "running";
}

export function buildAIJobProgressMessage({
  generationType = "image",
  progress = 0,
  modelUsage = ""
} = {}) {
  const label = generationType === "video" ? "Video" : "Image";
  const progressValue = Number(progress || 0);
  const suffix = progressValue > 0 ? ` (${Math.min(99, progressValue)}%)` : "";
  return `${label} generation is still running${suffix}.\n${modelUsage}`;
}

export async function waitForAIJob(jobId, { attempts = 180, delayMs = 2000, onProgress = null } = {}) {
  let lastPayload = { jobId };
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
      onProgress?.({
        ...lastPayload,
        status: "running",
        rateLimited: true,
        message: payload?.message || "Waiting for job status"
      });
      await delay(retryDelay);
      continue;
    }
    if (!response.ok) {
      const error = new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
      error.status = response.status;
      error.failureCode = payload?.failureCode || payload?.errorCode || "";
      error.failureMessage = payload?.failureMessage || payload?.errorMessage || payload?.message || "";
      error.stage = payload?.stage || "jobPoll";
      throw error;
    }
    lastPayload = payload;
    if (["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(payload?.status)) {
      if (payload.status !== "succeeded") {
        const error = new Error(payload.failureMessage || payload.errorMessage || payload.error || payload.status);
        error.failureCode = payload.failureCode || payload.errorCode || payload.status?.toUpperCase?.() || "AI_JOB_FAILED";
        error.failureMessage = payload.failureMessage || payload.errorMessage || payload.error || payload.status;
        error.stage = payload.status === "save_failed" ? "outputPersist" : "jobPoll";
        throw error;
      }
      return payload;
    }
    onProgress?.(payload);
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

export async function waitForTripo3DTask(taskId, { attempts = 180, delayMs = 2000, onProgress = null } = {}) {
  const id = String(taskId || "").trim();
  if (!id) throw new Error("Missing 3D task id");
  let lastPayload = { taskId: id };
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/3d/tasks/${encodeURIComponent(id)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.errorMessage || payload?.message || `3D task request failed: ${response.status}`);
      error.status = response.status;
      error.failureCode = payload?.failureCode || payload?.errorCode || "";
      error.failureMessage = payload?.errorMessage || payload?.message || "";
      error.stage = "jobPoll";
      throw error;
    }
    lastPayload = {
      ...payload,
      taskId: payload.taskId || id
    };
    onProgress?.(lastPayload);
    const status = String(payload.status || "").toLowerCase();
    if (status === "success") return lastPayload;
    if (["failed", "cancelled", "canceled", "banned"].includes(status)) {
      const error = new Error(payload.errorMessage || `3D task ${status}`);
      error.failureCode = payload.failureCode || payload.errorCode || status.toUpperCase();
      error.failureMessage = payload.errorMessage || `3D task ${status}`;
      error.stage = "jobPoll";
      throw error;
    }
  }
  throw new Error("3D 模型生成超时，请稍后在任务日志中查看结果。");
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
