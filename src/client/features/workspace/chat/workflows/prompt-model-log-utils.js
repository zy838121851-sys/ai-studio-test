export function warnIfModelMismatch(selectedModel, returnedModel, result = {}) {
  const selected = String(selectedModel || "").trim();
  const returned = String(returnedModel || "").trim();
  if (!selected || !returned || selected === returned) return;
  console.warn("[models] Response model does not match selected model", {
    selectedModel: selected,
    returnedModel: returned,
    jobId: result?.jobId || result?.job?.id || ""
  });
}

export function logSubmittedModel(surface, model) {
  if (!["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "")) return;
  console.debug("[models] submitting generation", {
    surface,
    selectedModel: model,
    payloadModel: model
  });
}
