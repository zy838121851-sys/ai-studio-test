import { createAssetLibraryFeatureRuntime } from "./asset-library-feature-runtime.js";

export function createWorkspaceAssetLibraryRuntime(options = {}) {
  return createAssetLibraryFeatureRuntime(options);
}
