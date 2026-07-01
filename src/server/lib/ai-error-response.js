import { toClientJob } from "./ai-response-dto.js";

export function buildAIErrorResponseBody(failure = {}, errorJob = null) {
  return {
    message: failure.failureMessage,
    errorCode: failure.failureCode,
    errorMessage: failure.failureMessage,
    failureCode: failure.failureCode,
    failureMessage: failure.failureMessage,
    stage: failure.stage,
    ...(errorJob ? { job: toClientJob(errorJob), jobId: errorJob.id } : {})
  };
}

export function toClientFailure(job = {}, fallbackCode = "AI_JOB_FAILED") {
  const failureCode = job?.failureCode || job?.errorCode || fallbackCode;
  const failureMessage = job?.failureMessage || job?.errorMessage || "AI job failed";
  return {
    errorCode: job?.errorCode || failureCode,
    errorMessage: job?.errorMessage || failureMessage,
    failureCode,
    failureMessage
  };
}

export function classifyAIError(error = {}, { path = "" } = {}) {
  const status = Number(error.status || 500);
  const message = error.message || "AI request failed";
  const rawCode = String(error.code || "").trim();
  if (status === 401) return { failureCode: "LOGIN_REQUIRED", failureMessage: message, stage: "auth" };
  if (status === 402 || rawCode === "INSUFFICIENT_CREDITS") {
    return { failureCode: "INSUFFICIENT_CREDITS", failureMessage: message, stage: "billing" };
  }
  if (status === 404) {
    return {
      failureCode: String(path).includes("/ai/jobs/") ? "JOB_NOT_FOUND" : "PROJECT_NOT_FOUND",
      failureMessage: message,
      stage: String(path).includes("/ai/jobs/") ? "jobPoll" : "conversation"
    };
  }
  if (status === 400) return { failureCode: rawCode || "INVALID_REQUEST", failureMessage: message, stage: "request" };
  if (/timeout|timed out/i.test(message)) return { failureCode: rawCode || "JOB_TIMEOUT", failureMessage: message, stage: "jobPoll" };
  if (/save|output/i.test(message)) return { failureCode: rawCode || "OUTPUT_SAVE_FAILED", failureMessage: message, stage: "outputPersist" };
  return { failureCode: rawCode || "PROVIDER_FAILED", failureMessage: message, stage: "provider" };
}
