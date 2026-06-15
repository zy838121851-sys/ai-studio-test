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

  return function runImageEditCommand(sourceNode, prompt, label = "Image Editing") {
    const count = Math.max(1, Math.min(4, Number.parseInt(getImageEditCount(), 10) || 1));
    const model = getImageEditModel();
    const runOne = (index) => executeImageEditAction({
      sourceNode,
      prompt,
      label: count > 1 ? `${label} ${index + 1}/${count}` : label,
      model,
      readImageSourceAsDataUrl,
      getOutputSize,
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
