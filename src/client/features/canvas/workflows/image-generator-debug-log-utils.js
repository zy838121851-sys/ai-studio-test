import {
  getResultImageUrls,
  getResultVideoUrls
} from "./image-generator-result-utils.js";

export function isLocalGeneratorDebugHost(hostname = globalThis.location?.hostname || "") {
  return ["localhost", "127.0.0.1"].includes(hostname || "");
}

export function buildSubmittedGeneratorModelLog(model = "") {
  return {
    surface: "generator",
    selectedModel: model,
    payloadModel: model
  };
}

export function buildGeneratorJobPollLog(payload = {}) {
  return {
    jobId: payload.jobId || payload.job?.id || "",
    remoteTaskId: payload.remoteTaskId || payload.job?.remoteTaskId || "",
    status: payload.status || payload.job?.status || "",
    progress: payload.progress || payload.job?.progress || 0,
    imageUrls: getResultImageUrls(payload),
    videoUrls: getResultVideoUrls(payload),
    outputCount: payload.outputCount ?? payload.outputs?.length ?? 0,
    updatedAt: payload.updatedAt || payload.job?.updatedAt || ""
  };
}

export function logSubmittedGeneratorModel(model, {
  hostname = globalThis.location?.hostname || "",
  logger = console
} = {}) {
  if (!isLocalGeneratorDebugHost(hostname)) return false;
  logger.debug?.("[models] submitting generation", buildSubmittedGeneratorModelLog(model));
  return true;
}

export function logGeneratorJobPoll(payload = {}, {
  hostname = globalThis.location?.hostname || "",
  logger = console
} = {}) {
  if (!isLocalGeneratorDebugHost(hostname)) return false;
  logger.debug?.("[generator] job poll", buildGeneratorJobPollLog(payload));
  return true;
}
