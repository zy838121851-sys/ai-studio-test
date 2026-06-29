export function createGenerationNodeWorkflow({
  services = {}
} = {}) {
  const {
    createGenerationPreviewNode = () => null,
    addNode = () => null,
    replacePreviewNodeWithImage = () => null,
    replacePreviewNodeWithModel = () => null,
    replacePreviewNodeWithVideo = () => null,
    markGeneratedNodeContext = () => {},
    recordCanvasEvent = () => {},
    addSourceBadgeElement = () => {},
    selectNode = () => {},
    registerGeneratedAsset = null
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
    const node = replacePreviewNodeWithImage({
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
      model,
      registerGeneratedAsset
    });
    return node;
  }

  function replacePreviewWithVideo(previewNode, {
    title,
    desc,
    url,
    width,
    aspectRatio,
    prompt = "",
    sourceNode = null,
    actionType = "video_generation",
    model = ""
  }) {
    const node = replacePreviewNodeWithVideo({
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
    return node;
  }

  function replacePreviewWithModel(previewNode, {
    title,
    desc,
    url,
    width,
    aspectRatio,
    prompt = "",
    sourceNode = null,
    actionType = "model3d_generation",
    model = ""
  }) {
    const node = replacePreviewNodeWithModel({
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
    return node;
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
    replacePreviewWithModel,
    replacePreviewWithVideo,
    addSourceBadge
  };
}
