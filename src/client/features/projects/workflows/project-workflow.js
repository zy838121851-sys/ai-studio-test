export function createProjectWorkflow(ctx) {
  const { state, projectRuntime, services = {}, elements = {}, ui = {}, chat = {} } = ctx;

  const {
    buildDemoProjects,
    hasDemoProjectsSeeded,
    markDemoProjectsSeeded,
    saveProjectsToStorage,
    remoteProjectsEnabled = false,
    makeProjectTitleFromPrompt,
    createProjectSavePatch,
    restoreCanvasSnapshotJson,
    listRemoteProjects,
    createRemoteProject,
    getRemoteProject,
    updateRemoteProject,
    deleteRemoteProject,
    saveRemoteProjectCanvas,
    getProjectDisplayPrompt,
    getProjectDisplayTitle,
    getProjectPreview,
    makeDemoThumb,
    wrapProjectIndex,
    getLibraryTransitionDirection,
    ensureAssetsReady
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
    updateProjectTitleView = () => {},
    setPendingHomeGenerationFocus = () => {}
  } = ui;

  const {
    setChatImageFiles,
    getChatImageFiles,
    renderChatImagePreview,
    waitFor
  } = chat;

  const pendingProjectCreates = new Map();

  function ensureDemoProjects() {
    if (remoteProjectsEnabled) return;
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
    const project = projectRuntime.create({ title, prompt, thumbnail });
    const createPromise = trackPendingProjectCreate(project.id, persistProjectCreate(project));
    createPromise.then((result) => {
      if (result.ok) return;
      showSaveStatus({
        text: getProjectPersistenceFailureText(result, "项目暂未保存，请稍后重试"),
        tone: "error",
        duration: 3600
      });
    });
    return project;
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
    const project = updateActiveProject({ title });
    persistProjectUpdate(project, { title });
  }

  async function saveCurrentProject() {
    const project = getActiveProject() || createProject({ title: "Fresh Ideas" });
    showSaveStatus({ text: "保存中...", tone: "pending", duration: 0 });
    await waitForPendingCanvasUploads(canvasWorld);
    const patch = createProjectSavePatch({
      project,
      canvasWorld,
      selectedNode: state.selectedNode,
      projectTitleElement: projectTitle,
      resolveAssetUrl: services.resolveAssetUrl
    });
    const updatedProject = updateActiveProject(patch);
    if (elements.projectMenu) elements.projectMenu.classList.remove("open");
    if (elements.brandMenu) elements.brandMenu.classList.remove("open");
    await waitForPendingProjectCreate(updatedProject?.id);
    const result = await persistCanvasSnapshot(updatedProject, patch);
    showSaveStatus({
      text: result.ok ? "已保存到项目库" : getProjectPersistenceFailureText(result),
      tone: result.ok ? "success" : "error",
      duration: result.ok ? 1600 : 4200
    });
    return result.ok;
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

  async function openProject(projectId) {
    let project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    const remoteProject = await fetchRemoteProject(project.id);
    if (remoteProject) project = remoteProject;
    if (!projectRuntime.setActive(project.id)) {
      state.activeProjectId = project.id;
    }
    resetCanvasForProject();
    showView("canvas");
    applyTransform();
    await ensureAssetsReady?.();
    const restoredCount = restoreCanvasSnapshotJson?.({
      snapshotJson: project.canvasSnapshotJson,
      addNode,
      canvasWorld,
      resolveAssetUrl: services.resolveAssetUrl
    }) || 0;
    if (!restoredCount && project.thumbnail) {
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
    if (restoredCount) {
      await persistRestoredSnapshotRepair(project);
    }
  }

  function deleteProject(projectId) {
    if (!projectId) return null;
    const previousProjects = Array.from(state.projects || []);
    const previousActiveProjectId = state.activeProjectId;
    const removed = projectRuntime.remove(projectId);
    if (!removed) return null;
    persistProjectDelete(projectId).then((result) => {
      if (result.ok) return;
      restoreProjectState(previousProjects, previousActiveProjectId);
    });
    return removed;
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
    const imageFiles = getImageFilesFromList(files).slice(0, 3);
    setChatImageFiles(imageFiles);
    renderChatImagePreview();
    promptInput.value = prompt || (imageFiles.length ? "Use uploaded images to generate a high-quality concept" : "");
    promptForm.__pendingHomeGenerationFiles = imageFiles.slice();
    setPendingHomeGenerationFocus(true);
    promptForm.requestSubmit();
    const updatedProject = updateActiveProject({ itemCount: 1 });
    persistProjectUpdate(updatedProject, { itemCount: 1 });
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

  async function syncRemoteProjects() {
    if (!projectRuntime || typeof listRemoteProjects !== "function") return false;
    try {
      const result = await listRemoteProjects();
      const projects = Array.isArray(result.projects) ? result.projects : [];
      projectRuntime.replace(projects);
      state.projects = projectRuntime.list();
      state.activeProjectId = projectRuntime.getActive()?.id || "";
      updateProjectTitle(getActiveProject());
      renderProjectLibrary();
      renderHomeHistory();
      updateProjectTitleView(getActiveProject());
      return true;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to load remote projects", error);
      return false;
    }
  }

  async function fetchRemoteProject(projectId) {
    if (!projectId || typeof getRemoteProject !== "function") return null;
    try {
      const result = await getRemoteProject(projectId);
      if (result?.project) mergeProject(result.project);
      return result?.project || null;
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) {
        console.warn("Failed to open remote project", error);
      }
      return null;
    }
  }

  async function persistProjectCreate(project) {
    if (!project) return { ok: false };
    if (typeof createRemoteProject !== "function") return { ok: true, skipped: true };
    try {
      const result = await createRemoteProject(project);
      if (result.project) mergeProject(result.project);
      return { ok: true };
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to create remote project", error);
      return { ok: false, status: error?.status || 0 };
    }
  }

  async function persistProjectUpdate(project, patch = {}) {
    if (!project?.id) return { ok: false };
    if (typeof updateRemoteProject !== "function") return { ok: true, skipped: true };
    try {
      const result = await updateRemoteProject(project.id, patch);
      if (result.project) mergeProject(result.project);
      return { ok: true };
    } catch (error) {
      if (error?.status === 404) return persistProjectCreate(project);
      if (error?.status !== 401) console.warn("Failed to update remote project", error);
      return { ok: false, status: error?.status || 0 };
    }
  }

  async function persistCanvasSnapshot(project, patch = {}) {
    if (!project?.id) return { ok: false };
    if (typeof saveRemoteProjectCanvas !== "function") return { ok: true, skipped: true };
    try {
      const result = await saveRemoteProjectCanvas(project.id, patch);
      if (result.project) mergeProject(result.project);
      return { ok: true };
    } catch (error) {
      if (error?.status === 404) {
        const created = await persistProjectCreate(project);
        if (created.ok) return persistCanvasSnapshot(project, patch);
        return created;
      }
      if (error?.status !== 401) console.warn("Failed to save remote project canvas", error);
      return { ok: false, status: error?.status || 0 };
    }
  }

  async function persistProjectDelete(projectId) {
    if (!projectId || typeof deleteRemoteProject !== "function") return { ok: true, skipped: true };
    try {
      await deleteRemoteProject(projectId);
      return { ok: true };
    } catch (error) {
      if (error?.status === 404) return { ok: true, missingRemote: true };
      if (error?.status !== 401 && error?.status !== 404) {
        console.warn("Failed to delete remote project", error);
      }
      return { ok: false, status: error?.status || 0 };
    }
  }

  function restoreProjectState(projects, activeProjectId) {
    projectRuntime.replace(projects);
    state.projects = projectRuntime.list();
    if (activeProjectId && projectRuntime.setActive(activeProjectId)) {
      state.activeProjectId = activeProjectId;
    } else {
      state.activeProjectId = projectRuntime.getActive()?.id || "";
    }
    updateProjectTitle(getActiveProject());
    renderProjectLibrary();
    renderHomeHistory();
    updateProjectTitleView(getActiveProject());
  }

  function trackPendingProjectCreate(projectId, promise) {
    if (!projectId || !promise || typeof promise.then !== "function") return promise;
    pendingProjectCreates.set(projectId, promise);
    promise.finally(() => {
      if (pendingProjectCreates.get(projectId) === promise) {
        pendingProjectCreates.delete(projectId);
      }
    });
    return promise;
  }

  async function waitForPendingProjectCreate(projectId) {
    const pendingCreate = pendingProjectCreates.get(projectId);
    if (!pendingCreate) return { ok: true, skipped: true };
    return pendingCreate;
  }

  function showSaveStatus(options = {}) {
    showProjectSaveStatus(projectSaveStatus, options);
  }

  function getProjectPersistenceFailureText(result = {}, fallback = "保存失败，请稍后重试") {
    if (result.status === 401) return "请先登录，再保存项目";
    return fallback;
  }

  function mergeProject(project) {
    if (!project?.id || !projectRuntime) return null;
    const nextProjects = Array.from(state.projects || []);
    const index = nextProjects.findIndex((item) => item.id === project.id);
    if (index >= 0) {
      nextProjects[index] = { ...nextProjects[index], ...project };
    } else {
      nextProjects.unshift(project);
    }
    projectRuntime.replace(nextProjects);
    state.projects = projectRuntime.list();
    state.activeProjectId = projectRuntime.getActive()?.id || state.activeProjectId;
    return project;
  }

  async function persistRestoredSnapshotRepair(project) {
    if (!snapshotNeedsUrlRepair(project?.canvasSnapshotJson)) return false;
    await waitForPendingCanvasUploads(canvasWorld);
    const patch = createProjectSavePatch({
      project,
      canvasWorld,
      selectedNode: state.selectedNode,
      projectTitleElement: projectTitle,
      resolveAssetUrl: services.resolveAssetUrl
    });
    if (snapshotHasUnresolvedMedia(patch.canvasSnapshotJson)) return false;
    const updatedProject = updateActiveProject(patch);
    return persistCanvasSnapshot(updatedProject, patch);
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
    syncRemoteProjects,
    getProjectDisplayTitle: getProjectDisplayTitleForCard,
    getProjectDisplayPrompt: getProjectDisplayPromptText,
    getProjectPreview: getProjectPreviewImage
  };
}

function getImageFilesFromList(files) {
  return Array.from(files || []).filter((item) => item?.type?.startsWith("image/") || /\.(?:png|jpe?g|webp|gif|bmp|heic)$/i.test(item?.name || ""));
}

async function waitForPendingCanvasUploads(canvasWorld) {
  const pendingUploads = Array.from(canvasWorld?.querySelectorAll?.(".node-card") || [])
    .flatMap((node) => [
      node?._uploadPersistencePromise,
      node?._generatedImageLocalizationPromise,
      node?._generatedAssetPersistencePromise
    ])
    .filter((promise) => promise && typeof promise.then === "function");
  if (!pendingUploads.length) return;
  await Promise.allSettled(pendingUploads);
}

function snapshotNeedsUrlRepair(snapshotJson = "") {
  const snapshot = parseSnapshotJson(snapshotJson);
  return Array.isArray(snapshot?.nodes) && snapshot.nodes.some((node) => (
    isMediaSnapshotNode(node)
    && (!hasStableMediaUrl(node?.media?.url) || containsTransientUrl(node))
  ));
}

function snapshotHasUnresolvedMedia(snapshotJson = "") {
  const snapshot = parseSnapshotJson(snapshotJson);
  return Array.isArray(snapshot?.nodes) && snapshot.nodes.some((node) => (
    isMediaSnapshotNode(node) && !hasStableMediaUrl(node?.media?.url)
  ));
}

function parseSnapshotJson(snapshotJson = "") {
  if (!snapshotJson) return null;
  try {
    const parsed = typeof snapshotJson === "string" ? JSON.parse(snapshotJson) : snapshotJson;
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch {
    return null;
  }
}

function isMediaSnapshotNode(node = {}) {
  const kind = String(node.kind || node.dataset?.kind || "").toLowerCase();
  const html = String(node.html || "");
  return kind === "image"
    || kind === "video"
    || /<(?:img|video)\b/i.test(html);
}

function hasStableMediaUrl(url = "") {
  const value = String(url || "").trim();
  return Boolean(value && !value.startsWith("blob:"));
}

function containsTransientUrl(value) {
  return JSON.stringify(value || {}).includes("blob:");
}
