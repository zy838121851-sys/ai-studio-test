import {
  assetTypeFromMime,
  normalizeAssets,
  normalizeCollection,
  normalizeCollections
} from "./asset-library-normalizers.js";

export function createAssetLibraryRuntime({
  eventBus,
  assetList,
  pageAssetList,
  pageUploadButton,
  assetUploadInput,
  assets = [],
  getAssets,
  setAssets,
  getActiveProjectId = () => "",
  getProjects = () => [],
  renderAssetLibraryFn,
  floatingLibrary,
  escapeHtml,
  listRemoteAssets,
  uploadRemoteAsset,
  registerGeneratedAsset,
  deleteRemoteAsset,
  addRemoteAssetToProject,
  listRemoteAssetCollections,
  createRemoteAssetCollection,
  updateRemoteAssetCollection,
  deleteRemoteAssetCollection,
  listRemoteCollectionAssets,
  moveRemoteAssetToCollection,
  insertAssetToCanvas = () => null,
  openProject = null,
  saveCurrentProject = null
} = {}) {
  const safeRenderAssetLibrary = typeof renderAssetLibraryFn === "function" ? renderAssetLibraryFn : () => {};
  const safeEvents = eventBus && typeof eventBus.emit === "function" ? eventBus : null;
  const fallbackAssets = Array.isArray(assets) ? assets : [];
  const collections = [];
  let activeCollectionId = "";
  let assetPageMode = "boards";
  let assetSelectionMode = false;
  const selectedAssetIds = new Set();

  const getAssetLists = () => [assetList, pageAssetList].filter(Boolean);
  const getAssetsPageView = () => pageAssetList?.closest?.(".assets-page-view") || document.querySelector("#assetsPageView");
  const getFloatingLibrary = () => floatingLibrary;
  const safeEscapeHtml = escapeHtml || ((value) => String(value ?? ""));
  const readCollections = () => collections.slice();
  const getActiveCollectionId = () => activeCollectionId;
  const readAssets = () => {
    const value = typeof getAssets === "function" ? getAssets() : fallbackAssets;
    return Array.isArray(value) ? value : [];
  };
  const writeAssets = (nextAssets = []) => {
    if (typeof setAssets === "function") setAssets(nextAssets);
    fallbackAssets.length = 0;
    fallbackAssets.push(...nextAssets);
  };
  const getVisibleAssetIds = () => {
    const assets = readAssets();
    if (assetPageMode === "recent") {
      return assets
        .filter((asset) => asset.isFavorite || asset.favorite || asset.collectionName || asset.source === "generated")
        .map((asset) => asset.id)
        .filter(Boolean);
    }
    return assets.map((asset) => asset.id).filter(Boolean);
  };

  function pruneAssetSelection(currentAssets = readAssets()) {
    const assetIds = new Set((currentAssets || []).map((asset) => asset.id));
    Array.from(selectedAssetIds).forEach((assetId) => {
      if (!assetIds.has(assetId)) selectedAssetIds.delete(assetId);
    });
    if (assetPageMode === "boards" && !activeCollectionId) {
      assetSelectionMode = false;
      selectedAssetIds.clear();
    }
  }

  function setAssetSelectionMode(value) {
    assetSelectionMode = Boolean(value) && (assetPageMode !== "boards" || Boolean(activeCollectionId));
    if (!assetSelectionMode) selectedAssetIds.clear();
    renderAssets();
  }

  function toggleAssetSelection(assetId) {
    if (!assetId || (assetPageMode === "boards" && !activeCollectionId)) return;
    assetSelectionMode = true;
    if (selectedAssetIds.has(assetId)) selectedAssetIds.delete(assetId);
    else selectedAssetIds.add(assetId);
    renderAssets();
  }

  function toggleAllAssetSelection() {
    const visibleAssetIds = getVisibleAssetIds();
    const allSelected = visibleAssetIds.length > 0 && visibleAssetIds.every((assetId) => selectedAssetIds.has(assetId));
    selectedAssetIds.clear();
    if (!allSelected) visibleAssetIds.forEach((assetId) => selectedAssetIds.add(assetId));
    assetSelectionMode = true;
    renderAssets();
  }

  async function deleteSelectedAssets() {
    const assetIds = Array.from(selectedAssetIds);
    if (!assetIds.length) return;
    if (!window.confirm(`Delete ${assetIds.length} assets? This cannot be undone.`)) return;
    assetSelectionMode = false;
    selectedAssetIds.clear();
    for (const assetId of assetIds) {
      await removeAsset(assetId);
    }
    renderAssets();
  }

  function renderAssets() {
    const currentAssets = readAssets();
    const currentCollections = readCollections();
    pruneAssetSelection(currentAssets);
    getAssetLists().forEach((list) => {
      const isAssetsPageList = list === pageAssetList || list?.classList?.contains("assets-page-list");
      safeRenderAssetLibrary({
        assetList: list,
        assets: currentAssets,
        collections: currentCollections,
        activeCollectionId,
        assetPageMode,
        activeProjectId: getActiveProjectId(),
        selectionMode: isAssetsPageList && assetSelectionMode && (assetPageMode !== "boards" || Boolean(activeCollectionId)),
        selectedAssetIds: isAssetsPageList ? Array.from(selectedAssetIds) : [],
        escapeHtml: safeEscapeHtml
      });
    });
    if (safeEvents?.emit) {
      getAssetLists().forEach((list) => {
        safeEvents.emit("assets:render", {
          assets: currentAssets,
          collections: currentCollections,
          activeCollectionId,
          assetPageMode,
          activeProjectId: getActiveProjectId(),
          assetList: list
        });
      });
    }
    bindAssetListInteractions();
  }

  function openAssetLibraryPanel(point = null) {
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      return openAssetPickerPanel(point);
    }
    renderAssets();
    getFloatingLibrary()?.classList.add("open");
    return getFloatingLibrary();
  }

  function openAssetPickerPanel(point = null) {
    closeAssetPickerPanel();
    const picker = document.createElement("div");
    picker.className = "asset-picker-popover";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-modal", "true");
    picker.setAttribute("aria-label", "选择素材");
    picker.innerHTML = `
      <button class="asset-picker-backdrop" type="button" data-close-asset-picker aria-label="关闭"></button>
      <div class="asset-picker-card">
        <div class="asset-picker-head">
          <div>
            <strong>选择素材</strong>
            <span>插入到当前画布</span>
          </div>
          <button type="button" data-close-asset-picker aria-label="关闭">×</button>
        </div>
        <div class="asset-picker-list">
          ${renderAssetPickerItems(readAssets())}
        </div>
      </div>
    `;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeAssetPickerPanel();
    };
    picker.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-asset-picker]")) {
        closeAssetPickerPanel();
        return;
      }
      const button = event.target.closest("[data-pick-asset]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      insertAsset(button.dataset.pickAsset, point);
      closeAssetPickerPanel();
    });
    picker._assetPickerKeydown = onKeyDown;
    document.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(picker);
    return picker;
  }

  function closeAssetPickerPanel() {
    const picker = document.querySelector(".asset-picker-popover");
    if (!picker) return;
    if (picker._assetPickerKeydown) {
      document.removeEventListener("keydown", picker._assetPickerKeydown, true);
    }
    picker.remove();
  }

  function renderAssetPickerItems(items = []) {
    const availableAssets = Array.isArray(items) ? items.filter((asset) => asset?.id) : [];
    if (!availableAssets.length) {
      return `
        <div class="asset-picker-empty">
          <strong>素材库暂无素材</strong>
          <span>先从素材库页面上传或收藏素材。</span>
        </div>
      `;
    }
    return availableAssets.map((asset) => {
      const thumb = asset.thumbnailUrl || asset.thumbnail || asset.url || "";
      const title = asset.title || asset.name || "Untitled asset";
      const desc = asset.collectionName || asset.collection || asset.prompt || asset.desc || asset.source || asset.type || "";
      return `
        <button class="asset-picker-item" type="button" data-pick-asset="${safeEscapeHtml(asset.id)}">
          <span class="asset-picker-thumb">
            ${thumb ? `<img src="${safeEscapeHtml(thumb)}" alt="${safeEscapeHtml(title)}" draggable="false" />` : `<i>${safeEscapeHtml(String(asset.type || "ASSET").slice(0, 5).toUpperCase())}</i>`}
          </span>
          <span class="asset-picker-meta">
            <strong>${safeEscapeHtml(title)}</strong>
            <small>${safeEscapeHtml(desc)}</small>
          </span>
        </button>
      `;
    }).join("");
  }

  function closeAssetLibraryPanel() {
    getFloatingLibrary()?.classList.remove("open");
  }

  async function syncRemoteAssets() {
    if (typeof listRemoteAssets !== "function") return false;
    try {
      await syncRemoteCollections();
      const result = activeCollectionId && typeof listRemoteCollectionAssets === "function"
        ? await listRemoteCollectionAssets(activeCollectionId)
        : await listRemoteAssets();
      writeAssets(normalizeAssets(result.assets || []));
      renderAssets();
      return true;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to load remote assets", error);
      if (error?.status === 401) {
        writeAssets([]);
        collections.length = 0;
        activeCollectionId = "";
        assetPageMode = "boards";
      }
      renderAssets();
      return false;
    }
  }

  async function syncAllRemoteAssets() {
    if (typeof listRemoteAssets !== "function") return false;
    try {
      await syncRemoteCollections();
      const result = await listRemoteAssets();
      writeAssets(normalizeAssets(result.assets || []));
      renderAssets();
      return true;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to load remote assets", error);
      if (error?.status === 401) {
        writeAssets([]);
        collections.length = 0;
        activeCollectionId = "";
        assetPageMode = "boards";
      }
      renderAssets();
      return false;
    }
  }

  async function uploadAssetFile(file, metadata = {}) {
    if (!file || typeof uploadRemoteAsset !== "function") return null;
    try {
      const result = await uploadRemoteAsset(file, {
        projectId: metadata.projectId || getActiveProjectId(),
        collectionId: metadata.collectionId !== undefined ? metadata.collectionId : activeCollectionId,
        type: metadata.type || assetTypeFromMime(file.type),
        title: metadata.title || file.name || "Uploaded asset",
        collection: metadata.collection || "",
        source: metadata.source || "upload"
      });
      if (result.asset) return mergeAsset(result.asset);
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to upload asset", error);
    }
    return null;
  }

  async function registerGeneratedAssetRecord(payload = {}) {
    if (typeof registerGeneratedAsset !== "function") return null;
    const defaultToActiveCollection = payload.libraryVisible !== false;
    try {
      const result = await registerGeneratedAsset({
        projectId: payload.projectId || getActiveProjectId(),
        type: payload.type || "image",
        source: payload.source || "generated",
        title: payload.title || "Generated image",
        url: payload.url,
        dataUrl: payload.dataUrl,
        thumbnailUrl: payload.thumbnailUrl || payload.url,
        prompt: payload.prompt || "",
        modelName: payload.modelName || payload.model || "",
        libraryVisible: payload.libraryVisible,
        collection: payload.collection || "",
        collectionId: payload.collectionId !== undefined
          ? payload.collectionId
          : (defaultToActiveCollection ? activeCollectionId : "")
      });
      if (result.asset) return mergeAsset(result.asset);
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to register generated asset", error);
    }
    return null;
  }

  async function removeAsset(assetId) {
    if (!assetId) return null;
    const previous = readAssets();
    writeAssets(previous.filter((asset) => asset.id !== assetId));
    renderAssets();
    if (typeof deleteRemoteAsset !== "function") return null;
    try {
      const result = await deleteRemoteAsset(assetId);
      return result.asset || null;
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) {
        console.warn("Failed to delete asset", error);
        writeAssets(previous);
        renderAssets();
      }
      if (error?.status === 401) {
        writeAssets([]);
        collections.length = 0;
        activeCollectionId = "";
        assetPageMode = "boards";
        renderAssets();
      }
      return null;
    }
  }

  async function bindAssetToCurrentProject(assetId, projectId = getActiveProjectId()) {
    if (!assetId || !projectId || typeof addRemoteAssetToProject !== "function") return null;
    try {
      const result = await addRemoteAssetToProject(assetId, projectId);
      if (result.asset) return mergeAsset(result.asset);
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) {
        console.warn("Failed to bind asset to project", error);
      }
    }
    return null;
  }

  async function syncRemoteCollections() {
    if (typeof listRemoteAssetCollections !== "function") return false;
    try {
      const result = await listRemoteAssetCollections();
      collections.length = 0;
      collections.push(...normalizeCollections(result.collections || []));
      if (activeCollectionId && !collections.some((collection) => collection.id === activeCollectionId)) {
        activeCollectionId = "";
      }
      return true;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to load asset collections", error);
      return false;
    }
  }

  async function createCollection(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName || typeof createRemoteAssetCollection !== "function") return null;
    try {
      const result = await createRemoteAssetCollection({ name: cleanName });
      if (!result.collection) return null;
      const collection = normalizeCollection(result.collection);
      collections.push(collection);
      await syncRemoteCollections();
      renderAssets();
      return collection;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to create asset collection", error);
      return null;
    }
  }

  async function renameCollection(collectionId, name) {
    const cleanName = String(name || "").trim();
    if (!collectionId || !cleanName || typeof updateRemoteAssetCollection !== "function") return null;
    try {
      const result = await updateRemoteAssetCollection(collectionId, { name: cleanName });
      if (!result.collection) return null;
      const collection = normalizeCollection(result.collection);
      const index = collections.findIndex((item) => item.id === collection.id);
      if (index >= 0) collections[index] = collection;
      renderAssets();
      return collection;
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) console.warn("Failed to rename asset collection", error);
      return null;
    }
  }

  async function removeCollection(collectionId) {
    if (!collectionId || typeof deleteRemoteAssetCollection !== "function") return null;
    try {
      const result = await deleteRemoteAssetCollection(collectionId);
      const index = collections.findIndex((item) => item.id === collectionId);
      if (index >= 0) collections.splice(index, 1);
      if (activeCollectionId === collectionId) activeCollectionId = "";
      await syncRemoteAssets();
      return result.collection || null;
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) console.warn("Failed to delete asset collection", error);
      return null;
    }
  }

  async function selectCollection(collectionId = "") {
    activeCollectionId = String(collectionId || "");
    assetPageMode = activeCollectionId ? "boards" : assetPageMode;
    assetSelectionMode = false;
    selectedAssetIds.clear();
    await syncRemoteAssets();
    return activeCollectionId;
  }

  async function selectAssetPageMode(mode = "boards") {
    assetPageMode = ["boards", "all", "recent"].includes(mode) ? mode : "boards";
    activeCollectionId = "";
    assetSelectionMode = false;
    selectedAssetIds.clear();
    await syncRemoteAssets();
    return assetPageMode;
  }

  async function moveAssetToCollection(assetId, collectionId = "") {
    if (!assetId || typeof moveRemoteAssetToCollection !== "function") return null;
    try {
      const result = await moveRemoteAssetToCollection(assetId, collectionId);
      if (result.asset) {
        const moved = mergeAsset(result.asset);
        await syncRemoteCollections();
        if (activeCollectionId && moved.collectionId !== activeCollectionId) {
          writeAssets(readAssets().filter((asset) => asset.id !== moved.id));
          renderAssets();
        }
        return moved;
      }
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) console.warn("Failed to move asset to collection", error);
    }
    return null;
  }

  function insertAsset(assetId, point) {
    const asset = readAssets().find((item) => item.id === assetId);
    if (!asset) return null;
    const node = insertAssetToCanvas(asset, point);
    bindAssetToCurrentProject(asset.id);
    return node;
  }

  async function insertAssetIntoProject(assetId, projectId = getActiveProjectId()) {
    const asset = readAssets().find((item) => item.id === assetId);
    if (!asset) return null;
    const currentProjectId = getActiveProjectId();
    if (projectId && projectId !== currentProjectId && typeof openProject === "function") {
      await saveCurrentProject?.();
      await openProject(projectId);
    }
    const node = insertAsset(assetId);
    await saveCurrentProject?.();
    return node;
  }

  function openAssetCanvasPicker(assetId) {
    const asset = readAssets().find((item) => item.id === assetId);
    if (!asset) return null;
    closeAssetCanvasPicker();
    const projects = readProjectsForPicker();
    const overlay = document.createElement("div");
    overlay.className = "asset-canvas-picker";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "选择插入画布");
    overlay.innerHTML = `
      <button class="asset-canvas-picker-backdrop" type="button" data-close-asset-canvas-picker aria-label="关闭"></button>
      <div class="asset-canvas-picker-card">
        <div class="asset-canvas-picker-head">
          <div>
            <strong>插入画布</strong>
            <span>${safeEscapeHtml(asset.title || asset.name || "素材")}</span>
          </div>
          <button type="button" data-close-asset-canvas-picker aria-label="关闭">×</button>
        </div>
        <div class="asset-canvas-picker-list">
          ${projects.map((project) => renderCanvasPickerProject(project)).join("")}
        </div>
      </div>
    `;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeAssetCanvasPicker();
    };
    overlay.addEventListener("click", async (event) => {
      if (event.target.closest("[data-close-asset-canvas-picker]")) {
        closeAssetCanvasPicker();
        return;
      }
      const projectButton = event.target.closest("[data-insert-asset-project]");
      if (!projectButton) return;
      event.preventDefault();
      event.stopPropagation();
      const projectId = projectButton.dataset.insertAssetProject || "";
      projectButton.disabled = true;
      try {
        await insertAssetIntoProject(assetId, projectId);
        closeAssetCanvasPicker();
        getFloatingLibrary()?.classList.remove("open");
      } catch (error) {
        console.warn("Failed to insert asset into project", error);
        projectButton.disabled = false;
      }
    });
    overlay._assetCanvasPickerKeydown = onKeyDown;
    document.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeAssetCanvasPicker() {
    const overlay = document.querySelector(".asset-canvas-picker");
    if (!overlay) return;
    if (overlay._assetCanvasPickerKeydown) {
      document.removeEventListener("keydown", overlay._assetCanvasPickerKeydown, true);
    }
    overlay.remove();
  }

  function readProjectsForPicker() {
    const projects = Array.isArray(getProjects?.()) ? getProjects() : [];
    const activeProjectId = getActiveProjectId();
    if (projects.length) return projects;
    return activeProjectId ? [{ id: activeProjectId, title: "当前画布" }] : [];
  }

  function renderCanvasPickerProject(project = {}) {
    const active = project.id && project.id === getActiveProjectId();
    const thumb = project.thumbnail || project.thumbnailUrl || getSnapshotPreviewImage(project.canvasSnapshotJson);
    const title = project.title || project.name || "未命名画布";
    const prompt = project.prompt || project.description || (active ? "当前正在编辑" : "项目画布");
    return `
      <button class="asset-canvas-picker-project ${active ? "active" : ""}" type="button" data-insert-asset-project="${safeEscapeHtml(project.id || "")}">
        <span class="asset-canvas-picker-thumb">
          ${thumb ? `<img src="${safeEscapeHtml(thumb)}" alt="${safeEscapeHtml(title)}" />` : "<i></i>"}
        </span>
        <span class="asset-canvas-picker-meta">
          <strong>${safeEscapeHtml(title)}</strong>
          <small>${safeEscapeHtml(prompt)}</small>
        </span>
        ${active ? "<em>当前</em>" : ""}
      </button>
    `;
  }
  function getSnapshotPreviewImage(snapshotJson = "") {
    if (!snapshotJson) return "";
    try {
      const snapshot = JSON.parse(snapshotJson);
      const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
      const imageNode = nodes.find((node) => node?.media?.url || node?.media?.thumbnail || node?.thumbnail);
      return imageNode?.media?.url || imageNode?.media?.thumbnail || imageNode?.thumbnail || "";
    } catch {
      return "";
    }
  }

  function previewAsset(assetId) {
    const asset = readAssets().find((item) => item.id === assetId);
    if (!asset) return null;
    const src = asset.url || asset.thumbnailUrl || asset.thumbnail || "";
    if (!src) return null;

    let overlay = document.querySelector(".asset-preview-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "asset-preview-overlay";
      overlay.innerHTML = `
        <button class="asset-preview-backdrop" type="button" data-close-asset-preview aria-label="关闭预览"></button>
        <div class="asset-preview-dialog" role="dialog" aria-modal="true" aria-label="素材预览">
          <button class="asset-preview-close" type="button" data-close-asset-preview aria-label="关闭预览">×</button>
          <img alt="" />
          <strong class="asset-preview-title"></strong>
        </div>
      `;
      overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-close-asset-preview]")) closeAssetPreview();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAssetPreview();
      });
      document.body.appendChild(overlay);
    }

    const image = overlay.querySelector("img");
    const title = overlay.querySelector(".asset-preview-title");
    if (image) {
      image.src = src;
      image.alt = asset.title || asset.name || "素材预览";
    }
    if (title) title.textContent = asset.title || asset.name || "";
    overlay.classList.add("open");
    return asset;
  }

  function closeAssetPreview() {
    document.querySelector(".asset-preview-overlay")?.classList.remove("open");
  }

  function mergeAsset(asset) {
    if (!asset?.id) return null;
    const normalized = normalizeAsset(asset);
    const current = readAssets();
    const index = current.findIndex((item) => item.id === normalized.id);
    const next = current.slice();
    if (index >= 0) {
      next[index] = { ...next[index], ...normalized };
    } else {
      next.unshift(normalized);
    }
    writeAssets(next);
    renderAssets();
    return normalized;
  }

  function bindAssetListInteractions() {
    getAssetLists().forEach(bindAssetList);
    bindAssetsPageScrollFallback();
  }

  function bindAssetsPageScrollFallback() {
    const pageView = getAssetsPageView();
    if (!pageView || pageView.dataset.assetScrollBound === "true") return;
    pageView.dataset.assetScrollBound = "true";
    pageView.addEventListener("wheel", (event) => {
      if (document.body?.dataset?.view !== "assetsPage") return;
      const maxScroll = pageView.scrollHeight - pageView.clientHeight;
      if (maxScroll <= 0) return;
      const nextScroll = Math.max(0, Math.min(maxScroll, pageView.scrollTop + event.deltaY));
      if (nextScroll === pageView.scrollTop) return;
      pageView.scrollTop = nextScroll;
      event.preventDefault();
    }, { passive: false });
  }

  function bindAssetList(list) {
    if (!list || list.dataset.assetRuntimeBound === "true") return;
    list.dataset.assetRuntimeBound = "true";
    const closeAssetContextMenu = () => {
      const menu = list.querySelector("[data-asset-context-menu]");
      if (!menu) return;
      menu.hidden = true;
      menu.dataset.assetId = "";
      menu.style.left = "";
      menu.style.top = "";
      menu.classList.remove("submenu-open");
    };
    const openAssetContextMenu = (event, assetId) => {
      const menu = list.querySelector("[data-asset-context-menu]");
      if (!menu || !assetId) return;
      menu.hidden = false;
      menu.dataset.assetId = assetId;
      menu.classList.remove("submenu-open");
      const bounds = menu.getBoundingClientRect();
      const left = Math.max(12, Math.min(event.clientX, window.innerWidth - bounds.width - 12));
      const top = Math.max(12, Math.min(event.clientY, window.innerHeight - bounds.height - 12));
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    };
    list.addEventListener("click", (event) => {
      const menuAction = event.target.closest("[data-asset-menu-action]");
      if (menuAction) {
        event.preventDefault();
        event.stopPropagation();
        const menu = menuAction.closest("[data-asset-context-menu]");
        const assetId = menu?.dataset.assetId || "";
        const action = menuAction.dataset.assetMenuAction;
        if (action === "move-open") {
          menu?.classList.toggle("submenu-open");
          return;
        }
        if (!assetId) return;
        if (action === "insert") {
          closeAssetContextMenu();
          openAssetCanvasPicker(assetId);
          return;
        }
        if (action === "move") {
          moveAssetToCollection(assetId, menuAction.dataset.collectionId || "");
          closeAssetContextMenu();
          return;
        }
        if (action === "delete") {
          removeAsset(assetId);
          closeAssetContextMenu();
          return;
        }
      }

      const assetSelectModeButton = event.target.closest("[data-asset-select-mode]");
      if (assetSelectModeButton) {
        event.preventDefault();
        event.stopPropagation();
        closeAssetContextMenu();
        setAssetSelectionMode(!assetSelectModeButton.classList.contains("active"));
        return;
      }

      const assetSelectAllButton = event.target.closest("[data-asset-select-all]");
      if (assetSelectAllButton) {
        event.preventDefault();
        event.stopPropagation();
        closeAssetContextMenu();
        toggleAllAssetSelection();
        return;
      }

      const assetBulkDeleteButton = event.target.closest("[data-asset-bulk-delete]");
      if (assetBulkDeleteButton) {
        event.preventDefault();
        event.stopPropagation();
        closeAssetContextMenu();
        deleteSelectedAssets();
        return;
      }

      const assetSelectButton = event.target.closest("[data-asset-select]");
      if (assetSelectButton) {
        event.preventDefault();
        event.stopPropagation();
        closeAssetContextMenu();
        toggleAssetSelection(assetSelectButton.dataset.assetSelect);
        return;
      }

      const deleteButton = event.target.closest("[data-delete-asset]");
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        closeAssetContextMenu();
        removeAsset(deleteButton.dataset.deleteAsset);
        return;
      }

      const previewButton = event.target.closest("[data-preview-asset]");
      if (previewButton) {
        event.preventDefault();
        event.stopPropagation();
        previewAsset(previewButton.dataset.previewAsset);
        return;
      }

      const isPageList = list.classList.contains("assets-page-list");

      const uploadButton = event.target.closest("[data-upload-asset]");
      if (uploadButton) {
        event.preventDefault();
        event.stopPropagation();
        if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "library";
        assetUploadInput?.click();
        return;
      }

      const insertButton = event.target.closest("[data-insert-asset]");
      if (insertButton) {
        event.preventDefault();
        event.stopPropagation();
        openAssetCanvasPicker(insertButton.dataset.insertAsset);
        return;
      }

      const moveButton = event.target.closest("[data-move-asset]");
      if (moveButton) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const pageAssetCard = isPageList ? event.target.closest(".asset-pinterest-pin.asset-item[data-id]") : null;
      if (pageAssetCard) {
        event.preventDefault();
        event.stopPropagation();
        if (assetSelectionMode) {
          toggleAssetSelection(pageAssetCard.dataset.id);
          return;
        }
        previewAsset(pageAssetCard.dataset.id);
        return;
      }

      const pageModeButton = event.target.closest("[data-asset-page-mode]");
      if (pageModeButton) {
        event.preventDefault();
        selectAssetPageMode(pageModeButton.dataset.assetPageMode || "boards");
        return;
      }

      const createCollectionButton = event.target.closest("[data-create-asset-collection]");
      if (createCollectionButton) {
        event.preventDefault();
        const name = window.prompt("新建图板名称", "");
        if (name?.trim()) createCollection(name.trim());
        return;
      }

      const collectionButton = event.target.closest("[data-select-asset-collection]");
      if (collectionButton) {
        event.preventDefault();
        selectCollection(collectionButton.dataset.selectAssetCollection || "");
        return;
      }

      const renameButton = event.target.closest("[data-rename-asset-collection]");
      if (renameButton) {
        event.preventDefault();
        event.stopPropagation();
        const collection = collections.find((item) => item.id === renameButton.dataset.renameAssetCollection);
        const name = window.prompt("重命名图板", collection?.name || "");
        if (name?.trim()) renameCollection(renameButton.dataset.renameAssetCollection, name.trim());
        return;
      }

      const deleteCollectionButton = event.target.closest("[data-delete-asset-collection]");
      if (deleteCollectionButton) {
        event.preventDefault();
        event.stopPropagation();
        const collection = collections.find((item) => item.id === deleteCollectionButton.dataset.deleteAssetCollection);
        if (window.confirm(`删除图板「${collection?.name || "未命名"}」？素材不会被删除。`)) {
          removeCollection(deleteCollectionButton.dataset.deleteAssetCollection);
        }
        return;
      }

      const card = event.target.closest(".asset-item[data-id]");
      const assetId = !isPageList ? card?.dataset.id : "";
      if (!assetId) return;
      event.preventDefault();
      insertAsset(assetId);
    });
    list.addEventListener("contextmenu", (event) => {
      if (!list.classList.contains("assets-page-list")) return;
      const card = event.target.closest(".asset-pinterest-pin.asset-item[data-id]");
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      openAssetContextMenu(event, card.dataset.id);
    });
    list.addEventListener("scroll", closeAssetContextMenu, { passive: true });
    window.addEventListener("scroll", closeAssetContextMenu, { passive: true, capture: true });
    document.addEventListener("pointerdown", (event) => {
      const menu = list.querySelector("[data-asset-context-menu]");
      if (!menu || menu.hidden || menu.contains(event.target)) return;
      closeAssetContextMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAssetContextMenu();
    });
    list.addEventListener("dragstart", (event) => {
      const item = event.target.closest(".asset-item[data-id]");
      if (!item) return;
      event.dataTransfer?.setData("text/plain", String(item.dataset.id));
    });
  }

  pageUploadButton?.addEventListener("click", () => {
    if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "library";
    assetUploadInput?.click();
  });

  assetUploadInput?.addEventListener("change", async () => {
    if (assetUploadInput.dataset.uploadIntent !== "library") return;
    const files = Array.from(assetUploadInput.files || []);
    assetUploadInput.dataset.uploadHandledByLibrary = "true";
    globalThis.queueMicrotask?.(() => {
      delete assetUploadInput.dataset.uploadIntent;
      delete assetUploadInput.dataset.uploadHandledByLibrary;
      assetUploadInput.value = "";
    });
    if (!files.length) return;
    for (const file of files) {
      await uploadAssetFile(file);
    }
    await syncRemoteCollections();
    renderAssets();
  });

  window.addEventListener("ai-studio-auth-changed", (event) => {
    writeAssets([]);
    collections.length = 0;
    activeCollectionId = "";
    assetPageMode = "boards";
    renderAssets();
    if (event.detail?.user) {
      syncRemoteAssets();
      return;
    }
  });

  renderAssets();
  syncRemoteAssets();

  return {
    renderAssets,
    openAssetLibraryPanel,
    openAssetPickerPanel,
    closeAssetPickerPanel,
    closeAssetLibraryPanel,
    syncRemoteAssets,
    syncAllRemoteAssets,
    uploadAssetFile,
    registerGeneratedAsset: registerGeneratedAssetRecord,
    removeAsset,
    insertAsset,
    bindAssetToCurrentProject,
    syncRemoteCollections,
    createCollection,
    renameCollection,
    removeCollection,
    selectCollection,
    selectAssetPageMode,
    moveAssetToCollection,
    getCollections: readCollections,
    getActiveCollectionId,
    getAssets: readAssets
  };
}
