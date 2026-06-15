export function createCanvasSelectionRuntimeInputs({
  document,
  elements,
  state,
  textFormatToolbar,
  services,
  actions,
  canvasInteractionRuntime
}) {
  return {
    document,
    elements,
    state: {
      getSelectedNodes: state.getSelectedNodes,
      setSelectedNode: state.setSelectedNode
    },
    toolbars: {
      textFormatToolbar
    },
    services: {
      hideTextToolbar: services.hideTextToolbar,
      hideShapeToolbar: services.hideShapeToolbar,
      clearSelectedNodeElements: services.clearSelectedNodeElements,
      addSelectedNodeElement: services.addSelectedNodeElement,
      replaceSelectedNodeElements: services.replaceSelectedNodeElements,
      getSelectedNodeDeletePayload: services.getSelectedNodeDeletePayload,
      recordUndoAction: actions.recordUndoAction,
      removeCanvasNodeDeep: services.removeCanvasNodeDeep,
      positionTextFormatToolbar: canvasInteractionRuntime.positionTextFormatToolbar,
      positionShapeFormatToolbar: canvasInteractionRuntime.positionShapeFormatToolbar
    },
    actions: {
      recordCanvasEvent: actions.recordCanvasEvent
    }
  };
}
