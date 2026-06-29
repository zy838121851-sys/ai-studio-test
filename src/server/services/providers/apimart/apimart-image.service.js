import { randomUUID } from "node:crypto";
import {
  APIMART_IMAGE_ENDPOINT,
  APIMART_MIDJOURNEY_IMAGE_ENDPOINT,
  requestApimart,
  shouldUseApimartMock,
  uploadApimartImage
} from "./apimart.client.js";
import { normalizeApimartImageSize } from "../../image-size-normalization.service.js";

const MOCK_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export async function callApimartImage({
  model,
  prompt = "",
  images = [],
  size = "1024*1024",
  requestId = randomUUID(),
  operation = "generateImage",
  extraBody = null,
  sizeNormalization = null
} = {}) {
  const resolvedSizeNormalization = resolveApimartSizeNormalization({
    model,
    size,
    sizeNormalization
  });
  if (shouldUseApimartMock()) {
    return mockImageResult({ model, prompt, images, requestId, operation, sizeNormalization: resolvedSizeNormalization });
  }

  const imageOptions = toApimartImageOptions(resolvedSizeNormalization);
  if (isMidjourneyModel(model)) {
    const imageUrls = await normalizeMidjourneyReferenceImages(images, { requestId });
    const body = {
      prompt: String(prompt || "").trim(),
      size: imageOptions.size
    };
    if (imageUrls.length) body.image_urls = imageUrls;
    const payload = await requestApimart(APIMART_MIDJOURNEY_IMAGE_ENDPOINT, {
      method: "POST",
      body,
      requestId
    });
    return normalizeImageResponse(payload, {
      model,
      images,
      requestId,
      endpoint: APIMART_MIDJOURNEY_IMAGE_ENDPOINT,
      sizeNormalization: resolvedSizeNormalization
    });
  }

  const body = {
    model,
    prompt,
    size: imageOptions.size,
    n: 1,
    ...(extraBody && typeof extraBody === "object" ? extraBody : {})
  };
  if (imageOptions.resolution) body.resolution = imageOptions.resolution;
  if (images.length) body.image_urls = images;

  const payload = await requestApimart(APIMART_IMAGE_ENDPOINT, {
    method: "POST",
    body,
    requestId
  });
  return normalizeImageResponse(payload, {
    model,
    images,
    requestId,
    endpoint: APIMART_IMAGE_ENDPOINT,
    operation,
    sizeNormalization: resolvedSizeNormalization
  });
}

export async function callApimartImageEdit({
  model = "qwen-image-edit-plus",
  prompt = "",
  images = [],
  size = "1024*1024",
  requestId
} = {}) {
  return callApimartImage({
    model,
    prompt,
    images,
    size,
    requestId,
    operation: "editImage"
  });
}

export async function callApimartImageExpand({
  model = "wan2.7-image-pro",
  image,
  prompt = "",
  requestId
} = {}) {
  return callApimartImage({
    model,
    prompt,
    images: [image].filter(Boolean),
    size: "2K",
    requestId,
    operation: "expandImage"
  });
}

export async function callApimartSuperResolution({
  image,
  prompt = "",
  upscaleFactor,
  requestId
} = {}) {
  const upscale = Math.max(1, Math.min(4, Math.ceil(Number(upscaleFactor || 1))));
  return callApimartImage({
    model: "wanx2.1-imageedit",
    prompt,
    images: [image].filter(Boolean),
    size: "auto",
    requestId,
    operation: "superResolutionImage",
    extraBody: {
      function: "super_resolution",
      parameters: {
        upscale_factor: upscale
      }
    }
  });
}

function isMidjourneyModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
}

function resolveApimartSizeNormalization({ model, size, sizeNormalization } = {}) {
  if (sizeNormalization?.providerSize) return sizeNormalization;
  return normalizeApimartImageSize({
    modelId: model,
    providerModel: model,
    size,
    defaultSize: "1024*1024"
  });
}

function toApimartImageOptions(sizeNormalization = {}) {
  return {
    size: sizeNormalization.providerSize || "auto",
    resolution: sizeNormalization.providerResolution || ""
  };
}

async function normalizeMidjourneyReferenceImages(images = [], { requestId } = {}) {
  const refs = Array.isArray(images) ? images.filter(Boolean) : [];
  const output = [];
  for (let index = 0; index < refs.length; index += 1) {
    const value = String(refs[index] || "").trim();
    if (!value) continue;
    if (/^data:image\//i.test(value)) {
      const uploadedUrl = await uploadApimartImage(value, {
        requestId,
        filename: `midjourney-reference-${index + 1}`
      });
      output.push(uploadedUrl);
      continue;
    }
    output.push(value);
  }
  return output;
}

export function mockImageResult({
  model,
  prompt = "",
  images = [],
  requestId = randomUUID(),
  operation = "generateImage",
  sizeNormalization = null
} = {}) {
  const cleanPrompt = String(prompt || "").toLowerCase();
  if (cleanPrompt.includes("mock-apimart-fail")) {
    const error = new Error("Mock APIMart image failure");
    error.status = 502;
    error.code = "MOCK_APIMART_IMAGE_FAILED";
    throw error;
  }
  if (cleanPrompt.includes("mock-apimart-still-running")) {
    const remoteTaskId = `remote-image-running-${randomUUID()}`;
    return {
      taskId: remoteTaskId,
      remoteTaskId,
      status: "running",
      type: "image",
      model,
      referenceCount: images.length,
      sizeNormalization,
      providerCalls: [providerCall(model, operation, requestId)]
    };
  }
  if (cleanPrompt.includes("mock-apimart-pending")) {
    const remoteTaskId = `remote-image-${randomUUID()}`;
    return {
      taskId: remoteTaskId,
      remoteTaskId,
      status: "queued",
      type: "image",
      model,
      referenceCount: images.length,
      sizeNormalization,
      providerCalls: [providerCall(model, operation, requestId)]
    };
  }
  if (cleanPrompt.includes("mock-apimart-task-no-url")) {
    const remoteTaskId = `remote-image-${randomUUID()}`;
    return {
      taskId: remoteTaskId,
      remoteTaskId,
      status: "succeeded",
      type: "image",
      model,
      referenceCount: images.length,
      sizeNormalization,
      providerCalls: [providerCall(model, operation, requestId)]
    };
  }
  if (cleanPrompt.includes("mock-apimart-task")) {
    const remoteTaskId = `remote-image-${randomUUID()}`;
    return {
      taskId: remoteTaskId,
      remoteTaskId,
      status: "succeeded",
      type: "image",
      imageUrl: MOCK_IMAGE_DATA_URL,
      model,
      referenceCount: images.length,
      sizeNormalization,
      providerCalls: [providerCall(model, operation, requestId)]
    };
  }
  return {
    imageUrl: MOCK_IMAGE_DATA_URL,
    model,
    referenceCount: images.length,
    sizeNormalization,
    providerCalls: [providerCall(model, operation, requestId)]
  };
}

function normalizeImageResponse(payload = {}, {
  model,
  images = [],
  requestId,
  endpoint = APIMART_IMAGE_ENDPOINT,
  operation = "generateImage",
  sizeNormalization = null
} = {}) {
  const data = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const taskId = data?.task_id || data?.taskId || payload?.task_id || payload?.taskId;
  const imageUrl = extractImageUrl(data?.url || data?.image_url || data?.imageUrl || data?.images?.[0]?.url || payload?.imageUrl);
  if (taskId && !imageUrl) {
    return {
      taskId,
      remoteTaskId: taskId,
      status: normalizeRemoteStatus(data?.status || payload?.status || "queued"),
      type: "image",
      model,
      referenceCount: images.length,
      sizeNormalization,
      providerCalls: [providerCall(model, operation, requestId, endpoint)]
    };
  }
  return {
    imageUrl,
    model,
    referenceCount: images.length,
    sizeNormalization,
    providerCalls: [providerCall(model, operation, requestId, endpoint)]
  };
}

function extractImageUrl(value) {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

function normalizeRemoteStatus(status = "") {
  const clean = String(status || "").toLowerCase();
  if (clean === "submitted" || clean === "pending") return "queued";
  if (clean === "processing") return "running";
  if (clean === "completed") return "succeeded";
  if (clean === "cancelled") return "cancelled";
  if (clean === "failed") return "failed";
  return clean || "queued";
}

function providerCall(model, operation, requestId, endpoint = APIMART_IMAGE_ENDPOINT) {
  return {
    provider: "apimart",
    model,
    operation,
    endpoint,
    requestId
  };
}

export { MOCK_IMAGE_DATA_URL };
