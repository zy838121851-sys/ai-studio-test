import { createSelectionWorkflow } from "../workflows/selection-workflow.js";

export function createCanvasSelectionBootstrap({
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createSelectionWorkflow({
    state: {
      getSelectedNodes: state.getSelectedNodes,
      setSelectedNode: state.setSelectedNode
    },
    services: {
      hideTextToolbar: () => services.hideTextToolbar(elements.textFormatToolbar),
      hideShapeToolbar: services.hideShapeToolbar,
      getTextFormatToolbar: () => elements.textFormatToolbar,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      recordCanvasEvent: services.recordCanvasEvent,
      scheduleAICoreAgent: services.scheduleAICoreAgent,
      clearSelectedNodeElements: services.clearSelectedNodeElements,
      addSelectedNodeElement: services.addSelectedNodeElement,
      replaceSelectedNodeElements: services.replaceSelectedNodeElements,
      getSelectedNodeDeletePayload: services.getSelectedNodeDeletePayload,
      recordUndoAction: services.recordUndoAction,
      removeCanvasNodeDeep: services.removeCanvasNodeDeep,
      removeSuggestionForNode: (nodeId) => {
        elements.root?.querySelector?.(`.canvas-ai-suggestions[data-node-id="${nodeId}"]`)?.remove();
      }
    }
  });
}
