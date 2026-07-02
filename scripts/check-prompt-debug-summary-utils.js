import {
  summarizeConversationPayload,
  summarizeDataUrl,
  summarizeFiles,
  summarizeGeneratePayload,
  summarizeGenerationResult,
  summarizePrompt,
  summarizeReferenceImages
} from "../src/client/features/workspace/chat/workflows/prompt-debug-summary-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(summarizeDataUrl("plain") === "plain", "Non-data URL values should pass through");
assert(summarizeDataUrl("data:image/png;base64,abcdef") === "data:image/png;base64, length=6", "Data URLs should be summarized by payload length");

const longPrompt = ` a ${"word ".repeat(80)} `;
assert(summarizePrompt("  hello\nworld  ") === "hello world", "Prompt summaries should normalize whitespace");
assert(summarizePrompt(longPrompt).endsWith("..."), "Long prompt summaries should be truncated");

const fileSummary = summarizeFiles([
  { name: "a.png", type: "image/png", size: 12 },
  { name: "", type: "", size: "" }
]);
assert(fileSummary.count === 2, "File summary should preserve file count");
assert(fileSummary.files[0].index === 0 && fileSummary.files[0].size === 12, "File summary should preserve metadata");
assert(fileSummary.files[1].size === 0, "File summary should default empty size to zero");

const references = summarizeReferenceImages([
  { source: "upload", name: "ref.png", type: "image/png", dataUrl: "data:image/png;base64,1234" }
]);
assert(references[0].dataUrl === "data:image/png;base64, length=4", "Reference image data URLs should be summarized");

const conversation = summarizeConversationPayload({
  text: "hello",
  model: "gpt-image-2",
  mode: "agent",
  attachments: [{ dataUrl: "data:image/png;base64,12" }],
  canvasContext: {
    selected: [{ id: "one" }],
    nodes: [{ id: "one" }, { id: "two" }]
  }
});
assert(conversation.textLength === 5, "Conversation summary should keep text length");
assert(conversation.attachmentCount === 1, "Conversation summary should keep attachment count");
assert(conversation.canvasSelectedCount === 1, "Conversation summary should keep selected canvas count");
assert(conversation.canvasNodeCount === 2, "Conversation summary should keep canvas node count");

const generate = summarizeGeneratePayload({
  model: "seedream",
  prompt: "make image",
  images: ["data:image/png;base64,123", ""],
  size: "1024x1024"
}, "image");
assert(generate.modelId === "seedream", "Generate payload summary should keep model id");
assert(generate.imageCount === 2, "Generate payload summary should keep image count");
assert(generate.images[0].dataUrl === "data:image/png;base64, length=3", "Generate payload images should be summarized");

const result = summarizeGenerationResult({
  imageUrl: "/uploads/a.png",
  imageUrls: ["/uploads/a.png", "/uploads/b.png"],
  videoUrl: "",
  videoUrls: ["/uploads/a.mp4"],
  outputs: [
    { type: "image", url: "/uploads/output.png" },
    { mime_type: "video/mp4" }
  ],
  job: {
    id: "job-1",
    status: "succeeded",
    failureCode: "JOB_FAIL"
  },
  sizeNormalization: { from: "1:1" }
});
assert(result.imageUrl === true, "Generation result summary should expose imageUrl presence");
assert(result.imageUrls === 2, "Generation result summary should count image URLs");
assert(result.videoUrls === 1, "Generation result summary should count video URLs");
assert(result.outputs[0].hasUrl === true && result.outputs[1].mimeType === "video/mp4", "Generation result summary should preserve output shape");
assert(result.jobId === "job-1" && result.status === "succeeded", "Generation result summary should preserve nested job metadata");
assert(result.failureCode === "JOB_FAIL", "Generation result summary should preserve nested failure code");

console.log("Prompt debug summary utility checks passed.");
