import { randomUUID } from "node:crypto";
import {
  APIMART_VIDEO_ENDPOINT,
  requestApimart,
  shouldUseApimartMock,
  uploadApimartImage
} from "./apimart.client.js";

export async function callApimartVideo({
  model,
  prompt = "",
  images = [],
  videoOptions = {},
  requestId = randomUUID()
} = {}) {
  const useMock = shouldUseApimartMock();
  const references = await normalizeApimartVideoReferenceImages(images, {
    requestId,
    uploadDataUrls: !useMock
  });
  if (useMock) {
    return mockVideoResult({
      model,
      prompt,
      images: references.imageUrls,
      requestId,
      referenceImageNormalization: references.summary
    });
  }

  const body = {
    model,
    prompt,
    ...videoOptions
  };
  if (references.imageUrls.length) body.image_urls = references.imageUrls;
  const payload = await requestApimart(APIMART_VIDEO_ENDPOINT, {
    method: "POST",
    body,
    requestId
  });
  const data = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const taskId = data?.task_id || data?.taskId || payload?.task_id || payload?.taskId;
  if (!taskId) {
    const error = new Error("APIMart video response did not include a task id");
    error.status = 502;
    throw error;
  }
  return {
    taskId,
    remoteTaskId: taskId,
    status: "queued",
    type: "video",
    model,
    referenceCount: references.imageUrls.length,
    referenceImageNormalization: references.summary,
    providerCalls: [providerCall(model, "generateVideo", requestId)]
  };
}

export function mockVideoResult({
  model,
  prompt = "",
  images = [],
  requestId = randomUUID(),
  referenceImageNormalization = null
} = {}) {
  if (String(prompt || "").toLowerCase().includes("mock-apimart-fail")) {
    const error = new Error("Mock APIMart video failure");
    error.status = 502;
    error.code = "MOCK_APIMART_VIDEO_FAILED";
    throw error;
  }
  const remoteTaskId = `remote-video-${randomUUID()}`;
  return {
    taskId: remoteTaskId,
    remoteTaskId,
    status: "queued",
    type: "video",
    model,
    referenceCount: images.length,
    referenceImageNormalization,
    providerCalls: [providerCall(model, "generateVideo", requestId)]
  };
}

export async function normalizeApimartVideoReferenceImages(images = [], {
  requestId = randomUUID(),
  uploadDataUrls = true
} = {}) {
  const refs = Array.isArray(images) ? images.filter(Boolean) : [];
  const imageUrls = [];
  let uploadedCount = 0;
  let passthroughCount = 0;
  let dataUrlCount = 0;
  const sourceTypes = [];

  for (let index = 0; index < refs.length; index += 1) {
    const value = String(refs[index] || "").trim();
    if (!value) continue;
    if (/^data:image\//i.test(value)) {
      dataUrlCount += 1;
      sourceTypes.push("data-url");
      if (uploadDataUrls) {
        try {
          const uploadedUrl = await uploadApimartImage(value, {
            requestId,
            filename: `video-reference-${index + 1}`
          });
          imageUrls.push(uploadedUrl);
          uploadedCount += 1;
        } catch (error) {
          const nextError = new Error(`视频参考图上传失败，请重新上传参考图：${error?.message || String(error)}`);
          nextError.status = error?.status || 502;
          nextError.code = error?.code || "APIMART_VIDEO_REFERENCE_UPLOAD_FAILED";
          throw nextError;
        }
      } else {
        imageUrls.push(`mock://video-reference-${index + 1}`);
        uploadedCount += 1;
      }
      continue;
    }
    if (/^https?:\/\//i.test(value)) {
      imageUrls.push(value);
      passthroughCount += 1;
      sourceTypes.push("url");
      continue;
    }
    if (/^asset:\/\//i.test(value)) {
      imageUrls.push(value);
      passthroughCount += 1;
      sourceTypes.push("asset");
      continue;
    }
    const error = new Error("视频参考图格式无效，请重新上传参考图");
    error.status = 400;
    error.code = "INVALID_VIDEO_REFERENCE_IMAGE";
    throw error;
  }

  return {
    imageUrls,
    summary: {
      originalCount: refs.length,
      finalUrlCount: imageUrls.length,
      dataUrlCount,
      uploadedCount,
      passthroughCount,
      sourceTypes
    }
  };
}

function providerCall(model, operation, requestId) {
  return {
    provider: "apimart",
    model,
    operation,
    endpoint: APIMART_VIDEO_ENDPOINT,
    requestId
  };
}
