import { createWorkspaceCanvasSelectionAppRuntime } from "../runtime/workspace-canvas-runtime.js";

export function createWorkspaceCanvasSelectionCompositionRuntime({
  document,
  elements,
  state,
  toolbars,
  services,
  actions
}) {
  return createWorkspaceCanvasSelectionAppRuntime({
    document,
    elements,
    state,
    services: {
      hideTextToolbar: () => services.hideTextToolbar(toolbars.textFormatToolbar),
      hideShapeToolbar: services.hideShapeToolbar,
      getTextFormatToolbar: () => toolbars.textFormatToolbar,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      recordCanvasEvent: actions.recordCanvasEvent,
      scheduleAICoreAgent: (...args) => {
        globalThis.scheduleAICoreAgent?.(...args);
      },
      clearSelectedNodeElements: services.clearSelectedNodeElements,
      addSelectedNodeElement: services.addSelectedNodeElement,
      replaceSelectedNodeElements: services.replaceSelectedNodeElements,
      getSelectedNodeDeletePayload: services.getSelectedNodeDeletePayload,
      recordUndoAction: actions.recordUndoAction,
      removeCanvasNodeDeep: services.removeCanvasNodeDeep
    }
  });
}
