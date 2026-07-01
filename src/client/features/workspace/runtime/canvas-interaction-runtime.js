import { createWorkspaceCanvasInteractionRuntime } from "../../canvas/runtime/canvas-app-runtime.js";

export function createWorkspaceCanvasInteractionAppRuntime({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  return createWorkspaceCanvasInteractionRuntime({
    elements: {
      canvasViewport: elements.canvasViewport,
      canvasWorld: elements.canvasWorld,
      imageEditPopover: elements.imageEditPopover,
      editImageThumb: elements.editImageThumb,
      editAddRef: elements.editAddRef,
      editReferenceInput: elements.editReferenceInput,
      imageEditPrompt: elements.imageEditPrompt,
      addNodeMenu: elements.addNodeMenu,
      canvasContextMenu: elements.canvasContextMenu,
      textFormatToolbar: elements.textFormatToolbar,
      textColorInput: elements.textColorInput,
      textFontFamily: elements.textFontFamily,
      textFontWeight: elements.textFontWeight,
      textFontSize: elements.textFontSize
    },
    state: {
      getPan: state.getPan,
      getZoom: state.getZoom,
      getSelectedNodes: state.getSelectedNodes,
      getNextCanvasNodeId: state.getNextCanvasNodeId,
      getSelectedNode: state.getSelectedNode
    },
    services: {
      createImageTextPanel: services.createImageTextPanel,
      getImageTextEdits: services.getImageTextEdits,
      renderImageTextInputs: services.renderImageTextInputs,
      positionImageTextPanelElement: services.positionImageTextPanelElement,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      readFileAsDataUrl: services.readFileAsDataUrl,
      postJsonRequest: services.postJsonRequest,
      runImageEditCommand: services.runImageEditCommand,
      getImageEditModel: services.getImageEditModel,
      buildImageTextEditPrompt: services.buildImageTextEditPrompt,
      hideCanvasContextMenu: services.hideCanvasContextMenu,
      hideAddNodeMenu: services.hideAddNodeMenu,
      selectNode: services.selectNode,
      positionImageEditPopoverElement: services.positionImageEditPopoverElement,
      showViewportMenu: services.showViewportMenu,
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getTextEditorFromNode: services.getTextEditorFromNode,
      setTextNodeEditingState: services.setTextNodeEditingState,
      focusTextEditorAtEnd: services.focusTextEditorAtEnd,
      hideTextToolbar: services.hideTextToolbar,
      positionTextToolbar: services.positionTextToolbar,
      applyTextEditorStyle: services.applyTextEditorStyle,
      recordUndoAction: services.recordUndoAction
    },
    defaults: {
      imageEditBuildOutput: defaults.imageEditBuildOutput
    }
  });
}
