export function createRuntimeChatContext(deps = {}) {
  const {
    recordCanvasEvent,
    addThinking,
    updateThinking,
    renderChatImagePreview,
    addChat,
    updateChat,
    addChatImage,
    addGenerationPreview,
    replacePreviewWithImage,
    updateActiveProject,
    saveCurrentProject,
    saveCurrentProjectAfterGeneration,
    getActiveProject,
    makeProjectTitle,
    postJsonRequest,
    buildChatImagePayload,
    readFileAsDataUrl,
    detectGenerationKind,
    getPendingHomeGenerationFocus,
    setPendingHomeGenerationFocus,
    centerViewOnNode
  } = deps;

  return {
    recordCanvasEvent,
    addThinking,
    updateThinking,
    renderChatImagePreview,
    addChat,
    updateChat,
    addChatImage,
    addGenerationPreview,
    replacePreviewWithImage,
    updateActiveProject,
    saveCurrentProject,
    saveCurrentProjectAfterGeneration,
    getActiveProject,
    makeProjectTitle,
    postJsonRequest,
    buildChatImagePayload,
    readFileAsDataUrl,
    detectGenerationKind,
    getPendingHomeGenerationFocus,
    setPendingHomeGenerationFocus,
    centerViewOnNode
  };
}
