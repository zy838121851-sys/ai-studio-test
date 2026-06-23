export function bindHomeLibraryInteractions({
  documentRoot,
  elements,
  actions
}) {
  const {
    homeModelButton,
    projectGrid,
    homeView,
    homeHistory,
    homeBackTop,
    uploadAsset,
    assetUploadInput,
    chatUploadImage,
    chatImageInput,
    promptForm,
    homeModelPicker
  } = elements;

  const {
    getLibraryViewMode,
    setLibraryViewModeInMemory,
    renderProjectLibrary,
    newBlankProject,
    saveCurrentProject,
    selectLibraryProject,
    stepLibraryProject,
    openProject,
    deleteProject,
    setLibraryWheelLock,
    getLibraryWheelLock,
    showView,
    uploadAsReference,
    addChatImageFiles,
    getChatDragDepth,
    setChatDragDepth,
    setLibraryViewModeStorage,
    renderHomeHistory,
    getPendingUploadPoint,
    setPendingUploadPoint
  } = actions;

  const safeBind = (label, bind) => {
    try {
      bind();
    } catch (error) {
      console.warn(`[home-library-interactions] ${label} binding failed`, error);
    }
  };

  safeBind("home model picker", () => {
    documentRoot?.addEventListener("click", (event) => {
      if (!homeModelPicker?.contains(event.target)) {
        homeModelPicker?.classList.remove("open");
        homeModelButton?.setAttribute("aria-expanded", "false");
      }
    });
  });

  safeBind("home back to top", () => {
    if (!homeView || !homeBackTop) return;
    const syncBackTop = () => {
      homeBackTop.classList.toggle("show", homeView.scrollTop > 280);
    };
    homeView.addEventListener("scroll", syncBackTop, { passive: true });
    homeBackTop.addEventListener("click", () => {
      homeView.scrollTo({ top: 0, behavior: "smooth" });
    });
    syncBackTop();
  });

  safeBind("project library", () => {
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
        (setLibraryViewModeStorage || setLibraryViewModeInMemory)(nextMode);
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
        documentRoot?.body?.dataset.view !== "library" ||
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
  });

  homeHistory?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-project]");
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const card = deleteButton.closest(".home-history-card");
      deleteButton.disabled = true;
      card?.classList.add("is-removing");
      globalThis.setTimeout?.(() => {
        if (typeof renderHomeHistory === "function") {
          renderHomeHistory();
        } else if (card?.isConnected) {
          card.remove();
        }
      }, 160);
      const deleteAction = deleteProject || globalThis.AIStudioCompatibilityBridge?.deleteProject;
      deleteAction?.(deleteButton.dataset.deleteProject);
      return;
    }
    const newProject = event.target.closest("[data-new-project]");
    if (newProject) {
      newBlankProject();
      return;
    }
    const nav = event.target.closest("[data-nav-view]");
    if (nav) {
      showView(nav.dataset.navView === "library" ? "library" : nav.dataset.navView);
      return;
    }
    const card = event.target.closest("[data-open-project]");
    if (card) openProject(card.dataset.openProject);
  });

  uploadAsset?.addEventListener("click", () => {
    setPendingUploadPoint(null);
    if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "library";
    assetUploadInput?.click();
  });

  assetUploadInput?.addEventListener("change", () => {
    if (
      assetUploadInput.dataset.uploadIntent === "library"
      || assetUploadInput.dataset.uploadHandledByLibrary === "true"
    ) {
      return;
    }
    const point = getPendingUploadPoint();
    uploadAsReference(assetUploadInput.files, point);
    setPendingUploadPoint(null);
    delete assetUploadInput.dataset.uploadIntent;
    assetUploadInput.value = "";
  });

  chatUploadImage?.addEventListener("click", () => {
    chatImageInput?.click();
  });

  chatImageInput?.addEventListener("change", () => {
    addChatImageFiles(chatImageInput.files);
    chatImageInput.value = "";
  });

  promptForm?.addEventListener("dragenter", (event) => {
    if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
    event.preventDefault();
    setChatDragDepth(getChatDragDepth() + 1);
    promptForm.classList.add("drag-over");
  });

  promptForm?.addEventListener("dragover", (event) => {
    if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    promptForm.classList.add("drag-over");
  });

  promptForm?.addEventListener("dragleave", () => {
    setChatDragDepth(Math.max(0, getChatDragDepth() - 1));
    if (!getChatDragDepth()) promptForm.classList.remove("drag-over");
  });

  promptForm?.addEventListener("drop", (event) => {
    event.preventDefault();
    addChatImageFiles(event.dataTransfer.files);
    promptForm.classList.remove("drag-over");
    setChatDragDepth(0);
  });
}
