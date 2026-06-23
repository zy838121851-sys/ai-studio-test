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
  syncMultiSelectionState(root);
  return null;
}

export function addSelectedNodeElement(selectedNodes, node, additive = false) {
  if (!node) return null;
  if (!additive) clearSelectedNodeElements(selectedNodes);
  selectedNodes.add(node);
  node.classList.add("selected");
  markActiveSelectedNode(node, selectedNodes);
  syncMultiSelectionState(node.ownerDocument || globalThis.document);
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
  syncMultiSelectionState(activeNode?.ownerDocument || globalThis.document);
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

function syncMultiSelectionState(root = globalThis.document) {
  const documentRef = root?.nodeType === 9 ? root : root?.ownerDocument || globalThis.document;
  const selectedNodes = Array.from(documentRef?.querySelectorAll?.(".node-card.selected") || []);
  const selectedCount = selectedNodes.length;
  const selectedImageCount = selectedNodes.filter((node) => (
    node.classList.contains("node-image") && node.querySelector(".image-frame img")
  )).length;
  const canCompareImages = selectedCount === 2 && selectedImageCount === 2;
  if (canCompareImages && !selectedNodes.some((node) => node.dataset.activeSelection === "true")) {
    selectedNodes[selectedNodes.length - 1].dataset.activeSelection = "true";
  }
  documentRef?.body?.classList.toggle("canvas-has-multi-selection", selectedCount > 1);
  documentRef?.body?.classList.toggle("canvas-has-compare-selection", canCompareImages);
}
