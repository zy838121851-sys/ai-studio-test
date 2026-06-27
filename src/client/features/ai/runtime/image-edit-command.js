import { getModelType } from "../model-catalog.js?v=20260627-library-bulk-select-1";

export function createImageEditCommand({
  executeImageEditAction,
  getImageEditModel = () => "",
  getImageEditCount = () => 1,
  readImageSourceAsDataUrl = async () => "",
  getOutputSize,
  addGenerationPreview,
  replacePreviewWithImage,
  replacePreviewWithVideo,
  addSourceBadge,
  addChat,
  addThinking,
  updateThinking,
  updateChat,
  addChatImage,
  saveCurrentProjectAfterGeneration = null
} = {}) {
  if (typeof executeImageEditAction !== "function") {
    return () => Promise.resolve();
  }

  return function runImageEditCommand(sourceNode, prompt, label = "Image Editing", options = {}) {
    const requestedCount = options.count ?? getImageEditCount();
    const model = options.model || getImageEditModel();
    const count = getModelType(model) === "video"
      ? 1
      : Math.max(1, Math.min(4, Number.parseInt(requestedCount, 10) || 1));
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
      replacePreviewVideo: replacePreviewWithVideo,
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
        if ((result?.imageUrl || result?.videoUrl) && !result?.error) {
          await saveCurrentProjectAfterGeneration?.();
        }
        return [...results, result];
      }),
      Promise.resolve([])
    );
  };
}
