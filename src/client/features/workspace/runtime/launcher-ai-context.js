export function createWorkspaceLauncherAIContext({
  actions = {},
  safeBindings = {}
} = {}) {
  return {
    setAICoreState: actions.setAICoreState,
    isPointInAICore: actions.isPointInAICore,
    updateAICoreDragState: actions.updateAICoreDragState,
    uploadIntoAICore: actions.uploadIntoAICore,
    uploadAsReference: safeBindings.safeUploadAsReference,
    hideAICoreWorkspace: actions.hideAICoreWorkspace,
    setAiCoreAgentEnabled: actions.setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble: actions.positionCanvasSuggestionBubble,
    positionAgentBubble: actions.positionAgentBubble
  };
}
