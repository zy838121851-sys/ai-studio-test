import {
  buildGeneratedImageChatCaption,
  buildGeneratedImageNodeOptions,
  buildGeneratedMediaProjectPatch,
  buildGeneratedModelNodeOptions,
  buildGeneratedModelProjectPatch,
  buildGeneratedProjectPatch,
  buildGeneratedVideoNodeOptions,
  createPromptGeneratedImageNodes,
  createPromptGeneratedVideoNode,
  getResultImageUrls,
  getResultUrls,
  getResultVideoUrls,
  isMidjourneyModel,
  resolvePromptGeneratedMediaResult,
  resolvePromptPreviewCount
} from "../src/client/features/workspace/chat/workflows/prompt-result-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mixedResult = {
  imageUrl: "/uploads/primary.png",
  imageUrls: ["/uploads/a.png", "", "/uploads/a.png"],
  videoUrl: "/uploads/primary.mp4",
  videoUrls: ["/uploads/v1.mp4", "/uploads/v1.mp4"],
  outputs: [
    { type: "image", url: "/uploads/output.png" },
    { type: "video", url: "/uploads/output.mp4" },
    { mimeType: "video/mp4", url: "/uploads/mime-video.mp4" },
    { mime_type: "video/webm", url: "/uploads/mime-snake.webm" },
    { type: "text", url: "/uploads/ignored.txt" }
  ]
};

assert(
  JSON.stringify(getResultImageUrls(mixedResult)) === JSON.stringify([
    "/uploads/primary.png",
    "/uploads/a.png",
    "/uploads/output.png"
  ]),
  "Prompt result image URLs should preserve order, dedupe, and include output images"
);

assert(
  JSON.stringify(getResultVideoUrls(mixedResult)) === JSON.stringify([
    "/uploads/primary.mp4",
    "/uploads/v1.mp4",
    "/uploads/output.mp4",
    "/uploads/mime-video.mp4",
    "/uploads/mime-snake.webm"
  ]),
  "Prompt result video URLs should preserve order, dedupe, and include video MIME outputs"
);

assert(
  JSON.stringify(getResultUrls(mixedResult)) === JSON.stringify([
    "/uploads/primary.png",
    "/uploads/a.png",
    "/uploads/output.png",
    "/uploads/primary.mp4",
    "/uploads/v1.mp4",
    "/uploads/output.mp4",
    "/uploads/mime-video.mp4",
    "/uploads/mime-snake.webm"
  ]),
  "Prompt result URLs should combine image and video URLs"
);

const videoMediaResult = resolvePromptGeneratedMediaResult({
  result: mixedResult,
  videoModel: true
});
assert(videoMediaResult.generationType === "video", "Prompt generated media result should prefer videos for video models");
assert(videoMediaResult.primaryUrl === "/uploads/primary.mp4", "Prompt generated media result should preserve primary video URLs");
assert(JSON.stringify(videoMediaResult.videoUrls) === JSON.stringify(getResultVideoUrls(mixedResult)), "Prompt generated media result should include all video URLs");
assert(videoMediaResult.imageUrls.length === 0, "Prompt generated media result should not include image URLs for video results");
assert(videoMediaResult.missing === false, "Prompt generated media result should mark video results as present");

const imageFallbackMediaResult = resolvePromptGeneratedMediaResult({
  result: { imageUrl: "/uploads/fallback.png" },
  videoModel: true
});
assert(imageFallbackMediaResult.generationType === "image", "Prompt generated media result should preserve image fallback behavior for video models without videos");
assert(imageFallbackMediaResult.primaryUrl === "/uploads/fallback.png", "Prompt generated media result should expose image fallback primary URLs");
assert(JSON.stringify(imageFallbackMediaResult.imageUrls) === JSON.stringify(["/uploads/fallback.png"]), "Prompt generated media result should include fallback image URLs");

const missingImageMediaResult = resolvePromptGeneratedMediaResult({
  result: { videoUrl: "/uploads/ignored.mp4" },
  videoModel: false
});
assert(missingImageMediaResult.missing === true, "Prompt generated media result should preserve image-model missing behavior when only video URLs are returned");
assert(missingImageMediaResult.generationType === "image", "Prompt generated media result should preserve image-model missing type");
assert(missingImageMediaResult.errorMessage === "Generation completed but no image URL was returned.", "Prompt generated media result should preserve image missing error text");

const missingVideoMediaResult = resolvePromptGeneratedMediaResult({
  result: {},
  videoModel: true
});
assert(missingVideoMediaResult.missing === true, "Prompt generated media result should mark empty video results as missing");
assert(missingVideoMediaResult.generationType === "video", "Prompt generated media result should preserve video missing type");
assert(missingVideoMediaResult.errorMessage === "Generation completed but no video URL was returned.", "Prompt generated media result should preserve video missing error text");

assert(isMidjourneyModel(" midjourney "), "Midjourney model detection should trim whitespace");
assert(!isMidjourneyModel("seedream-5-lite"), "Non-Midjourney models should not match");
assert(resolvePromptPreviewCount({ model: "midjourney", videoModel: false, midjourneyCount: 4 }) === 4, "Prompt preview count should use Midjourney image batches");
assert(resolvePromptPreviewCount({ model: "seedream-5-lite", videoModel: false, midjourneyCount: 4 }) === 1, "Prompt preview count should use single image previews for non-Midjourney image models");
assert(resolvePromptPreviewCount({ model: "midjourney", videoModel: true, midjourneyCount: 4 }) === 1, "Prompt preview count should keep video previews single");
assert(buildGeneratedImageChatCaption({ index: 0, total: 1, modelUsage: "10 credits" }) === "\u751f\u6210\u56fe\u7247 \u00b7 10 credits", "Single generated image chat captions should preserve copy");
assert(buildGeneratedImageChatCaption({ index: 1, total: 4, modelUsage: "20 credits" }) === "\u751f\u6210\u56fe\u7247 2/4 \u00b7 20 credits", "Multi generated image chat captions should preserve numbering");

const existingProjectPatch = buildGeneratedProjectPatch({
  project: { title: "Existing title", itemCount: 2 },
  prompt: "Original prompt",
  generationPrompt: "Optimized prompt",
  thumbnail: "/uploads/generated.png",
  itemCountIncrement: 3,
  makeProjectTitle: (value) => `Title: ${value}`
});
assert(existingProjectPatch.title === "Existing title", "Generated project patches should preserve existing titles");
assert(existingProjectPatch.prompt === "Optimized prompt", "Generated project patches should store generation prompts");
assert(existingProjectPatch.thumbnail === "/uploads/generated.png", "Generated project patches should store thumbnails");
assert(existingProjectPatch.itemCount === 5, "Generated project patches should increment existing item counts");

const newProjectPatch = buildGeneratedProjectPatch({
  project: { itemCount: 0 },
  prompt: "",
  generationPrompt: "Optimized prompt",
  itemCountIncrement: 1,
  makeProjectTitle: (value) => `Title: ${value}`
});
assert(newProjectPatch.title === "Title: Optimized prompt", "Generated project patches should title new projects from generation prompts");
assert(newProjectPatch.itemCount === 1, "Generated project patches should handle missing item counts");

const mediaProjectPatch = buildGeneratedMediaProjectPatch({
  project: { itemCount: 4 },
  prompt: "Original prompt",
  generationPrompt: "Generated media prompt",
  urls: ["/uploads/media-a.png", "/uploads/media-b.png"],
  makeProjectTitle: (value) => `Title: ${value}`
});
assert(mediaProjectPatch.title === "Title: Original prompt", "Generated media project patches should preserve title prompt behavior");
assert(mediaProjectPatch.prompt === "Generated media prompt", "Generated media project patches should store generation prompts");
assert(mediaProjectPatch.thumbnail === "/uploads/media-a.png", "Generated media project patches should use first media URL as thumbnail");
assert(mediaProjectPatch.itemCount === 6, "Generated media project patches should increment by media URL count");

const emptyMediaProjectPatch = buildGeneratedMediaProjectPatch({
  project: { title: "Existing title", itemCount: 2 },
  prompt: "Original prompt",
  generationPrompt: "Generated media prompt",
  urls: null,
  makeProjectTitle: (value) => `Title: ${value}`
});
assert(emptyMediaProjectPatch.title === "Existing title", "Generated media project patches should preserve existing titles");
assert(emptyMediaProjectPatch.thumbnail === "", "Generated media project patches should preserve empty thumbnails for empty URL lists");
assert(emptyMediaProjectPatch.itemCount === 2, "Generated media project patches should preserve item counts for empty URL lists");

const modelProjectPatch = buildGeneratedModelProjectPatch({
  project: { title: "3D title", itemCount: 1 },
  titlePrompt: "3D prompt",
  storedPrompt: "3D prompt",
  thumbnail: "/uploads/model.glb",
  itemCountIncrement: 1,
  makeProjectTitle: (value) => `Title: ${value}`
});
assert(modelProjectPatch.title === "3D title", "Generated model project patches should preserve existing titles");
assert(modelProjectPatch.prompt === "3D prompt", "Generated model project patches should store selected prompts");
assert(modelProjectPatch.thumbnail === "/uploads/model.glb", "Generated model project patches should store thumbnails");
assert(modelProjectPatch.itemCount === 2, "Generated model project patches should increment item counts");

const newModelProjectPatch = buildGeneratedModelProjectPatch({
  project: { itemCount: 0 },
  titlePrompt: "Image to 3D",
  storedPrompt: "Existing prompt",
  thumbnail: "/uploads/model.glb",
  makeProjectTitle: null,
  fallbackTitle: "3D Project"
});
assert(newModelProjectPatch.title === "Image to 3D", "Generated model project patches should use title prompts before fallback titles");
assert(newModelProjectPatch.prompt === "Existing prompt", "Generated model project patches should preserve stored prompt overrides");
assert(newModelProjectPatch.itemCount === 1, "Generated model project patches should handle missing model item counts");

const fallbackModelProjectPatch = buildGeneratedModelProjectPatch({
  project: null,
  titlePrompt: "",
  storedPrompt: "Image to 3D",
  fallbackTitle: "3D Project"
});
assert(fallbackModelProjectPatch.title === "3D Project", "Generated model project patches should use fallback titles");

const modelNodeOptions = buildGeneratedModelNodeOptions({
  url: "/uploads/model.glb",
  previewWidth: 420,
  generationPrompt: "3D prompt",
  actionType: "text_to_3d",
  model: "tripo"
});
assert(modelNodeOptions.title === "Tripo 3D Model", "Generated model node options should preserve titles");
assert(modelNodeOptions.desc === "Generated 3D model from your prompt.", "Generated model node options should preserve default descriptions");
assert(modelNodeOptions.url === "/uploads/model.glb", "Generated model node options should preserve URLs");
assert(modelNodeOptions.width === 420, "Generated model node options should prefer preview widths");
assert(modelNodeOptions.aspectRatio === "1 / 1", "Generated model node options should preserve aspect ratios");
assert(modelNodeOptions.prompt === "3D prompt", "Generated model node options should preserve prompts");
assert(modelNodeOptions.actionType === "text_to_3d", "Generated model node options should preserve action types");
assert(modelNodeOptions.model === "tripo", "Generated model node options should preserve models");

const sourceNode = { dataset: { nodeId: "source-1" } };
const imageTo3DNodeOptions = buildGeneratedModelNodeOptions({
  url: "/uploads/image-model.glb",
  previewWidth: 0,
  generationPrompt: "Image to 3D",
  sourceNode,
  actionType: "image_to_3d",
  model: "tripo-image",
  desc: "Generated 3D model from your image."
});
assert(imageTo3DNodeOptions.width === 360, "Generated model node options should fall back to default widths");
assert(imageTo3DNodeOptions.sourceNode === sourceNode, "Generated model node options should preserve source nodes");
assert(imageTo3DNodeOptions.desc === "Generated 3D model from your image.", "Generated model node options should preserve custom descriptions");
assert(imageTo3DNodeOptions.actionType === "image_to_3d", "Generated model node options should preserve image-to-3D action types");

const videoNodeOptions = buildGeneratedVideoNodeOptions({
  url: "/uploads/video.mp4",
  previewWidth: 320,
  generationMetrics: { width: 512, aspectRatio: "16 / 9" },
  generationPrompt: "Video prompt",
  model: "video-model"
});
assert(videoNodeOptions.title === "Generated Video.mp4", "Generated video node options should preserve titles");
assert(videoNodeOptions.desc === "Generated video from your prompt.", "Generated video node options should preserve descriptions");
assert(videoNodeOptions.url === "/uploads/video.mp4", "Generated video node options should preserve URLs");
assert(videoNodeOptions.width === 320, "Generated video node options should prefer preview widths");
assert(videoNodeOptions.aspectRatio === "16 / 9", "Generated video node options should preserve aspect ratios");
assert(videoNodeOptions.prompt === "Video prompt", "Generated video node options should preserve prompts");
assert(videoNodeOptions.actionType === "video_generation", "Generated video node options should preserve action types");
assert(videoNodeOptions.model === "video-model", "Generated video node options should preserve models");

const videoPreviewNode = { offsetWidth: 444 };
const createdVideoNode = createPromptGeneratedVideoNode({
  replacePreviewWithVideo: (previewNode, options) => ({ previewNode, options }),
  previewNode: videoPreviewNode,
  url: "/uploads/video.mp4",
  generationMetrics: { width: 512, aspectRatio: "16 / 9" },
  generationPrompt: "Video prompt",
  model: "video-model"
});
assert(createdVideoNode.previewNode === videoPreviewNode, "Prompt video node creation should use the provided preview node");
assert(createdVideoNode.options.width === 444, "Prompt video node creation should prefer preview widths");
assert(createdVideoNode.options.actionType === "video_generation", "Prompt video node creation should preserve video action types");

let missingVideoWorkflowError = "";
try {
  createPromptGeneratedVideoNode({ replacePreviewWithVideo: null });
} catch (error) {
  missingVideoWorkflowError = error.message;
}
assert(missingVideoWorkflowError === "Video preview workflow is unavailable.", "Prompt video node creation should preserve missing workflow errors");

const singleImageNodeOptions = buildGeneratedImageNodeOptions({
  url: "/uploads/image.png",
  index: 0,
  total: 1,
  previewWidth: 0,
  generationMetrics: { width: 768, aspectRatio: "1 / 1" },
  generationPrompt: "Image prompt",
  actionType: "text_to_image",
  model: "image-model"
});
assert(singleImageNodeOptions.title === "Generated Image.png", "Single generated image node options should preserve titles");
assert(singleImageNodeOptions.width === 768, "Generated image node options should fall back to metric widths");
assert(singleImageNodeOptions.actionType === "text_to_image", "Generated image node options should preserve action types");

const multiImageNodeOptions = buildGeneratedImageNodeOptions({
  url: "/uploads/image-2.png",
  index: 1,
  total: 4,
  previewWidth: 256,
  generationMetrics: { width: 768, aspectRatio: "4 / 3" },
  generationPrompt: "Image prompt",
  actionType: "image_variation",
  model: "image-model"
});
assert(multiImageNodeOptions.title === "Generated Image 2.png", "Multi generated image node options should preserve numbered titles");
assert(multiImageNodeOptions.desc === "Generated image from your prompt.", "Generated image node options should preserve descriptions");
assert(multiImageNodeOptions.url === "/uploads/image-2.png", "Generated image node options should preserve URLs");
assert(multiImageNodeOptions.width === 256, "Generated image node options should prefer preview widths");
assert(multiImageNodeOptions.aspectRatio === "4 / 3", "Generated image node options should preserve aspect ratios");
assert(multiImageNodeOptions.prompt === "Image prompt", "Generated image node options should preserve prompts");
assert(multiImageNodeOptions.model === "image-model", "Generated image node options should preserve models");

const imagePreviewNodes = [
  { offsetWidth: 111 },
  { offsetWidth: 222 }
];
const imageReplacementCalls = [];
const promptImageNodes = createPromptGeneratedImageNodes({
  replacePreviewWithImage: (previewNode, options) => {
    imageReplacementCalls.push({ previewNode, options });
    return options.url === "/uploads/skip.png" ? null : { previewNode, options };
  },
  previewNodes: imagePreviewNodes,
  imageUrls: ["/uploads/a.png", "/uploads/b.png", "/uploads/skip.png"],
  generationMetrics: { width: 512, aspectRatio: "1 / 1" },
  generationPrompt: "Image prompt",
  detectGenerationKind: (value) => `kind:${value}`,
  model: "image-model"
});
assert(promptImageNodes.length === 2, "Prompt image node creation should filter missing replacement nodes");
assert(imageReplacementCalls[0].previewNode === imagePreviewNodes[0], "Prompt image node creation should use matching preview nodes");
assert(imageReplacementCalls[1].previewNode === imagePreviewNodes[1], "Prompt image node creation should use second preview nodes");
assert(imageReplacementCalls[2].previewNode === imagePreviewNodes[0], "Prompt image node creation should fall back to first preview node");
assert(imageReplacementCalls[0].options.width === 111, "Prompt image node creation should prefer preview widths");
assert(imageReplacementCalls[1].options.title === "Generated Image 2.png", "Prompt image node creation should preserve numbered titles");
assert(imageReplacementCalls[0].options.actionType === "kind:Image prompt", "Prompt image node creation should use generation kind detection");
assert(imageReplacementCalls[0].options.model === "image-model", "Prompt image node creation should preserve models");

console.log("Prompt result utility checks passed.");
