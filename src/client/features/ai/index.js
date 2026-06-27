export { registerAIProvider, setActiveAIProvider, generateImage, analyzeImage } from "./ai-client.js";
export { getJson, postJson } from "./api-client.js";
export { buildImagePrompt, buildChatImagePayload, detectGenerationKind, getDefaultReferencePrompt } from "./prompt-builder.js";
export { generateCanvasImage, getQwenImageSizeForElement, buildPromptGenerationNodeConfig } from "./image-generator.js";
export { analyzeCanvasImage, analyzeImageInput } from "./image-analyzer.js";
export { executeImageEditAction, positionImageEditPopover } from "./image-edit-actions.js?v=20260627-library-bulk-select-1";
export { isPromptBasedNode, markGeneratedImageNode } from "./generation-nodes.js";
export { createPromptGenerationWorkflow } from "./workflows/prompt-generation-workflow.js";
