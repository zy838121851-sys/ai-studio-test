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
  getVisibleAssetIds,
  pruneAssetSelectionState,
  setAssetSelectionModeState,
  toggleAllAssetSelectionState,
  toggleAssetSelectionState
} from "../src/client/features/workspace/asset-library/asset-library-selection.js";
import {
  cleanAssetCollectionName,
  removeAssetCollectionState,
  selectAssetCollectionState,
  selectAssetPageModeState,
  upsertAssetCollectionState
} from "../src/client/features/workspace/asset-library/asset-library-collections.js";
import {
  closeAssetContextMenu,
  openAssetContextMenu,
  shouldCloseAssetContextMenuOnPointer
} from "../src/client/features/workspace/asset-library/asset-library-context-menu.js";
import {
  getAssetListClickIntent
} from "../src/client/features/workspace/asset-library/asset-library-click-intent.js";
import {
  syncAllRemoteAssetsState,
  syncRemoteAssetsState,
  syncRemoteCollectionsState
} from "../src/client/features/workspace/asset-library/asset-library-sync.js";
import {
  getSnapshotPreviewImage,
  insertAssetIntoProjectFlow
} from "../src/client/features/workspace/asset-library/asset-library-project-insert.js";
import {
  closeAssetPreviewOverlay,
  getAssetPreviewSource,
  getAssetPreviewTitle,
  showAssetPreviewOverlay
} from "../src/client/features/workspace/asset-library/asset-library-preview.js";
import {
  closeAssetPickerOverlay,
  getAssetPickerDisplay,
  getAvailableAssetPickerItems,
  mountAssetPickerOverlay
} from "../src/client/features/workspace/asset-library/asset-library-picker.js";
import {
  closeAssetCanvasPickerOverlay,
  getAssetCanvasPickerProjectDisplay,
  getAssetCanvasPickerProjects,
  mountAssetCanvasPickerOverlay
} from "../src/client/features/workspace/asset-library/asset-library-canvas-picker.js";

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
  "asset-library-collections.js",
  "asset-library-context-menu.js",
  "asset-library-click-intent.js",
  "asset-library-selection.js",
  "asset-library-sync.js",
  "asset-library-project-insert.js",
  "asset-library-preview.js",
  "asset-library-picker.js",
  "asset-library-canvas-picker.js",
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

if (
  cleanAssetCollectionName("  Board  ") !== "Board"
  || cleanAssetCollectionName(null) !== ""
) {
  throw new Error("Asset collection helper should preserve collection name cleanup");
}

const collectionState = createAssetLibraryState();
const insertedCollection = upsertAssetCollectionState({
  libraryState: collectionState,
  collection: { id: "board-1", name: "Board", asset_count: "2" }
});
const updatedCollection = upsertAssetCollectionState({
  libraryState: collectionState,
  collection: { id: "board-1", name: "Renamed", asset_count: "3" }
});
if (
  insertedCollection?.name !== "Board"
  || updatedCollection?.name !== "Renamed"
  || collectionState.collections.length !== 1
  || collectionState.collections[0].assetCount !== 3
) {
  throw new Error("Asset collection helper should upsert normalized collections");
}
collectionState.activeCollectionId = "board-1";
const removedCollection = removeAssetCollectionState({ libraryState: collectionState, collectionId: "board-1" });
if (
  removedCollection?.id !== "board-1"
  || collectionState.collections.length !== 0
  || collectionState.activeCollectionId !== ""
) {
  throw new Error("Asset collection helper should remove collections and clear active board");
}

collectionState.assetPageMode = "recent";
collectionState.assetSelectionMode = true;
collectionState.selectedAssetIds.add("asset-1");
const selectedCollectionId = selectAssetCollectionState({ libraryState: collectionState, collectionId: "board-2" });
if (
  selectedCollectionId !== "board-2"
  || collectionState.activeCollectionId !== "board-2"
  || collectionState.assetPageMode !== "boards"
  || collectionState.assetSelectionMode !== false
  || collectionState.selectedAssetIds.size !== 0
) {
  throw new Error("Asset collection helper should select boards and clear selection state");
}
collectionState.selectedAssetIds.add("asset-2");
const selectedPageMode = selectAssetPageModeState({ libraryState: collectionState, mode: "all" });
if (
  selectedPageMode !== "all"
  || collectionState.activeCollectionId !== ""
  || collectionState.assetPageMode !== "all"
  || collectionState.selectedAssetIds.size !== 0
) {
  throw new Error("Asset collection helper should select page modes and clear active board");
}
if (selectAssetPageModeState({ libraryState: collectionState, mode: "unknown" }) !== "boards") {
  throw new Error("Asset collection helper should fall back to boards for unknown page modes");
}

const contextMenuList = createContextMenuList({ width: 120, height: 80 });
const openedContextMenu = openAssetContextMenu({
  list: contextMenuList,
  event: { clientX: 790, clientY: 590 },
  assetId: "asset-1",
  viewportWidth: 800,
  viewportHeight: 600
});
if (
  openedContextMenu?.hidden !== false
  || openedContextMenu.dataset.assetId !== "asset-1"
  || openedContextMenu.style.left !== "668px"
  || openedContextMenu.style.top !== "508px"
  || openedContextMenu.classList.contains("submenu-open")
) {
  throw new Error("Asset context menu helper should open menus with clamped viewport position");
}
if (!shouldCloseAssetContextMenuOnPointer({ list: contextMenuList, target: { label: "outside" } })) {
  throw new Error("Asset context menu helper should close on outside pointer targets");
}
if (shouldCloseAssetContextMenuOnPointer({ list: contextMenuList, target: contextMenuList.menu.insideTarget })) {
  throw new Error("Asset context menu helper should keep menus open for inside pointer targets");
}
if (
  !closeAssetContextMenu(contextMenuList)
  || contextMenuList.menu.hidden !== true
  || contextMenuList.menu.dataset.assetId !== ""
  || contextMenuList.menu.style.left !== ""
  || contextMenuList.menu.style.top !== ""
) {
  throw new Error("Asset context menu helper should close and clear menu state");
}
if (shouldCloseAssetContextMenuOnPointer({ list: contextMenuList, target: { label: "outside" } })) {
  throw new Error("Asset context menu helper should ignore outside pointers when hidden");
}

const menuIntent = getAssetListClickIntent({
  list: createIntentList({ isPageList: true }),
  event: {
    target: createIntentTarget({
      "[data-asset-menu-action]": {
        dataset: { assetMenuAction: "move" },
        closest(selector) {
          return selector === "[data-asset-context-menu]"
            ? { dataset: { assetId: "asset-menu" } }
            : null;
        }
      },
      "[data-preview-asset]": { dataset: { previewAsset: "asset-preview" } }
    })
  }
});
if (
  menuIntent?.type !== "menu-action"
  || menuIntent.action !== "move"
  || menuIntent.assetId !== "asset-menu"
) {
  throw new Error("Asset click intent helper should preserve menu action priority and fields");
}
const pageCardIntent = getAssetListClickIntent({
  list: createIntentList({ isPageList: true }),
  event: {
    target: createIntentTarget({
      ".asset-pinterest-pin.asset-item[data-id]": { dataset: { id: "asset-page" } }
    })
  }
});
if (pageCardIntent?.type !== "page-asset-card" || pageCardIntent.assetId !== "asset-page") {
  throw new Error("Asset click intent helper should detect page asset cards");
}
const floatingCardIntent = getAssetListClickIntent({
  list: createIntentList({ isPageList: false }),
  event: {
    target: createIntentTarget({
      ".asset-item[data-id]": { dataset: { id: "asset-floating" } }
    })
  }
});
if (floatingCardIntent?.type !== "asset-card" || floatingCardIntent.assetId !== "asset-floating") {
  throw new Error("Asset click intent helper should detect floating library asset cards");
}
const pageModeIntent = getAssetListClickIntent({
  list: createIntentList({ isPageList: true }),
  event: {
    target: createIntentTarget({
      "[data-asset-page-mode]": { dataset: { assetPageMode: "recent" } }
    })
  }
});
if (pageModeIntent?.type !== "page-mode" || pageModeIntent.mode !== "recent") {
  throw new Error("Asset click intent helper should preserve page mode fields");
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

const selectionAssets = [
  { id: "favorite", favorite: true },
  { id: "collection", collectionName: "Board" },
  { id: "generated", source: "generated" },
  { id: "plain" },
  { id: "" }
];
if (getVisibleAssetIds({ assets: selectionAssets, assetPageMode: "recent" }).join("|") !== "favorite|collection|generated") {
  throw new Error("Asset selection helper should keep recent-mode visible asset filtering");
}
if (getVisibleAssetIds({ assets: selectionAssets, assetPageMode: "boards" }).join("|") !== "favorite|collection|generated|plain") {
  throw new Error("Asset selection helper should keep board-mode visible asset filtering");
}

const selectionState = createAssetLibraryState();
selectionState.assetPageMode = "all";
setAssetSelectionModeState({ libraryState: selectionState, value: true });
if (selectionState.assetSelectionMode !== true) {
  throw new Error("Asset selection helper should enable selection outside board home");
}
toggleAssetSelectionState({ libraryState: selectionState, assetId: "asset-1" });
if (!selectionState.selectedAssetIds.has("asset-1")) {
  throw new Error("Asset selection helper should select an asset");
}
toggleAssetSelectionState({ libraryState: selectionState, assetId: "asset-1" });
if (selectionState.selectedAssetIds.has("asset-1")) {
  throw new Error("Asset selection helper should toggle an existing asset off");
}
toggleAllAssetSelectionState({ libraryState: selectionState, assetIds: ["asset-1", "asset-2"] });
if (Array.from(selectionState.selectedAssetIds).join("|") !== "asset-1|asset-2") {
  throw new Error("Asset selection helper should select every visible asset");
}
toggleAllAssetSelectionState({ libraryState: selectionState, assetIds: ["asset-1", "asset-2"] });
if (selectionState.selectedAssetIds.size !== 0 || selectionState.assetSelectionMode !== true) {
  throw new Error("Asset selection helper should clear all-selected assets while staying in selection mode");
}
selectionState.selectedAssetIds.add("asset-1");
selectionState.selectedAssetIds.add("stale");
pruneAssetSelectionState({ libraryState: selectionState, assets: [{ id: "asset-1" }] });
if (Array.from(selectionState.selectedAssetIds).join("|") !== "asset-1") {
  throw new Error("Asset selection helper should prune stale selections");
}

const boardHomeSelectionState = createAssetLibraryState();
setAssetSelectionModeState({ libraryState: boardHomeSelectionState, value: true });
toggleAssetSelectionState({ libraryState: boardHomeSelectionState, assetId: "asset-1" });
if (boardHomeSelectionState.assetSelectionMode || boardHomeSelectionState.selectedAssetIds.size) {
  throw new Error("Asset selection helper should block selection on the board home");
}
boardHomeSelectionState.assetSelectionMode = true;
boardHomeSelectionState.selectedAssetIds.add("asset-1");
pruneAssetSelectionState({ libraryState: boardHomeSelectionState, assets: [{ id: "asset-1" }] });
if (boardHomeSelectionState.assetSelectionMode || boardHomeSelectionState.selectedAssetIds.size) {
  throw new Error("Asset selection helper should clear selection when returning to board home");
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

if (
  getSnapshotPreviewImage(JSON.stringify({
    nodes: [
      { media: {} },
      { media: { thumbnail: "/uploads/thumb.png" } }
    ]
  })) !== "/uploads/thumb.png"
) {
  throw new Error("Asset project insert helper should read snapshot media thumbnails");
}
if (
  getSnapshotPreviewImage(JSON.stringify({
    nodes: [
      { thumbnail: "/uploads/fallback.png" }
    ]
  })) !== "/uploads/fallback.png"
) {
  throw new Error("Asset project insert helper should read snapshot thumbnail fallbacks");
}
if (getSnapshotPreviewImage("{invalid") !== "") {
  throw new Error("Asset project insert helper should ignore invalid snapshot JSON");
}

const sameProjectInsertCalls = [];
const sameProjectNode = await insertAssetIntoProjectFlow({
  assetId: "asset-1",
  projectId: "project-1",
  getActiveProjectId: () => "project-1",
  saveCurrentProject: () => sameProjectInsertCalls.push("save"),
  insertAsset: (assetId) => {
    sameProjectInsertCalls.push(`insert:${assetId}`);
    return { id: "node-1" };
  }
});
if (sameProjectNode?.id !== "node-1" || sameProjectInsertCalls.join("|") !== "insert:asset-1|save") {
  throw new Error("Asset project insert helper should insert and save in the active project");
}

const otherProjectInsertCalls = [];
await insertAssetIntoProjectFlow({
  assetId: "asset-2",
  projectId: "project-2",
  getActiveProjectId: () => "project-1",
  saveCurrentProject: () => otherProjectInsertCalls.push("save"),
  openProject: (projectId) => otherProjectInsertCalls.push(`open:${projectId}`),
  insertAsset: (assetId) => {
    otherProjectInsertCalls.push(`insert:${assetId}`);
    return { id: "node-2" };
  }
});
if (otherProjectInsertCalls.join("|") !== "save|open:project-2|insert:asset-2|save") {
  throw new Error("Asset project insert helper should save, switch, insert, and save for another project");
}

if (getAvailableAssetPickerItems([{ id: "" }, { id: "asset-1" }, null]).map((asset) => asset.id).join("|") !== "asset-1") {
  throw new Error("Asset picker helper should filter picker items to assets with ids");
}
const pickerDisplay = getAssetPickerDisplay({
  id: "asset-1",
  thumbnailUrl: "/uploads/thumb-url.png",
  thumbnail: "/uploads/thumb.png",
  url: "/uploads/full.png",
  title: "Title",
  name: "Name",
  collectionName: "Board",
  type: "image"
});
if (
  pickerDisplay.thumb !== "/uploads/thumb-url.png"
  || pickerDisplay.title !== "Title"
  || pickerDisplay.desc !== "Board"
  || pickerDisplay.fallbackType !== "IMAGE"
) {
  throw new Error("Asset picker helper should preserve picker display field priority");
}
const pickerDocument = createPickerDocument();
const pickerOverlay = createPickerOverlay();
const pickerCalls = [];
mountAssetPickerOverlay({
  documentRef: pickerDocument,
  picker: pickerOverlay,
  point: { x: 10, y: 20 },
  insertAsset: (assetId, point) => pickerCalls.push(["insert", assetId, point.x, point.y]),
  closePicker: () => {
    pickerCalls.push(["close"]);
    closeAssetPickerOverlay(pickerDocument);
  }
});
if (pickerDocument.body.children.length !== 1 || !pickerOverlay._assetPickerKeydown) {
  throw new Error("Asset picker helper should mount the picker and store its keydown handler");
}
pickerOverlay.dispatchClick("[data-pick-asset]", "asset-1");
if (
  JSON.stringify(pickerCalls) !== JSON.stringify([["insert", "asset-1", 10, 20], ["close"]])
  || pickerDocument.body.children.length !== 0
  || pickerDocument.removedKeydownCount !== 1
) {
  throw new Error("Asset picker helper should insert the selected asset and close the picker");
}
const escapePickerOverlay = createPickerOverlay();
mountAssetPickerOverlay({
  documentRef: pickerDocument,
  picker: escapePickerOverlay,
  closePicker: () => {
    pickerCalls.push(["escape-close"]);
    closeAssetPickerOverlay(pickerDocument);
  }
});
pickerDocument.dispatchKeydown("Escape");
if (
  pickerCalls[pickerCalls.length - 1]?.[0] !== "escape-close"
  || pickerDocument.body.children.length !== 0
  || pickerDocument.removedKeydownCount !== 2
) {
  throw new Error("Asset picker helper should close the picker on Escape and remove its listener");
}
const closePickerOverlay = createPickerOverlay();
mountAssetPickerOverlay({
  documentRef: pickerDocument,
  picker: closePickerOverlay,
  closePicker: () => {
    pickerCalls.push(["button-close"]);
    closeAssetPickerOverlay(pickerDocument);
  }
});
closePickerOverlay.dispatchClick("[data-close-asset-picker]");
if (
  pickerCalls[pickerCalls.length - 1]?.[0] !== "button-close"
  || pickerDocument.body.children.length !== 0
) {
  throw new Error("Asset picker helper should close the picker when close controls are clicked");
}

if (
  getAssetPreviewSource({ thumbnail: "/uploads/thumb.png" }) !== "/uploads/thumb.png"
  || getAssetPreviewSource({ thumbnailUrl: "/uploads/thumb-url.png", thumbnail: "/uploads/thumb.png" }) !== "/uploads/thumb-url.png"
  || getAssetPreviewSource({ url: "/uploads/full.png", thumbnailUrl: "/uploads/thumb-url.png" }) !== "/uploads/full.png"
) {
  throw new Error("Asset preview helper should preserve preview source priority");
}
if (
  getAssetPreviewTitle({ name: "Name" }) !== "Name"
  || getAssetPreviewTitle({ title: "Title", name: "Name" }) !== "Title"
) {
  throw new Error("Asset preview helper should preserve preview title priority");
}

if (
  getAssetCanvasPickerProjects({ projects: [{ id: "project-1" }], activeProjectId: "active" })[0].id !== "project-1"
  || getAssetCanvasPickerProjects({ projects: [], activeProjectId: "active" })[0].title !== "当前画布"
  || getAssetCanvasPickerProjects({ projects: [], activeProjectId: "" }).length !== 0
) {
  throw new Error("Asset canvas picker helper should preserve project list fallback behavior");
}
const activeCanvasDisplay = getAssetCanvasPickerProjectDisplay({
  project: { id: "project-1", thumbnailUrl: "/uploads/thumb.png", title: "Project title" },
  activeProjectId: "project-1",
  getSnapshotPreviewImage: () => "/uploads/snapshot.png"
});
if (
  activeCanvasDisplay.active !== true
  || activeCanvasDisplay.thumb !== "/uploads/thumb.png"
  || activeCanvasDisplay.title !== "Project title"
  || activeCanvasDisplay.prompt !== "当前正在编辑"
) {
  throw new Error("Asset canvas picker helper should preserve active project display fields");
}
const fallbackCanvasDisplay = getAssetCanvasPickerProjectDisplay({
  project: { id: "project-2", canvasSnapshotJson: "{}" },
  activeProjectId: "project-1",
  getSnapshotPreviewImage: () => "/uploads/snapshot.png"
});
if (
  fallbackCanvasDisplay.active !== false
  || fallbackCanvasDisplay.thumb !== "/uploads/snapshot.png"
  || fallbackCanvasDisplay.title !== "未命名画布"
  || fallbackCanvasDisplay.prompt !== "项目画布"
) {
  throw new Error("Asset canvas picker helper should preserve inactive project fallback display fields");
}

const canvasPickerDocument = createCanvasPickerDocument();
const canvasPickerOverlay = createCanvasPickerOverlay("project-2");
const canvasPickerCalls = [];
mountAssetCanvasPickerOverlay({
  documentRef: canvasPickerDocument,
  overlay: canvasPickerOverlay,
  assetId: "asset-1",
  insertAssetIntoProject: async (assetId, projectId) => canvasPickerCalls.push(["insert", assetId, projectId]),
  closePicker: () => {
    canvasPickerCalls.push(["close"]);
    closeAssetCanvasPickerOverlay(canvasPickerDocument);
  },
  closeFloatingLibrary: () => canvasPickerCalls.push(["floating-close"])
});
if (canvasPickerDocument.body.children.length !== 1 || !canvasPickerOverlay._assetCanvasPickerKeydown) {
  throw new Error("Asset canvas picker helper should mount the overlay and store its keydown handler");
}
await canvasPickerOverlay.dispatchClick("[data-insert-asset-project]");
if (
  JSON.stringify(canvasPickerCalls) !== JSON.stringify([["insert", "asset-1", "project-2"], ["close"], ["floating-close"]])
  || canvasPickerDocument.body.children.length !== 0
  || canvasPickerDocument.removedKeydownCount !== 1
) {
  throw new Error("Asset canvas picker helper should insert into a project, close the picker, and close the library");
}
const failedCanvasPickerDocument = createCanvasPickerDocument();
const failedCanvasPickerOverlay = createCanvasPickerOverlay("project-3");
const canvasWarnings = [];
mountAssetCanvasPickerOverlay({
  documentRef: failedCanvasPickerDocument,
  overlay: failedCanvasPickerOverlay,
  assetId: "asset-1",
  insertAssetIntoProject: async () => {
    throw new Error("insert failed");
  },
  closePicker: () => {
    throw new Error("failed insert should not close the canvas picker");
  },
  closeFloatingLibrary: () => {
    throw new Error("failed insert should not close the floating library");
  },
  logger: {
    warn(...args) {
      canvasWarnings.push(args);
    }
  }
});
await failedCanvasPickerOverlay.dispatchClick("[data-insert-asset-project]");
if (
  failedCanvasPickerOverlay.projectButton.disabled !== false
  || failedCanvasPickerDocument.body.children.length !== 1
  || canvasWarnings[0]?.[0] !== "Failed to insert asset into project"
) {
  throw new Error("Asset canvas picker helper should restore project button state when insertion fails");
}
const escapeCanvasPickerDocument = createCanvasPickerDocument();
const escapeCanvasPickerOverlay = createCanvasPickerOverlay("project-4");
mountAssetCanvasPickerOverlay({
  documentRef: escapeCanvasPickerDocument,
  overlay: escapeCanvasPickerOverlay,
  closePicker: () => closeAssetCanvasPickerOverlay(escapeCanvasPickerDocument)
});
escapeCanvasPickerDocument.dispatchKeydown("Escape");
if (escapeCanvasPickerDocument.body.children.length !== 0 || escapeCanvasPickerDocument.removedKeydownCount !== 1) {
  throw new Error("Asset canvas picker helper should close the picker on Escape");
}

const previewDocument = createPreviewDocument();
let previewCloseCalls = 0;
const previewAssetResult = showAssetPreviewOverlay({
  asset: { url: "/uploads/full.png", title: "Preview title" },
  documentRef: previewDocument,
  closePreview: () => {
    previewCloseCalls += 1;
    closeAssetPreviewOverlay(previewDocument);
  },
  createOverlay: () => createPreviewOverlay()
});
const previewOverlay = previewDocument.querySelector(".asset-preview-overlay");
if (
  previewAssetResult?.title !== "Preview title"
  || previewDocument.body.children.length !== 1
  || !previewOverlay.classList.contains("open")
  || previewOverlay.querySelector("img").src !== "/uploads/full.png"
  || previewOverlay.querySelector("img").alt !== "Preview title"
  || previewOverlay.querySelector(".asset-preview-title").textContent !== "Preview title"
) {
  throw new Error("Asset preview helper should create, populate, and open the preview overlay");
}
showAssetPreviewOverlay({
  asset: { thumbnailUrl: "/uploads/second.png", name: "Second title" },
  documentRef: previewDocument,
  closePreview: () => {},
  createOverlay: () => {
    throw new Error("Asset preview helper should reuse the existing preview overlay");
  }
});
if (
  previewDocument.body.children.length !== 1
  || previewOverlay.querySelector("img").src !== "/uploads/second.png"
  || previewOverlay.querySelector("img").alt !== "Second title"
  || previewOverlay.querySelector(".asset-preview-title").textContent !== "Second title"
) {
  throw new Error("Asset preview helper should update an existing preview overlay");
}
previewOverlay.dispatchClick("[data-close-asset-preview]");
if (previewCloseCalls !== 1 || previewOverlay.classList.contains("open")) {
  throw new Error("Asset preview helper should close when the preview close target is clicked");
}
showAssetPreviewOverlay({
  asset: { url: "/uploads/full.png", title: "Preview title" },
  documentRef: previewDocument,
  closePreview: () => {
    previewCloseCalls += 1;
    closeAssetPreviewOverlay(previewDocument);
  },
  createOverlay: () => {
    throw new Error("Asset preview helper should still reuse the existing overlay after close");
  }
});
previewDocument.dispatchKeydown("Escape");
if (previewCloseCalls !== 2 || previewOverlay.classList.contains("open")) {
  throw new Error("Asset preview helper should close when Escape is pressed");
}
if (showAssetPreviewOverlay({
  asset: { title: "No source" },
  documentRef: previewDocument,
  createOverlay: () => createPreviewOverlay()
}) !== null) {
  throw new Error("Asset preview helper should ignore assets without a preview source");
}

assertContains("styles/features/project-library.css", [
  ".library-selection-bar",
  ".library-card-check",
  ".library-small-card.selected"
]);

assertContains("styles/features/assets.css", [
  ".asset-selection-bar",
  ".asset-card-check",
  ".asset-pinterest-pin.selected"
]);

console.log("Library bulk select checks passed");

function createIntentList({ isPageList = false } = {}) {
  return {
    classList: {
      contains(name) {
        return name === "assets-page-list" && isPageList;
      }
    }
  };
}

function createIntentTarget(matches = {}) {
  return {
    closest(selector) {
      return matches[selector] || null;
    }
  };
}

function createContextMenuList({ width = 100, height = 80 } = {}) {
  const classNames = new Set(["submenu-open"]);
  const insideTarget = { label: "inside" };
  const menu = {
    hidden: true,
    dataset: {
      assetId: ""
    },
    style: {
      left: "",
      top: ""
    },
    insideTarget,
    classList: {
      remove(name) {
        classNames.delete(name);
      },
      contains(name) {
        return classNames.has(name);
      }
    },
    getBoundingClientRect() {
      return { width, height };
    },
    contains(target) {
      return target === insideTarget;
    }
  };
  return {
    menu,
    querySelector(selector) {
      return selector === "[data-asset-context-menu]" ? menu : null;
    }
  };
}

function createCanvasPickerDocument() {
  const listeners = new Map();
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
      node.remove = () => {
        const index = this.children.indexOf(node);
        if (index >= 0) this.children.splice(index, 1);
      };
      return node;
    }
  };
  return {
    body,
    removedKeydownCount: 0,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
        if (type === "keydown") this.removedKeydownCount += 1;
      }
    },
    querySelector(selector) {
      return body.children.find((node) => node.matchesSelector(selector)) || null;
    },
    dispatchKeydown(key) {
      listeners.get("keydown")?.({ key });
    }
  };
}

function createCanvasPickerOverlay(projectId = "") {
  const projectButton = {
    disabled: false,
    dataset: {
      insertAssetProject: projectId
    }
  };
  return {
    listeners: new Map(),
    projectButton,
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    matchesSelector(selector) {
      return selector === ".asset-canvas-picker";
    },
    dispatchClick(selector) {
      return this.listeners.get("click")?.({
        target: {
          closest(targetSelector) {
            if (targetSelector !== selector) return null;
            if (targetSelector === "[data-insert-asset-project]") return projectButton;
            return {};
          }
        },
        preventDefault() {},
        stopPropagation() {}
      });
    }
  };
}

function createPickerDocument() {
  const listeners = new Map();
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
      node.remove = () => {
        const index = this.children.indexOf(node);
        if (index >= 0) this.children.splice(index, 1);
      };
      return node;
    }
  };
  return {
    body,
    removedKeydownCount: 0,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
        if (type === "keydown") this.removedKeydownCount += 1;
      }
    },
    querySelector(selector) {
      return body.children.find((node) => node.matchesSelector(selector)) || null;
    },
    dispatchKeydown(key) {
      listeners.get("keydown")?.({ key });
    }
  };
}

function createPickerOverlay() {
  return {
    listeners: new Map(),
    dataset: {},
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    matchesSelector(selector) {
      return selector === ".asset-picker-popover";
    },
    dispatchClick(selector, assetId = "") {
      this.listeners.get("click")?.({
        target: {
          closest(targetSelector) {
            if (targetSelector !== selector) return null;
            if (targetSelector === "[data-pick-asset]") {
              return { dataset: { pickAsset: assetId } };
            }
            return {};
          }
        },
        preventDefault() {},
        stopPropagation() {}
      });
    }
  };
}

function createPreviewDocument() {
  const listeners = new Map();
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
      return node;
    }
  };
  return {
    body,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    querySelector(selector) {
      return body.children.find((node) => node.matchesSelector(selector)) || null;
    },
    dispatchKeydown(key) {
      listeners.get("keydown")?.({ key });
    }
  };
}

function createPreviewOverlay() {
  const image = {
    src: "",
    alt: ""
  };
  const title = {
    textContent: ""
  };
  const classNames = new Set(["asset-preview-overlay"]);
  return {
    listeners: new Map(),
    classList: {
      add(name) {
        classNames.add(name);
      },
      remove(name) {
        classNames.delete(name);
      },
      contains(name) {
        return classNames.has(name);
      }
    },
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    matchesSelector(selector) {
      return selector === ".asset-preview-overlay";
    },
    querySelector(selector) {
      if (selector === "img") return image;
      if (selector === ".asset-preview-title") return title;
      return null;
    },
    dispatchClick(closeSelector) {
      this.listeners.get("click")?.({
        target: {
          closest(selector) {
            return selector === closeSelector ? {} : null;
          }
        }
      });
    }
  };
}
