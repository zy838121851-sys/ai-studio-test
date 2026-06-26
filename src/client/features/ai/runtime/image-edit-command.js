export function createImageEditCommand({
  executeImageEditAction,
  getImageEditModel = () => "",
  getImageEditCount = () => 1,
  readImageSourceAsDataUrl = async () => "",
  getOutputSize,
  addGenerationPreview,
  replacePreviewWithImage,
  addSourceBadge,
  addChat,
  addThinking,
  updateThinking,
  updateChat,
  addChatImage
} = {}) {
  if (typeof executeImageEditAction !== "function") {
    return () => Promise.resolve();
  }

  return function runImageEditCommand(sourceNode, prompt, label = "Image Editing", options = {}) {
    const requestedCount = options.count ?? getImageEditCount();
    const count = Math.max(1, Math.min(4, Number.parseInt(requestedCount, 10) || 1));
    const model = options.model || getImageEditModel();
    const referenceNodes = Array.isArray(options.referenceNodes) && options.referenceNodes.length
      ? options.referenceNodes
      : [sourceNode];
    const runOne = (index) => executeImageEditAction({
      sourceNode,
      referenceNodes,
      prompt,
      label: count > 1 ? `${label} ${index + 1}/${count}` : label,
      model,
      readImageSourceAsDataUrl,
      getOutputSize,
      outputSize: options.outputSize,
      previewWidth: options.previewWidth,
      previewAspectRatio: options.previewAspectRatio,
      outputX: options.outputX,
      outputY: options.outputY,
      actionType: options.actionType,
      targetLongEdge: options.targetLongEdge,
      upscaleFactor: options.upscaleFactor,
      expand: options.expand,
      referenceImages: options.referenceImages,
      createPreview: addGenerationPreview,
      replacePreview: replacePreviewWithImage,
      addSourceBadge,
      addChat,
      addThinking,
      updateThinking,
      updateChat,
      addChatImage
    });

    return Array.from({ length: count }).reduce(
      (queue, _, index) => queue.then(async (results) => {
        const result = await runOne(index);
        return [...results, result];
      }),
      Promise.resolve([])
    );
  };
}
