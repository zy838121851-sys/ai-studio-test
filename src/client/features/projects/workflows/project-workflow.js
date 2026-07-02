import {
  resolveImageModelId
} from "../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import {
  normalizePersistentMediaUrl
} from "../snapshot.js";
import {
  getProjectMediaUrls,
  projectHasRestorableCanvasContent,
  snapshotHasUnresolvedMedia,
  snapshotNeedsUrlRepair
} from "../snapshot-repair-utils.js";

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
  let generationAutosaveQueue = Promise.resolve();
  let projectSelectionMode = false;
  const selectedProjectIds = new Set();

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

  async function saveCurrentProject(options = {}) {
    const {
      pendingText = "\u4fdd\u5b58\u4e2d...",
      successText = "\u5df2\u4fdd\u5b58\u5230\u9879\u76ee\u5e93",
      failureText = null
    } = options;
    const project = getActiveProject() || createProject({ title: "Fresh Ideas" });
    showSaveStatus({ text: pendingText, tone: "pending", duration: 0 });
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
      text: result.ok ? successText : (failureText || getProjectPersistenceFailureText(result)),
      tone: result.ok ? "success" : "error",
      duration: result.ok ? 1600 : 4200
    });
    return result.ok;
  }

  function saveCurrentProjectAfterGeneration() {
    const autosave = generationAutosaveQueue
      .catch(() => false)
      .then(() => saveCurrentProject({
        pendingText: "\u6b63\u5728\u81ea\u52a8\u4fdd\u5b58...",
        successText: "\u5df2\u81ea\u52a8\u4fdd\u5b58\u5f53\u524d\u9879\u76ee",
        failureText: "\u81ea\u52a8\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u4fdd\u5b58"
      }));
    generationAutosaveQueue = autosave.catch((error) => {
      console.warn("[projects] Generation autosave failed", error);
      return false;
    });
    return autosave;
  }

  function showView(view) {
    if (view !== "canvas") {
      globalThis.document?.dispatchEvent?.(new CustomEvent("canvas:context-overlay-close", {
        detail: { reason: "view-change", view }
      }));
    }
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
    if (view !== "library" && projectSelectionMode) {
      projectSelectionMode = false;
      selectedProjectIds.clear();
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
    pruneProjectSelection();
    applyProjectLibraryClasses(projectGrid, {
      mode: "grid",
      transitionDirection: 0
    });
    projectGrid.innerHTML = renderProjectLibraryContent({
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      mode: "grid",
      selectionMode: projectSelectionMode,
      selectedProjectIds: Array.from(selectedProjectIds),
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

  function pruneProjectSelection() {
    const projectIds = new Set((state.projects || []).map((project) => project.id));
    Array.from(selectedProjectIds).forEach((projectId) => {
      if (!projectIds.has(projectId)) selectedProjectIds.delete(projectId);
    });
  }

  function setProjectSelectionMode(value) {
    projectSelectionMode = Boolean(value);
    if (!projectSelectionMode) selectedProjectIds.clear();
    renderProjectLibrary();
  }

  function toggleProjectSelection(projectId) {
    if (!projectId) return;
    projectSelectionMode = true;
    if (selectedProjectIds.has(projectId)) selectedProjectIds.delete(projectId);
    else selectedProjectIds.add(projectId);
    renderProjectLibrary();
  }

  function toggleAllProjectSelection() {
    const projectIds = (state.projects || []).map((project) => project.id).filter(Boolean);
    const allSelected = projectIds.length > 0 && projectIds.every((projectId) => selectedProjectIds.has(projectId));
    selectedProjectIds.clear();
    if (!allSelected) projectIds.forEach((projectId) => selectedProjectIds.add(projectId));
    projectSelectionMode = true;
    renderProjectLibrary();
  }

  function deleteSelectedProjects() {
    const projectIds = Array.from(selectedProjectIds);
    if (!projectIds.length) return;
    if (!window.confirm(`删除 ${projectIds.length} 个项目？此操作不可恢复。`)) return;
    projectSelectionMode = false;
    selectedProjectIds.clear();
    projectIds.forEach((projectId) => deleteProject(projectId));
    state.projects = projectRuntime.list();
    renderProjectLibrary();
    renderHomeHistory();
    updateProjectTitle(getActiveProject());
    updateProjectTitleView(getActiveProject());
  }

  function resetCanvasForProject({ showEmptyState = true } = {}) {
    globalThis.document?.dispatchEvent?.(new CustomEvent("canvas:context-overlay-close", {
      detail: { reason: "canvas-reset" }
    }));
    state.selectedNodes.clear();
    state.selectedNode = null;
    if (canvasWorld) {
      canvasWorld.querySelectorAll(".node-card").forEach((node) => removeNodeDeep(node));
    }
    document.querySelectorAll(".canvas-ai-suggestions").forEach((item) => item.remove());
    syncCanvasEmptyState({ allowShow: showEmptyState });
  }

  function syncCanvasEmptyState({ allowShow = true } = {}) {
    if (!emptyState) return;
    const hasNodes = Boolean(canvasWorld?.querySelector(".node-card"));
    emptyState.classList.toggle("hidden", !allowShow || hasNodes);
  }

  async function openProject(projectId) {
    let project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    const remoteProject = await fetchRemoteProject(project.id);
    if (remoteProject) project = remoteProject;
    const hasRestorableContent = projectHasRestorableCanvasContent(project);
    appRoot?.classList.add("canvas-restoring");
    try {
      await ensureAssetsReady?.();
      await preloadProjectMedia(project);
      if (!projectRuntime.setActive(project.id)) {
        state.activeProjectId = project.id;
      }
      resetCanvasForProject({ showEmptyState: !hasRestorableContent });
      const restoredCount = restoreCanvasSnapshotJson?.({
        snapshotJson: project.canvasSnapshotJson,
        addNode,
        canvasWorld,
        resolveAssetUrl: services.resolveAssetUrl,
        nodeOptions: {
          select: false,
          suppressEmptyState: true,
          openGeneratorPopover: false
        }
      }) || 0;
      let restoredFromThumbnail = false;
      const restoredThumbnail = normalizePersistentMediaUrl(project.thumbnail);
      if (!restoredCount && restoredThumbnail) {
        const node = addNode({
          kind: "image",
          title: `${project.title}.png`,
          desc: project.prompt || "Project restore image",
          x: -160,
          y: -120,
          media: {
            url: restoredThumbnail,
            name: `${project.title}.png`,
            type: "image/png"
          }
        }, {
          select: false,
          suppressEmptyState: true
        });
        markGeneratedNodeContext(node, {
          prompt: project.prompt,
          actionType: "project_restore"
        });
        restoredFromThumbnail = Boolean(node);
      }
      if (restoredCount || restoredFromThumbnail) {
        await persistRestoredSnapshotRepair(project);
      }
      showView("canvas");
      applyTransform();
      syncCanvasEmptyState({ allowShow: true });
    } finally {
      appRoot?.classList.remove("canvas-restoring");
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
    if (!projectRuntime.setActive(project.id)) {
      state.activeProjectId = project.id;
    }
    showView("canvas");
    updateProjectTitle(project);
    updateProjectTitleView(project);
    applyTransform();
    syncCanvasEmptyState();
  }

  function makeProjectTitle(prompt) {
    return makeProjectTitleFromPrompt(prompt);
  }

  async function generateHomeProject(prompt, model, files = []) {
    const generationModel = resolveImageModelId(model, "home");
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
    if (chatModelSelect) {
      chatModelSelect.value = generationModel;
      chatModelSelect.dataset.modelUserSelected = "true";
      chatModelSelect.dataset.selectedModelId = generationModel;
      chatModelSelect.__compactSelectSync?.();
      chatModelSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const imageFiles = getImageFilesFromList(files).slice(0, 3);
    setChatImageFiles(imageFiles);
    renderChatImagePreview();
    promptInput.value = prompt || (imageFiles.length ? "Use uploaded images to generate a high-quality concept" : "");
    promptForm.__pendingHomeGenerationFiles = imageFiles.slice();
    promptForm.__pendingHomeGenerationModel = generationModel;
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
    saveCurrentProjectAfterGeneration,
    showView,
    getProjectDisplayTitleForCard,
    getProjectDisplayPromptText,
    getProjectPreviewImage,
    renderProjectLibrary,
    renderHomeHistory,
    selectLibraryProject,
    stepLibraryProject,
    setProjectSelectionMode,
    toggleProjectSelection,
    toggleAllProjectSelection,
    deleteSelectedProjects,
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

async function preloadProjectMedia(project = {}, timeoutMs = 420) {
  const urls = getProjectMediaUrls(project);
  if (!urls.length || typeof Image !== "function") return;
  await Promise.race([
    Promise.allSettled(urls.map((url) => preloadImage(url))),
    new Promise((resolve) => setTimeout(resolve, timeoutMs))
  ]);
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
    if (typeof image.decode === "function") {
      image.decode().then(() => resolve(true)).catch(() => resolve(false));
    }
  });
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

