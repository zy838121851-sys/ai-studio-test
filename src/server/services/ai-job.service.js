import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { prepare, transaction } from "../db/sqlite.js";
import { normalizePaginationLimit, normalizePaginationOffset } from "../lib/api-pagination.js";
import { chargeReservedCredits, releaseReservedCredits } from "./credits/credit.service.js";
import { createGeneratedAsset, createGeneratedAssetFromBuffer, getAsset } from "./asset.service.js";
import { createJobQueueKey, scheduleUniqueJob } from "./job-queue.service.js";
import { getApimartTaskStatus } from "./providers/apimart/apimart-task.service.js";
import { sanitizePromptPreview, stripLargeInputs } from "./providers/apimart/apimart.client.js";
import { ensureUserWorkspaceWithDb } from "./workspace.service.js";

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled", "timeout", "save_failed"]);
const MAX_LOG_JSON_LENGTH = 24000;
const SECRET_KEY_PATTERN = /(?:authorization|cookie|password|secret|token|api[_-]?key|access[_-]?key)/i;

export function createAIJob(input = {}) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, input.userId);
    const now = Date.now();
    const id = input.id || randomUUID();
    db.prepare(`
      INSERT INTO ai_jobs (
        id, workspace_id, user_id, provider, vendor, model_id, provider_model, remote_task_id,
        type, status, progress, prompt_preview, error_code, error_message, failure_code, failure_message,
        request_json, response_json, duration_ms, credits_reserved,
        credits_charged, created_at, updated_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', ?, ?, ?, ?, 0, ?, ?, NULL);
    `).run(
      id,
      scope.workspaceId,
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
      stringifyJobLog(input.requestData || input.requestJson || {}),
      stringifyJobLog(input.responseData || input.responseJson || {}),
      nullableDuration(input.durationMs),
      Math.max(0, Math.ceil(Number(input.creditsReserved || 0))),
      now,
      now
    );
    insertJobAssetLinks(db, {
      jobId: id,
      workspaceId: scope.workspaceId,
      userId: input.userId,
      direction: "input",
      assetIds: input.inputAssetIds || [],
      createdAt: now
    });
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

export function getAIJobDetails(userId, id) {
  return toPublicJob(prepare(`
    SELECT *
    FROM ai_jobs
    WHERE user_id = ?
      AND id = ?
    LIMIT 1;
  `).get(userId, id), { includeLog: true });
}

export function getAIJobOutputAssets(userId, job = {}) {
  return Array.from(job.outputAssetIds || [])
    .map((assetId) => getAsset(userId, assetId))
    .filter(Boolean);
}

export function getAIJobByRemoteTaskId(userId, remoteTaskId) {
  return toPublicJob(prepare(`
    SELECT *
    FROM ai_jobs
    WHERE user_id = ?
      AND remote_task_id = ?
    LIMIT 1;
  `).get(userId, String(remoteTaskId || "").trim()), { includeLog: true });
}

export function listAIJobs(userId, filters = {}) {
  const limit = normalizePaginationLimit(filters.limit, { fallback: 10, max: 50 });
  const offset = normalizePaginationOffset(filters.offset);
  const { whereSql, params } = buildJobListWhere(userId, filters);
  const total = Number(prepare(`
    SELECT count(*) AS count
    FROM ai_jobs
    ${whereSql};
  `).get(...params)?.count || 0);
  const rows = prepare(`
    SELECT *
    FROM ai_jobs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ?
    OFFSET ?;
  `).all(...params, limit, offset);
  return {
    jobs: rows.map((row) => toPublicJob(row)),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total
  };
}

export async function refreshAIJob(userId, id) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status) && !shouldRefreshTerminalJob(job)) return job;
  if (!job.remoteTaskId) return job;
  if (job.type === "model3d" || job.provider === "tripo") return job;
  const remote = await getApimartTaskStatus(job.remoteTaskId, {
    type: job.type,
    model: job.providerModel
  });
  if (remote.status === "succeeded") {
    return completeAIJob(userId, id, {
      outputs: remote.outputs || [],
      status: "succeeded",
      responseData: { remote }
    });
  }
  if (["failed", "cancelled", "timeout"].includes(remote.status)) {
    return failAIJob(userId, id, {
      status: remote.status,
      errorCode: remote.errorCode || "",
      errorMessage: remote.errorMessage || remote.status,
      responseData: { remote }
    });
  }
  updateAIJobLogData(userId, id, { responseData: { remote } });
  return updateAIJobProgress(userId, id, {
    status: remote.status || "running",
    progress: remote.progress
  });
}

export function scheduleAIJobRefresh(userId, id, { attempts = 180, delayMs = 2000 } = {}) {
  if (!userId || !id) return;
  const key = createJobQueueKey(userId, id);
  scheduleUniqueJob(key, () => runScheduledAIJobRefresh(userId, id, { attempts, delayMs }));
}

async function runScheduledAIJobRefresh(userId, id, { attempts, delayMs }) {
  try {
    for (let index = 0; index < attempts; index += 1) {
      await delay(delayMs);
      const job = await refreshAIJob(userId, id);
      if (!job) return;
      if (TERMINAL_STATUSES.has(job.status) && !shouldRefreshTerminalJob(job)) return;
    }
  } catch (error) {
    console.warn("[ai-jobs] Scheduled refresh failed", { jobId: id, error: error?.message || String(error) });
  }
}

export async function completeAIJob(userId, id, { outputs = [], responseData = null, durationMs = null } = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status) && !shouldCompleteMissingOutputs(job)) return job;
  try {
    const assets = [];
    for (const output of outputs) {
      const asset = await saveJobOutputAsset(userId, job, output);
      if (asset) assets.push(asset);
    }
    if (!assets.length) throw new Error("Generated output could not be saved locally");
    const charge = job.creditsReserved > 0 && job.creditsCharged <= 0
      ? chargeReservedCredits({
        userId,
        reservedAmount: job.creditsReserved,
        chargeAmount: job.creditsReserved,
        provider: job.provider,
        model: job.modelId,
        task: job.type === "video" ? "video_generation" : "image_generation",
        billingType: "fixed",
        reason: "ai_job_succeeded",
        requestId: id,
        aiJobId: id
      })
      : { chargedCredits: job.creditsCharged || 0 };
    return updateAIJobTerminal(userId, id, {
      status: "succeeded",
      progress: 100,
      outputAssetIds: assets.map((asset) => asset.id),
      creditsCharged: charge.chargedCredits || 0,
      responseData,
      durationMs
    });
  } catch (error) {
    return failAIJob(userId, id, {
      status: "save_failed",
      errorCode: "SAVE_FAILED",
      errorMessage: error.message || "Generated output could not be saved locally",
      responseData: responseData || { saveError: serializeErrorForLog(error) },
      durationMs
    });
  }
}

export async function completeModel3DJob(userId, id, {
  outputs = [],
  responseData = null,
  durationMs = null,
  force = false
} = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (!force && TERMINAL_STATUSES.has(job.status) && !shouldCompleteMissingOutputs(job)) return job;
  try {
    const assets = [];
    for (const output of outputs) {
      const asset = await saveJobOutputAsset(userId, { ...job, type: "model3d" }, output);
      if (asset) assets.push(asset);
    }
    if (!assets.length) throw new Error("Generated 3D model could not be saved locally");
    const nextResponseData = {
      ...(responseData || {}),
      outputPersistence: buildOutputPersistenceLog(assets)
    };
    return updateAIJobTerminal(userId, id, {
      status: "succeeded",
      progress: 100,
      outputAssetIds: assets.map((asset) => asset.id),
      creditsCharged: job.creditsCharged || 0,
      responseData: nextResponseData,
      durationMs
    });
  } catch (error) {
    return failModel3DJob(userId, id, {
      status: "save_failed",
      errorCode: "SAVE_FAILED",
      errorMessage: error.message || "Generated 3D model could not be saved locally",
      responseData: responseData || { saveError: serializeErrorForLog(error) },
      durationMs
    });
  }
}

function shouldRefreshTerminalJob(job = {}) {
  return shouldCompleteMissingOutputs(job) && Boolean(job.remoteTaskId);
}

function shouldCompleteMissingOutputs(job = {}) {
  return job.status === "succeeded" && !hasOutputAssets(job);
}

function hasOutputAssets(job = {}) {
  return Array.isArray(job.outputAssetIds) && job.outputAssetIds.length > 0;
}

function summarizeOutputUrlHost(url = "") {
  try {
    return new URL(String(url || "")).host;
  } catch {
    return "";
  }
}

function buildOutputPersistenceLog(assets = []) {
  return Array.from(assets || []).map((asset) => ({
    assetId: asset.id || "",
    type: asset.type || "",
    mode: asset.filePath ? "local" : "remote_fallback",
    urlHost: summarizeOutputUrlHost(asset.url || ""),
    hasLocalFile: Boolean(asset.filePath),
    mimeType: asset.mimeType || "",
    sizeBytes: Number(asset.sizeBytes || 0),
    localSaveError: asset.localSaveError || undefined
  }));
}

function delay(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

export function failAIJob(userId, id, {
  status = "failed",
  errorCode = "",
  errorMessage = "",
  responseData = null,
  durationMs = null
} = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status) && !(status === "save_failed" && shouldCompleteMissingOutputs(job))) return job;
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
      aiJobId: id,
      status: "failed"
    });
  }
  return updateAIJobTerminal(userId, id, {
    status,
    progress: 100,
    errorCode,
    errorMessage,
    responseData,
    durationMs
  });
}

export function failModel3DJob(userId, id, {
  status = "failed",
  errorCode = "",
  errorMessage = "",
  responseData = null,
  durationMs = null,
  refundTodo = true
} = {}) {
  const job = getAIJob(userId, id);
  if (!job) return null;
  if (TERMINAL_STATUSES.has(job.status) && !(status === "save_failed" && shouldCompleteMissingOutputs(job))) return job;
  return updateAIJobTerminal(userId, id, {
    status,
    progress: 100,
    errorCode,
    errorMessage,
    creditsCharged: job.creditsCharged || 0,
    responseData: refundTodo
      ? {
        ...(responseData || {}),
        refundTodo: true,
        refundPolicy: "manual_review"
      }
      : (responseData || {}),
    durationMs
  });
}

export function markAIJobCreditsCharged(userId, id, creditsCharged = 0) {
  const now = Date.now();
  prepare(`
    UPDATE ai_jobs
    SET credits_charged = ?,
        updated_at = ?
    WHERE user_id = ?
      AND id = ?;
  `).run(Math.max(0, Math.ceil(Number(creditsCharged || 0))), now, userId, id);
  return getAIJob(userId, id);
}

export function updateAIJobDispatchResult(userId, id, {
  remoteTaskId = "",
  providerModel = "",
  status = "queued",
  progress = 5,
  responseData = null
} = {}) {
  const now = Date.now();
  prepare(`
    UPDATE ai_jobs
    SET remote_task_id = COALESCE(NULLIF(?, ''), remote_task_id),
        provider_model = COALESCE(NULLIF(?, ''), provider_model),
        status = ?,
        progress = ?,
        response_json = ?,
        updated_at = ?
    WHERE user_id = ?
      AND id = ?;
  `).run(
    remoteTaskId || "",
    providerModel || "",
    status || "queued",
    normalizeProgress(progress),
    stringifyJobLog(responseData || {}),
    now,
    userId,
    id
  );
  return getAIJob(userId, id);
}

export function updateAIJobLogData(userId, id, {
  requestData = null,
  responseData = null,
  durationMs = null
} = {}) {
  const fields = [];
  const params = [];
  const existing = responseData !== null && responseData !== undefined
    ? prepare(`
      SELECT response_json
      FROM ai_jobs
      WHERE user_id = ?
        AND id = ?
      LIMIT 1;
    `).get(userId, id)
    : null;
  if (requestData !== null && requestData !== undefined) {
    fields.push("request_json = ?");
    params.push(stringifyJobLog(requestData));
  }
  if (responseData !== null && responseData !== undefined) {
    fields.push("response_json = ?");
    params.push(stringifyJobLog(mergeJobLog(parseJobLog(existing?.response_json, {}), responseData)));
  }
  if (durationMs !== null && durationMs !== undefined) {
    fields.push("duration_ms = ?");
    params.push(nullableDuration(durationMs));
  }
  if (!fields.length) return getAIJob(userId, id);
  fields.push("updated_at = ?");
  params.push(Date.now(), userId, id);
  prepare(`
    UPDATE ai_jobs
    SET ${fields.join(", ")}
    WHERE user_id = ?
      AND id = ?;
  `).run(...params);
  return getAIJob(userId, id);
}

export function updateAIJobProgress(userId, id, { status = "running", progress = 50 } = {}) {
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
  creditsCharged = 0,
  responseData = null,
  durationMs = null
} = {}) {
  return transaction((db) => {
    const job = db.prepare(`
      SELECT *
      FROM ai_jobs
      WHERE user_id = ?
        AND id = ?
      LIMIT 1;
    `).get(userId, id);
    if (!job) return null;
    const now = Date.now();
    db.prepare(`
      UPDATE ai_jobs
      SET status = ?,
          progress = ?,
          error_code = ?,
          error_message = ?,
          failure_code = ?,
          failure_message = ?,
          credits_charged = ?,
          response_json = ?,
          duration_ms = ?,
          updated_at = ?,
          completed_at = ?
      WHERE user_id = ?
        AND id = ?;
    `).run(
      status,
      normalizeProgress(progress),
      errorCode || "",
      sanitizePromptPreview(errorMessage || "", 160),
      errorCode || "",
      sanitizePromptPreview(errorMessage || "", 160),
      Math.max(0, Math.ceil(Number(creditsCharged || 0))),
      stringifyJobLog(responseData === null || responseData === undefined
        ? parseJobLog(job.response_json, {})
        : mergeJobLog(parseJobLog(job.response_json, {}), responseData)),
      nullableDuration(durationMs ?? (now - Number(job.created_at || now))),
      now,
      now,
      userId,
      id
    );
    if (Array.isArray(outputAssetIds)) {
      db.prepare(`
        DELETE FROM ai_job_assets
        WHERE job_id = ?
          AND direction = 'output';
      `).run(id);
      insertJobAssetLinks(db, {
        jobId: id,
        workspaceId: job.workspace_id,
        userId,
        direction: "output",
        assetIds: outputAssetIds,
        createdAt: now
      });
    }
    return getAIJob(userId, id);
  });
}

async function saveJobOutputAsset(userId, job, output = {}) {
  const url = String(output.url || "").trim();
  const mimeType = String(output.mimeType || defaultMimeTypeForJob(job));
  if (url.startsWith("data:")) {
    return createGeneratedAsset(userId, {
      dataUrl: url,
      type: job.type,
      source: "generated",
      title: defaultTitleForJob(job),
      prompt: job.promptPreview,
      modelName: job.modelId,
      libraryVisible: false
    });
  }
  if (url.startsWith("mock://")) {
    const buffer = Buffer.from(`mock ${job.type || "asset"} output`);
    return createGeneratedAssetFromBuffer(userId, {
      buffer,
      mimeType,
      type: job.type,
      title: defaultTitleForJob(job),
      prompt: job.promptPreview,
      modelName: job.modelId,
      libraryVisible: false
    });
  }
  if (/^https?:\/\//i.test(url)) {
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`Unable to fetch generated output: ${response.status}`);
      const contentType = job.type === "model3d"
        ? mimeType
        : (response.headers.get("content-type") || mimeType);
      const buffer = Buffer.from(await response.arrayBuffer());
      return createGeneratedAssetFromBuffer(userId, {
        buffer,
        mimeType: contentType,
        type: job.type,
        title: defaultTitleForJob(job),
        prompt: job.promptPreview,
        modelName: job.modelId,
        libraryVisible: false
      });
    } catch (error) {
      if (job.type !== "model3d" || output.allowRemoteFallback !== true) throw error;
      const asset = createGeneratedAsset(userId, {
        url,
        type: "model3d",
        source: "generated",
        title: defaultTitleForJob(job),
        mimeType,
        prompt: job.promptPreview,
        modelName: job.modelId,
        libraryVisible: false
      });
      return {
        ...asset,
        localSaveError: serializeErrorForLog(error)
      };
    }
  }
  return null;
}

function defaultMimeTypeForJob(job = {}) {
  if (job.type === "video") return "video/mp4";
  if (job.type === "model3d") return "model/gltf-binary";
  return "image/png";
}

function defaultTitleForJob(job = {}) {
  if (job.type === "video") return "Generated video.mp4";
  if (job.type === "model3d") return "Tripo 3D Model.glb";
  return "Generated image.png";
}

function toPublicJob(row, { includeLog = false } = {}) {
  if (!row) return null;
  const inputAssetIds = getJobAssetIds(row.id, "input");
  const outputAssetIds = getJobAssetIds(row.id, "output");
  const job = {
    id: row.id,
    userId: row.user_id,
    vendor: row.vendor,
    modelId: row.model_id,
    providerModel: row.provider_model,
    type: row.type,
    status: row.status,
    progress: Number(row.progress || 0),
    promptPreview: row.prompt_preview || "",
    inputAssetIds,
    outputAssetIds,
    outputCount: outputAssetIds.length,
    errorCode: row.error_code || "",
    errorMessage: row.error_message || "",
    failureCode: row.failure_code || row.error_code || "",
    failureMessage: row.failure_message || row.error_message || "",
    creditsReserved: Number(row.credits_reserved || 0),
    creditsCharged: Number(row.credits_charged || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    completedAt: row.completed_at ? Number(row.completed_at) : null,
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms || 0),
    provider: row.provider,
    remoteTaskId: row.remote_task_id
  };
  if (includeLog) {
    job.requestData = parseJobLog(row.request_json, {});
    job.responseData = parseJobLog(row.response_json, {});
  }
  return job;
}

function insertJobAssetLinks(db, { jobId, workspaceId, userId, direction, assetIds = [], createdAt = Date.now() } = {}) {
  const ids = Array.isArray(assetIds)
    ? assetIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return;

  const assetExists = db.prepare(`
    SELECT id
    FROM assets
    WHERE id = ?
      AND workspace_id = ?
      AND user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ai_job_assets (
      job_id, asset_id, workspace_id, direction, sort_order, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?);
  `);
  ids.forEach((assetId, index) => {
    if (!assetExists.get(assetId, workspaceId, userId)) return;
    insert.run(jobId, assetId, workspaceId, direction, index, createdAt);
  });
}

function getJobAssetIds(jobId, direction) {
  return prepare(`
    SELECT asset_id
    FROM ai_job_assets
    WHERE job_id = ?
      AND direction = ?
    ORDER BY sort_order ASC, created_at ASC;
  `).all(jobId, direction).map((row) => row.asset_id);
}

function normalizeProgress(value) {
  return Math.max(0, Math.min(100, Math.ceil(Number(value || 0))));
}

function buildJobListWhere(userId, filters = {}) {
  const clauses = ["user_id = ?"];
  const params = [userId];
  const q = String(filters.q || "").trim();
  const type = String(filters.type || "").trim().toLowerCase();
  const status = String(filters.status || "").trim().toLowerCase();
  const dateFrom = parseDateFilter(filters.dateFrom, { endOfDay: false });
  const dateTo = parseDateFilter(filters.dateTo, { endOfDay: true });

  if (q) {
    clauses.push("(id LIKE ? ESCAPE '\\' OR remote_task_id LIKE ? ESCAPE '\\')");
    params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`);
  }
  if (["image", "video", "model3d"].includes(type)) {
    clauses.push("type = ?");
    params.push(type);
  }
  if (TERMINAL_STATUSES.has(status) || ["queued", "running"].includes(status)) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (dateFrom !== null) {
    clauses.push("created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo !== null) {
    clauses.push("created_at <= ?");
    params.push(dateTo);
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params
  };
}

function parseDateFilter(value, { endOfDay = false } = {}) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
    : new Date(text);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function escapeLike(value = "") {
  return String(value).replace(/[\\%_]/g, (match) => `\\${match}`);
}

function nullableDuration(value) {
  if (value === null || value === undefined || value === "") return null;
  const duration = Math.ceil(Number(value || 0));
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function stringifyJobLog(value = {}) {
  try {
    const sanitized = sanitizeJobLogValue(stripLargeInputs(value));
    const json = JSON.stringify(sanitized ?? {});
    if (json.length <= MAX_LOG_JSON_LENGTH) return json;
    return JSON.stringify({
      truncated: true,
      originalLength: json.length,
      preview: json.slice(0, MAX_LOG_JSON_LENGTH)
    });
  } catch (error) {
    return JSON.stringify({
      error: "Unable to serialize job log",
      message: sanitizePromptPreview(error?.message || String(error), 200)
    });
  }
}

function parseJobLog(value, fallback = {}) {
  try {
    if (!value) return fallback;
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function mergeJobLog(existing = {}, next = {}) {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) return next || {};
  if (!next || typeof next !== "object" || Array.isArray(next)) return next || existing;
  return {
    ...existing,
    ...next,
    history: [
      ...(Array.isArray(existing.history) ? existing.history : []),
      {
        at: Date.now(),
        status: next.status || next.remote?.status || "",
        failureCode: next.failureCode || next.remote?.errorCode || "",
        failureMessage: next.failureMessage || next.remote?.errorMessage || ""
      }
    ].filter((item) => item.status || item.failureCode || item.failureMessage)
  };
}

function sanitizeJobLogValue(value, depth = 0) {
  if (depth > 8) return "[max-depth-redacted]";
  if (Array.isArray(value)) return value.slice(0, 60).map((item) => sanitizeJobLogValue(item, depth + 1));
  if (!value || typeof value !== "object") return sanitizeJobLogString(value);
  return Object.fromEntries(
    Object.entries(value).slice(0, 120).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "[secret-redacted]" : sanitizeJobLogValue(item, depth + 1)
    ])
  );
}

function sanitizeJobLogString(value) {
  if (typeof value !== "string") return value;
  if (value.length > 2000) return `${value.slice(0, 2000)}...[truncated:${value.length}]`;
  return value;
}

function serializeErrorForLog(error = {}) {
  return {
    name: error?.name || "Error",
    code: error?.code || "",
    status: error?.status || 500,
    message: error?.message || String(error)
  };
}
