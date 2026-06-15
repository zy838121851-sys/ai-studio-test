import { bindFooterEvents } from "./footer-events.js";

function getRuntimeElement(runtime, value, selector) {
  if (value && typeof value.addEventListener === "function") {
    return value;
  }
  return runtime.documentRoot?.querySelector?.(selector) ||
    globalThis.document?.querySelector?.(selector) ||
    null;
}

export function createFooterRuntimePayload(runtime = {}) {
  return {
    aiCore: runtime.aiCore,
    appRoot: runtime.appRoot,
    canvasWorld: runtime.canvasWorld,
    projectMenu: runtime.projectMenu,
    brandMenu: runtime.brandMenu,
    promptInput: runtime.promptInput,
    presetSkill: runtime.presetSkill,
    directorActions: runtime.directorActions,
    refreshDirectorOptions: runtime.refreshDirectorOptions,
    runDirectorAction: runtime.runDirectorAction,
    imageEditSubmit: getRuntimeElement(runtime, runtime.imageEditSubmit, "#imageEditSubmit"),
    imageEditCancel: getRuntimeElement(runtime, runtime.imageEditCancel, "#imageEditCancel"),
    onImageEditSubmit: runtime.handleImageEditSubmit,
    onImageEditCancel: runtime.handleImageEditCancel,
    closeMenuWhenOutside: runtime.closeMenuWhenOutside,
    closeOpenImageToolbarMenus: runtime.closeOpenImageToolbarMenus,
    hideUploadModeBubbles: runtime.hideUploadModeBubbles,
    chooseUploadMode: runtime.chooseUploadMode,
    getPendingUploadChoice: () => runtime.getPendingUploadChoice(),
    setPendingUploadChoice: (value) => runtime.setPendingUploadChoice(value),
    appRootElement: runtime.appRoot,
    setUploadDragDepth: (value) => runtime.setUploadDragDepth(value),
    setUploadModeHover: runtime.setUploadModeHover,
    setAICoreState: runtime.setAICoreState,
    updateAICoreDragState: runtime.updateAICoreDragState,
    uploadAsReference: runtime.uploadAsReference,
    viewportPointToWorld: runtime.viewportPointToWorld,
    getAiCoreDragState: () => runtime.getAiCoreDragState(),
    setAiCoreDragState: (value) => runtime.setAiCoreDragState(value),
    getAiCoreSuppressClick: () => runtime.getAiCoreSuppressClick(),
    setAiCoreSuppressClick: (value) => runtime.setAiCoreSuppressClick(value),
    getAiCoreAgentEnabled: () => runtime.getAiCoreAgentEnabled(),
    setAiCoreAgentEnabled: (value) => runtime.setAiCoreAgentEnabled(value),
    positionCanvasSuggestionBubble: runtime.positionCanvasSuggestionBubble,
    positionAgentBubble: runtime.positionAgentBubble
  };
}

export function bindFooterRuntime(runtime = {}) {
  const bindingPayload = createFooterRuntimePayload(runtime);

  const bindRuntimeFooterEvents = runtime.bindFooterEvents;
  if (typeof bindRuntimeFooterEvents === "function") {
    bindRuntimeFooterEvents(bindingPayload);
    return;
  }

  bindFooterEvents(bindingPayload);
}
