import { renderAssetLibrary } from "./asset-panel.js";
import { createAssetLibraryRuntime } from "./asset-library-runtime.js";
import {
  addRemoteAssetToProject,
  createRemoteAssetCollection,
  deleteRemoteAssetCollection,
  deleteRemoteAsset,
  listRemoteAssetCollections,
  listRemoteCollectionAssets,
  listRemoteAssets,
  moveRemoteAssetToCollection,
  registerGeneratedAsset,
  updateRemoteAssetCollection,
  uploadRemoteAsset
} from "../../ai/asset-client.js";

export function createAssetLibraryFeatureRuntime({
  eventBus,
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createAssetLibraryRuntime({
    eventBus,
    assetList: elements.assetList,
    pageAssetList: elements.pageAssetList,
    pageUploadButton: elements.pageUploadButton,
    assetUploadInput: elements.assetUploadInput,
    assets: state.assets || [],
    getAssets: state.getAssets,
    setAssets: state.setAssets,
    getActiveProjectId: state.getActiveProjectId,
    getProjects: state.getProjects,
    renderAssetLibraryFn: renderAssetLibrary,
    floatingLibrary: elements.floatingLibrary,
    escapeHtml: services.escapeHtml,
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
    insertAssetToCanvas: services.insertAssetToCanvas,
    openProject: services.openProject,
    saveCurrentProject: services.saveCurrentProject
  });
}
