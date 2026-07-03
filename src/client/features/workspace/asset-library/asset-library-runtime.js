import {
  assetTypeFromMime,
  normalizeAsset
} from "./asset-library-normalizers.js";
import { createAssetLibraryState } from "./asset-library-state.js";
import {
  cleanAssetCollectionName,
  removeAssetCollectionState,
  selectAssetCollectionState,
  selectAssetPageModeState,
  upsertAssetCollectionState
} from "./asset-library-collections.js";
import {
  closeAssetContextMenu,
  openAssetContextMenu,
  shouldCloseAssetContextMenuOnPointer
} from "./asset-library-context-menu.js";
import {
  syncAllRemoteAssetsState,
  syncRemoteAssetsState,
  syncRemoteCollectionsState
} from "./asset-library-sync.js";
import {
  getVisibleAssetIds,
  pruneAssetSelectionState,
  setAssetSelectionModeState,
  toggleAllAssetSelectionState,
  toggleAssetSelectionState
} from "./asset-library-selection.js";
import {
  getSnapshotPreviewImage,
  insertAssetIntoProjectFlow
} from "./asset-library-project-insert.js";
import {
  closeAssetPreviewOverlay,
  showAssetPreviewOverlay
} from "./asset-library-preview.js";
import {
  closeAssetPickerOverlay,
  getAssetPickerDisplay,
  getAvailableAssetPickerItems,
  mountAssetPickerOverlay
} from "./asset-library-picker.js";
import {
  closeAssetCanvasPickerOverlay,
  getAssetCanvasPickerProjectDisplay,
  getAssetCanvasPickerProjects,
  mountAssetCanvasPickerOverlay
} from "./asset-library-canvas-picker.js";

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
  const libraryState = createAssetLibraryState({ assets, getAssets, setAssets });

  const getAssetLists = () => [assetList, pageAssetList].filter(Boolean);
  const getAssetsPageView = () => pageAssetList?.closest?.(".assets-page-view") || document.querySelector("#assetsPageView");
  const getFloatingLibrary = () => floatingLibrary;
  const safeEscapeHtml = escapeHtml || ((value) => String(value ?? ""));
  const readCollections = () => libraryState.readCollections();
  const getActiveCollectionId = () => libraryState.activeCollectionId;
  const readAssets = () => libraryState.readAssets();
  const writeAssets = (nextAssets = []) => libraryState.writeAssets(nextAssets);

  function pruneAssetSelection(currentAssets = readAssets()) {
    pruneAssetSelectionState({ libraryState, assets: currentAssets });
  }

  function setAssetSelectionMode(value) {
    setAssetSelectionModeState({ libraryState, value });
    renderAssets();
  }

  function toggleAssetSelection(assetId) {
    toggleAssetSelectionState({ libraryState, assetId });
    renderAssets();
  }

  function toggleAllAssetSelection() {
    toggleAllAssetSelectionState({
      libraryState,
      assetIds: getVisibleAssetIds({
        assets: readAssets(),
        assetPageMode: libraryState.assetPageMode
      })
    });
    renderAssets();
  }

  async function deleteSelectedAssets() {
    const assetIds = Array.from(libraryState.selectedAssetIds);
    if (!assetIds.length) return;
    if (!window.confirm(`Delete ${assetIds.length} assets? This cannot be undone.`)) return;
    libraryState.assetSelectionMode = false;
    libraryState.selectedAssetIds.clear();
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
        activeCollectionId: libraryState.activeCollectionId,
        assetPageMode: libraryState.assetPageMode,
        activeProjectId: getActiveProjectId(),
        selectionMode: isAssetsPageList
          && libraryState.assetSelectionMode
          && (libraryState.assetPageMode !== "boards" || Boolean(libraryState.activeCollectionId)),
        selectedAssetIds: isAssetsPageList ? Array.from(libraryState.selectedAssetIds) : [],
        escapeHtml: safeEscapeHtml
      });
    });
    if (safeEvents?.emit) {
      getAssetLists().forEach((list) => {
        safeEvents.emit("assets:render", {
          assets: currentAssets,
          collections: currentCollections,
          activeCollectionId: libraryState.activeCollectionId,
          assetPageMode: libraryState.assetPageMode,
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
    return mountAssetPickerOverlay({
      documentRef: document,
      picker,
      point,
      closePicker: closeAssetPickerPanel,
      insertAsset
    });
  }

  function closeAssetPickerPanel() {
    closeAssetPickerOverlay(document);
  }

  function renderAssetPickerItems(items = []) {
    const availableAssets = getAvailableAssetPickerItems(items);
    if (!availableAssets.length) {
      return `
        <div class="asset-picker-empty">
          <strong>素材库暂无素材</strong>
          <span>先从素材库页面上传或收藏素材。</span>
        </div>
      `;
    }
    return availableAssets.map((asset) => {
      const { thumb, title, desc, fallbackType } = getAssetPickerDisplay(asset);
      return `
        <button class="asset-picker-item" type="button" data-pick-asset="${safeEscapeHtml(asset.id)}">
          <span class="asset-picker-thumb">
            ${thumb ? `<img src="${safeEscapeHtml(thumb)}" alt="${safeEscapeHtml(title)}" draggable="false" />` : `<i>${safeEscapeHtml(fallbackType)}</i>`}
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
    const result = await syncRemoteAssetsState({
      libraryState,
      listRemoteAssets,
      listRemoteCollectionAssets,
      listRemoteAssetCollections
    });
    renderAssets();
    return result;
  }

  async function syncAllRemoteAssets() {
    const result = await syncAllRemoteAssetsState({
      libraryState,
      listRemoteAssets,
      listRemoteAssetCollections
    });
    renderAssets();
    return result;
  }

  async function uploadAssetFile(file, metadata = {}) {
    if (!file || typeof uploadRemoteAsset !== "function") return null;
    try {
      const result = await uploadRemoteAsset(file, {
        projectId: metadata.projectId || getActiveProjectId(),
        collectionId: metadata.collectionId !== undefined ? metadata.collectionId : libraryState.activeCollectionId,
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
          : (defaultToActiveCollection ? libraryState.activeCollectionId : "")
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
        libraryState.resetRemoteState();
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
    return syncRemoteCollectionsState({
      libraryState,
      listRemoteAssetCollections
    });
  }

  async function createCollection(name) {
    const cleanName = cleanAssetCollectionName(name);
    if (!cleanName || typeof createRemoteAssetCollection !== "function") return null;
    try {
      const result = await createRemoteAssetCollection({ name: cleanName });
      if (!result.collection) return null;
      const collection = upsertAssetCollectionState({ libraryState, collection: result.collection });
      await syncRemoteCollections();
      renderAssets();
      return collection;
    } catch (error) {
      if (error?.status !== 401) console.warn("Failed to create asset collection", error);
      return null;
    }
  }

  async function renameCollection(collectionId, name) {
    const cleanName = cleanAssetCollectionName(name);
    if (!collectionId || !cleanName || typeof updateRemoteAssetCollection !== "function") return null;
    try {
      const result = await updateRemoteAssetCollection(collectionId, { name: cleanName });
      if (!result.collection) return null;
      const collection = upsertAssetCollectionState({ libraryState, collection: result.collection });
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
      removeAssetCollectionState({ libraryState, collectionId });
      await syncRemoteAssets();
      return result.collection || null;
    } catch (error) {
      if (error?.status !== 401 && error?.status !== 404) console.warn("Failed to delete asset collection", error);
      return null;
    }
  }

  async function selectCollection(collectionId = "") {
    selectAssetCollectionState({ libraryState, collectionId });
    await syncRemoteAssets();
    return libraryState.activeCollectionId;
  }

  async function selectAssetPageMode(mode = "boards") {
    selectAssetPageModeState({ libraryState, mode });
    await syncRemoteAssets();
    return libraryState.assetPageMode;
  }

  async function moveAssetToCollection(assetId, collectionId = "") {
    if (!assetId || typeof moveRemoteAssetToCollection !== "function") return null;
    try {
      const result = await moveRemoteAssetToCollection(assetId, collectionId);
      if (result.asset) {
        const moved = mergeAsset(result.asset);
        await syncRemoteCollections();
        if (libraryState.activeCollectionId && moved.collectionId !== libraryState.activeCollectionId) {
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
    return insertAssetIntoProjectFlow({
      assetId,
      projectId,
      getActiveProjectId,
      openProject,
      saveCurrentProject,
      insertAsset
    });
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
    return mountAssetCanvasPickerOverlay({
      documentRef: document,
      overlay,
      assetId,
      closePicker: closeAssetCanvasPicker,
      insertAssetIntoProject,
      closeFloatingLibrary: () => getFloatingLibrary()?.classList.remove("open")
    });
  }

  function closeAssetCanvasPicker() {
    closeAssetCanvasPickerOverlay(document);
  }

  function readProjectsForPicker() {
    return getAssetCanvasPickerProjects({
      projects: getProjects?.(),
      activeProjectId: getActiveProjectId()
    });
  }

  function renderCanvasPickerProject(project = {}) {
    const { active, thumb, title, prompt } = getAssetCanvasPickerProjectDisplay({
      project,
      activeProjectId: getActiveProjectId(),
      getSnapshotPreviewImage
    });
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
  function previewAsset(assetId) {
    const asset = readAssets().find((item) => item.id === assetId);
    if (!asset) return null;
    return showAssetPreviewOverlay({
      asset,
      documentRef: document,
      closePreview: closeAssetPreview,
      createOverlay: () => {
        const overlay = document.createElement("div");
        overlay.className = "asset-preview-overlay";
        overlay.innerHTML = `
          <button class="asset-preview-backdrop" type="button" data-close-asset-preview aria-label="关闭预览"></button>
          <div class="asset-preview-dialog" role="dialog" aria-modal="true" aria-label="素材预览">
            <button class="asset-preview-close" type="button" data-close-asset-preview aria-label="关闭预览">×</button>
            <img alt="" />
            <strong class="asset-preview-title"></strong>
          </div>
        `;
        return overlay;
      }
    });
  }

  function closeAssetPreview() {
    closeAssetPreviewOverlay(document);
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
    const closeContextMenu = () => closeAssetContextMenu(list);
    const openContextMenu = (event, assetId) => openAssetContextMenu({
      list,
      event,
      assetId,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
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
          closeContextMenu();
          openAssetCanvasPicker(assetId);
          return;
        }
        if (action === "move") {
          moveAssetToCollection(assetId, menuAction.dataset.collectionId || "");
          closeContextMenu();
          return;
        }
        if (action === "delete") {
          removeAsset(assetId);
          closeContextMenu();
          return;
        }
      }

      const assetSelectModeButton = event.target.closest("[data-asset-select-mode]");
      if (assetSelectModeButton) {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        setAssetSelectionMode(!assetSelectModeButton.classList.contains("active"));
        return;
      }

      const assetSelectAllButton = event.target.closest("[data-asset-select-all]");
      if (assetSelectAllButton) {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        toggleAllAssetSelection();
        return;
      }

      const assetBulkDeleteButton = event.target.closest("[data-asset-bulk-delete]");
      if (assetBulkDeleteButton) {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        deleteSelectedAssets();
        return;
      }

      const assetSelectButton = event.target.closest("[data-asset-select]");
      if (assetSelectButton) {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        toggleAssetSelection(assetSelectButton.dataset.assetSelect);
        return;
      }

      const deleteButton = event.target.closest("[data-delete-asset]");
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
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
        if (libraryState.assetSelectionMode) {
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
        const collection = libraryState.collections.find((item) => item.id === renameButton.dataset.renameAssetCollection);
        const name = window.prompt("重命名图板", collection?.name || "");
        if (name?.trim()) renameCollection(renameButton.dataset.renameAssetCollection, name.trim());
        return;
      }

      const deleteCollectionButton = event.target.closest("[data-delete-asset-collection]");
      if (deleteCollectionButton) {
        event.preventDefault();
        event.stopPropagation();
        const collection = libraryState.collections.find((item) => item.id === deleteCollectionButton.dataset.deleteAssetCollection);
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
      openContextMenu(event, card.dataset.id);
    });
    list.addEventListener("scroll", closeContextMenu, { passive: true });
    window.addEventListener("scroll", closeContextMenu, { passive: true, capture: true });
    document.addEventListener("pointerdown", (event) => {
      if (!shouldCloseAssetContextMenuOnPointer({ list, target: event.target })) return;
      closeContextMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeContextMenu();
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
    libraryState.resetRemoteState();
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
