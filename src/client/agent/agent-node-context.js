export function writeAICoreAnalysisCache({
  node,
  analysis,
  source = "vision",
  normalizeAnalysis,
  inferProfile,
  getTitle,
  improveActions,
  shouldUsePromptContext
}) {
  if (!node || !analysis) return;
  const data = normalizeAnalysis(analysis, inferProfile({ name: getTitle(node) }));
  data.recommendedActions = improveActions(data);
  node.dataset.aiCoreAnalysis = JSON.stringify(data);
  node.dataset.aiCoreAnalysisStatus = "ready";
  node.dataset.aiCoreAnalysisSource = source;
  if (!shouldUsePromptContext(node)) node.dataset.sourceMode = "uploaded";
  node.dataset.productName = data.productName;
  node.dataset.productType = data.category;
}

export function shouldUsePromptContext(node, isPromptBasedNode) {
  return isPromptBasedNode(node) || Boolean(node?.dataset?.generationPrompt || node?.dataset?.editPrompt);
}
