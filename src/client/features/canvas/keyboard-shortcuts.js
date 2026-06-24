import { runCanvasObjectMenuCommand } from "./workflows/canvas-menu-actions.js";

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
    redoLastCanvasAction,
    recordUndoAction,
    selectNode,
    addChat
  } = actions;

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target?.matches?.("input, textarea") || target?.isContentEditable;
    if (isTyping) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoLastCanvasAction?.({ source: "keyboard" });
      return;
    }
    if (
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y")
    ) {
      event.preventDefault();
      redoLastCanvasAction?.({ source: "keyboard" });
      return;
    }

    const canvasCommand = getCanvasShortcutCommand(event);
    if (canvasCommand) {
      event.preventDefault();
      runCanvasObjectMenuCommand(canvasCommand, {
        targetNode: getCanvasShortcutTargetNode(),
        selectNode,
        addChat,
        recordUndoAction
      });
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
  }, { capture: true });
}

export function getCanvasShortcutCommand(event) {
  if (document.body?.dataset?.view !== "canvas") return "";
  const key = normalizeShortcutKey(event);
  const primary = event.ctrlKey || event.metaKey;
  if (!primary && !event.altKey && !event.shiftKey) {
    if (key === "]") return "layer-front";
    if (key === "[") return "layer-back";
  }
  if (!primary) return "";
  if (!event.altKey && !event.shiftKey) {
    if (key === "]") return "layer-up";
    if (key === "[") return "layer-down";
  }

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
  if (event.code === "BracketRight") return "]";
  if (event.code === "BracketLeft") return "[";
  if (event.code === "ArrowLeft") return "arrowleft";
  if (event.code === "ArrowRight") return "arrowright";
  if (event.code === "ArrowUp") return "arrowup";
  if (event.code === "ArrowDown") return "arrowdown";
  if (key === "Left") return "arrowleft";
  if (key === "Right") return "arrowright";
  if (key === "Up") return "arrowup";
  if (key === "Down") return "arrowdown";
  return key.toLowerCase();
}

function getCanvasShortcutTargetNode() {
  const root = document.querySelector("#canvasWorld") || document;
  return root.querySelector(".node-card.selected[data-active-selection='true'], .canvas-object.selected[data-active-selection='true']")
    || Array.from(root.querySelectorAll(".node-card.selected, .canvas-object.selected")).at(-1)
    || null;
}
