export function createNodeSnapshot(node, {
  getTitle,
  readJson,
  compactAnalysis,
  compactText,
  isSelected
} = {}) {
  if (!node) return null;
  const analysis = compactAnalysis?.(readJson?.(node, "aiCoreAnalysis")) || null;
  const sourceAnalysis = compactAnalysis?.(readJson?.(node, "aiCoreSourceAnalysis")) || null;
  return {
    id: node.dataset.nodeId,
    kind: node.dataset.kind,
    title: getTitle?.(node) || node.dataset.title || "",
    productName: node.dataset.productName || "",
    productType: node.dataset.productType || "",
    assetType: node.dataset.assetType || "",
    sourceMode: node.dataset.sourceMode || (node.dataset.createdBy === "ai" ? "generated" : ""),
    createdBy: node.dataset.createdBy || "",
    generationPrompt: compactText?.(node.dataset.generationPrompt || node.dataset.editPrompt || "", 900) || "",
    generationModel: node.dataset.generationModel || node.dataset.editModel || "",
    analysisStatus: node.dataset.aiCoreAnalysisStatus || "",
    analysisSource: node.dataset.aiCoreAnalysisSource || "",
    analysis,
    sourceAnalysis,
    selected: Boolean(isSelected?.(node)),
    stackedChildren: node._stackChildren?.length || 0
  };
}

export function createCanvasStateSnapshot({
  reason,
  targetId,
  canvasWorld,
  selectedNode,
  selectedNodes = [],
  canvasEvents = [],
  getNodeById,
  createNodeSnapshot: snapshotNode
} = {}) {
  const nodes = Array.from(canvasWorld?.querySelectorAll?.(".node-card") || [])
    .filter((node) => !node.classList.contains("stack-member-hidden"))
    .slice(-20);
  const target = getNodeById?.(targetId) || selectedNode || nodes[nodes.length - 1] || null;
  return {
    reason,
    target: snapshotNode(target),
    selected: Array.from(selectedNodes).map(snapshotNode).filter(Boolean),
    nodes: nodes.map(snapshotNode).filter(Boolean),
    recentEvents: canvasEvents.slice(-12)
  };
}
