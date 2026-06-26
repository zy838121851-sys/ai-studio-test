import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { prepare, transaction } from "../db/sqlite.js";
import { chargeReservedCredits, releaseReservedCredits } from "./credits/credit.service.js";
import { createGeneratedAsset, createGeneratedAssetFromBuffer } from "./asset.service.js";
import { getApimartTaskStatus } from "./providers/apimart/apimart-task.service.js";
import { sanitizePromptPreview } from "./providers/apimart/apimart.client.js";

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled", "timeout", "save_failed"]);

export function createAIJob(input = {}) {
  return transaction((db) => {
    const now = Date.now();
    const id = input.id || randomUUID();
    db.prepare(`
      INSERT INTO ai_jobs (
        id, user_id, provider, vendor, model_id, provider_model, remote_task_id,
        type, status, progress, prompt_preview, input_asset_ids_json,
        output_asset_ids_json, error_code, error_message, credits_reserved,
        credits_charged, created_at, updated_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '', '', ?, 0, ?, ?, NULL);
    `).run(
      id,
      input.userId,
      input.provider || "",
      input.vendor || "",
      input.modelId || "",
      input.providerModel || "",
      input.remoteTaskId || "",
      input.type || "image",
      input.status || "queued",
      normalizeProgress(input.progress),
      sanitizePromptPreview(input.prompt || input.promptPreview || ""),
      JSON.stringify(Array.isArray(input.inputAssetIds) ? input.inputAssetIds : []),
      Math.max(0, Math.ceil(Number(input.creditsReserved || 0))),
      now,
      now
    );
    return getAIJob(input.userId, id);
  });
}

export function getAIJob(userId, id) {
  return toPublicJob(prepare(`
    SELECT *
    FROM ai_jobs
    WHERE user_id = ?
      AND id = ?
    LIMIT 1;
  `).get(userId, id));
}

export async function refreshAIJob(userId, id) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status)) return job;
  const remote = await getApimartTaskStatus(job.remoteTaskId, {
    type: job.type,
    model: job.providerModel
  });
  if (remote.status === "succeeded") {
    return completeAIJob(userId, id, {
      outputs: remote.outputs || [],
      status: "succeeded"
    });
  }
  if (["failed", "cancelled", "timeout"].includes(remote.status)) {
    return failAIJob(userId, id, {
      status: remote.status,
      errorCode: remote.errorCode || "",
      errorMessage: remote.errorMessage || remote.status
    });
  }
  return updateAIJobProgress(userId, id, {
    status: remote.status || "running",
    progress: remote.progress
  });
}

export async function completeAIJob(userId, id, { outputs = [] } = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status)) return job;
  try {
    const assets = [];
    for (const output of outputs) {
      const asset = await saveJobOutputAsset(userId, job, output);
      if (asset) assets.push(asset);
    }
    if (!assets.length) throw new Error("Generated output could not be saved locally");
    const charge = job.creditsReserved > 0
      ? chargeReservedCredits({
        userId,
        reservedAmount: job.creditsReserved,
        chargeAmount: job.creditsReserved,
        provider: job.provider,
        model: job.modelId,
        task: job.type === "video" ? "video_generation" : "image_generation",
        billingType: "fixed",
        reason: "ai_job_succeeded",
        requestId: id
      })
      : { chargedCredits: 0 };
    return updateAIJobTerminal(userId, id, {
      status: "succeeded",
      progress: 100,
      outputAssetIds: assets.map((asset) => asset.id),
      creditsCharged: charge.chargedCredits || 0
    });
  } catch (error) {
    return failAIJob(userId, id, {
      status: "save_failed",
      errorCode: "SAVE_FAILED",
      errorMessage: error.message || "Generated output could not be saved locally"
    });
  }
}

export function failAIJob(userId, id, { status = "failed", errorCode = "", errorMessage = "" } = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status)) return job;
  if (job.creditsReserved > 0 && job.creditsCharged <= 0) {
    releaseReservedCredits({
      userId,
      amount: job.creditsReserved,
      provider: job.provider,
      model: job.modelId,
      task: job.type === "video" ? "video_generation" : "image_generation",
      billingType: "fixed",
      reason: errorMessage || status,
      requestId: id,
      status: "failed"
    });
  }
  return updateAIJobTerminal(userId, id, {
    status,
    progress: 100,
    errorCode,
    errorMessage
  });
}

function updateAIJobProgress(userId, id, { status = "running", progress = 50 } = {}) {
  const now = Date.now();
  prepare(`
    UPDATE ai_jobs
    SET status = ?,
        progress = ?,
        updated_at = ?
    WHERE user_id = ?
      AND id = ?;
  `).run(status, normalizeProgress(progress), now, userId, id);
  return getAIJob(userId, id);
}

function updateAIJobTerminal(userId, id, {
  status,
  progress = 100,
  outputAssetIds = null,
  errorCode = "",
  errorMessage = "",
  creditsCharged = 0
} = {}) {
  const now = Date.now();
  prepare(`
    UPDATE ai_jobs
    SET status = ?,
        progress = ?,
        output_asset_ids_json = COALESCE(?, output_asset_ids_json),
        error_code = ?,
        error_message = ?,
        credits_charged = ?,
        updated_at = ?,
        completed_at = ?
    WHERE user_id = ?
      AND id = ?;
  `).run(
    status,
    normalizeProgress(progress),
    outputAssetIds ? JSON.stringify(outputAssetIds) : null,
    errorCode || "",
    sanitizePromptPreview(errorMessage || "", 160),
    Math.max(0, Math.ceil(Number(creditsCharged || 0))),
    now,
    now,
    userId,
    id
  );
  return getAIJob(userId, id);
}

async function saveJobOutputAsset(userId, job, output = {}) {
  const url = String(output.url || "").trim();
  const mimeType = String(output.mimeType || (job.type === "video" ? "video/mp4" : "image/png"));
  if (url.startsWith("data:")) {
    return createGeneratedAsset(userId, {
      dataUrl: url,
      type: job.type,
      source: "generated",
      title: job.type === "video" ? "Generated video.mp4" : "Generated image.png",
      prompt: job.promptPreview,
      modelName: job.modelId,
      libraryVisible: false
    });
  }
  if (url.startsWith("mock://")) {
    const buffer = job.type === "video"
      ? Buffer.from("mock video output")
      : Buffer.from("mock image output");
    return createGeneratedAssetFromBuffer(userId, {
      buffer,
      mimeType,
      type: job.type,
      title: job.type === "video" ? "Generated video.mp4" : "Generated image.png",
      prompt: job.promptPreview,
      modelName: job.modelId,
      libraryVisible: false
    });
  }
  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Unable to fetch generated output: ${response.status}`);
    const contentType = response.headers.get("content-type") || mimeType;
    const buffer = Buffer.from(await response.arrayBuffer());
    return createGeneratedAssetFromBuffer(userId, {
      buffer,
      mimeType: contentType,
      type: job.type,
      title: job.type === "video" ? "Generated video.mp4" : "Generated image.png",
      prompt: job.promptPreview,
      modelName: job.modelId,
      libraryVisible: false
    });
  }
  return null;
}

function toPublicJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    vendor: row.vendor,
    modelId: row.model_id,
    providerModel: row.provider_model,
    type: row.type,
    status: row.status,
    progress: Number(row.progress || 0),
    promptPreview: row.prompt_preview || "",
    inputAssetIds: parseJsonArray(row.input_asset_ids_json),
    outputAssetIds: parseJsonArray(row.output_asset_ids_json),
    errorCode: row.error_code || "",
    errorMessage: row.error_message || "",
    creditsReserved: Number(row.credits_reserved || 0),
    creditsCharged: Number(row.credits_charged || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    completedAt: row.completed_at ? Number(row.completed_at) : null,
    provider: row.provider,
    remoteTaskId: row.remote_task_id
  };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeProgress(value) {
  return Math.max(0, Math.min(100, Math.ceil(Number(value || 0))));
}
