export function markGeneratedImageNode(node, {
  prompt = "",
  sourceNode = null,
  actionType = "",
  model = "",
  getSourceTitle = () => "",
  readSourceAnalysis = () => null
} = {}) {
  if (!node) return;
  node.dataset.createdBy = "ai";
  node.dataset.sourceMode = "generated";
  if (prompt) node.dataset.generationPrompt = prompt;
  if (actionType) node.dataset.assetType = actionType;
  if (model) node.dataset.generationModel = model;

  if (!sourceNode) return;
  const sourceId = sourceNode.dataset.nodeId || "";
  node.dataset.sourceId = sourceId;
  node.dataset.parentId = sourceId;
  node.dataset.productName = sourceNode.dataset.productName || getSourceTitle(sourceNode);
  node.dataset.productType = sourceNode.dataset.productType || "";

  const sourceAnalysis = readSourceAnalysis(sourceNode);
  if (sourceAnalysis) {
    node.dataset.aiCoreSourceAnalysis = JSON.stringify(sourceAnalysis);
  }
}

export function isPromptBasedNode(node) {
  return Boolean(
    node?.dataset?.sourceMode === "generated" ||
    node?.dataset?.generationPrompt ||
    node?.dataset?.editPrompt
  );
}
