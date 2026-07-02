export function classifyGenerationClientError(error = {}, debugRecord = {}) {
  const status = Number(error.status || 0);
  const message = error.failureMessage || error.errorMessage || error.message || String(error);
  const explicitCode = error.failureCode || error.errorCode || "";
  if (
    explicitCode === "REFERENCE_ATTACHMENT_UNREADABLE"
    || /Chat preview attachments|reference image|参考图读取失败/i.test(message)
  ) {
    return buildClientFailure("REFERENCE_ATTACHMENT_UNREADABLE", "参考图读取失败，请重新上传参考图。", "attachments");
  }
  if (status === 401) return buildClientFailure("LOGIN_REQUIRED", message, "auth");
  if (status === 402 || explicitCode === "INSUFFICIENT_CREDITS") {
    return buildClientFailure("INSUFFICIENT_CREDITS", message, "billing");
  }
  if (status === 404 || /Project not found|Conversation request failed: 404/i.test(message)) {
    return buildClientFailure(explicitCode || "PROJECT_NOT_FOUND", message, "conversation");
  }
  if (/项目保存失败|Project save|save current project|无法开始生成/i.test(message)) {
    return buildClientFailure(explicitCode || "PROJECT_SAVE_FAILED", message, "saveProject");
  }
  if (/still running|timeout|timed out/i.test(message)) {
    return buildClientFailure(explicitCode || "JOB_TIMEOUT", message, "jobPoll");
  }
  if (/output|save_failed|save failed|保存/i.test(message)) {
    return buildClientFailure(explicitCode || "OUTPUT_SAVE_FAILED", message, "outputPersist");
  }
  if (debugRecord?.generateRequestStarted) {
    return buildClientFailure(explicitCode || "PROVIDER_FAILED", message, error.stage || "generateRequest");
  }
  return buildClientFailure(explicitCode || "CONVERSATION_FAILED", message, error.stage || debugRecord?.generationStage || "conversation");
}

export function buildClientFailure(failureCode, failureMessage, stage) {
  return { failureCode, failureMessage, stage };
}
