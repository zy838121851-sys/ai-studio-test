import { getQwenImageSizeForElement } from "../image-generator.js";
import { executeImageEditAction } from "../image-edit-actions.js?v=20260626-popover-anchor-1";
import { createImageEditCommand } from "./image-edit-command.js";

const IMAGE_EDIT_SIZE_PRESETS = {
  "1:1": "1024*1024",
  "16:9": "1456*816",
  "9:16": "816*1456",
  "4:3": "1184*896",
  "3:4": "896*1184"
};

export function createImageEditCommandRuntime({
  state = {},
  services = {}
} = {}) {
  return createImageEditCommand({
    executeImageEditAction,
    getImageEditModel: state.getImageEditModel,
    getImageEditCount: state.getImageEditCount,
    readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
    getOutputSize: (img) => {
      const selectedSize = state.getImageEditSize?.();
      return IMAGE_EDIT_SIZE_PRESETS[selectedSize] || getQwenImageSizeForElement(img);
    },
    addGenerationPreview: services.addGenerationPreview,
    replacePreviewWithImage: services.replacePreviewWithImage,
    addSourceBadge: services.addSourceBadge,
    addChat: services.addChat,
    addThinking: services.addThinking,
    updateThinking: services.updateThinking,
    updateChat: services.updateChat,
    addChatImage: services.addChatImage
  });
}
