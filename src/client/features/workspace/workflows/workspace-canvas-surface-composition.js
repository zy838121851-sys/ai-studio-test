import { createWorkspaceCanvasSurfaceAppRuntime } from "../runtime/workspace-canvas-runtime.js";

export function createWorkspaceCanvasSurfaceCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasSurfaceAppRuntime({
    elements,
    state,
    services: {
      attachDragBlocker: (node) => {
        if (!node) return;
        node.addEventListener("dragstart", (event) => event.preventDefault());
      },
      centerViewOnNode: (...args) => services.centerViewOnNode(...args),
      hideImageEditPopover: services.hideImageEditPopover,
      selectNode: (...args) => services.selectNode(...args),
      recordUndoAction: services.recordUndoAction,
      ensureImageLightbox: () => services.ensureImageLightbox({
        onClose: services.hideImageLightboxElement,
      }),
      hideImageLightbox: services.hideImageLightboxElement,
      showImageLightboxElement: services.showImageLightboxElement,
      getNodeTitle: services.getNodeTitle,
      positionTextFormatToolbar: (...args) => services.positionTextFormatToolbar(...args),
      runImageEditCommand: (node, prompt, label) => services.runImageEditCommand(node, prompt, label),
      showImageTextEditor: (...args) => services.showImageTextEditor(...args),
      isEditingImageNode: (...args) => services.isEditingImageNode(...args),
      isImageEditPopoverOpen: (...args) => services.isImageEditPopoverOpen(...args),
      getRenderNodeTemplate: () => services.renderNodeTemplate,
      createWorkspaceNode: services.createWorkspaceNode,
      getNextCanvasNodeId: () => services.nextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getMakeDraggable: () => services.getMakeDraggable(),
      getSelectNode: () => services.selectNode,
      getInitModelViewer: () => services.initModelViewer,
      getIsEditingImageNode: () => services.isEditingImageNode,
      getIsImageEditPopoverOpen: () => services.isImageEditPopoverOpen,
      getPositionImageEditPopover: () => services.positionImageEditPopover,
      getShowImageEditPopover: () => services.showImageEditPopover,
      getElementWorldBounds: services.getElementWorldBounds,
      isImageTextPanelOpen: () => services.isImageTextPanelOpen(),
      positionImageEditPopover: services.positionImageEditPopover,
      positionTextPanel: services.positionImageTextPanel,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      positionAgentBubble: services.positionAgentBubble,
      syncZoomControls: services.syncZoomControls,
      getCanvasTransformStyle: services.getCanvasTransformStyle,
      clampCanvasZoom: services.clampCanvasZoom,
      centerPanOnWorldPoint: services.centerPanOnWorldPoint,
      fitWorldBoundsInViewport: services.fitWorldBoundsInViewport
    },
    defaults
  });
}
