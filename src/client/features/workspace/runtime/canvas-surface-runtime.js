import { createWorkspaceCanvasSurfaceRuntime } from "../../canvas/runtime/index.js";

export function createWorkspaceCanvasSurfaceAppRuntime({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  return createWorkspaceCanvasSurfaceRuntime({
    elements: {
      addNodeMenu: elements.addNodeMenu,
      canvasContextMenu: elements.canvasContextMenu,
      canvasWorld: elements.canvasWorld,
      canvasViewport: elements.canvasViewport,
      emptyState: elements.emptyState,
      zoomText: elements.zoomText,
      zoomRange: elements.zoomRange
    },
    state: {
      getPan: state.getPan,
      setPan: state.setPan,
      getZoom: state.getZoom,
      setZoom: state.setZoom,
      getDefaultPan: state.getDefaultPan,
      getSelectedNode: state.getSelectedNode,
      getCanvasNodeRect: state.getCanvasNodeRect,
      getCroppingImageNode: state.getCroppingImageNode,
      setCroppingImageNode: state.setCroppingImageNode
    },
    services: {
      attachDragBlocker: services.attachDragBlocker,
      centerViewOnNode: services.centerViewOnNode,
      hideImageEditPopover: services.hideImageEditPopover,
      selectNode: services.selectNode,
      recordUndoAction: services.recordUndoAction,
      ensureImageLightbox: services.ensureImageLightbox,
      hideImageLightbox: services.hideImageLightbox,
      showImageLightboxElement: services.showImageLightboxElement,
      getNodeTitle: services.getNodeTitle,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      runImageEditCommand: services.runImageEditCommand,
      showImageTextEditor: services.showImageTextEditor,
      isEditingImageNode: services.isEditingImageNode,
      isImageEditPopoverOpen: services.isImageEditPopoverOpen,
      getRenderNodeTemplate: services.getRenderNodeTemplate,
      createWorkspaceNode: services.createWorkspaceNode,
      getNextCanvasNodeId: services.getNextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getMakeDraggable: services.getMakeDraggable,
      getSelectNode: services.getSelectNode,
      getInitModelViewer: services.getInitModelViewer,
      getIsEditingImageNode: services.getIsEditingImageNode,
      getIsImageEditPopoverOpen: services.getIsImageEditPopoverOpen,
      getPositionImageEditPopover: services.getPositionImageEditPopover,
      getShowImageEditPopover: services.getShowImageEditPopover,
      getElementWorldBounds: services.getElementWorldBounds,
      isImageTextPanelOpen: services.isImageTextPanelOpen,
      positionImageEditPopover: services.positionImageEditPopover,
      positionTextPanel: services.positionTextPanel,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      positionAgentBubble: services.positionAgentBubble,
      syncZoomControls: services.syncZoomControls,
      getCanvasTransformStyle: services.getCanvasTransformStyle,
      clampCanvasZoom: services.clampCanvasZoom,
      centerPanOnWorldPoint: services.centerPanOnWorldPoint,
      fitWorldBoundsInViewport: services.fitWorldBoundsInViewport
    },
    defaults: {
      zoom: defaults.zoom,
      directorActions: defaults.directorActions,
      directorViewCount: defaults.directorViewCount
    }
  });
}
