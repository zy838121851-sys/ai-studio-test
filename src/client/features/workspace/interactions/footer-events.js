import { bindAICoreInteractions } from "../../agent/ai-core-interactions.js";

export function bindFooterEvents({
  aiCore,
  appRoot,
  canvasWorld,
  projectMenu,
  brandMenu,
  promptInput,
  presetSkill,
  directorActions = [],
  refreshDirectorOptions = () => {},
  runDirectorAction = async () => {},
  imageEditSubmit,
  imageEditCancel,
  onImageEditSubmit = () => Promise.resolve(),
  onImageEditCancel = () => {},
  closeMenuWhenOutside = () => {},
  closeOpenImageToolbarMenus = () => {},
  hideUploadModeBubbles = () => {},
  chooseUploadMode = () => {},
  getPendingUploadChoice = () => null,
  setPendingUploadChoice = () => {},
  appRootElement,
  setUploadDragDepth = () => {},
  setUploadModeHover = () => {},
  setAICoreState = () => {},
  updateAICoreDragState = () => {},
  uploadAsReference = () => {},
  viewportPointToWorld = () => ({ x: 0, y: 0 }),
  getAiCoreDragState = () => null,
  setAiCoreDragState = () => {},
  getAiCoreSuppressClick = () => false,
  setAiCoreSuppressClick = () => {},
  getAiCoreAgentEnabled = () => false,
  setAiCoreAgentEnabled = () => {},
  positionCanvasSuggestionBubble,
  positionAgentBubble
} = {}) {
  if (!appRoot || !canvasWorld) return;

  const presetSkillPrompt = "Use AI skill for focused generation suggestions.";

  bindAICoreInteractions({
    aiCore,
    getDragState: getAiCoreDragState,
    setDragState: setAiCoreDragState,
    getSuppressClick: getAiCoreSuppressClick,
    setSuppressClick: setAiCoreSuppressClick,
    getEnabled: getAiCoreAgentEnabled,
    setEnabled: setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble,
    positionAgentBubble
  });

  appRoot.addEventListener("click", (event) => {
    if (!event.target.closest("#projectMenu") && !event.target.closest("#projectMenuTrigger")) {
      closeMenuWhenOutside({
        event,
        menu: projectMenu,
        menuSelector: "#projectMenu",
        triggerSelector: "#projectMenuTrigger"
      });
    }
    if (!event.target.closest("#brandMenu") && !event.target.closest("[data-brand-menu]")) {
      closeMenuWhenOutside({
        event,
        menu: brandMenu,
        menuSelector: "#brandMenu",
        triggerSelector: "[data-brand-menu]"
      });
    }
    if (!event.target.closest(".image-node-toolbar")) {
      closeOpenImageToolbarMenus(document);
    }
    if (!event.target.closest(".shape-format-toolbar")) {
      document.querySelector("#shapeFormatToolbar")?.classList.remove("picker-open");
    }
    const button = event.target.closest("[data-upload-mode]");
    if (!button) {
      if (getPendingUploadChoice() && !event.target.closest(".upload-choice-bubbles")) {
        hideUploadModeBubbles();
        setPendingUploadChoice(null);
      }
      return;
    }
    if (!getPendingUploadChoice()) return;
    event.preventDefault();
    event.stopPropagation();
    chooseUploadMode(button.dataset.uploadMode);
  });

  appRoot.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    updateAICoreDragState(event.clientX, event.clientY);
  });

  appRoot.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files?.length) return;
    event.preventDefault();
    event.stopPropagation();
    const point = viewportPointToWorld(event.clientX, event.clientY);
    uploadAsReference(event.dataTransfer.files, point);
    setAICoreState("idle");
    appRootElement?.classList.remove("ai-core-awake");
    setUploadDragDepth(0);
  });

  window.addEventListener("dragend", () => {
    hideUploadModeBubbles();
    setPendingUploadChoice(null);
    setUploadModeHover(null);
    appRootElement?.classList.remove("ai-core-awake");
    setAICoreState("idle");
  });

  presetSkill?.addEventListener("click", () => {
    if (!promptInput) return;
    promptInput.value = presetSkillPrompt;
    promptInput.focus();
  });

  canvasWorld.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-director-action]");
    if (!button) return;
    const directorNode = button.closest(".node-director");
    if (!directorNode) return;

    event.preventDefault();
    event.stopPropagation();

    const actionType = button.dataset.directorAction;
    if (actionType === "refresh") {
      refreshDirectorOptions(directorNode);
      return;
    }

    button.classList.add("running");
    button.disabled = true;
    try {
      const actions = actionType === "all"
        ? directorActions
        : directorActions.filter((action) => action.type === actionType);
      for (const action of actions) {
        await runDirectorAction(directorNode, action);
      }
    } finally {
      button.classList.remove("running");
      button.disabled = false;
    }
  });

  imageEditCancel?.addEventListener("click", () => {
    onImageEditCancel();
  });

  imageEditSubmit?.addEventListener("click", () => {
    onImageEditSubmit();
  });
}
