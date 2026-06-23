export function bindGlobalInteractions({
  documentRoot = document,
  windowRoot = window,
  appRoot,
  elements = {},
  state = {},
  actions = {}
} = {}) {
  const {
    projectMenu,
    brandMenu,
    homeModelPicker,
    appRootElement = appRoot
  } = elements;

  const {
    getPendingUploadChoice = () => null,
    setPendingUploadChoice = () => {},
    setUploadDragDepth = () => {}
  } = state;

  const {
    closeMenuWhenOutside = () => {},
    closeOpenImageToolbarMenus = () => {},
    hideUploadModeBubbles = () => {},
    setUploadModeHover = () => {},
    chooseUploadMode = () => {},
    toggleHomeModelPicker = () => {},
    chooseHomeModel = () => {},
    setActiveRailPanelButton = () => {},
    runCanvasTool = () => {},
    setShapeTool = () => {},
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    uploadAsReference = () => {},
    updateAICoreDragState = () => {},
    setAICoreState = () => {}
  } = actions;

  documentRoot.addEventListener("click", (event) => {
    if (event.target.closest("#homeUploadButton")) return;

    const modelButton = event.target.closest("#homeModelButton");
    if (modelButton) {
      event.stopPropagation();
      toggleHomeModelPicker(event);
      return;
    }

    const modelOption = event.target.closest("#homeModelMenu [data-model-value]");
    if (modelOption) {
      event.preventDefault();
      event.stopPropagation();
      chooseHomeModel(modelOption);
      return;
    }

    const toolButton = event.target.closest(".rail-btn[data-tool]");
    if (toolButton) {
      setActiveRailPanelButton(toolButton);
      if (toolButton.dataset.tool === "pen") {
        documentRoot.querySelectorAll("[data-pen-tool]").forEach((item) => item.classList.toggle("active", item.dataset.penTool === "pen"));
      }
      runCanvasTool(toolButton.dataset.tool);
      return;
    }

    const penToolButton = event.target.closest("[data-pen-tool]");
    if (penToolButton) {
      event.preventDefault();
      event.stopPropagation();
      documentRoot.querySelectorAll("[data-pen-tool]").forEach((item) => item.classList.remove("active"));
      penToolButton.classList.add("active");
      setActiveRailPanelButton(documentRoot.querySelector('.rail-btn[data-tool="pen"]'));
      runCanvasTool(penToolButton.dataset.penTool);
      return;
    }

    const shapeButton = event.target.closest("[data-shape-tool]");
    if (shapeButton) {
      event.preventDefault();
      event.stopPropagation();
      setShapeTool(shapeButton.dataset.shapeTool);
    }
  }, true);

  appRoot?.addEventListener("click", (event) => {
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
      closeOpenImageToolbarMenus(documentRoot);
    }
    if (!event.target.closest(".shape-format-toolbar")) {
      documentRoot.querySelector("#shapeFormatToolbar")?.classList.remove("picker-open");
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

  appRoot?.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    updateAICoreDragState(event.clientX, event.clientY);
  });

  appRoot?.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files?.length) return;
    event.preventDefault();
    event.stopPropagation();
    const point = viewportPointToWorld(event.clientX, event.clientY);
    uploadAsReference(event.dataTransfer.files, point);
    setAICoreState("idle");
    appRootElement?.classList.remove("ai-core-awake");
    setUploadDragDepth(0);
  });

  windowRoot.addEventListener("dragend", () => {
    hideUploadModeBubbles();
    setPendingUploadChoice(null);
    setUploadModeHover(null);
    appRootElement?.classList.remove("ai-core-awake");
    setAICoreState("idle");
  });

  if (homeModelPicker) {
    documentRoot.addEventListener("click", (event) => {
      if (!event.target.closest("#homeModelPicker") && !event.target.closest("#homeModelButton")) {
        homeModelPicker.classList.remove("open");
      }
    });
  }
}
