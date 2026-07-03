import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetTypeFromMime,
  normalizeAsset,
  normalizeAssets,
  normalizeCollection,
  normalizeCollections
} from "../src/client/features/workspace/asset-library/asset-library-normalizers.js";
import { createAssetLibraryState } from "../src/client/features/workspace/asset-library/asset-library-state.js";
import {
  syncAllRemoteAssetsState,
  syncRemoteAssetsState,
  syncRemoteCollectionsState
} from "../src/client/features/workspace/asset-library/asset-library-sync.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(file, patterns) {
  const source = read(file);
  for (const pattern of patterns) {
    if (!source.includes(pattern)) {
      throw new Error(`${file} is missing ${pattern}`);
    }
  }
}

assertContains("src/client/features/projects/components/project-library.js", [
  "data-project-select-mode",
  "data-project-bulk-delete",
  "library-card-check",
  "selectedProjectIds"
]);

const projectLibrarySource = read("src/client/features/projects/components/project-library.js");
for (const removedPattern of [
  "data-library-mode",
  "data-library-step",
  "project-stack",
  "project-timeline",
  "renderLibraryViewSwitch",
  "renderProjectStack"
]) {
  if (projectLibrarySource.includes(removedPattern)) {
    throw new Error(`project-library.js should not include removed stack UI marker ${removedPattern}`);
  }
}

assertContains("src/client/features/projects/workflows/project-workflow.js", [
  "selectedProjectIds",
  "toggleProjectSelection",
  "toggleAllProjectSelection",
  "deleteSelectedProjects"
]);

assertContains("src/client/features/workspace/home/home-library-interactions.js", [
  "data-project-select-mode",
  "data-project-select-all",
  "data-project-bulk-delete",
  "toggleProjectSelection"
]);

const homeInteractionsSource = read("src/client/features/workspace/home/home-library-interactions.js");
for (const removedPattern of ["data-library-mode", "data-library-step", ".project-stack", ".project-timeline"]) {
  if (homeInteractionsSource.includes(removedPattern)) {
    throw new Error(`home-library-interactions.js should not include removed stack interaction ${removedPattern}`);
  }
}

assertContains("src/client/features/workspace/runtime/launch-actions-config.js", [
  "setProjectSelectionMode",
  "toggleProjectSelection",
  "toggleAllProjectSelection",
  "deleteSelectedProjects"
]);

assertContains("src/client/features/workspace/asset-library/asset-panel.js", [
  "data-asset-select-mode",
  "data-asset-bulk-delete",
  "asset-card-check",
  "selectedAssetIds"
]);

assertContains("src/client/features/workspace/asset-library/asset-library-runtime.js", [
  "asset-library-normalizers.js",
  "asset-library-state.js",
  "asset-library-sync.js",
  "selectedAssetIds",
  "toggleAssetSelection",
  "toggleAllAssetSelection",
  "deleteSelectedAssets"
]);

const normalizedAsset = normalizeAsset({
  id: "asset-1",
  name: "File name",
  collection_name: "Board",
  collection_id: "board-1",
  thumbnail_url: "/uploads/thumb.png",
  created_at: 100,
  updated_at: 200
});
if (
  normalizedAsset.title !== "File name"
  || normalizedAsset.collectionId !== "board-1"
  || normalizedAsset.collectionName !== "Board"
  || normalizedAsset.thumbnailUrl !== "/uploads/thumb.png"
  || normalizedAsset.url !== ""
  || normalizedAsset.createdAt !== 100
  || normalizedAsset.updatedAt !== 200
  || normalizedAsset.type !== "other"
) {
  throw new Error("Asset normalizer should preserve legacy asset field mapping");
}
if (normalizeAssets([{ id: "a" }])[0].title !== "Untitled asset") {
  throw new Error("Asset list normalizer should apply asset defaults");
}

const normalizedCollection = normalizeCollection({
  id: "board-1",
  asset_count: "3",
  cover_url: "/uploads/cover.png",
  updated_at: 300
});
if (
  normalizedCollection.name !== "Untitled board"
  || normalizedCollection.assetCount !== 3
  || normalizedCollection.coverUrl !== "/uploads/cover.png"
  || normalizedCollection.updatedAt !== 300
) {
  throw new Error("Collection normalizer should preserve legacy collection field mapping");
}
if (normalizeCollections([{ name: "Board" }])[0].id !== "") {
  throw new Error("Collection list normalizer should apply collection defaults");
}
if (
  assetTypeFromMime("image/png") !== "image"
  || assetTypeFromMime("video/mp4") !== "video"
  || assetTypeFromMime("model/gltf+json") !== "model3d"
  || assetTypeFromMime("application/pdf") !== "document"
  || assetTypeFromMime("text/plain") !== "other"
) {
  throw new Error("Asset MIME type helper should preserve existing type mapping");
}

const fallbackState = createAssetLibraryState({ assets: [{ id: "initial" }] });
if (fallbackState.readAssets()[0].id !== "initial") {
  throw new Error("Asset library state should read fallback assets");
}
fallbackState.writeAssets([{ id: "next" }]);
if (fallbackState.readAssets()[0].id !== "next") {
  throw new Error("Asset library state should update fallback assets");
}
fallbackState.replaceCollections([{ id: "board-1" }]);
fallbackState.activeCollectionId = "board-1";
fallbackState.assetPageMode = "recent";
fallbackState.assetSelectionMode = true;
fallbackState.selectedAssetIds.add("asset-1");
if (
  fallbackState.readCollections().length !== 1
  || fallbackState.readCollections()[0].id !== "board-1"
) {
  throw new Error("Asset library state should expose collection snapshots");
}
fallbackState.resetRemoteState();
if (
  fallbackState.readAssets().length !== 0
  || fallbackState.readCollections().length !== 0
  || fallbackState.activeCollectionId !== ""
  || fallbackState.assetPageMode !== "boards"
  || fallbackState.assetSelectionMode !== false
  || fallbackState.selectedAssetIds.size !== 0
) {
  throw new Error("Asset library state should reset remote runtime state");
}

const externalWrites = [];
const externalState = createAssetLibraryState({
  getAssets: () => [{ id: "external" }],
  setAssets: (nextAssets) => externalWrites.push(nextAssets)
});
if (externalState.readAssets()[0].id !== "external") {
  throw new Error("Asset library state should read external asset providers");
}
externalState.writeAssets([{ id: "written" }]);
if (externalWrites[0][0].id !== "written") {
  throw new Error("Asset library state should write through external asset providers");
}

const syncState = createAssetLibraryState();
syncState.activeCollectionId = "board-1";
const syncCalls = [];
const syncResult = await syncRemoteAssetsState({
  libraryState: syncState,
  listRemoteAssetCollections: () => {
    syncCalls.push("collections");
    return { collections: [{ id: "board-1", name: "Board", asset_count: 2 }] };
  },
  listRemoteCollectionAssets: (collectionId) => {
    syncCalls.push(`collection-assets:${collectionId}`);
    return { assets: [{ id: "asset-1", name: "Asset" }] };
  },
  listRemoteAssets: () => {
    syncCalls.push("all-assets");
    return { assets: [{ id: "asset-all" }] };
  }
});
if (
  syncResult !== true
  || syncCalls.join("|") !== "collections|collection-assets:board-1"
  || syncState.readCollections()[0].assetCount !== 2
  || syncState.readAssets()[0].title !== "Asset"
) {
  throw new Error("Asset sync helper should load collection assets for the active board");
}

const syncAllState = createAssetLibraryState();
const syncAllCalls = [];
const syncAllResult = await syncAllRemoteAssetsState({
  libraryState: syncAllState,
  listRemoteAssetCollections: () => {
    syncAllCalls.push("collections");
    return { collections: [{ id: "board-2" }] };
  },
  listRemoteAssets: () => {
    syncAllCalls.push("all-assets");
    return { assets: [{ id: "asset-all", name: "All Asset" }] };
  }
});
if (
  syncAllResult !== true
  || syncAllCalls.join("|") !== "collections|all-assets"
  || syncAllState.readAssets()[0].title !== "All Asset"
) {
  throw new Error("Asset sync helper should load all assets for full sync");
}

const missingCollectionState = createAssetLibraryState();
missingCollectionState.activeCollectionId = "missing";
await syncRemoteCollectionsState({
  libraryState: missingCollectionState,
  listRemoteAssetCollections: () => ({ collections: [{ id: "other" }] })
});
if (missingCollectionState.activeCollectionId !== "") {
  throw new Error("Asset collection sync should clear missing active collections");
}

const unauthorizedState = createAssetLibraryState({ assets: [{ id: "existing" }] });
unauthorizedState.replaceCollections([{ id: "board-1" }]);
unauthorizedState.activeCollectionId = "board-1";
unauthorizedState.assetPageMode = "recent";
unauthorizedState.assetSelectionMode = true;
unauthorizedState.selectedAssetIds.add("asset-1");
const unauthorizedResult = await syncRemoteAssetsState({
  libraryState: unauthorizedState,
  listRemoteAssets: () => Promise.reject({ status: 401 }),
  logger: { warn() { throw new Error("401 asset sync should not warn"); } }
});
if (
  unauthorizedResult !== false
  || unauthorizedState.readAssets().length !== 0
  || unauthorizedState.readCollections().length !== 0
  || unauthorizedState.activeCollectionId !== ""
  || unauthorizedState.assetPageMode !== "boards"
  || unauthorizedState.selectedAssetIds.size !== 0
) {
  throw new Error("Asset sync helper should reset remote state on 401");
}

assertContains("styles/workspace-layout.css", [
  ".library-selection-bar",
  ".library-card-check",
  ".library-small-card.selected"
]);

assertContains("styles/legacy-assets.css", [
  ".asset-selection-bar",
  ".asset-card-check",
  ".asset-pinterest-pin.selected"
]);

console.log("Library bulk select checks passed");
