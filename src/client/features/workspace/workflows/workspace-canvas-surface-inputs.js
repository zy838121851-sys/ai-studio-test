export function createCanvasSurfaceRuntimeInputs({
  elements,
  canvasWorld,
  state,
  services,
  actions,
  defaults,
  canvasInteractionRuntime,
  canvasSelectionRuntime,
  getMakeDraggable,
  getGenerationRuntime
}) {
  return {
    elements,
    state: {
      getPan: state.getPan,
      setPan: state.setPan,
      getZoom: state.getZoom,
      setZoom: state.setZoom,
      getDefaultPan: state.getDefaultPan,
      getSelectedNode: state.getSelectedNode,
      getCanvasNodeRect: () => Array.from(canvasWorld.querySelectorAll(".node-card")),
      getCroppingImageNode: state.getCroppingImageNode,
      setCroppingImageNode: state.setCroppingImageNode
    },
    services: {
      centerViewOnNode: (...args) => services.centerViewOnNode(...args),
      hideImageEditPopover: canvasInteractionRuntime.hideImageEditPopover,
      selectNode: (...args) => canvasSelectionRuntime.selectNode(...args),
      recordUndoAction: actions.recordUndoAction,
      ensureImageLightbox: services.ensureImageLightbox,
      hideImageLightboxElement: services.hideImageLightboxElement,
      showImageLightboxElement: services.showImageLightboxElement,
      getNodeTitle: services.getNodeTitle,
      positionTextFormatToolbar: (...args) => canvasInteractionRuntime.positionTextFormatToolbar(...args),
      runImageEditCommand: (...args) => services.runImageEditCommand(...args),
      registerImageAsset: (...args) => services.registerImageAsset?.(...args),
      removeImageAsset: (...args) => services.removeImageAsset?.(...args),
      getAssetCollections: (...args) => services.getAssetCollections?.(...args),
      createAssetCollection: (...args) => services.createAssetCollection?.(...args),
      showImageTextEditor: (...args) => canvasInteractionRuntime.showImageTextEditor(...args),
      isEditingImageNode: (...args) => canvasInteractionRuntime.isEditingImageNode(...args),
      isImageEditPopoverOpen: (...args) => canvasInteractionRuntime.isImageEditPopoverOpen(...args),
      renderNodeTemplate: services.renderNodeTemplate,
      createWorkspaceNode: services.createWorkspaceNode,
      nextCanvasNodeId: canvasInteractionRuntime.nextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getMakeDraggable,
      initModelViewer: (...args) => getGenerationRuntime().initModelViewer(...args),
      getElementWorldBounds: services.getElementWorldBounds,
      isImageTextPanelOpen: () => canvasInteractionRuntime.isImageTextPanelOpen(),
      positionImageEditPopover: canvasInteractionRuntime.positionImageEditPopover,
      showImageEditPopover: canvasInteractionRuntime.showImageEditPopover,
      positionTextPanel: canvasInteractionRuntime.positionImageTextPanel,
      positionShapeFormatToolbar: canvasInteractionRuntime.positionShapeFormatToolbar,
      positionAgentBubble: actions.positionAgentBubble,
      syncZoomControls: services.syncZoomControls,
      getCanvasTransformStyle: services.getCanvasTransformStyle,
      clampCanvasZoom: services.clampCanvasZoom,
      centerPanOnWorldPoint: services.centerPanOnWorldPoint,
      fitWorldBoundsInViewport: services.fitWorldBoundsInViewport
    },
    defaults: {
      zoom: state.getZoom(),
      directorActions: defaults.directorActions,
      directorViewCount: defaults.directorViewCount
    }
  };
}
