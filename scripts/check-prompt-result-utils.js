import {
  buildGeneratedImageNodeOptions,
  buildGeneratedProjectPatch,
  buildGeneratedVideoNodeOptions,
  getResultImageUrls,
  getResultUrls,
  getResultVideoUrls,
  isMidjourneyModel
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

assert(isMidjourneyModel(" midjourney "), "Midjourney model detection should trim whitespace");
assert(!isMidjourneyModel("seedream-5-lite"), "Non-Midjourney models should not match");

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

console.log("Prompt result utility checks passed.");
