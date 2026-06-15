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
  clearActiveSelectedNode(selectedNodes);
  const sampleNode = selectedNodes?.values?.().next?.().value;
  const root = sampleNode?.ownerDocument || globalThis.document;
  selectedNodes.forEach((node) => {
    node.classList.remove("selected");
    delete node.dataset.activeSelection;
  });
  root?.querySelectorAll?.(".node-card.selected").forEach((node) => {
    node.classList.remove("selected");
    delete node.dataset.activeSelection;
  });
  selectedNodes.clear();
  return null;
}

export function addSelectedNodeElement(selectedNodes, node, additive = false) {
  if (!node) return null;
  if (!additive) clearSelectedNodeElements(selectedNodes);
  selectedNodes.add(node);
  node.classList.add("selected");
  markActiveSelectedNode(node, selectedNodes);
  return node;
}

export function replaceSelectedNodeElements(selectedNodes, nodes = []) {
  clearSelectedNodeElements(selectedNodes);
  nodes.forEach((node) => {
    selectedNodes.add(node);
    node.classList.add("selected");
  });
  const activeNode = nodes[nodes.length - 1] || null;
  markActiveSelectedNode(activeNode, selectedNodes);
  return activeNode;
}

function clearActiveSelectedNode(selectedNodes) {
  const sampleNode = selectedNodes?.values?.().next?.().value;
  const root = sampleNode?.ownerDocument || globalThis.document;
  root?.querySelectorAll?.(".node-card[data-active-selection='true']").forEach((node) => {
    delete node.dataset.activeSelection;
  });
}

function markActiveSelectedNode(node, selectedNodes) {
  clearActiveSelectedNode(selectedNodes);
  if (node) node.dataset.activeSelection = "true";
}
