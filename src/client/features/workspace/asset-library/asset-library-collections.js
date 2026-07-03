import {
  normalizeCollection
} from "./asset-library-normalizers.js";

export function cleanAssetCollectionName(name = "") {
  return String(name || "").trim();
}

export function upsertAssetCollectionState({
  libraryState,
  collection
} = {}) {
  if (!libraryState || !collection) return null;
  const normalized = normalizeCollection(collection);
  if (!normalized.id) return null;
  const index = libraryState.collections.findIndex((item) => item.id === normalized.id);
  if (index >= 0) libraryState.collections[index] = normalized;
  else libraryState.collections.push(normalized);
  return normalized;
}

export function removeAssetCollectionState({
  libraryState,
  collectionId = ""
} = {}) {
  if (!libraryState || !collectionId) return null;
  const index = libraryState.collections.findIndex((item) => item.id === collectionId);
  const removed = index >= 0 ? libraryState.collections.splice(index, 1)[0] : null;
  if (libraryState.activeCollectionId === collectionId) libraryState.activeCollectionId = "";
  return removed;
}

export function selectAssetCollectionState({
  libraryState,
  collectionId = ""
} = {}) {
  if (!libraryState) return "";
  libraryState.activeCollectionId = String(collectionId || "");
  libraryState.assetPageMode = libraryState.activeCollectionId ? "boards" : libraryState.assetPageMode;
  libraryState.assetSelectionMode = false;
  libraryState.selectedAssetIds.clear();
  return libraryState.activeCollectionId;
}

export function selectAssetPageModeState({
  libraryState,
  mode = "boards"
} = {}) {
  if (!libraryState) return "boards";
  libraryState.assetPageMode = ["boards", "all", "recent"].includes(mode) ? mode : "boards";
  libraryState.activeCollectionId = "";
  libraryState.assetSelectionMode = false;
  libraryState.selectedAssetIds.clear();
  return libraryState.assetPageMode;
}
