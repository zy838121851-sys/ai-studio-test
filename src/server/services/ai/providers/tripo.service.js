import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { env } from "../../../config/env.js";
import { createHttpError } from "../../../lib/input-validation.js";

const TEXT_TO_MODEL_ENDPOINT = "/generation/text-to-model";
const IMAGE_TO_MODEL_ENDPOINT = "/generation/image-to-model";
const FILE_UPLOAD_ENDPOINT = "/files";
const TASK_ENDPOINT = "/tasks";
const VALID_TRIPO_MODELS = new Set([
  "P1-20260311",
  "v2.5-20250123",
  "v3.0-20250812",
  "v3.1-20260211"
]);

export async function createTextToModelTask({
  prompt = "",
  apiModel = env.tripoDefaultModel,
  texture = true,
  defaultParams = {},
  requestId = randomUUID()
} = {}) {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) {
    const error = createHttpError("Missing prompt", 400);
    error.code = "TRIPO_PROMPT_REQUIRED";
    throw error;
  }
  const model = normalizeTripoModel(apiModel || env.tripoDefaultModel);
  const payload = await requestTripo(TEXT_TO_MODEL_ENDPOINT, {
    method: "POST",
    requestId,
    body: {
      model,
      prompt: cleanPrompt,
      texture: Boolean(texture),
      pbr: true,
      texture_quality: "detailed",
      export_uv: false,
      ...sanitizeDefaultParams(defaultParams)
    }
  });
  return {
    ...normalizeCreatedTask(payload),
    providerModel: model,
    inputType: "prompt"
  };
}

export async function createImageToModelTask({
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = "",
  apiModel = env.tripoDefaultModel,
  texture = true,
  defaultParams = {},
  requestId = randomUUID()
} = {}) {
  const model = normalizeTripoModel(apiModel || env.tripoDefaultModel);
  const input = await normalizeTripoImageInput({
    imageUrl,
    imageDataUrl,
    imageName,
    imageMimeType,
    requestId
  });
  const payload = await requestTripo(IMAGE_TO_MODEL_ENDPOINT, {
    method: "POST",
    requestId,
    body: {
      input: input.value,
      model,
      texture: Boolean(texture),
      pbr: true,
      texture_quality: "detailed",
      export_uv: false,
      ...sanitizeDefaultParams(defaultParams)
    }
  });
  return {
    ...normalizeCreatedTask(payload),
    providerModel: model,
    inputType: input.type,
    inputSummary: input.summary
  };
}

export async function getTask(taskId, { requestId = randomUUID() } = {}) {
  const id = String(taskId || "").trim();
  if (!id) {
    const error = createHttpError("Missing Tripo task id", 400);
    error.code = "TRIPO_TASK_ID_REQUIRED";
    throw error;
  }
  const payload = await requestTripo(`${TASK_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: "GET",
    requestId
  });
  return normalizeTask(payload, id);
}

export async function downloadModelIfNeeded(modelUrl, taskId, {
  timeoutMs = 60000
} = {}) {
  const url = String(modelUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const error = createHttpError(`Unable to download Tripo model: ${response.status}`, 502);
    error.code = "TRIPO_MODEL_DOWNLOAD_FAILED";
    throw error;
  }
  const contentType = response.headers.get("content-type") || guessModelMimeType(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    taskId: String(taskId || ""),
    url,
    buffer,
    mimeType: contentType,
    byteLength: buffer.length
  };
}

async function requestTripo(path, {
  method = "GET",
  body = null,
  requestId = randomUUID(),
  timeoutMs = 45000
} = {}) {
  if (!env.tripoApiKey) {
    const error = createHttpError("Tripo API key is not configured", 503);
    error.code = "TRIPO_KEY_MISSING";
    throw error;
  }
  const url = `${String(env.tripoBaseUrl || "").replace(/\/+$/, "")}${path}`;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.tripoApiKey}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "X-Request-ID": requestId
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || Number(payload?.code || 0) >= 400) {
    const error = createHttpError(payload?.message || payload?.error?.message || `Tripo request failed: ${response.status}`, response.status || 502);
    error.code = payload?.code || payload?.error?.code || "TRIPO_REQUEST_FAILED";
    error.providerPayload = payload;
    throw error;
  }
  return payload;
}

async function uploadTripoImage(dataUrl, {
  filename = "reference.png",
  requestId = randomUUID(),
  timeoutMs = 45000
} = {}) {
  const upload = dataUrlToImageUpload(dataUrl, filename);
  const form = new FormData();
  form.append("file", new Blob([upload.buffer], { type: upload.mimeType }), upload.filename);
  const payload = await requestTripo(FILE_UPLOAD_ENDPOINT, {
    method: "POST",
    requestId,
    body: form,
    timeoutMs
  });
  const token = extractFileToken(payload);
  if (!token) {
    const error = createHttpError("Tripo upload did not return a file token", 502);
    error.code = "TRIPO_FILE_TOKEN_MISSING";
    error.providerPayload = payload;
    throw error;
  }
  return {
    fileToken: token,
    mimeType: upload.mimeType,
    byteLength: upload.buffer.length,
    filename: upload.filename,
    raw: summarizeTripoPayload(payload)
  };
}

async function normalizeTripoImageInput({
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = "",
  requestId = randomUUID()
} = {}) {
  const cleanUrl = String(imageUrl || "").trim();
  if (/^https?:\/\//i.test(cleanUrl)) {
    return {
      value: cleanUrl,
      type: "url",
      summary: summarizeInputValue(cleanUrl)
    };
  }
  if (/^(file_token:)?[A-Za-z0-9_-]{10,}$/i.test(cleanUrl)) {
    const token = cleanUrl.replace(/^file_token:/i, "");
    return {
      value: token,
      type: "file_token",
      summary: "[file_token]"
    };
  }
  const cleanDataUrl = String(imageDataUrl || "").trim();
  if (cleanDataUrl.startsWith("data:image/")) {
    const uploaded = await uploadTripoImage(cleanDataUrl, {
      filename: imageName || `tripo-reference-${Date.now()}`,
      requestId
    });
    return {
      value: uploaded.fileToken,
      type: "file_token",
      summary: {
        source: "data-url",
        mimeType: uploaded.mimeType || imageMimeType || "",
        byteLength: uploaded.byteLength || 0
      }
    };
  }
  const error = createHttpError("Invalid 3D reference image. Use an http/https URL, Tripo file token, or image data URL.", 400);
  error.code = "TRIPO_IMAGE_INPUT_REQUIRED";
  throw error;
}

function normalizeCreatedTask(payload = {}) {
  const data = getPayloadData(payload);
  const taskId = String(
    data?.task_id
      || data?.taskId
      || payload?.task_id
      || payload?.taskId
      || ""
  ).trim();
  if (!taskId) {
    const error = createHttpError("Tripo did not return a task id", 502);
    error.code = "TRIPO_TASK_ID_MISSING";
    error.providerPayload = payload;
    throw error;
  }
  return {
    provider: "tripo",
    taskId,
    status: mapTripoStatus(data?.status || payload?.status || "queued"),
    raw: summarizeTripoPayload(payload)
  };
}

function normalizeTripoModel(value = "") {
  const model = String(value || env.tripoDefaultModel || "").trim();
  if (VALID_TRIPO_MODELS.has(model)) return model;
  const error = createHttpError(`Invalid Tripo model '${model}'. Allowed values: ${Array.from(VALID_TRIPO_MODELS).join(", ")}`, 400);
  error.code = "TRIPO_INVALID_MODEL";
  throw error;
}

function normalizeTask(payload = {}, fallbackTaskId = "") {
  const data = getPayloadData(payload);
  const output = data?.output || payload?.output || {};
  const status = mapTripoStatus(data?.status || payload?.status || "");
  return {
    provider: "tripo",
    taskId: String(data?.task_id || data?.taskId || payload?.task_id || payload?.taskId || fallbackTaskId || ""),
    status,
    progress: normalizeProgress(data?.progress ?? payload?.progress, status),
    modelUrl: String(output?.model_url || output?.modelUrl || data?.model_url || data?.modelUrl || ""),
    renderedImageUrl: String(output?.rendered_image_url || output?.renderedImageUrl || data?.rendered_image_url || data?.renderedImageUrl || ""),
    errorCode: String(data?.error_code || data?.errorCode || payload?.error_code || payload?.errorCode || ""),
    errorMessage: String(data?.error_message || data?.errorMessage || payload?.message || ""),
    raw: summarizeTripoPayload(payload)
  };
}

function getPayloadData(payload = {}) {
  return Array.isArray(payload?.data) ? payload.data[0] : (payload?.data || payload);
}

function mapTripoStatus(status = "") {
  const clean = String(status || "").trim().toLowerCase();
  if (["success", "succeeded", "completed", "done"].includes(clean)) return "success";
  if (["failed", "failure", "error"].includes(clean)) return "failed";
  if (["cancelled", "canceled"].includes(clean)) return "cancelled";
  if (clean === "banned") return "banned";
  if (["running", "processing", "in_progress"].includes(clean)) return "running";
  return clean || "queued";
}

function normalizeProgress(value, status) {
  const number = Number(value);
  if (Number.isFinite(number)) return Math.max(0, Math.min(100, Math.round(number)));
  if (status === "success") return 100;
  if (status === "failed" || status === "cancelled" || status === "banned") return 100;
  if (status === "running") return 50;
  return 0;
}

function sanitizeDefaultParams(defaultParams = {}) {
  const allowed = {};
  if (Number(defaultParams.face_limit) > 0) allowed.face_limit = Number(defaultParams.face_limit);
  return allowed;
}

function dataUrlToImageUpload(dataUrl = "", filename = "reference.png") {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (!match) {
    const error = createHttpError("Only image data URLs can be uploaded to Tripo", 400);
    error.code = "TRIPO_IMAGE_DATA_URL_REQUIRED";
    throw error;
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    const error = createHttpError("Reference image is empty", 400);
    error.code = "TRIPO_IMAGE_EMPTY";
    throw error;
  }
  return {
    buffer,
    mimeType,
    filename: safeUploadFilename(filename, mimeType)
  };
}

function safeUploadFilename(filename = "", mimeType = "") {
  const clean = String(filename || "reference").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = extensionForMime(mimeType);
  if (clean.toLowerCase().endsWith(ext)) return clean;
  return `${clean || "reference"}${ext}`;
}

function extensionForMime(mimeType = "") {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".png";
}

function extractFileToken(payload = {}) {
  const data = getPayloadData(payload);
  return String(
    data?.file_token
      || data?.fileToken
      || data?.token
      || payload?.file_token
      || payload?.fileToken
      || payload?.token
      || ""
  ).trim();
}

function summarizeInputValue(value = "") {
  const text = String(value || "");
  return text.length > 180 ? `${text.slice(0, 120)}...` : text;
}

function summarizeTripoPayload(payload = {}) {
  return redactUrls(payload);
}

function redactUrls(value) {
  if (Array.isArray(value)) return value.map(redactUrls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/authorization|api[_-]?key|token|secret|cookie/i.test(key)) return [key, "[redacted]"];
    if (typeof item === "string" && /^https?:\/\//i.test(item) && item.length > 180) {
      return [key, `${item.slice(0, 120)}...`];
    }
    return [key, redactUrls(item)];
  }));
}

function guessModelMimeType(url = "") {
  const clean = String(url || "").split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".gltf")) return "model/gltf+json";
  return "model/gltf-binary";
}
