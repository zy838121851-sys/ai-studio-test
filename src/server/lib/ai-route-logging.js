import { logInfo } from "./logger.js";

export function logAIProviderRoute({ requestedModel, provider, providerModel, referenceCount } = {}, options = {}) {
  logAIModelRoute({
    route: "/api/chat",
    requestedModel,
    providerModel,
    provider,
    type: "image",
    referenceCount
  }, options);
}

export function logAIModelRoute({
  route = "",
  requestedModel = "",
  provider = "apimart",
  providerModel = "",
  remoteTaskId = "",
  type = "image",
  referenceCount = 0
} = {}, {
  nodeEnv = process.env.NODE_ENV || "development",
  logger = logInfo
} = {}) {
  if (nodeEnv !== "development") return;
  logger("AI model route", {
    route,
    requestedModel,
    provider,
    providerModel,
    remoteTaskId,
    type,
    referenceCount: Number(referenceCount || 0)
  });
}
