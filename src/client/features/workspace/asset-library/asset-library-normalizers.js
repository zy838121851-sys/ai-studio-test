export function normalizeAssets(assets = []) {
  return assets.map(normalizeAsset);
}

export function normalizeAsset(asset = {}) {
  return {
    ...asset,
    title: asset.title || asset.name || "Untitled asset",
    desc: asset.collectionName || asset.collection || asset.prompt || asset.source || "",
    projectId: asset.projectId || asset.project_id || "",
    collectionId: asset.collectionId || asset.collection_id || "",
    collectionName: asset.collectionName || asset.collection_name || asset.collection || "",
    thumbnailUrl: asset.thumbnailUrl || asset.thumbnail_url || asset.thumbnail || asset.url || "",
    url: asset.url || asset.thumbnailUrl || asset.thumbnail || "",
    createdAt: asset.createdAt || asset.created_at || "",
    updatedAt: asset.updatedAt || asset.updated_at || "",
    type: asset.type || "other"
  };
}

export function normalizeCollections(nextCollections = []) {
  return nextCollections.map(normalizeCollection);
}

export function normalizeCollection(collection = {}) {
  return {
    ...collection,
    id: collection.id || "",
    name: collection.name || "Untitled board",
    assetCount: Number(collection.assetCount || collection.asset_count || 0),
    coverUrl: collection.coverUrl || collection.cover_url || "",
    updatedAt: collection.updatedAt || collection.updated_at || 0
  };
}

export function assetTypeFromMime(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("model") || mimeType.includes("gltf")) return "model3d";
  if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
  return "other";
}
