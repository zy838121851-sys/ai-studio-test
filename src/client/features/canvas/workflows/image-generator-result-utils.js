import {
  formatModelUsage
} from "../../ai/model-catalog.js?v=20260627-library-bulk-select-1";

export function getGeneratorResultModel(result = {}, fallbackModel = "") {
  return result?.requestedModel || result?.model || fallbackModel;
}

export function parseGeneratorResult(result = {}, selectedModel = "", expectedType = "image") {
  const urls = getGeneratorResultUrls(result, expectedType);
  return {
    ...getGeneratorResultSummary(result, selectedModel),
    urls,
    primaryUrl: urls[0] || ""
  };
}

export function getResultImageUrls(result = {}) {
  const urls = [];
  if (Array.isArray(result?.imageUrls)) urls.push(...result.imageUrls);
  if (Array.isArray(result?.outputs)) {
    result.outputs.forEach((output) => {
      const type = String(output?.type || "").toLowerCase();
      const mimeType = String(output?.mimeType || output?.mime_type || "").toLowerCase();
      if (output?.url && (type === "image" || mimeType.startsWith("image/") || (!type && !mimeType))) {
        urls.push(output.url);
      }
    });
  }
  if (result?.imageUrl) urls.unshift(result.imageUrl);
  return Array.from(new Set(urls.filter(Boolean)));
}

export function getPrimaryResultImageUrl(result = {}) {
  return getResultImageUrls(result)[0] || "";
}

export function getGeneratorResultUrls(result = {}, expectedType = "image") {
  return expectedType === "video"
    ? getResultVideoUrls(result)
    : getResultImageUrls(result);
}

export function getResultVideoUrls(result = {}) {
  const urls = [];
  if (Array.isArray(result?.videoUrls)) urls.push(...result.videoUrls);
  if (Array.isArray(result?.outputs)) {
    result.outputs.forEach((output) => {
      const type = String(output?.type || "").toLowerCase();
      const mimeType = String(output?.mimeType || output?.mime_type || "").toLowerCase();
      if (output?.url && (type === "video" || mimeType.startsWith("video/"))) {
        urls.push(output.url);
      }
    });
  }
  if (result?.videoUrl) urls.unshift(result.videoUrl);
  return Array.from(new Set(urls.filter(Boolean)));
}

export function getFailedGeneratorJobError(result = {}) {
  return new Error(result?.failureMessage || result?.errorMessage || result?.error || result?.status);
}

export function getMissingGeneratorResultError(result = {}, expectedType = "image") {
  return new Error(getMissingGeneratorResultMessage(result, expectedType));
}

export function getMissingGeneratorResultMessage(result = {}, expectedType = "image") {
  const fallback = expectedType === "video"
    ? "Model returned without a video URL"
    : "Model returned without an image URL";
  const message = String(result?.failureMessage || result?.errorMessage || result?.error || result?.message || fallback).trim();
  const details = [
    result?.jobId ? `jobId=${result.jobId}` : "",
    result?.status ? `status=${result.status}` : ""
  ].filter(Boolean).join(", ");
  return details ? `${message} (${details})` : message;
}

function getGeneratorResultSummary(result = {}, selectedModel = "") {
  const resultModel = getGeneratorResultModel(result, selectedModel);
  warnIfGeneratorModelMismatch(selectedModel, resultModel, result);
  return {
    resultModel,
    modelUsage: formatModelUsage(result, resultModel)
  };
}

function warnIfGeneratorModelMismatch(selectedModel, returnedModel, result = {}) {
  const selected = String(selectedModel || "").trim();
  const returned = String(returnedModel || "").trim();
  if (!selected || !returned || selected === returned) return;
  console.warn("[models] Image generator response model does not match selected model", {
    selectedModel: selected,
    returnedModel: returned,
    jobId: result?.jobId || result?.job?.id || ""
  });
}
