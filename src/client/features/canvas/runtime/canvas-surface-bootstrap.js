import { createCanvasCropWorkflow } from "../workflows/canvas-crop-workflow.js";
import { createCanvasExpandWorkflow } from "../workflows/canvas-expand-workflow.js";
import { createCanvasLightboxWorkflow } from "../workflows/canvas-lightbox-workflow.js";
import { createCanvasMenuStateWorkflow } from "../workflows/canvas-menu-state-workflow.js";
import { createViewportWorkflow } from "../workflows/viewport-workflow.js";
import { createCanvasViewStateSynchronizer } from "./canvas-view-state.js";
import { createNodeRuntimeHelpers } from "./node-runtime-helpers.js";
import { createNodeControlsManager } from "../node-controls.js";

export function createCanvasSurfaceBootstrap({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  const menuStateWorkflow = createCanvasMenuStateWorkflow({
    elements: {
      addNodeMenu: elements.addNodeMenu,
      canvasContextMenu: elements.canvasContextMenu
    },
    services: {
      attachDragBlocker: services.attachDragBlocker
    }
  });

  const cropWorkflow = createCanvasCropWorkflow({
    state: {
      getCroppingImageNode: state.getCroppingImageNode,
      setCroppingImageNode: state.setCroppingImageNode
    },
    services: {
      centerViewOnNode: services.centerViewOnNode,
      hideImageEditPopover: services.hideImageEditPopover,
      hideCanvasContextMenu: menuStateWorkflow.hideCanvasContextMenu,
      hideAddNodeMenu: menuStateWorkflow.hideAddNodeMenu,
      selectNode: services.selectNode,
      recordUndoAction: services.recordUndoAction,
      getZoom: state.getZoom,
      zoom: defaults.zoom
    }
  });

  const expandWorkflow = createCanvasExpandWorkflow({
    elements: {
      canvasWorld: elements.canvasWorld
    },
    services: {
      centerViewOnNode: services.centerViewOnNode,
      hideImageEditPopover: services.hideImageEditPopover,
      hideImageCropOverlay: cropWorkflow.hideImageCropOverlay,
      hideCanvasContextMenu: menuStateWorkflow.hideCanvasContextMenu,
      hideAddNodeMenu: menuStateWorkflow.hideAddNodeMenu,
      selectNode: services.selectNode,
      runImageEditCommand: services.runImageEditCommand,
      getZoom: state.getZoom
    }
  });

  let showImageLightbox = () => {};
  const nodeControlsManager = createNodeControlsManager({
    getNodeTitle: services.getNodeTitle,
    openImageLightbox: (...args) => showImageLightbox(...args),
    positionTextFormatToolbar: services.positionTextFormatToolbar,
    runImageEditCommand: services.runImageEditCommand,
    registerImageAsset: services.registerImageAsset,
    removeImageAsset: services.removeImageAsset,
    getAssetCollections: services.getAssetCollections,
    createAssetCollection: services.createAssetCollection,
    showImageTextEditor: services.showImageTextEditor,
    startImageCrop: cropWorkflow.startImageCrop,
    startImageExpand: expandWorkflow.startImageExpand,
    getSelectedNodes: state.getSelectedNodes,
    isEditingImageNode: services.isEditingImageNode,
    isImageEditPopoverOpen: services.isImageEditPopoverOpen,
    selectImageNode: services.selectNode
  });

  const nodeHelpers = createNodeRuntimeHelpers({
    directorActions: defaults.directorActions,
    directorViewCount: defaults.directorViewCount,
    getRenderNodeTemplate: services.getRenderNodeTemplate,
    createWorkspaceNode: services.createWorkspaceNode,
    getCanvasWorld: () => elements.canvasWorld,
    getEmptyState: () => elements.emptyState,
    getNextCanvasNodeId: services.getNextCanvasNodeId,
    ensureCanvasNodeId: services.ensureCanvasNodeId,
    getMakeDraggable: services.getMakeDraggable,
    getSelectNode: services.getSelectNode,
    getInitModelViewer: services.getInitModelViewer,
    getIsEditingImageNode: services.getIsEditingImageNode,
    getIsImageEditPopoverOpen: services.getIsImageEditPopoverOpen,
    getPositionImageEditPopover: services.getPositionImageEditPopover,
    getHideCanvasContextMenu: () => menuStateWorkflow.hideCanvasContextMenu,
    getHideAddNodeMenu: () => menuStateWorkflow.hideAddNodeMenu,
    getShowImageEditPopover: services.getShowImageEditPopover,
    getElementWorldBounds: services.getElementWorldBounds,
    nodeControlsManager
  });

  const lightboxWorkflow = createCanvasLightboxWorkflow({
    services: {
      ensureImageLightbox: services.ensureImageLightbox,
      hideImageLightbox: services.hideImageLightboxElement,
      showImageLightbox: services.showImageLightboxElement
    }
  });
  showImageLightbox = lightboxWorkflow.showImageLightbox;

  const viewportWorkflow = createViewportWorkflow({
    elements: {
      canvasWorld: elements.canvasWorld,
      canvasViewport: elements.canvasViewport,
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
      getCanvasNodeRect: state.getCanvasNodeRect
    },
    services: {
      isImageEditPopoverOpen: services.isImageEditPopoverOpen,
      isImageTextPanelOpen: services.isImageTextPanelOpen,
      positionImageEditPopover: services.positionImageEditPopover,
      positionGeneratorPopover: services.positionGeneratorPopover,
      positionTextPanel: services.positionTextPanel,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      positionAgentBubble: services.positionAgentBubble,
      syncZoomControls: services.syncZoomControls,
      getCanvasTransformStyle: services.getCanvasTransformStyle,
      clampCanvasZoom: services.clampCanvasZoom,
      centerPanOnWorldPoint: services.centerPanOnWorldPoint,
      fitWorldBoundsInViewport: services.fitWorldBoundsInViewport
    }
  });

  const syncCanvasTransform = createCanvasViewStateSynchronizer({
    canvasWorld: elements.canvasWorld,
    zoomText: elements.zoomText,
    zoomRange: elements.zoomRange,
    getPan: state.getPan,
    setPan: state.setPan,
    getZoom: state.getZoom,
    setZoom: state.setZoom,
    isImageEditPopoverOpen: services.isImageEditPopoverOpen,
    isImageTextPanelOpen: services.isImageTextPanelOpen,
    positionImageEditPopover: services.positionImageEditPopover,
    positionGeneratorPopover: services.positionGeneratorPopover,
    positionTextPanel: services.positionTextPanel,
    positionTextFormatToolbar: services.positionTextFormatToolbar,
    positionShapeFormatToolbar: services.positionShapeFormatToolbar,
    positionAgentBubble: services.positionAgentBubble
  });

  return {
    ...menuStateWorkflow,
    ...cropWorkflow,
    ...expandWorkflow,
    ...nodeHelpers,
    ...lightboxWorkflow,
    applyTransform: viewportWorkflow.applyTransform,
    centerViewOnNode: viewportWorkflow.centerViewOnNode,
    returnViewToContent: viewportWorkflow.returnViewToContent,
    syncCanvasTransform
  };
}
