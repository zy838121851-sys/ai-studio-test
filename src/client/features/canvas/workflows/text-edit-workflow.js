export function createTextEditWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const {
    textFormatToolbar = null,
    textColorInput = null,
    textFontFamily = null,
    textFontWeight = null,
    textFontSize = null
  } = elements;

  const {
    getSelectedNode = () => null,
    selectNode = () => {}
  } = state;

  const {
    getTextEditorFromNode = () => null,
    setTextNodeEditingState = () => null,
    focusTextEditorAtEnd = () => {},
    hideTextToolbar = () => {},
    positionTextToolbar = () => {},
    applyTextEditorStyle = () => false,
    getCanvasNodeScreenRect = () => null,
    recordUndoAction = () => {}
  } = services;

  function getActiveTextNode() {
    const selectedNode = getSelectedNode();
    const root = selectedNode?.ownerDocument || textFormatToolbar?.ownerDocument || globalThis.document;
    const activeText = root?.querySelector?.(".canvas-text.selected[data-active-selection='true']");
    if (activeText) return activeText;
    if (
      selectedNode?.isConnected
      && selectedNode.classList.contains("canvas-text")
      && selectedNode.classList.contains("selected")
    ) {
      return selectedNode;
    }
    const selectedTexts = Array.from(root?.querySelectorAll?.(".canvas-text.selected") || []);
    return selectedTexts[selectedTexts.length - 1] || null;
  }

  function positionTextFormatToolbar() {
    if (!textFormatToolbar) return;
    const node = getActiveTextNode();
    const editor = getTextEditorFromNode(node);
    if (!editor) {
      hideTextToolbar(textFormatToolbar);
      return;
    }
    const rect = getCanvasNodeScreenRect(node) || node.getBoundingClientRect?.();
    if (!rect) return;
    positionTextToolbar({
      toolbar: textFormatToolbar,
      editor,
      nodeRect: rect,
      colorInput: textColorInput,
      fontFamilyInput: textFontFamily,
      fontWeightInput: textFontWeight,
      fontSizeInput: textFontSize
    });
  }

  function applyTextStyle(style) {
    const editor = getTextEditorFromNode(getActiveTextNode());
    const before = editor?.getAttribute("style") || "";
    if (!applyTextEditorStyle(editor, style)) return;
    const after = editor?.getAttribute("style") || "";
    if (editor && before !== after) {
      recordUndoAction({
        type: "text-style",
        undo: () => {
          if (!editor.isConnected) return;
          editor.setAttribute("style", before);
          positionTextFormatToolbar();
        },
        redo: () => {
          if (!editor.isConnected) return;
          editor.setAttribute("style", after);
          positionTextFormatToolbar();
        }
      });
    }
    positionTextFormatToolbar();
  }

  function setTextNodeEditing(node, editing) {
    const editor = setTextNodeEditingState(node, editing);
    if (!editor) return;
    if (editing) {
      selectNode(node);
      window.setTimeout(() => {
        focusTextEditorAtEnd(editor);
        positionTextFormatToolbar();
      }, 0);
    } else if (document.activeElement === editor) {
      editor.blur();
    }
  }

  return {
    positionTextFormatToolbar,
    applyTextStyle,
    setTextNodeEditing
  };
}
