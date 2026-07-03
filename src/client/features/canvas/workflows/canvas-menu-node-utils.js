export function isNodeLocked(node) {
  return node?.dataset?.locked === "true" || node?.classList?.contains("node-locked");
}

export function getNodeKind(node) {
  if (node.classList.contains("node-image")) return "image";
  if (node.classList.contains("node-group")) return "group";
  if (node.classList.contains("node-model")) return "model";
  if (node.classList.contains("node-video")) return "video";
  if (node.classList.contains("canvas-text")) return "2d";
  return node.dataset.kind || "2d";
}
