export function getCanvasSnapshot(root = document) {
  const nodes = Array.from(root.querySelectorAll(".node-card"));
  return {
    nodeCount: nodes.length,
    selectedIds: nodes
      .filter((node) => node.classList.contains("selected"))
      .map((node) => node.dataset.nodeId)
      .filter(Boolean),
    nodes: nodes.map((node) => ({
      id: node.dataset.nodeId,
      kind: node.dataset.kind,
      title: node.dataset.title || "",
      x: Number.parseFloat(node.style.left || "0"),
      y: Number.parseFloat(node.style.top || "0"),
      width: node.offsetWidth,
      height: node.offsetHeight
    }))
  };
}
