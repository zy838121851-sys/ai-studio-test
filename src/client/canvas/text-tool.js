export function getTextEditorFromNode(node) {
  if (!node?.classList.contains("canvas-text")) return null;
  return node.querySelector(".canvas-text-editor");
}

export function hideTextToolbar(toolbar) {
  toolbar?.classList.remove("open");
}

export function setTextNodeEditingState(node, editing) {
  const editor = node?.querySelector(".canvas-text-editor");
  if (!editor) return null;
  editor.contentEditable = editing ? "true" : "false";
  node.classList.toggle("text-editing", editing);
  return editor;
}

export function focusTextEditorAtEnd(editor) {
  if (!editor) return;
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

export function rgbToHexColor(color, fallback = "#0f172a") {
  const values = color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!values || values.length < 3) return fallback;
  return `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}

export function positionTextToolbar({
  toolbar,
  editor,
  nodeRect,
  colorInput,
  fontSizeInput
} = {}) {
  if (!toolbar || !editor || !nodeRect) return false;
  if (colorInput) {
    colorInput.value = rgbToHexColor(getComputedStyle(editor).color);
    colorInput.closest(".text-color-picker")?.style.setProperty("--text-toolbar-color", colorInput.value);
  }
  if (fontSizeInput) {
    fontSizeInput.value = String(parseInt(getComputedStyle(editor).fontSize, 10) || 80);
  }
  toolbar.style.left = `${nodeRect.left + nodeRect.width / 2}px`;
  toolbar.style.top = `${Math.max(16, nodeRect.top - 64)}px`;
  toolbar.classList.add("open");
  return true;
}

export function applyTextEditorStyle(editor, style) {
  if (!editor) return false;
  Object.assign(editor.style, style);
  return true;
}

export function hasTextNodeInSet(node, selectedNodes) {
  return node?.classList.contains("canvas-text")
    || Array.from(selectedNodes || []).some((item) => item.classList.contains("canvas-text"));
}
