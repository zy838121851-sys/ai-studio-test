export function inferSubmitTriggerSource(event, form) {
  const submitter = event?.submitter || null;
  if (submitter?.id === "promptSubmit" || submitter?.classList?.contains("send")) return "send-button";
  if (submitter?.id === "presetSkill" || submitter?.closest?.("#presetSkill")) return "skill-button";
  if (submitter?.dataset?.prompt || submitter?.closest?.("[data-prompt]")) return "quick-action";
  if (Array.isArray(form?.__pendingHomeGenerationFiles) && form.__pendingHomeGenerationFiles.length) return "quick-action";
  return submitter ? "other" : "enter";
}

export function copyReferenceFiles(files = []) {
  return Array.from(files || []).filter((file) => file instanceof Blob);
}

export function clearComposerAttachments({ setChatImageFiles, renderChatImagePreview } = {}) {
  setChatImageFiles([]);
  renderChatImagePreview();
}
