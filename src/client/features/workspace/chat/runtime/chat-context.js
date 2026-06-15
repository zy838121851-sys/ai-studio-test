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
    getActiveProject,
    makeProjectTitle,
    postJsonRequest,
    buildChatImagePayload,
    readFileAsDataUrl,
    detectGenerationKind
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
    getActiveProject,
    makeProjectTitle,
    postJsonRequest,
    buildChatImagePayload,
    readFileAsDataUrl,
    detectGenerationKind
  };
}
