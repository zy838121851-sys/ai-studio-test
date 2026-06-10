export function removeCanvasNodeDeep(node, {
  removeSuggestionForNode = () => {}
} = {}) {
  if (!node) return;
  const children = node._stackChildren || [];
  children.forEach((child) => removeCanvasNodeDeep(child, { removeSuggestionForNode }));
  if (node.dataset.objectUrl) URL.revokeObjectURL(node.dataset.objectUrl);
  if (node.dataset.nodeId) removeSuggestionForNode(node.dataset.nodeId);
  node.remove();
}

export function getSelectedNodeDeletePayload(selectedNodes) {
  const nodes = Array.from(selectedNodes || []);
  return {
    nodes,
    eventPayload: {
      count: nodes.length,
      nodeIds: nodes.map((node) => node.dataset.nodeId)
    }
  };
}
