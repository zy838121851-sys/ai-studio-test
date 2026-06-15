export function createCanvasInteractionRuntimeInputs({
  elements,
  state,
  services,
  defaults,
  actions = {},
  getSurfaceRuntime,
  getSelectionRuntime
}) {
  return {
    elements,
    state: {
      getPan: state.getPan,
      getZoom: state.getZoom,
      getNextCanvasNodeId: state.getNextCanvasNodeId,
      getSelectedNode: state.getSelectedNode
    },
    services: {
      createImageTextPanel: services.createImageTextPanel,
      getImageTextEdits: services.getImageTextEdits,
      renderImageTextInputs: services.renderImageTextInputs,
      positionImageTextPanelElement: services.positionImageTextPanelElement,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      postJsonRequest: services.postJsonRequest,
      runImageEditCommand: services.runImageEditCommand,
      buildImageTextEditPrompt: services.buildImageTextEditPrompt,
      hideCanvasContextMenu: (...args) => getSurfaceRuntime().hideCanvasContextMenu(...args),
      hideAddNodeMenu: (...args) => getSurfaceRuntime().hideAddNodeMenu(...args),
      selectNode: (...args) => getSelectionRuntime().selectNode(...args),
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
      recordUndoAction: actions.recordUndoAction
    },
    defaults: {
      imageEditBuildOutput: defaults.imageEditBuildOutput
    }
  };
}
