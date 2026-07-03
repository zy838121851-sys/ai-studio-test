export async function insertAssetIntoProjectFlow({
  assetId,
  projectId = "",
  getActiveProjectId = () => "",
  openProject = null,
  saveCurrentProject = null,
  insertAsset = null
} = {}) {
  const currentProjectId = getActiveProjectId();
  if (projectId && projectId !== currentProjectId && typeof openProject === "function") {
    await saveCurrentProject?.();
    await openProject(projectId);
  }
  const node = typeof insertAsset === "function" ? insertAsset(assetId) : null;
  await saveCurrentProject?.();
  return node;
}

export function getSnapshotPreviewImage(snapshotJson = "") {
  if (!snapshotJson) return "";
  try {
    const snapshot = JSON.parse(snapshotJson);
    const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
    const imageNode = nodes.find((node) => node?.media?.url || node?.media?.thumbnail || node?.thumbnail);
    return imageNode?.media?.url || imageNode?.media?.thumbnail || imageNode?.thumbnail || "";
  } catch {
    return "";
  }
}
