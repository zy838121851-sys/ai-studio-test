import { renderAssetLibrary } from "./asset-panel.js";
import { createAssetLibraryRuntime } from "./asset-library-runtime.js";

export function createAssetLibraryFeatureRuntime({
  eventBus,
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createAssetLibraryRuntime({
    eventBus,
    assetList: elements.assetList,
    assets: state.assets || [],
    renderAssetLibraryFn: renderAssetLibrary,
    floatingLibrary: elements.floatingLibrary,
    escapeHtml: services.escapeHtml
  });
}
