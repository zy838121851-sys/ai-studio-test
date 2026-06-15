import { createWorkspaceCanvasSelectionRuntime } from "../../canvas/runtime/index.js";

export function createWorkspaceCanvasSelectionAppRuntime({
  document,
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createWorkspaceCanvasSelectionRuntime({
    elements: {
      root: document,
      textFormatToolbar: elements.textFormatToolbar
    },
    state: {
      getSelectedNodes: state.getSelectedNodes,
      setSelectedNode: state.setSelectedNode
    },
    services: {
      hideTextToolbar: services.hideTextToolbar,
      hideShapeToolbar: services.hideShapeToolbar,
      getTextFormatToolbar: services.getTextFormatToolbar,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      recordCanvasEvent: services.recordCanvasEvent,
      scheduleAICoreAgent: services.scheduleAICoreAgent,
      clearSelectedNodeElements: services.clearSelectedNodeElements,
      addSelectedNodeElement: services.addSelectedNodeElement,
      replaceSelectedNodeElements: services.replaceSelectedNodeElements,
      getSelectedNodeDeletePayload: services.getSelectedNodeDeletePayload,
      recordUndoAction: services.recordUndoAction,
      removeCanvasNodeDeep: services.removeCanvasNodeDeep
    }
  });
}
