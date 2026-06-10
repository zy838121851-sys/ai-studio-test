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
    deleteSelectedNode
  } = actions;

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target.matches("input, textarea") || target.isContentEditable;
    if (isTyping) return;

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
      deleteSelectedNode();
    }
  });
}
