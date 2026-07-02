import {
  createPromptPreviewBatch,
  updatePromptPreviewStatus
} from "../src/client/features/workspace/chat/workflows/prompt-preview-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const promptPreviews = collectPreviewCalls({
  placement: { x: 100, y: 200 },
  generationMetrics: { width: 320, aspectRatio: "1 / 1" }
});
assert(promptPreviews.length === 1, "Prompt preview batch should create one preview by default");
assert(promptPreviews[0].title === "Generated Image.png", "Prompt preview should use default image title");
assert(promptPreviews[0].desc === "Generating from prompt", "Prompt preview should describe prompt-only generation");
assert(promptPreviews[0].x === 100 && promptPreviews[0].y === 200, "Prompt preview should use placement coordinates");
assert(promptPreviews[0].width === 320, "Prompt preview should preserve metrics width");
assert(promptPreviews[0].aspectRatio === "1 / 1", "Prompt preview should preserve metrics aspect ratio");

const referencePreviews = collectPreviewCalls({
  files: [{ name: "ref.png" }],
  placement: { x: 10, y: 20 },
  generationMetrics: { width: 256, aspectRatio: "4 / 3" }
});
assert(referencePreviews[0].desc === "Generating from reference images", "Prompt preview should describe reference-image generation");

const selectedPreviews = collectPreviewCalls({
  placement: { x: 10, y: 20 },
  generationMetrics: { width: 256, sourceNode: { id: "source" } }
});
assert(selectedPreviews[0].desc === "Generating from the selected image", "Prompt preview should describe selected-image generation");

const multiPreviews = collectPreviewCalls({
  count: 3,
  placement: { x: 50, y: 60 },
  generationMetrics: { width: 200, aspectRatio: "2 / 1" }
});
assert(multiPreviews.length === 3, "Prompt preview batch should create multiple previews");
assert(multiPreviews[0].title === "Generated Image 1.png", "Multiple image previews should number titles");
assert(multiPreviews[1].title === "Generated Image 2.png", "Multiple image previews should number second title");
assert(multiPreviews[2].desc === "Waiting for result 3/3...", "Multiple image previews should describe progress slot");
assert(multiPreviews[1].x === 278, "Multiple image previews should apply horizontal gap");
assert(multiPreviews[2].x === 506, "Multiple image previews should apply repeated horizontal gap");

const modelPreviews = collectPreviewCalls({
  outputType: "3d",
  placement: { x: 1, y: 2 },
  generationMetrics: { width: 300 }
});
assert(modelPreviews[0].title === "Tripo 3D Model", "3D previews should use model title");
assert(modelPreviews[0].desc === "Waiting for 3D model result...", "3D previews should use model waiting text");

const videoPreviews = collectPreviewCalls({
  outputType: "video",
  placement: { x: 1, y: 2 },
  generationMetrics: { width: 300 }
});
assert(videoPreviews[0].title === "Generated Video.mp4", "Video previews should use video title");
assert(videoPreviews[0].desc === "Waiting for video result...", "Video previews should use video waiting text");

const filtered = createPromptPreviewBatch({
  addGenerationPreview: (_config) => null,
  placement: { x: 0, y: 0 },
  generationMetrics: {}
});
assert(filtered.length === 0, "Prompt preview batch should filter failed preview nodes");

const status = { textContent: "" };
updatePromptPreviewStatus({
  querySelector(selector) {
    return selector === ".generation-frame span" ? status : null;
  }
}, "Generation failed, please try again.");
assert(status.textContent === "Generation failed, please try again.", "Prompt preview status should update existing status text");

updatePromptPreviewStatus({
  querySelector() {
    return status;
  }
}, "");
assert(status.textContent === "Generation failed, please try again.", "Prompt preview status should ignore empty text");

console.log("Prompt preview utility checks passed.");

function collectPreviewCalls(options = {}) {
  const calls = [];
  const nodes = createPromptPreviewBatch({
    addGenerationPreview: (config) => {
      calls.push(config);
      return config;
    },
    ...options
  });
  assert(nodes.length === calls.length, "Prompt preview batch should return created preview nodes");
  return calls;
}
