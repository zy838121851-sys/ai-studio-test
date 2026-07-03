export function getAssetCanvasPickerProjects({
  projects = [],
  activeProjectId = ""
} = {}) {
  const list = Array.isArray(projects) ? projects : [];
  if (list.length) return list;
  return activeProjectId ? [{ id: activeProjectId, title: "当前画布" }] : [];
}

export function getAssetCanvasPickerProjectDisplay({
  project = {},
  activeProjectId = "",
  getSnapshotPreviewImage = () => ""
} = {}) {
  const active = Boolean(project.id && project.id === activeProjectId);
  return {
    active,
    thumb: project.thumbnail || project.thumbnailUrl || getSnapshotPreviewImage(project.canvasSnapshotJson),
    title: project.title || project.name || "未命名画布",
    prompt: project.prompt || project.description || (active ? "当前正在编辑" : "项目画布")
  };
}

export function mountAssetCanvasPickerOverlay({
  documentRef = globalThis.document,
  overlay,
  assetId = "",
  closePicker,
  insertAssetIntoProject,
  closeFloatingLibrary,
  logger = console
} = {}) {
  if (!overlay || !documentRef?.body) return null;
  const onKeyDown = (event) => {
    if (event.key === "Escape") closePicker?.();
  };
  overlay.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-asset-canvas-picker]")) {
      closePicker?.();
      return;
    }
    const projectButton = event.target.closest("[data-insert-asset-project]");
    if (!projectButton) return;
    event.preventDefault();
    event.stopPropagation();
    const projectId = projectButton.dataset.insertAssetProject || "";
    projectButton.disabled = true;
    try {
      await insertAssetIntoProject?.(assetId, projectId);
      closePicker?.();
      closeFloatingLibrary?.();
    } catch (error) {
      logger?.warn?.("Failed to insert asset into project", error);
      projectButton.disabled = false;
    }
  });
  overlay._assetCanvasPickerKeydown = onKeyDown;
  documentRef.addEventListener("keydown", onKeyDown, true);
  documentRef.body.appendChild(overlay);
  return overlay;
}

export function closeAssetCanvasPickerOverlay(documentRef = globalThis.document) {
  const overlay = documentRef?.querySelector?.(".asset-canvas-picker");
  if (!overlay) return false;
  if (overlay._assetCanvasPickerKeydown) {
    documentRef.removeEventListener("keydown", overlay._assetCanvasPickerKeydown, true);
  }
  overlay.remove();
  return true;
}
