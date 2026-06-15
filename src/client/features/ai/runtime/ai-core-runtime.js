export function buildAICoreRuntimeInputs(deps) {
  return {
    ...deps,
    chooseUploadMode: deps.chooseUploadMode,
    getPendingUploadChoice: deps.getPendingUploadChoice,
    setPendingUploadChoice: deps.setPendingUploadChoice,
    setUploadDragDepthForUi: deps.setUploadDragDepthForUi,
    updateAICoreDragState: deps.updateAICoreDragState,
    getAiCoreDragState: deps.getAiCoreDragState,
    setAiCoreDragState: deps.setAiCoreDragState,
    getAiCoreSuppressClick: deps.getAiCoreSuppressClick,
    setAiCoreSuppressClick: deps.setAiCoreSuppressClick,
    getAiCoreAgentEnabled: deps.getAiCoreAgentEnabled,
    setAiCoreAgentEnabled: deps.setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble: deps.positionCanvasSuggestionBubble,
    positionAgentBubble: deps.positionAgentBubble,
    handleImageEditSubmit: deps.handleImageEditSubmit,
    handleImageEditCancel: deps.handleImageEditCancel,
    closeOpenImageToolbarMenus: deps.closeOpenImageToolbarMenus
  };
}

export function buildAICoreRuntimeRefGroup({
  aiCore,
  aiCoreHint,
  setUploadDragDepthForUi,
  chooseUploadMode,
  getPendingUploadChoice,
  setPendingUploadChoice,
  updateAICoreDragState,
  aiCoreDrag,
  setAiCoreDragState,
  aiCoreSuppressClick,
  setAiCoreSuppressClick,
  aiCoreAgentEnabled,
  setAiCoreAgentEnabled,
  positionCanvasSuggestionBubble,
  positionAgentBubble,
  closeOpenImageToolbarMenus,
  handleImageEditSubmit,
  handleImageEditCancel
}) {
  return {
    aiCore,
    aiCoreHint,
    setUploadDragDepthForUi,
    chooseUploadMode,
    getPendingUploadChoice,
    setPendingUploadChoice,
    updateAICoreDragState,
    getAiCoreDragState: () => aiCoreDrag,
    setAiCoreDragState,
    getAiCoreSuppressClick: () => aiCoreSuppressClick,
    setAiCoreSuppressClick,
    getAiCoreAgentEnabled: () => aiCoreAgentEnabled,
    setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble,
    closeOpenImageToolbarMenus,
    handleImageEditSubmit,
    handleImageEditCancel
  };
}

export function buildAICoreRuntimeSources(deps = {}) {
  const {
    aiCore,
    aiCoreHint,
    setUploadDragDepthForUi,
    chooseUploadMode,
    getPendingUploadChoice,
    setPendingUploadChoice,
    updateAICoreDragState,
    getAiCoreDragState,
    setAiCoreDragState,
    getAiCoreSuppressClick,
    setAiCoreSuppressClick,
    getAiCoreAgentEnabled,
    setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble,
    handleImageEditSubmit,
    handleImageEditCancel,
    closeOpenImageToolbarMenus,
    ...directAICoreSources
  } = deps;

  const mappedAICoreSources = {
    aiCore,
    aiCoreHint,
    setUploadDragDepthForUi,
    chooseUploadMode,
    getPendingUploadChoice,
    setPendingUploadChoice,
    updateAICoreDragState,
    getAiCoreDragState,
    setAiCoreDragState,
    getAiCoreSuppressClick,
    setAiCoreSuppressClick,
    getAiCoreAgentEnabled,
    setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble,
    handleImageEditSubmit,
    handleImageEditCancel,
    closeOpenImageToolbarMenus
  };
  return {
    ...directAICoreSources,
    ...mappedAICoreSources
  };
}

export function buildAICoreRuntimeDependencyInputs({
  aiCore,
  aiCoreHint,
  setUploadDragDepthForUi,
  chooseUploadMode,
  getPendingUploadChoice,
  setPendingUploadChoice,
  updateAICoreDragState,
  getAiCoreDragState,
  setAiCoreDragState,
  getAiCoreSuppressClick,
  setAiCoreSuppressClick,
  getAiCoreAgentEnabled,
  setAiCoreAgentEnabled,
  positionCanvasSuggestionBubble,
  positionAgentBubble,
  handleImageEditSubmit,
  handleImageEditCancel,
  closeOpenImageToolbarMenus,
  ...directAICoreInputs
}) {
  const mappedAICoreInputs = {
    aiCore,
    aiCoreHint,
    setUploadDragDepthForUi,
    chooseUploadMode,
    getPendingUploadChoice,
    setPendingUploadChoice,
    updateAICoreDragState,
    getAiCoreDragState,
    setAiCoreDragState,
    getAiCoreSuppressClick,
    setAiCoreSuppressClick,
    getAiCoreAgentEnabled,
    setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble,
    handleImageEditSubmit,
    handleImageEditCancel,
    closeOpenImageToolbarMenus
  };
  return {
    ...directAICoreInputs,
    ...mappedAICoreInputs
  };
}

export function buildAICoreRuntimeBootstrapBindings({
  aiCore,
  aiCoreHint,
  setUploadDragDepth,
  chooseUploadMode,
  getPendingUploadChoice,
  setPendingUploadChoice,
  updateAICoreDragState,
  aiCoreDrag,
  setAiCoreDragState,
  aiCoreSuppressClick,
  setAiCoreSuppressClick,
  aiCoreAgentEnabled,
  setAiCoreAgentEnabled,
  positionCanvasSuggestionBubble,
  positionAgentBubble,
  closeOpenImageToolbarMenus,
  handleImageEditSubmit,
  handleImageEditCancel
} = {}) {
  const setUploadDragDepthForUi = (value) => {
    if (typeof setUploadDragDepth === "function") {
      setUploadDragDepth(value);
    }
  };

  return {
    aiCore,
    aiCoreHint,
    setUploadDragDepthForUi,
    chooseUploadMode,
    getPendingUploadChoice,
    setPendingUploadChoice,
    updateAICoreDragState,
    aiCoreDrag,
    setAiCoreDragState,
    aiCoreSuppressClick,
    setAiCoreSuppressClick,
    aiCoreAgentEnabled,
    setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble,
    closeOpenImageToolbarMenus,
    handleImageEditSubmit,
    handleImageEditCancel
  };
}
