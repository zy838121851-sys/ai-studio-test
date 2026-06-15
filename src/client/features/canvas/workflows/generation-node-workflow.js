export function createGenerationNodeWorkflow({
  services = {}
} = {}) {
  const {
    createGenerationPreviewNode = () => null,
    addNode = () => null,
    replacePreviewNodeWithImage = () => null,
    markGeneratedNodeContext = () => {},
    recordCanvasEvent = () => {},
    addSourceBadgeElement = () => {},
    selectNode = () => {}
  } = services;

  function addGenerationPreview({ title, desc, x, y, width, aspectRatio }) {
    return createGenerationPreviewNode({
      addNode,
      title,
      desc,
      x,
      y,
      width,
      aspectRatio
    });
  }

  function replacePreviewWithImage(previewNode, {
    title,
    desc,
    url,
    width,
    aspectRatio,
    prompt = "",
    sourceNode = null,
    actionType = "",
    model = ""
  }) {
    return replacePreviewNodeWithImage({
      previewNode,
      addNode,
      applyGeneratedContext: markGeneratedNodeContext,
      recordGenerationCreated: (node, eventData) => {
        recordCanvasEvent("generation_created", {
          nodeId: node.dataset.nodeId,
          sourceId: eventData.sourceNode?.dataset?.nodeId || "",
          actionType: eventData.actionType,
          model: eventData.model
        });
      },
      title,
      desc,
      url,
      width,
      aspectRatio,
      prompt,
      sourceNode,
      actionType,
      model
    });
  }

  function addSourceBadge(node, sourceNode, label = "来源") {
    addSourceBadgeElement(node, sourceNode, {
      label,
      onSelectSource: selectNode
    });
  }

  return {
    addGenerationPreview,
    replacePreviewWithImage,
    addSourceBadge
  };
}
