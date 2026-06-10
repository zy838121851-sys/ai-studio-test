export function createSelectionState() {
  const selectedIds = new Set();
  return {
    select(id, additive = false) {
      if (!additive) selectedIds.clear();
      if (id) selectedIds.add(id);
      return Array.from(selectedIds);
    },
    clear() {
      selectedIds.clear();
    },
    has(id) {
      return selectedIds.has(id);
    },
    list() {
      return Array.from(selectedIds);
    }
  };
}

export function clearSelectedNodeElements(selectedNodes) {
  selectedNodes.forEach((node) => node.classList.remove("selected"));
  selectedNodes.clear();
  return null;
}

export function addSelectedNodeElement(selectedNodes, node, additive = false) {
  if (!node) return null;
  if (!additive) clearSelectedNodeElements(selectedNodes);
  selectedNodes.add(node);
  node.classList.add("selected");
  return node;
}

export function replaceSelectedNodeElements(selectedNodes, nodes = []) {
  clearSelectedNodeElements(selectedNodes);
  nodes.forEach((node) => {
    selectedNodes.add(node);
    node.classList.add("selected");
  });
  return nodes[nodes.length - 1] || null;
}
