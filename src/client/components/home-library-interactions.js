export function bindHomeLibraryInteractions({
  documentRoot,
  elements,
  actions
}) {
  const {
    homeUploadButton,
    homeFileInput,
    homePromptForm,
    homePromptInput,
    homeModelButton,
    homeModelSelect,
    homeModelMenu,
    projectGrid,
    homeHistory,
    uploadAsset,
    assetUploadInput,
    chatUploadImage,
    chatImageInput,
    promptForm,
    homeModelPicker
  } = elements;

  const {
    setHomeFiles,
    syncHomeModelPicker,
    getHomeImageFiles,
    getLibraryViewMode,
    setLibraryViewModeInMemory,
    renderProjectLibrary,
    newBlankProject,
    saveCurrentProject,
    selectLibraryProject,
    stepLibraryProject,
    openProject,
    setLibraryWheelLock,
    getLibraryWheelLock,
    showView,
    uploadAsReference,
    addChatImageFiles,
    generateHomeProject,
    recordCanvasEvent,
    getChatDragDepth,
    setChatDragDepth,
    setLibraryViewModeStorage,
    getPendingUploadPoint,
    setPendingUploadPoint
  } = actions;

  homeUploadButton?.addEventListener("click", () => {
    homeFileInput?.click();
  });

  homeFileInput?.addEventListener("change", () => {
    setHomeFiles(homeFileInput.files);
    homeFileInput.value = "";
    homePromptInput?.focus();
  });

  homeModelButton?.addEventListener("click", (event) => {
    event.preventDefault();
    const open = !homeModelPicker.classList.contains("open");
    homeModelPicker.classList.toggle("open", open);
    homeModelButton.setAttribute("aria-expanded", String(open));
  });

  homeModelMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-model-value]");
    if (!button || !homeModelSelect) return;
    homeModelSelect.value = button.dataset.modelValue;
    syncHomeModelPicker();
    homeModelMenu.classList.remove("open");
    homeModelButton?.setAttribute("aria-expanded", "false");
    homePromptInput?.focus();
  });

  documentRoot.addEventListener("click", (event) => {
    if (!homeModelPicker?.contains(event.target)) {
      homeModelPicker?.classList.remove("open");
      homeModelButton?.setAttribute("aria-expanded", "false");
    }
  });

  homePromptForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = homePromptInput.value.trim();
    const files = getHomeImageFiles().slice();
    if (!prompt && !files.length) return;
    const model = homeModelSelect?.value;
    recordCanvasEvent("prompt_submitted", {
      source: "home",
      hasPrompt: Boolean(prompt),
      imageCount: files.length,
      model
    });
    homePromptInput.value = "";
    setHomeFiles([]);
    await generateHomeProject(prompt, model, files);
  });

  projectGrid?.addEventListener("click", (event) => {
    const newProject = event.target.closest("[data-new-project]");
    if (newProject) {
      newBlankProject();
      return;
    }
    const saveProject = event.target.closest("[data-save-project]");
    if (saveProject) {
      saveCurrentProject();
      return;
    }
    const modeButton = event.target.closest("[data-library-mode]");
    if (modeButton) {
      const nextMode = modeButton.dataset.libraryMode;
      setLibraryViewModeInMemory(nextMode);
      setLibraryViewModeStorage(nextMode);
      renderProjectLibrary();
      return;
    }
    const timelineItem = event.target.closest("[data-library-index]");
    if (timelineItem) {
      selectLibraryProject(Number(timelineItem.dataset.libraryIndex));
      return;
    }
    const stepButton = event.target.closest("[data-library-step]");
    if (stepButton) {
      stepLibraryProject(Number(stepButton.dataset.libraryStep));
      return;
    }
    const open = event.target.closest("[data-open-project]");
    if (open) openProject(open.dataset.openProject);
  });

    projectGrid?.addEventListener("wheel", (event) => {
    if (
      getLibraryViewMode() !== "stack" ||
      document.body.dataset.view !== "library" ||
      !event.target.closest(".project-stack, .project-timeline")
    ) return;
    event.preventDefault();
    if (getLibraryWheelLock()) return;
    setLibraryWheelLock(true);
    stepLibraryProject(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => {
      setLibraryWheelLock(false);
    }, 900);
  }, { passive: false });

  homeHistory?.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav-view]");
    if (nav) {
      showView(nav.dataset.navView === "library" ? "library" : nav.dataset.navView);
      return;
    }
    const card = event.target.closest("[data-open-project]");
    if (card) openProject(card.dataset.openProject);
  });

  uploadAsset.addEventListener("click", () => {
    setPendingUploadPoint(null);
    assetUploadInput.click();
  });

  assetUploadInput.addEventListener("change", () => {
    const point = getPendingUploadPoint();
    uploadAsReference(assetUploadInput.files, point);
    setPendingUploadPoint(null);
    assetUploadInput.value = "";
  });

  chatUploadImage.addEventListener("click", () => {
    chatImageInput.click();
  });

  chatImageInput.addEventListener("change", () => {
    addChatImageFiles(chatImageInput.files);
    chatImageInput.value = "";
  });

  promptForm.addEventListener("dragenter", (event) => {
    if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
    event.preventDefault();
    setChatDragDepth(getChatDragDepth() + 1);
    promptForm.classList.add("drag-over");
  });

  promptForm.addEventListener("dragover", (event) => {
    if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    promptForm.classList.add("drag-over");
  });

  promptForm.addEventListener("dragleave", () => {
    setChatDragDepth(Math.max(0, getChatDragDepth() - 1));
    if (!getChatDragDepth()) promptForm.classList.remove("drag-over");
  });

  promptForm.addEventListener("drop", (event) => {
    event.preventDefault();
    addChatImageFiles(event.dataTransfer.files);
    promptForm.classList.remove("drag-over");
    setChatDragDepth(0);
  });
}
