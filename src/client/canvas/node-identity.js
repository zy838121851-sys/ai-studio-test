export function ensureCanvasNodeId(node, {
  nextId = () => ""
} = {}) {
  if (!node) return "";
  if (!node.dataset.nodeId) {
    node.dataset.nodeId = nextId();
  }
  return node.dataset.nodeId;
}
