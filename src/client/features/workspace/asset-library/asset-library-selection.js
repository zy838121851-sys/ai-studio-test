export function getVisibleAssetIds({
  assets = [],
  assetPageMode = "boards"
} = {}) {
  const safeAssets = Array.isArray(assets) ? assets : [];
  if (assetPageMode === "recent") {
    return safeAssets
      .filter((asset) => asset.isFavorite || asset.favorite || asset.collectionName || asset.source === "generated")
      .map((asset) => asset.id)
      .filter(Boolean);
  }
  return safeAssets.map((asset) => asset.id).filter(Boolean);
}

export function pruneAssetSelectionState({
  libraryState,
  assets = []
} = {}) {
  if (!libraryState) return;
  const assetIds = new Set((assets || []).map((asset) => asset.id));
  Array.from(libraryState.selectedAssetIds || []).forEach((assetId) => {
    if (!assetIds.has(assetId)) libraryState.selectedAssetIds.delete(assetId);
  });
  if (libraryState.assetPageMode === "boards" && !libraryState.activeCollectionId) {
    libraryState.assetSelectionMode = false;
    libraryState.selectedAssetIds.clear();
  }
}

export function setAssetSelectionModeState({
  libraryState,
  value
} = {}) {
  if (!libraryState) return;
  libraryState.assetSelectionMode = Boolean(value)
    && (libraryState.assetPageMode !== "boards" || Boolean(libraryState.activeCollectionId));
  if (!libraryState.assetSelectionMode) libraryState.selectedAssetIds.clear();
}

export function toggleAssetSelectionState({
  libraryState,
  assetId
} = {}) {
  if (!libraryState || !assetId || (libraryState.assetPageMode === "boards" && !libraryState.activeCollectionId)) return;
  libraryState.assetSelectionMode = true;
  if (libraryState.selectedAssetIds.has(assetId)) libraryState.selectedAssetIds.delete(assetId);
  else libraryState.selectedAssetIds.add(assetId);
}

export function toggleAllAssetSelectionState({
  libraryState,
  assetIds = []
} = {}) {
  if (!libraryState) return;
  const visibleAssetIds = Array.isArray(assetIds) ? assetIds.filter(Boolean) : [];
  const allSelected = visibleAssetIds.length > 0
    && visibleAssetIds.every((assetId) => libraryState.selectedAssetIds.has(assetId));
  libraryState.selectedAssetIds.clear();
  if (!allSelected) visibleAssetIds.forEach((assetId) => libraryState.selectedAssetIds.add(assetId));
  libraryState.assetSelectionMode = true;
}
