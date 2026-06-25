export function createCanvasNodeDragRuntimeInputs({
  elements,
  canvasWorld,
  appRoot,
  state,
  services,
  actions,
  canvasInteractionRuntime,
  canvasSelectionRuntime,
  canvasSurfaceRuntime,
  canvasOperationsRuntime,
  canvasGenerationRuntime
}) {
  return {
    elements,
    state: {
      getActiveCanvasTool: state.getActiveCanvasTool,
      getSelectedNodes: state.getSelectedNodes,
      getSelectedNode: state.getSelectedNode,
      getZoom: state.getZoom
    },
    services: {
      stopNativeDrag: canvasSurfaceRuntime.stopNativeDrag,
      ensureResizeHandles: canvasSurfaceRuntime.ensureResizeHandles,
      ensureNodeControls: canvasSurfaceRuntime.ensureNodeControls,
      selectNode: canvasSelectionRuntime.selectNode,
      hideAddNodeMenu: canvasSurfaceRuntime.hideAddNodeMenu,
      hideShapeToolbar: services.hideShapeToolbar,
      hideTextToolbar: services.hideTextToolbar,
      hasShapeNodeInSet: services.hasShapeNodeInSet,
      hasTextNodeInSet: services.hasTextNodeInSet,
      getNodeBounds: canvasSurfaceRuntime.getNodeBounds,
      getVisibleCanvasNodes: () => services.getVisibleCanvasNodes(canvasWorld),
      positionTextFormatToolbar: canvasInteractionRuntime.positionTextFormatToolbar,
      positionShapeFormatToolbar: canvasInteractionRuntime.positionShapeFormatToolbar,
      positionDirectorCard: canvasGenerationRuntime.positionDirectorCard,
      positionCanvasSuggestionBubble: actions.positionCanvasSuggestionBubble,
      positionAgentBubble: actions.positionAgentBubble,
      isEditingImageNode: canvasInteractionRuntime.isEditingImageNode,
      isTextEditingImageNode: canvasInteractionRuntime.isTextEditingImageNode,
      isImageEditPopoverOpen: canvasInteractionRuntime.isImageEditPopoverOpen,
      isImageTextPanelOpen: canvasInteractionRuntime.isImageTextPanelOpen,
      positionImageEditPopover: canvasInteractionRuntime.positionImageEditPopover,
      positionImageTextPanel: canvasInteractionRuntime.positionImageTextPanel,
      setAICoreState: actions.setAICoreState,
      updateAICoreDragState: actions.updateAICoreDragState,
      setAICoreAwakeClass: (isAwake) => {
        if (!appRoot?.classList) return;
        appRoot.classList.toggle("ai-core-awake", Boolean(isAwake));
      },
      getNextCanvasNodeId: canvasInteractionRuntime.nextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getNodeThumbnail: services.getNodeThumbnail,
      getNodeTitle: services.getNodeTitle,
      escapeHtmlText: services.escapeHtml,
      setTextNodeEditing: (node) => canvasInteractionRuntime.setTextNodeEditing(node, true),
      findCanvasNodeById: (nodeId) => services.findCanvasNodeById(canvasWorld, nodeId),
      recordUndoAction: actions.recordUndoAction
    }
  };
}
