import {
  createCanvasCoordinateWorkflow
} from "../workflows/canvas-coordinate-workflow.js";
import { createCanvasMenuWorkflow } from "../workflows/canvas-menu-workflow.js";
import { createImageEditWorkflow } from "../workflows/image-edit-workflow.js?v=20260627-generator-job-recovery-2";
import { createShapeToolbarController } from "../shape-toolbar-controller.js";
import { createTextEditWorkflow } from "../workflows/text-edit-workflow.js";

export function createCanvasInteractionBootstrap({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  const {
    nextCanvasNodeId,
    getCanvasNodeScreenRect,
    viewportPointToWorld,
    viewportCenterPoint
  } = createCanvasCoordinateWorkflow({
    elements: {
      canvasViewport: elements.canvasViewport
    },
    state: {
      getPan: state.getPan,
      getZoom: state.getZoom,
      getNextCanvasNodeId: state.getNextCanvasNodeId
    }
  });

  const imageEditWorkflow = createImageEditWorkflow({
    elements: {
      canvasWorld: elements.canvasWorld,
      createImageTextPanel: services.createImageTextPanel,
      imageEditPopover: elements.imageEditPopover,
      editImageThumb: elements.editImageThumb,
      editAddRef: elements.editAddRef,
      editReferenceInput: elements.editReferenceInput,
      imageEditPrompt: elements.imageEditPrompt
    },
    services: {
      getImageTextEdits: services.getImageTextEdits,
      renderImageTextInputs: services.renderImageTextInputs,
      positionImageTextPanelElement: services.positionImageTextPanelElement,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      readFileAsDataUrl: services.readFileAsDataUrl,
      getZoom: state.getZoom,
      getSelectedNodes: state.getSelectedNodes,
      postJsonRequest: services.postJsonRequest,
      runImageEditCommand: services.runImageEditCommand,
      getImageEditModel: services.getImageEditModel,
      buildImageTextEditPrompt: services.buildImageTextEditPrompt,
      hideCanvasContextMenu: services.hideCanvasContextMenu,
      hideAddNodeMenu: services.hideAddNodeMenu,
      selectNode: services.selectNode,
      positionImageEditPopoverElement: services.positionImageEditPopoverElement,
      buildOutputDefaults: defaults.imageEditBuildOutput
    }
  });

  const canvasMenuWorkflow = createCanvasMenuWorkflow({
    elements: {
      addNodeMenu: elements.addNodeMenu,
      canvasContextMenu: elements.canvasContextMenu,
      canvasViewport: elements.canvasViewport
    },
    services: {
      hideAddNodeMenu: services.hideAddNodeMenu,
      hideImageEditPopover: imageEditWorkflow.hideImageEditPopover,
      showViewportMenu: services.showViewportMenu,
      viewportPointToWorld
    }
  });

  const shapeToolbarController = createShapeToolbarController({
    getCanvasNodeScreenRect,
    getSelectedNode: state.getSelectedNode,
    isFixedStrokeToolName: services.isFixedStrokeToolName,
    isLinearDrawToolName: services.isLinearDrawToolName,
    recordUndoAction: services.recordUndoAction
  });

  const textEditWorkflow = createTextEditWorkflow({
    elements: {
      textFormatToolbar: elements.textFormatToolbar,
      textColorInput: elements.textColorInput,
      textFontFamily: elements.textFontFamily,
      textFontWeight: elements.textFontWeight,
      textFontSize: elements.textFontSize
    },
    state: {
      getSelectedNode: state.getSelectedNode,
      selectNode: services.selectNode
    },
    services: {
      getTextEditorFromNode: services.getTextEditorFromNode,
      setTextNodeEditingState: services.setTextNodeEditingState,
      focusTextEditorAtEnd: services.focusTextEditorAtEnd,
      hideTextToolbar: services.hideTextToolbar,
      positionTextToolbar: services.positionTextToolbar,
      applyTextEditorStyle: services.applyTextEditorStyle,
      getCanvasNodeScreenRect,
      recordUndoAction: services.recordUndoAction
    }
  });

  return {
    ...imageEditWorkflow,
    ...canvasMenuWorkflow,
    ...shapeToolbarController,
    ...textEditWorkflow,
    nextCanvasNodeId,
    getCanvasNodeScreenRect,
    viewportPointToWorld,
    viewportCenterPoint
  };
}
