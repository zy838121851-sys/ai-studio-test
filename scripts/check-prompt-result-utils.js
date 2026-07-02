import {
  buildGeneratedProjectPatch,
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

console.log("Prompt result utility checks passed.");
