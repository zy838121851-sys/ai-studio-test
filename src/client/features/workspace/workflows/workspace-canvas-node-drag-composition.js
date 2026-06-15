import { createWorkspaceCanvasNodeDragAppRuntime } from "../runtime/workspace-canvas-runtime.js";

export function createWorkspaceCanvasNodeDragCompositionRuntime({
  elements,
  state,
  services
}) {
  return createWorkspaceCanvasNodeDragAppRuntime({
    elements,
    state,
    services: {
      stopNativeDrag: services.stopNativeDrag,
      ensureResizeHandles: services.ensureResizeHandles,
      ensureNodeControls: services.ensureNodeControls,
      selectNode: services.selectNode,
      hideAddNodeMenu: services.hideAddNodeMenu,
      hideShapeToolbar: services.hideShapeToolbar,
      hideTextToolbar: services.hideTextToolbar,
      hasShapeNodeInSet: services.hasShapeNodeInSet,
      hasTextNodeInSet: services.hasTextNodeInSet,
      getNodeBounds: services.getNodeBounds,
      getVisibleCanvasNodes: services.getVisibleCanvasNodes,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      startEraserDrag: services.startEraserDrag,
      updateEraserDrag: services.updateEraserDrag,
      positionDirectorCard: services.positionDirectorCard,
      positionCanvasSuggestionBubble: services.positionCanvasSuggestionBubble,
      positionAgentBubble: services.positionAgentBubble,
      isEditingImageNode: services.isEditingImageNode,
      isTextEditingImageNode: services.isTextEditingImageNode,
      isImageEditPopoverOpen: services.isImageEditPopoverOpen,
      isImageTextPanelOpen: services.isImageTextPanelOpen,
      positionImageEditPopover: services.positionImageEditPopover,
      positionImageTextPanel: services.positionImageTextPanel,
      setAICoreState: services.setAICoreState,
      updateAICoreDragState: services.updateAICoreDragState,
      setAICoreAwakeClass: services.setAICoreAwakeClass,
      getNextCanvasNodeId: services.getNextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getNodeThumbnail: services.getNodeThumbnail,
      getNodeTitle: services.getNodeTitle,
      escapeHtmlText: services.escapeHtmlText,
      setTextNodeEditing: services.setTextNodeEditing,
      findCanvasNodeById: services.findCanvasNodeById,
      recordUndoAction: services.recordUndoAction
    }
  });
}
