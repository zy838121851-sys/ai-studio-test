import { escapeAttributeValue } from "./canvas-menu-text-utils.js";

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

export function getVisibleUniqueCanvasNodes(nodes = []) {
  return Array.from(nodes)
    .filter((node, index, allNodes) => allNodes.indexOf(node) === index)
    .filter((node) => node.isConnected
      && !node.classList.contains("hidden")
      && !node.classList.contains("stack-member-hidden"));
}

export function getGroupableSelection(targetNode = null, nodes = []) {
  const selected = nodes
    .filter((node) => node.classList.contains("selected"))
    .filter((node) => !node.classList.contains("node-group"))
    .filter((node) => !node.dataset.groupId);
  if (selected.length) return selected;
  return targetNode?.isConnected
    && !targetNode.classList.contains("node-group")
    && !targetNode.dataset.groupId
    ? [targetNode]
    : [];
}

export function getGroupMembers(groupId, nodes = []) {
  if (!groupId) return [];
  return nodes.filter((node) => node.dataset.groupId === groupId && !node.classList.contains("node-group"));
}

export function getGroupNodeForTarget(targetNode = null, {
  querySelector = (selector) => document.querySelector(selector)
} = {}) {
  if (!targetNode?.isConnected) return null;
  if (targetNode.classList.contains("node-group")) return targetNode;
  const groupId = targetNode.dataset.groupId || "";
  return groupId ? querySelector(`.node-group[data-group-id="${escapeAttributeValue(groupId)}"]`) : null;
}

export function getEarliestDomNode(nodes = [], {
  documentPositionPreceding = globalThis.Node?.DOCUMENT_POSITION_PRECEDING ?? 2
} = {}) {
  return nodes
    .filter((node) => node?.parentElement)
    .sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & documentPositionPreceding ? 1 : -1;
    })[0] || null;
}

export function getCommandNodesFromSelection(nodes = [], { targetNode = null } = {}) {
  const selected = nodes.filter((node) => node.classList.contains("selected"));
  const commandNodes = selected.length ? selected : (targetNode ? [targetNode] : []);
  return commandNodes.filter((node) => node?.isConnected && !isNodeLocked(node));
}

export function getImageLayoutCommandNodesFromSelection(nodes = [], {
  targetNode = null,
  isCanvasImageNode = () => false
} = {}) {
  const selected = nodes.filter((node) => node.classList.contains("selected"));
  const commandNodes = selected.length ? selected : (targetNode ? [targetNode] : []);
  return commandNodes.filter((node) => node?.isConnected && isCanvasImageNode(node) && !isNodeLocked(node));
}

export function getLayerCommandNodesFromSelection(nodes = [], { targetNode = null } = {}) {
  const activeSelected = nodes.filter((node) => node.classList.contains("selected"));
  const targetIsSelected = targetNode?.isConnected && targetNode.classList.contains("selected");
  const commandNodes = targetIsSelected && activeSelected.length
    ? activeSelected
    : (targetNode ? [targetNode] : activeSelected);
  return commandNodes.filter((node) => node?.isConnected && !isNodeLocked(node));
}

export function isExportableImageNode(node) {
  return Boolean(node?.isConnected
    && node.classList?.contains("node-image")
    && node.querySelector?.(".image-frame img"));
}

export function getImageNodesForExportFromSelection(nodes = [], scope = "selected", targetNode = null) {
  const imageNodes = nodes.filter(isExportableImageNode);
  if (scope === "all") return imageNodes;
  const selectedImages = imageNodes.filter((node) => node.classList.contains("selected"));
  if (selectedImages.length) return selectedImages;
  return isExportableImageNode(targetNode) ? [targetNode] : [];
}
