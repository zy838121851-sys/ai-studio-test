import {
  summarizeDataUrl,
  summarizeFiles
} from "./prompt-debug-summary-utils.js";

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

export function resolvePromptSubmitAttachmentState({
  form = null,
  chatImageFiles = [],
  domPreviewAttachments = []
} = {}) {
  const pendingHomeFiles = Array.isArray(form?.__pendingHomeGenerationFiles)
    ? form.__pendingHomeGenerationFiles
    : [];
  const pendingHomeModel = String(form?.__pendingHomeGenerationModel || "").trim();
  const currentFiles = Array.isArray(chatImageFiles) ? chatImageFiles : [];
  const referenceFiles = currentFiles.length ? currentFiles : pendingHomeFiles;
  const selectedSource = currentFiles.length
    ? "composer"
    : (pendingHomeFiles.length ? "pending-home" : (domPreviewAttachments.length ? "dom-preview" : "none"));

  return {
    pendingHomeFiles,
    pendingHomeModel,
    currentFiles,
    referenceFiles,
    selectedSource
  };
}

export function clearComposerAttachments({ setChatImageFiles, renderChatImagePreview } = {}) {
  setChatImageFiles([]);
  renderChatImagePreview();
}

export function restoreComposerAttachmentsOnFailure({
  files = [],
  setChatImageFiles,
  renderChatImagePreview,
  onRestored = null
} = {}) {
  if (!files.length) return;
  setChatImageFiles(files.slice());
  renderChatImagePreview();
  onRestored?.(files);
}

export function restoreComposerAttachmentsForPromptFailure({
  files = [],
  previewNodes = [],
  setChatImageFiles,
  renderChatImagePreview,
  logAgentDebug = null,
  agentDebug = null
} = {}) {
  if (Array.from(previewNodes || []).length || !files.length) return false;
  restoreComposerAttachmentsOnFailure({
    files,
    setChatImageFiles,
    renderChatImagePreview,
    onRestored: (restoredFiles) => {
      logAgentDebug?.(agentDebug, "attachments.restored", summarizeFiles(restoredFiles));
    }
  });
  return true;
}

export function getChatPreviewDomSummaries(root = globalThis.document) {
  return Array.from(root?.querySelectorAll?.(".chat-image-preview button") || []).map((button, index) => {
    const image = button.querySelector("img");
    return {
      index,
      attachmentId: button.dataset.attachmentId || "",
      name: button.dataset.attachmentName || image?.alt || `Reference ${index + 1}`,
      type: button.dataset.attachmentType || "",
      mime: button.dataset.attachmentType || "",
      size: Number(button.dataset.attachmentSize || 0),
      hasFile: false,
      hasBlob: Boolean(image?.src?.startsWith("blob:")),
      hasDataUrl: Boolean(image?.src?.startsWith("data:")),
      dataUrl: summarizeDataUrl(image?.src || "")
    };
  });
}
