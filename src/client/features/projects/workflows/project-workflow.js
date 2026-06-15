export function createProjectWorkflow(ctx) {
  const { state, projectRuntime, services = {}, elements = {}, ui = {}, chat = {} } = ctx;

  const {
    buildDemoProjects,
    hasDemoProjectsSeeded,
    markDemoProjectsSeeded,
    saveProjectsToStorage,
    makeProjectTitleFromPrompt,
    createProjectSavePatch,
    getProjectDisplayPrompt,
    getProjectDisplayTitle,
    getProjectPreview,
    makeDemoThumb,
    wrapProjectIndex,
    getLibraryTransitionDirection
  } = services;

  const {
    projectGrid,
    homeHistory,
    projectTitle,
    projectSaveStatus,
    canvasWorld,
    emptyState,
    appRoot,
    homeView,
    projectLibraryView,
    profileView,
    assetsPageView,
    promptInput,
    promptForm,
    chatModelSelect
  } = elements;

  const {
    applyProjectLibraryClasses,
    renderProjectLibraryContent,
    renderHomeHistoryContent,
    showProjectSaveStatus,
    applyViewState,
    addNode,
    markGeneratedNodeContext,
    removeNodeDeep,
    applyTransform = () => {},
    setChatCollapsed,
    updateProjectTitleView = () => {}
  } = ui;

  const {
    setChatImageFiles,
    getChatImageFiles,
    renderChatImagePreview,
    waitFor
  } = chat;

  function ensureDemoProjects() {
    const nextProjects = buildDemoProjects({
      projects: state.projects,
      escapeHtml: services.escapeHtml,
      hasSeeded: hasDemoProjectsSeeded,
      markSeeded: markDemoProjectsSeeded
    });
    if (nextProjects === state.projects) return;
    state.projects = nextProjects;
    projectRuntime?.replace?.(state.projects);
    saveProjectsToStorage(state.projects);
  }

  function createProject({ title = "Untitled Project", prompt = "", thumbnail = "" } = {}) {
    return projectRuntime.create({ title, prompt, thumbnail });
  }

  function getActiveProject() {
    return projectRuntime.getActive();
  }

  function updateActiveProject(patch = {}) {
    return projectRuntime.updateActive(patch, { title: "Fresh Ideas" });
  }

  function updateProjectTitle(project = getActiveProject()) {
    if (projectTitle) {
      projectTitle.textContent = project?.title || "Fresh Ideas";
    }
  }

  function commitProjectTitleEdit() {
    if (!projectTitle) return;
    const current = getActiveProject();
    const title = projectTitle.textContent.replace(/\s+/g, " ").trim() || current?.title || "Fresh Ideas";
    projectTitle.textContent = title;
    updateActiveProject({ title });
  }

  function saveCurrentProject() {
    const project = getActiveProject() || createProject({ title: "Fresh Ideas" });
    updateActiveProject(createProjectSavePatch({
      project,
      canvasWorld,
      selectedNode: state.selectedNode,
      projectTitleElement: projectTitle
    }));
    if (elements.projectMenu) elements.projectMenu.classList.remove("open");
    if (elements.brandMenu) elements.brandMenu.classList.remove("open");
    showProjectSaveStatus(projectSaveStatus);
  }

  function showView(view) {
    applyViewState({
      view,
      appRoot,
      homeView,
      projectLibraryView,
      profileView,
      assetsPageView
    });
    if (view !== "canvas") {
      setChatCollapsed(true);
      if (elements.projectMenu) elements.projectMenu.classList.remove("open");
    }
    if (elements.brandMenu) elements.brandMenu.classList.remove("open");
    if (view === "library") renderProjectLibrary();
  }

  function getProjectDisplayTitleForCard(project, index = 0) {
    return getProjectDisplayTitle(project, index, services.getProjectDisplayTitle);
  }

  function getProjectDisplayPromptText(project) {
    return getProjectDisplayPrompt(project, services.getProjectDisplayPrompt);
  }

  function getProjectPreviewImage(project, index = 0) {
    return getProjectPreview(project, index, {
      getTitle: getProjectDisplayTitleForCard,
      makeDemoThumb,
      escapeHtml: services.escapeHtml,
      getStoredPreview: services.getProjectPreview
    });
  }

  function renderProjectLibrary() {
    if (!projectGrid) return;
    applyProjectLibraryClasses(projectGrid, {
      mode: state.libraryViewMode,
      transitionDirection: state.libraryTransitionDirection
    });
    projectGrid.innerHTML = renderProjectLibraryContent({
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      mode: state.libraryViewMode,
      getProjectPreview: getProjectPreviewImage,
      getProjectDisplayTitle: getProjectDisplayTitleForCard,
      getProjectDisplayPrompt: getProjectDisplayPromptText,
      formatProjectDate: services.formatProjectDate
    });
  }

  function renderHomeHistory() {
    if (!homeHistory) return;
    homeHistory.innerHTML = renderHomeHistoryContent({
      projects: state.projects,
      getProjectPreview: getProjectPreviewImage,
      formatProjectDate: services.formatProjectDate
    });
  }

  function selectLibraryProject(index) {
    if (!state.projects.length) return;
    const nextIndex = wrapProjectIndex(index, state.projects.length);
    const currentIndex = Math.max(0, state.projects.findIndex((project) => project.id === state.activeProjectId));
    state.libraryTransitionDirection = getLibraryTransitionDirection({ currentIndex, nextIndex });
    state.activeProjectId = state.projects[nextIndex].id;
    renderProjectLibrary();
    window.setTimeout(() => {
      state.libraryTransitionDirection = 0;
      projectGrid?.classList.remove("switch-next", "switch-prev");
    }, 1500);
  }

  function stepLibraryProject(direction) {
    const currentIndex = Math.max(0, state.projects.findIndex((project) => project.id === state.activeProjectId));
    selectLibraryProject(currentIndex + direction);
  }

  function resetCanvasForProject() {
    state.selectedNodes.clear();
    state.selectedNode = null;
    if (canvasWorld) {
      canvasWorld.querySelectorAll(".node-card").forEach((node) => removeNodeDeep(node));
    }
    document.querySelectorAll(".canvas-ai-suggestions").forEach((item) => item.remove());
    if (emptyState) emptyState.classList.remove("hidden");
  }

  function openProject(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    if (!projectRuntime.setActive(project.id)) {
      state.activeProjectId = project.id;
    }
    resetCanvasForProject();
    showView("canvas");
    applyTransform();
    if (project.thumbnail) {
      const node = addNode({
        kind: "image",
        title: `${project.title}.png`,
        desc: project.prompt || "Project restore image",
        x: -160,
        y: -120,
        media: {
          url: project.thumbnail,
          name: `${project.title}.png`,
          type: "image/png"
        }
      });
      markGeneratedNodeContext(node, {
        prompt: project.prompt,
        actionType: "project_restore"
      });
    }
  }

  function deleteProject(projectId) {
    if (!projectId) return null;
    return projectRuntime.remove(projectId);
  }

  function newBlankProject() {
    const project = createProject({ title: "Fresh Ideas", prompt: "" });
    resetCanvasForProject();
    openProject(project.id);
  }

  function makeProjectTitle(prompt) {
    return makeProjectTitleFromPrompt(prompt);
  }

  async function generateHomeProject(prompt, model, files = []) {
    const project = createProject({ title: makeProjectTitle(prompt), prompt });
    if (elements.body) elements.body.classList.add("home-transitioning");
    await waitFor(260);
    resetCanvasForProject();
    showView("canvas");
    applyTransform();
    if (elements.body) {
      elements.body.classList.remove("home-transitioning");
      elements.body.classList.add("canvas-entering");
      window.setTimeout(() => elements.body.classList.remove("canvas-entering"), 620);
    }
    setChatCollapsed(false);
    if (model && chatModelSelect) chatModelSelect.value = model;
    setChatImageFiles(getImageFilesFromList(files));
    renderChatImagePreview();
    promptInput.value = prompt || (getChatImageFiles().length ? "Use uploaded images to generate a high-quality concept" : "");
    promptForm.requestSubmit();
    updateActiveProject({ itemCount: 1 });
    return project;
  }

  function syncProjectState() {
    if (!projectRuntime) return;
    state.projects = projectRuntime.list();
    state.activeProjectId = state.activeProjectId || (state.projects[0]?.id || "");
    updateProjectTitle(getActiveProject());
    renderProjectLibrary();
    renderHomeHistory();
    updateProjectTitleView(getActiveProject());
  }

  return {
    ensureDemoProjects,
    createProject,
    getActiveProject,
    updateActiveProject,
    updateProjectTitle,
    commitProjectTitleEdit,
    saveCurrentProject,
    showView,
    getProjectDisplayTitleForCard,
    getProjectDisplayPromptText,
    getProjectPreviewImage,
    renderProjectLibrary,
    renderHomeHistory,
    selectLibraryProject,
    stepLibraryProject,
    resetCanvasForProject,
    openProject,
    deleteProject,
    newBlankProject,
    makeProjectTitle,
    generateHomeProject,
    syncProjectState,
    getProjectDisplayTitle: getProjectDisplayTitleForCard,
    getProjectDisplayPrompt: getProjectDisplayPromptText,
    getProjectPreview: getProjectPreviewImage
  };
}

function getImageFilesFromList(files) {
  return Array.from(files || []).filter((item) => item?.type?.startsWith("image/") || /\.(?:png|jpe?g|webp|gif|bmp|heic)$/i.test(item?.name || ""));
}
