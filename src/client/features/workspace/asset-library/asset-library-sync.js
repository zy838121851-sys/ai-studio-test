import {
  normalizeAssets,
  normalizeCollections
} from "./asset-library-normalizers.js";

export async function syncRemoteAssetsState({
  libraryState,
  listRemoteAssets,
  listRemoteCollectionAssets,
  listRemoteAssetCollections,
  logger = console
} = {}) {
  if (typeof listRemoteAssets !== "function") return false;
  try {
    await syncRemoteCollectionsState({
      libraryState,
      listRemoteAssetCollections,
      logger
    });
    const result = libraryState?.activeCollectionId && typeof listRemoteCollectionAssets === "function"
      ? await listRemoteCollectionAssets(libraryState.activeCollectionId)
      : await listRemoteAssets();
    libraryState?.writeAssets?.(normalizeAssets(result?.assets || []));
    return true;
  } catch (error) {
    handleRemoteAssetsError({ error, libraryState, logger });
    return false;
  }
}

export async function syncAllRemoteAssetsState({
  libraryState,
  listRemoteAssets,
  listRemoteAssetCollections,
  logger = console
} = {}) {
  if (typeof listRemoteAssets !== "function") return false;
  try {
    await syncRemoteCollectionsState({
      libraryState,
      listRemoteAssetCollections,
      logger
    });
    const result = await listRemoteAssets();
    libraryState?.writeAssets?.(normalizeAssets(result?.assets || []));
    return true;
  } catch (error) {
    handleRemoteAssetsError({ error, libraryState, logger });
    return false;
  }
}

export async function syncRemoteCollectionsState({
  libraryState,
  listRemoteAssetCollections,
  logger = console
} = {}) {
  if (typeof listRemoteAssetCollections !== "function") return false;
  try {
    const result = await listRemoteAssetCollections();
    libraryState?.replaceCollections?.(normalizeCollections(result?.collections || []));
    if (
      libraryState?.activeCollectionId
      && !libraryState.collections.some((collection) => collection.id === libraryState.activeCollectionId)
    ) {
      libraryState.activeCollectionId = "";
    }
    return true;
  } catch (error) {
    if (error?.status !== 401) logger?.warn?.("Failed to load asset collections", error);
    return false;
  }
}

function handleRemoteAssetsError({ error, libraryState, logger }) {
  if (error?.status !== 401) logger?.warn?.("Failed to load remote assets", error);
  if (error?.status === 401) {
    libraryState?.resetRemoteState?.();
  }
}
