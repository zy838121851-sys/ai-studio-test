import { runCanvasObjectMenuCommand } from "./workflows/canvas-menu-actions.js";
import {
  getDroppedExternalImageUrl,
  importExternalImageUrl
} from "./canvas-viewport-events.js";

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
    addChat,
    uploadAsReference,
    viewportPointToWorld
  } = actions;

  root.addEventListener("paste", (event) => {
    const target = event.target;
    if (isEditablePasteTarget(target) || document.body?.dataset?.view !== "canvas") return;

    const files = getClipboardImageFiles(event.clipboardData);
    if (files.length) {
      event.preventDefault();
      uploadAsReference?.(files, getCanvasPastePoint(viewportPointToWorld));
      return;
    }

    const externalImageUrl = getDroppedExternalImageUrl(event.clipboardData);
    if (!externalImageUrl) return;

    event.preventDefault();
    importExternalImageUrl(externalImageUrl)
      .then((file) => {
        uploadAsReference?.([file], getCanvasPastePoint(viewportPointToWorld));
      })
      .catch((error) => {
        console.warn("[canvas] Failed to paste external image", error);
        addChat?.("assistant", "无法粘贴这个网页图片。请尝试复制原图，或先保存到本地再导入。");
      });
  }, { capture: true });

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (isEditablePasteTarget(target)) return;

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

function isEditablePasteTarget(target) {
  return Boolean(target?.matches?.("input, textarea") || target?.isContentEditable);
}

function getClipboardImageFiles(clipboardData) {
  const directFiles = Array.from(clipboardData?.files || [])
    .filter((file) => file?.type?.startsWith("image/"));
  if (directFiles.length) return directFiles;

  return Array.from(clipboardData?.items || [])
    .filter((item) => item?.kind === "file" && item.type?.startsWith("image/"))
    .map((item, index) => normalizeClipboardImageFile(item.getAsFile?.(), index))
    .filter(Boolean);
}

function normalizeClipboardImageFile(file, index = 0) {
  if (!file || file.name) return file;
  const extension = getClipboardImageExtension(file.type);
  return new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, {
    type: file.type || "image/png"
  });
}

function getClipboardImageExtension(mimeType = "") {
  const type = String(mimeType || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/avif") return "avif";
  return "png";
}

function getCanvasPastePoint(viewportPointToWorld) {
  const canvasViewport = document.querySelector("#canvasViewport");
  const rect = canvasViewport?.getBoundingClientRect?.();
  if (!rect || typeof viewportPointToWorld !== "function") return { x: 0, y: 0 };
  return viewportPointToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
