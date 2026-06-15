export function buildChatRuntimeInputs(deps) {
  return {
    ...deps,
    recordCanvasEvent: deps.recordCanvasEvent,
    renderChatImagePreview: deps.renderChatImagePreview,
    addChat: deps.addChat,
    updateChat: deps.updateChat,
    addThinking: deps.addThinking,
    updateThinking: deps.updateThinking,
    addChatImage: deps.addChatImage,
    addGenerationPreview: deps.addGenerationPreview,
    replacePreviewWithImage: deps.replacePreviewWithImage,
    updateActiveProject: deps.updateActiveProject,
    getActiveProject: deps.getActiveProject,
    makeProjectTitle: deps.makeProjectTitle,
    postJsonRequest: deps.postJsonRequest,
    buildChatImagePayload: deps.buildChatImagePayload,
    readFileAsDataUrl: deps.readFileAsDataUrl,
    detectGenerationKind: deps.detectGenerationKind
  };
}

export function buildChatRuntimeRefGroup({
  recordCanvasEvent,
  renderChatImagePreview,
  addChat,
  updateChat,
  addThinking,
  updateThinking,
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
}) {
  return {
    recordCanvasEvent,
    renderChatImagePreview,
    addChat,
    updateChat,
    addThinking,
    updateThinking,
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

export function buildChatRuntimeSources(deps = {}) {
  const {
    addThinking,
    updateThinking,
    recordCanvasEvent,
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
    detectGenerationKind,
    ...directChatSources
  } = deps;

  const mappedChatSources = {
    recordCanvasEvent,
    renderChatImagePreview,
    addChat,
    updateChat,
    addThinking,
    updateThinking,
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
  return {
    ...directChatSources,
    ...mappedChatSources
  };
}

export function buildChatRuntimeDependencyInputs({
  recordCanvasEvent,
  renderChatImagePreview,
  addChat,
  updateChat,
  addThinking,
  updateThinking,
  addChatImage,
  addGenerationPreview,
  replacePreviewWithImage,
  updateActiveProject,
  getActiveProject,
  makeProjectTitle,
  postJsonRequest,
  buildChatImagePayload,
  readFileAsDataUrl,
  detectGenerationKind,
  ...directChatInputs
}) {
  const mappedChatInputs = {
    recordCanvasEvent,
    renderChatImagePreview,
    addChat,
    updateChat,
    addThinking,
    updateThinking,
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
  return {
    ...directChatInputs,
    ...mappedChatInputs
  };
}

export function buildChatRuntimeBootstrapBindings({
  recordCanvasEvent,
  renderChatImagePreview,
  addChat,
  updateChat,
  addThinking,
  updateThinking,
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
} = {}) {
  return {
    recordCanvasEvent,
    renderChatImagePreview,
    addChat,
    updateChat,
    addThinking,
    updateThinking,
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
