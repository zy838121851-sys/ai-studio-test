import { randomUUID } from "node:crypto";
import {
  APIMART_VIDEO_ENDPOINT,
  requestApimart,
  shouldUseApimartMock
} from "./apimart.client.js";

export async function callApimartVideo({
  model,
  prompt = "",
  images = [],
  videoOptions = {},
  requestId = randomUUID()
} = {}) {
  if (shouldUseApimartMock()) {
    return mockVideoResult({ model, prompt, images, requestId });
  }

  const body = {
    model,
    prompt,
    ...videoOptions
  };
  if (images.length) body.image_urls = images;
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
    referenceCount: images.length,
    providerCalls: [providerCall(model, "generateVideo", requestId)]
  };
}

export function mockVideoResult({ model, prompt = "", images = [], requestId = randomUUID() } = {}) {
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
    providerCalls: [providerCall(model, "generateVideo", requestId)]
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
