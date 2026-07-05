import {
  buildGeneratorCompletionMessage,
  getGeneratorResultTitle,
  getGeneratorResultUrls,
  getRequiredGeneratorResultUrls,
  getRequiredGeneratorResultUrl,
  parseGeneratorResult,
  shouldUseImmediateGeneratorResult
} from "../src/client/features/canvas/workflows/image-generator-result-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  buildGeneratorCompletionMessage({ videoModel: true, count: 4, modelUsage: "model: video" }) === "Video generation completed.\nmodel: video",
  "Generator completion message should preserve video copy"
);
assert(
  buildGeneratorCompletionMessage({ videoModel: false, count: 3, modelUsage: "model: image" }) === "Image generator completed 3 results.\nmodel: image",
  "Generator completion message should preserve multi-image copy"
);
assert(
  buildGeneratorCompletionMessage({ videoModel: false, count: 1, modelUsage: "model: image" }) === "Image generator completed.\nmodel: image",
  "Generator completion message should preserve single-image copy"
);

assert(getGeneratorResultTitle(0, 1) === "Image Generator Result.png", "Single result titles should remain stable");
assert(getGeneratorResultTitle(2, 4) === "Image Generator Result 3.png", "Batch result titles should remain stable");

const mixedResult = {
  imageUrl: "/uploads/primary.png",
  imageUrls: ["/uploads/a.png", "/uploads/primary.png"],
  videoUrl: "/uploads/video.mp4",
  outputs: [
    { type: "image", url: "/uploads/b.png" },
    { mimeType: "video/mp4", url: "/uploads/output-video.mp4" }
  ]
};
assert(
  getGeneratorResultUrls(mixedResult, "image").join(",") === "/uploads/primary.png,/uploads/a.png,/uploads/b.png",
  "Image result URLs should preserve order and remove duplicates"
);
assert(
  getGeneratorResultUrls(mixedResult, "video").join(",") === "/uploads/video.mp4,/uploads/output-video.mp4",
  "Video result URLs should preserve video outputs"
);

const parsedImage = parseGeneratorResult(mixedResult, "gpt-image", "image");
assert(parsedImage.primaryUrl === "/uploads/primary.png", "Parsed image results should expose primary image URLs");
assert(getRequiredGeneratorResultUrl(mixedResult, parsedImage) === "/uploads/primary.png", "Required image URLs should use parsed primary URLs");
assert(getRequiredGeneratorResultUrls(parsedImage, 2).join(",") === "/uploads/primary.png,/uploads/a.png", "Required image URL batches should preserve count");

let missingBatchError = null;
try {
  getRequiredGeneratorResultUrls(parsedImage, 10);
} catch (error) {
  missingBatchError = error;
}
assert(missingBatchError?.message === "Midjourney returned 3/10 images", "Missing batch errors should preserve copy");

assert(shouldUseImmediateGeneratorResult({ imageUrl: "/uploads/a.png" }), "Immediate image URLs should skip job polling");
assert(shouldUseImmediateGeneratorResult({ videoUrl: "/uploads/a.mp4" }), "Immediate video URLs should skip job polling");
assert(!shouldUseImmediateGeneratorResult({ jobId: "job-1" }), "Job ids without URLs should require polling");

console.log("Image generator result utility checks passed.");
