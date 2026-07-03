export function createAssetLibraryState({
  assets = [],
  getAssets,
  setAssets
} = {}) {
  const fallbackAssets = Array.isArray(assets) ? assets : [];

  return {
    collections: [],
    activeCollectionId: "",
    assetPageMode: "boards",
    assetSelectionMode: false,
    selectedAssetIds: new Set(),

    readAssets() {
      const value = typeof getAssets === "function" ? getAssets() : fallbackAssets;
      return Array.isArray(value) ? value : [];
    },

    writeAssets(nextAssets = []) {
      if (typeof setAssets === "function") setAssets(nextAssets);
      fallbackAssets.length = 0;
      fallbackAssets.push(...nextAssets);
    },

    readCollections() {
      return this.collections.slice();
    },

    replaceCollections(nextCollections = []) {
      this.collections.length = 0;
      this.collections.push(...nextCollections);
    },

    resetRemoteState() {
      this.writeAssets([]);
      this.collections.length = 0;
      this.activeCollectionId = "";
      this.assetPageMode = "boards";
      this.assetSelectionMode = false;
      this.selectedAssetIds.clear();
    }
  };
}
