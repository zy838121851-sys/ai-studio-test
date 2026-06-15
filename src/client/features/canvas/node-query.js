export function findCanvasNodeById(root, id) {
  if (!root || !id) return null;
  return Array.from(root.querySelectorAll(".node-card")).find((node) => node.dataset.nodeId === id) || null;
}

export function getVisibleCanvasNodes(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(".node-card")).filter((node) => {
    return !node.classList.contains("stack-member-hidden") && !node.classList.contains("hidden");
  });
}

export function getNodeTitle(node, fallback = "模块") {
  return node?.dataset?.title
    || node?.querySelector(".image-file-name")?.textContent.trim()
    || node?.querySelector("h3")?.textContent.trim()
    || node?.querySelector(".node-label")?.textContent.trim()
    || fallback;
}

export function getNodeThumbnail(node) {
  return node?.querySelector(".image-frame img")?.src
    || node?.querySelector("video")?.poster
    || "";
}
