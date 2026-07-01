import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { env } from "../../../config/env.js";
import { createHttpError } from "../../../lib/input-validation.js";

export const APIMART_IMAGE_ENDPOINT = "/images/generations";
export const APIMART_MIDJOURNEY_IMAGE_ENDPOINT = "/midjourney/generations";
export const APIMART_IMAGE_UPLOAD_ENDPOINT = "/uploads/images";
export const APIMART_VIDEO_ENDPOINT = "/videos/generations";
export const APIMART_TASK_ENDPOINT = "/tasks";

export function shouldUseApimartMock() {
  return env.apimartMock || !env.apimartApiKey;
}

export async function requestApimart(path, {
  method = "GET",
  body = null,
  timeoutMs = 30000,
  requestId = randomUUID(),
  retries = 2
} = {}) {
  if (!env.apimartApiKey) {
    const error = createHttpError("APIMart API key is not configured", 503);
    error.code = "APIMART_KEY_MISSING";
    throw error;
  }
  const url = `${String(env.apimartBaseUrl || "").replace(/\/+$/, "")}${path}`;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${env.apimartApiKey}`,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.code >= 400) {
        const error = createHttpError(payload?.message || payload?.error?.message || `APIMart request failed: ${response.status}`, response.status || 502);
        error.code = payload?.code || payload?.error?.code || "APIMART_REQUEST_FAILED";
        if (attempt < retries && isRetryableApimartError(error)) {
          lastError = error;
          await delay(backoffDelayMs(attempt));
          continue;
        }
        throw error;
      }
      return payload;
    } catch (error) {
      if (attempt < retries && isRetryableApimartError(error)) {
        lastError = error;
        await delay(backoffDelayMs(attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("APIMart request failed");
}

export async function uploadApimartImage(dataUrl, {
  timeoutMs = 30000,
  requestId = randomUUID(),
  retries = 2,
  filename = "reference.png"
} = {}) {
  if (!env.apimartApiKey) {
    const error = createHttpError("APIMart API key is not configured", 503);
    error.code = "APIMART_KEY_MISSING";
    throw error;
  }

  const upload = dataUrlToImageUpload(dataUrl, filename);
  const url = `${String(env.apimartBaseUrl || "").replace(/\/+$/, "")}${APIMART_IMAGE_UPLOAD_ENDPOINT}`;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const form = new FormData();
      form.append("file", upload.blob, upload.filename);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.apimartApiKey}`,
          "X-Request-ID": requestId
        },
        body: form,
        signal: AbortSignal.timeout(timeoutMs)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.code >= 400) {
        const error = createHttpError(payload?.message || payload?.error?.message || `APIMart upload failed: ${response.status}`, response.status || 502);
        error.code = payload?.code || payload?.error?.code || "APIMART_UPLOAD_FAILED";
        if (attempt < retries && isRetryableApimartError(error)) {
          lastError = error;
          await delay(backoffDelayMs(attempt));
          continue;
        }
        throw error;
      }
      const uploadedUrl = extractUploadedImageUrl(payload);
      if (!uploadedUrl) {
        const error = createHttpError("APIMart upload did not return an image URL", 502);
        error.code = "APIMART_UPLOAD_URL_MISSING";
        throw error;
      }
      return uploadedUrl;
    } catch (error) {
      if (attempt < retries && isRetryableApimartError(error)) {
        lastError = error;
        await delay(backoffDelayMs(attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("APIMart upload failed");
}

export function sanitizePromptPreview(prompt = "", maxLength = 100) {
  const text = String(prompt || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function stripLargeInputs(value) {
  if (Array.isArray(value)) return value.map(stripLargeInputs);
  if (!value || typeof value !== "object") return redactString(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, stripLargeInputs(item)])
  );
}

function redactString(value) {
  const text = typeof value === "string" ? value : "";
  if (/^data:/i.test(text)) return "[data-url-redacted]";
  if (/^https?:/i.test(text) && /video|tmp|task|output/i.test(text)) return "[remote-url-redacted]";
  return value;
}

function dataUrlToImageUpload(dataUrl, filename) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (!match) {
    const error = createHttpError("Only image data URLs can be uploaded to APIMart", 400);
    error.code = "APIMART_UPLOAD_INVALID_DATA_URL";
    throw error;
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extension = extensionForMimeType(mimeType);
  return {
    blob: new Blob([buffer], { type: mimeType }),
    filename: withImageExtension(filename, extension)
  };
}

function withImageExtension(filename, extension) {
  const clean = String(filename || "reference").replace(/[\\/:*?"<>|]+/g, "-").trim() || "reference";
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}.${extension}`;
}

function extensionForMimeType(mimeType) {
  const clean = String(mimeType || "").toLowerCase();
  if (clean.includes("jpeg") || clean.includes("jpg")) return "jpg";
  if (clean.includes("webp")) return "webp";
  if (clean.includes("gif")) return "gif";
  return "png";
}

function extractUploadedImageUrl(payload = {}) {
  const data = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  return String(payload?.url || data?.url || payload?.image_url || data?.image_url || "");
}

function isRetryableApimartError(error = {}) {
  const status = Number(error.status || 0);
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  const message = String(error.message || "").toLowerCase();
  return /please wait|try again|temporar|busy|rate|upgrade|later|timeout/.test(message);
}

function backoffDelayMs(attempt) {
  return 800 * (2 ** Math.max(0, attempt));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
