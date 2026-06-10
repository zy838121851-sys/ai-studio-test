export function createProjectSavePatch({
  project,
  canvasWorld,
  selectedNode,
  projectTitleElement
} = {}) {
  const nodes = Array.from(canvasWorld?.querySelectorAll(".node-card") || []);
  const selectedImage = selectedNode?.querySelector?.(".image-frame img")?.src || "";
  const firstImage = canvasWorld?.querySelector(".node-image .image-frame img")?.src || "";
  return {
    title: projectTitleElement?.textContent?.trim() || project?.title || "Fresh Ideas",
    thumbnail: selectedImage || firstImage || project?.thumbnail || "",
    itemCount: nodes.length
  };
}
