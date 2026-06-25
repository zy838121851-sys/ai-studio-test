import { createNodeDragWorkflow } from "../workflows/node-drag-workflow.js";

export function createCanvasNodeDragBootstrap({
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createNodeDragWorkflow({
    elements: {
      appRoot: elements.appRoot
    },
    services: {
      getActiveCanvasTool: state.getActiveCanvasTool,
      stopNativeDrag: services.stopNativeDrag,
      ensureResizeHandles: services.ensureResizeHandles,
      ensureNodeControls: services.ensureNodeControls,
      selectNode: services.selectNode,
      hideAddNodeMenu: services.hideAddNodeMenu,
      hideShapeToolbar: services.hideShapeToolbar,
      hideTextToolbar: services.hideTextToolbar,
      hasShapeNodeInSet: services.hasShapeNodeInSet,
      hasTextNodeInSet: services.hasTextNodeInSet,
      getSelectedNodes: state.getSelectedNodes,
      getSelectedNode: state.getSelectedNode,
      getZoom: state.getZoom,
      getNodeBounds: services.getNodeBounds,
      getVisibleCanvasNodes: services.getVisibleCanvasNodes,
      getPointerCaptureTarget: () => elements.canvasViewport,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      getTextFormatToolbar: () => elements.textFormatToolbar,
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
