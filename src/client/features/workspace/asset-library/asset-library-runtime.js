export function createAssetLibraryRuntime({
  eventBus,
  assetList,
  assets = [],
  renderAssetLibraryFn,
  floatingLibrary,
  escapeHtml
} = {}) {
  const safeRenderAssetLibrary = typeof renderAssetLibraryFn === "function" ? renderAssetLibraryFn : () => {};
  const safeEvents = eventBus && typeof eventBus.emit === "function" ? eventBus : null;
  const getAssetList = () => assetList;
  const getAssets = () => assets;
  const getFloatingLibrary = () => floatingLibrary;

  function renderAssets() {
    if (safeEvents?.emit) {
      safeEvents.emit("assets:render", {
        assets: getAssets(),
        assetList: getAssetList()
      });
      return;
    }
    safeRenderAssetLibrary({
      assetList: getAssetList(),
      assets: getAssets(),
      escapeHtml: escapeHtml || ((value) => String(value ?? ""))
    });
  }

  function openAssetLibraryPanel() {
    if (safeEvents?.emit) {
      safeEvents.emit("assets:open");
      return;
    }
    renderAssets();
    const panel = getFloatingLibrary();
    panel?.classList.add("open");
  }

  function closeAssetLibraryPanel() {
    if (safeEvents?.emit) {
      safeEvents.emit("assets:close");
      return;
    }
    const panel = getFloatingLibrary();
    panel?.classList.remove("open");
  }

  return {
    renderAssets,
    openAssetLibraryPanel,
    closeAssetLibraryPanel
  };
}
