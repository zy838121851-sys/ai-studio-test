import { bindCanvasKeyboardShortcuts } from "../core/keyboard-shortcuts.js";
import { bindCanvasViewportEvents } from "../canvas/canvas-viewport-events.js";

/**
 * Bind large app-wide interaction listeners that are shared across home/canvas flows.
 * Keeps legacy callback composition in a single place while avoiding inline listener
 * registration in legacy-app.js.
 */
export function initAppInteractions({
  elements,
  handlers,
  viewport,
  keyboardActions
}) {
  const {
    aiCore,
    appRoot,
    canvasWorld,
    imageEditPopover,
    addNodeMenu,
    canvasContextMenu,
    imageEditCancel,
    imageEditSubmit,
    closeLibraryButton,
    presetSkill,
    floatingLibrary,
    promptInput
  } = elements;

  const {
    onAICorePointerDown,
    onAICorePointerMove,
    onAICorePointerUp,
    onAICoreClick,
    onAppRootClick,
    onAppRootDragOver,
    onAppRootDrop,
    onAppRootDragEnd,
    onPresetSkillClick,
    onCanvasWorldClick,
    onImageEditPopoverPointerDown,
    onImageEditPopoverDblClick,
    onImageEditPopoverWheel,
    onAddNodeMenuPointerDown,
    onAddNodeMenuClick,
    onCanvasContextMenuPointerDown,
    onCanvasContextMenuClick,
    onImageEditCancel,
    onImageEditSubmit,
    onLibraryPanelClick,
    onLibraryCloseClick
  } = handlers;

  const {
    canvasViewport,
    canvasViewportInputState,
    canvasViewportActions
  } = viewport;

  aiCore?.addEventListener("pointerdown", onAICorePointerDown);
  aiCore?.addEventListener("pointermove", onAICorePointerMove);
  aiCore?.addEventListener("pointerup", onAICorePointerUp);
  aiCore?.addEventListener("click", onAICoreClick);

  appRoot?.addEventListener("click", onAppRootClick);
  appRoot?.addEventListener("dragover", onAppRootDragOver);
  appRoot?.addEventListener("drop", onAppRootDrop);
  window.addEventListener("dragend", onAppRootDragEnd);

  presetSkill?.addEventListener("click", onPresetSkillClick);

  canvasWorld?.addEventListener("click", onCanvasWorldClick);

  imageEditPopover?.addEventListener("pointerdown", onImageEditPopoverPointerDown);
  imageEditPopover?.addEventListener("dblclick", onImageEditPopoverDblClick);
  imageEditPopover?.addEventListener("wheel", onImageEditPopoverWheel, { passive: true });

  addNodeMenu?.addEventListener("pointerdown", onAddNodeMenuPointerDown);
  addNodeMenu?.addEventListener("click", onAddNodeMenuClick);

  canvasContextMenu?.addEventListener("pointerdown", onCanvasContextMenuPointerDown);
  canvasContextMenu?.addEventListener("click", onCanvasContextMenuClick);

  imageEditCancel?.addEventListener("click", onImageEditCancel);
  imageEditSubmit?.addEventListener("click", onImageEditSubmit);

  document.querySelectorAll(".rail-btn[data-panel]").forEach((button) => {
    button.addEventListener("click", onLibraryPanelClick);
  });

  closeLibraryButton?.addEventListener("click", onLibraryCloseClick);

  bindCanvasViewportEvents({
    canvasViewport,
    appRoot,
    state: canvasViewportInputState,
    actions: canvasViewportActions
  });

  bindCanvasKeyboardShortcuts({
    root: document,
    stateHost: appRoot,
    actions: keyboardActions
  });

  return {
    getPromptInput: () => promptInput
  };
}
