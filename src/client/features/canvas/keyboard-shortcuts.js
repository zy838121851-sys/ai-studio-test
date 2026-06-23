import { runCanvasImageMenuCommand } from "./workflows/canvas-menu-actions.js";

export function bindCanvasKeyboardShortcuts({ root, stateHost, actions }) {
  const {
    hideImageLightbox,
    hideImageCropOverlay,
    hideUploadModeBubbles,
    hideGenerationOverlay,
    hideAICoreWorkspace,
    setUploadModeHover,
    setAICoreState,
    clearPendingUploadChoice,
    deleteSelectedNode,
    undoLastCanvasAction,
    selectNode,
    addChat
  } = actions;

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target?.matches?.("input, textarea") || target?.isContentEditable;
    if (isTyping) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoLastCanvasAction?.();
      return;
    }

    const imageCommand = getImageShortcutCommand(event);
    if (imageCommand) {
      event.preventDefault();
      runCanvasImageMenuCommand(imageCommand, { selectNode, addChat });
      return;
    }

    if (event.key === "Escape") {
      hideImageLightbox();
      hideImageCropOverlay();
      hideUploadModeBubbles();
      hideGenerationOverlay();
      hideAICoreWorkspace();
      clearPendingUploadChoice();
      setUploadModeHover(null);
      stateHost.classList.remove("ai-core-awake");
      setAICoreState("idle");
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedNode?.();
    }
  });
}

function getImageShortcutCommand(event) {
  if (document.body?.dataset?.view !== "canvas") return "";
  const key = normalizeShortcutKey(event);
  const primary = event.ctrlKey || event.metaKey;
  if (!primary) return "";

  if (event.altKey && event.shiftKey && key === "r") return "relink-image";
  if (event.altKey) {
    if (key === "n") return "arrange-name";
    if (key === "a") return "arrange-added";
    if (key === "s") return "align-stack";
    if (key === "arrowleft") return "normalize-height";
    if (key === "arrowright") return "normalize-width";
    if (key === "arrowup") return "normalize-size";
    if (key === "arrowdown") return "normalize-ratio";
    return "";
  }
  if (event.shiftKey) return "";
  if (key === "a") return "select-all";
  if (key === "p") return "arrange-best";
  if (key === "arrowleft") return "align-left";
  if (key === "arrowright") return "align-right";
  if (key === "arrowup") return "align-top";
  if (key === "arrowdown") return "align-bottom";
  return "";
}

function normalizeShortcutKey(event) {
  const key = event.key || "";
  if (key === "Left") return "arrowleft";
  if (key === "Right") return "arrowright";
  if (key === "Up") return "arrowup";
  if (key === "Down") return "arrowdown";
  return key.toLowerCase();
}
