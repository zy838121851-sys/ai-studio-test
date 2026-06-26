import { bindPromptShortcuts, bindPromptSubmit } from "../workflows/prompt-workflow.js?v=20260626-midjourney-4up-1";

export function createPromptSubmitRuntimePayload(runtime = {}) {
  return {
    promptForm: runtime.promptForm,
    promptInput: runtime.promptInput,
    chatImageFilesRef: () => runtime.getChatImageFiles(),
    setChatImageFiles: (files) => runtime.setChatImageFiles(files),
    renderChatImagePreview: runtime.renderChatImagePreview,
    canvasViewport: runtime.canvasViewport,
    viewportPointToWorld: runtime.viewportPointToWorld,
    addThinking: runtime.addThinking,
    updateThinking: runtime.updateThinking,
    addChat: runtime.addChat,
    updateChat: runtime.updateChat,
    addChatImage: runtime.addChatImage,
    addGenerationPreview: runtime.addGenerationPreview,
    replacePreviewWithImage: runtime.replacePreviewWithImage,
    updateActiveProject: runtime.updateActiveProject,
    saveCurrentProject: runtime.saveCurrentProject,
    getActiveProject: runtime.getActiveProject,
    makeProjectTitle: runtime.makeProjectTitle,
    postJsonRequest: runtime.postJsonRequest,
    buildChatImagePayload: runtime.buildChatImagePayload,
    readFileAsDataUrl: runtime.readFileAsDataUrl,
    recordCanvasEvent: runtime.recordCanvasEvent,
    chatModelSelect: runtime.chatModelSelect,
    setChatCollapsed: runtime.setChatCollapsed,
    detectGenerationKind: runtime.detectGenerationKind,
    getPendingHomeGenerationFocus: runtime.getPendingHomeGenerationFocus,
    setPendingHomeGenerationFocus: runtime.setPendingHomeGenerationFocus,
    centerViewOnNode: runtime.centerViewOnNode
  };
}

export function createPromptShortcutsRuntimePayload(runtime = {}) {
  return {
    queryAll: runtime.documentRoot.querySelectorAll.bind(runtime.documentRoot),
    promptInput: runtime.promptInput,
    labelSelector: "[data-prompt]"
  };
}

export function bindPromptRuntime(runtime = {}) {
  const submitPayload = createPromptSubmitRuntimePayload(runtime);

  if (typeof runtime.bindPromptSubmit === "function") {
    runtime.bindPromptSubmit(submitPayload);
  } else {
    bindPromptSubmit(submitPayload);
  }

  const shortcutsPayload = createPromptShortcutsRuntimePayload(runtime);

  if (typeof runtime.bindPromptShortcuts === "function") {
    runtime.bindPromptShortcuts(shortcutsPayload);
    return;
  }

  bindPromptShortcuts(shortcutsPayload);
}
