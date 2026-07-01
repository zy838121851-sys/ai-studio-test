import { createWorkspaceCanvasInteractionAppRuntime } from "../runtime/canvas-interaction-runtime.js";

export function createWorkspaceCanvasInteractionCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasInteractionAppRuntime({
    elements,
    state,
    services: {
      createImageTextPanel: services.createImageTextPanel,
      getImageTextEdits: services.getImageTextEdits,
      renderImageTextInputs: services.renderImageTextInputs,
      positionImageTextPanelElement: services.positionImageTextPanelElement,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      postJsonRequest: services.postJsonRequest,
      runImageEditCommand: services.runImageEditCommand,
      getImageEditModel: services.getImageEditModel,
      buildImageTextEditPrompt: services.buildImageTextEditPrompt,
      hideCanvasContextMenu: (...args) => services.hideCanvasContextMenu(...args),
      hideAddNodeMenu: (...args) => services.hideAddNodeMenu(...args),
      selectNode: (...args) => services.selectNode(...args),
      positionImageEditPopoverElement: services.positionImageEditPopoverElement,
      showViewportMenu: (...args) => services.showViewportMenu(...args),
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
    defaults
  });
}
