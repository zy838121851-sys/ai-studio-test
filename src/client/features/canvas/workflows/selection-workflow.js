export function createSelectionWorkflow({
  state = {},
  services = {}
} = {}) {
  const {
    getSelectedNodes = () => new Set(),
    setSelectedNode = () => null,
    hideTextToolbar = () => {},
    hideShapeToolbar = () => {},
    getTextFormatToolbar = () => null,
    positionTextFormatToolbar = () => {},
    positionShapeFormatToolbar = () => {},
    recordCanvasEvent = () => {},
    scheduleAICoreAgent = () => {},
    clearSelectedNodeElements = () => null,
    addSelectedNodeElement = () => null,
    replaceSelectedNodeElements = () => null,
    getSelectedNodeDeletePayload = () => ({ nodes: [], eventPayload: {} }),
    removeCanvasNodeDeep = () => {},
    removeSuggestionForNode = () => {}
  } = services;

  function clearSelection() {
    const selectedNodes = getSelectedNodes();
    setSelectedNode(clearSelectedNodeElements(selectedNodes));
    hideTextToolbar(getTextFormatToolbar());
    hideShapeToolbar();
  }

  function selectNode(node, additive = false) {
    if (!node) {
      clearSelection();
      return;
    }
    const selectedNodes = getSelectedNodes();
    setSelectedNode(addSelectedNodeElement(selectedNodes, node, additive));
    positionTextFormatToolbar();
    positionShapeFormatToolbar();
    recordCanvasEvent("select", { nodeId: node.dataset.nodeId });
    scheduleAICoreAgent("selection_pause", node, 5000);
  }

  function selectNodes(nodes) {
    if (!nodes?.length) {
      clearSelection();
      return;
    }
    const selectedNodes = getSelectedNodes();
    setSelectedNode(replaceSelectedNodeElements(selectedNodes, nodes));
    positionTextFormatToolbar();
    positionShapeFormatToolbar();
  }

  function removeNodeDeep(node) {
    removeCanvasNodeDeep(node, {
      removeSuggestionForNode: (nodeId) => removeSuggestionForNode(nodeId)
    });
  }

  function detachNodeForUndo(node) {
    (node._stackChildren || []).forEach((child) => detachNodeForUndo(child));
    node.remove();
  }

  function deleteSelectedNode() {
    const selectedNodes = getSelectedNodes();
    const selectedNodeSet = selectedNodes.size
      ? selectedNodes
      : new Set(document.querySelectorAll(".node-card.selected"));
    if (!selectedNodeSet.size) return;
    const { nodes, eventPayload } = getSelectedNodeDeletePayload(selectedNodeSet);
    recordCanvasEvent("delete", eventPayload);
    clearSelection();
    nodes.forEach(detachNodeForUndo);
  }

  return {
    clearSelection,
    selectNode,
    selectNodes,
    removeNodeDeep,
    deleteSelectedNode
  };
}
