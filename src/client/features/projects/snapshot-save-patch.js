import {
  getStableNodeMediaUrl,
  isRestorableCanvasNode,
  normalizePersistentMediaUrl,
  serializeCanvasSnapshot
} from "./snapshot.js";

export function createProjectSavePatch({
  project,
  canvasWorld,
  selectedNode,
  projectTitleElement,
  resolveAssetUrl = null
} = {}) {
  const nodes = Array.from(canvasWorld?.querySelectorAll(".node-card") || []);
  const restorableNodes = nodes.filter(isRestorableCanvasNode);
  const selectedImage = getStableNodeMediaUrl(selectedNode, resolveAssetUrl);
  const firstImage = getStableNodeMediaUrl(canvasWorld?.querySelector(".node-image"), resolveAssetUrl);
  return {
    title: projectTitleElement?.textContent?.trim() || project?.title || "Fresh Ideas",
    thumbnail: selectedImage || firstImage || normalizePersistentMediaUrl(project?.thumbnail) || "",
    itemCount: restorableNodes.length,
    canvasSnapshotJson: serializeCanvasSnapshot({ canvasWorld, resolveAssetUrl })
  };
}
