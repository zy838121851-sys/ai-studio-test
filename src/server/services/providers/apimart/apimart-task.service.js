import {
  APIMART_TASK_ENDPOINT,
  requestApimart,
  shouldUseApimartMock
} from "./apimart.client.js";
import { MOCK_IMAGE_DATA_URL } from "./apimart-image.service.js";

export async function getApimartTaskStatus(remoteTaskId, { type = "image", model = "" } = {}) {
  if (shouldUseApimartMock()) {
    return mockTaskStatus(remoteTaskId, { type, model });
  }
  const payload = await requestApimart(`${APIMART_TASK_ENDPOINT}/${encodeURIComponent(remoteTaskId)}?language=zh`);
  return normalizeTaskPayload(payload, { type, model });
}

export function mockTaskStatus(remoteTaskId, { type = "image", model = "" } = {}) {
  const clean = String(remoteTaskId || "");
  if (clean.includes("failed")) {
    return {
      status: "failed",
      progress: 100,
      errorCode: "MOCK_TASK_FAILED",
      errorMessage: "Mock task failed"
    };
  }
  if (clean.includes("cancelled")) {
    return { status: "cancelled", progress: 100 };
  }
  if (clean.includes("running")) {
    return { status: "running", progress: 50 };
  }
  return {
    status: "succeeded",
    progress: 100,
    outputs: type === "video"
      ? [{ url: "mock://video-output", mimeType: "video/mp4", model }]
      : mockImageOutputs(model)
  };
}

function mockImageOutputs(model = "") {
  const count = String(model || "").trim().toLowerCase() === "midjourney" ? 4 : 1;
  return Array.from({ length: count }, () => ({
    url: MOCK_IMAGE_DATA_URL,
    mimeType: "image/png",
    model
  }));
}

function normalizeTaskPayload(payload = {}, { type = "image", model = "" } = {}) {
  const data = payload?.data || payload;
  const status = normalizeRemoteStatus(data?.status || payload?.status);
  const result = data?.result || data?.output || data;
  const images = Array.isArray(result?.images) ? result.images : [];
  const videos = Array.isArray(result?.videos) ? result.videos : [];
  return {
    status,
    progress: status === "succeeded" || status === "failed" ? 100 : Number(data?.progress || 50),
    outputs: (type === "video" ? videos : images)
      .flatMap((item) => extractOutputUrls(item).map((url) => ({
        url,
        mimeType: type === "video" ? "video/mp4" : "image/png",
        model
      })))
      .filter((item) => item.url),
    errorCode: data?.error?.code || data?.error_code || "",
    errorMessage: data?.error?.message || data?.error_message || ""
  };
}

function extractOutputUrls(item) {
  if (typeof item === "string") return [item].filter(Boolean);
  const rawUrl = item?.url || item?.video_url || item?.image_url || "";
  if (Array.isArray(rawUrl)) return rawUrl.map((url) => String(url || "")).filter(Boolean);
  return [String(rawUrl || "")].filter(Boolean);
}

function normalizeRemoteStatus(status = "") {
  const clean = String(status || "").toLowerCase();
  if (clean === "submitted" || clean === "pending") return "queued";
  if (clean === "processing") return "running";
  if (clean === "completed") return "succeeded";
  if (clean === "cancelled") return "cancelled";
  if (clean === "failed") return "failed";
  return clean || "running";
}
