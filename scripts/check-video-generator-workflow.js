import { readFileSync } from "node:fs";

import {
  buildVideoGenerationInputs,
  createVideoGenerationPayload,
  getResultVideoUrl,
  hasVideoGenerationInput,
  hasVideoGenerationModel,
  hasVideoGenerationServices,
  ratioToAspect
} from "../src/client/features/canvas/workflows/video-generator-job-utils.js";
import {
  buildGeneratedVideoNodeOptions,
  getVideoProgressStatusText,
  replaceVideoPreviewWithResult
} from "../src/client/features/canvas/workflows/video-generator-preview-utils.js";
import {
  buildVideoOptionGroups,
  getModeOptions,
  getSelectedVideoOptionsFromModel,
  getVideoGenerationModels,
  getVideoSelectedModelId
} from "../src/client/features/canvas/workflows/video-generator-option-utils.js";
import {
  getVideoReferences,
  mergeVideoReferences,
  readVideoReferenceFiles,
  removeVideoReferenceAt,
  renderVideoReferenceThumbnails
} from "../src/client/features/canvas/workflows/video-generator-reference-utils.js";
import {
  isVideoGenerationBusy,
  restoreVideoDraftState,
  saveVideoDraftState,
  setVideoBusyState,
  setVideoStatusText
} from "../src/client/features/canvas/workflows/video-generator-form-state-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function createFakeSelect(value = "") {
  return {
    value,
    dataset: {}
  };
}

const workflow = read("src/client/features/canvas/workflows/video-generator-workflow.js");

assert(
  workflow.includes("from \"./video-generator-job-utils.js\"")
    && workflow.includes("from \"./video-generator-preview-utils.js\"")
    && workflow.includes("from \"./video-generator-option-utils.js\"")
    && workflow.includes("from \"./video-generator-reference-utils.js\"")
    && workflow.includes("from \"./video-generator-form-state-utils.js\""),
  "video generator workflow must keep job, preview, option, reference, and form-state boundaries"
);
assert(
  !workflow.includes("function waitForVideoJob(")
    && !workflow.includes("function createVideoGenerationPayload(")
    && !workflow.includes("function replaceVideoPreviewWithResult(")
    && !workflow.includes("const audioOptions ="),
  "video generator workflow must not inline extracted job, preview, or option group helpers"
);
assert(
  workflow.includes("await saveCurrentProjectAfterGeneration?.();")
    && workflow.includes("markVideoPreviewFailed(previewNode, error);"),
  "video generator workflow must keep successful autosave and failed preview handling"
);

const references = [
  { name: "one.png", dataUrl: "data:image/png;base64,one" },
  { name: "two.png", dataUrl: "data:image/png;base64,two" }
];
const generationInputs = buildVideoGenerationInputs({
  model: "video-model",
  prompt: "demo",
  references,
  videoOptions: { size: "9:16", duration: 5 },
  defaultRatio: "16:9"
});
assert(generationInputs.model === "video-model", "video generation inputs must keep model");
assert(generationInputs.prompt === "demo", "video generation inputs must keep prompt");
assert(generationInputs.images.length === 2, "video generation inputs must include reference data URLs");
assert(generationInputs.aspectRatio === "9 / 16", "video generation inputs must normalize aspect ratio");
assert(ratioToAspect("", "1:1") === "1 / 1", "ratioToAspect must use fallback ratio");
assert(hasVideoGenerationInput("", references), "reference-only video generation must be valid");
assert(!hasVideoGenerationInput("", []), "empty video generation input must be invalid");
assert(hasVideoGenerationServices({
  addGenerationPreview: () => {},
  replacePreviewWithVideo: () => {}
}), "video generation services must accept required callbacks");
assert(!hasVideoGenerationServices({ addGenerationPreview: () => {} }), "video generation services must reject missing replacement callback");
assert(hasVideoGenerationModel("video-model"), "video generation model guard must accept a model id");

const payload = createVideoGenerationPayload({
  model: "video-model",
  prompt: "demo",
  images: ["data:image/png;base64,one"],
  videoOptions: { size: "9:16" },
  defaultSize: "16:9"
});
assert(payload.size === "9:16" && payload.videoOptions.size === "9:16", "video payload must prefer option size");
assert(getResultVideoUrl({ videoUrl: "/uploads/video.mp4" }) === "/uploads/video.mp4", "video result must read direct videoUrl");
assert(getResultVideoUrl({ videoUrls: ["/uploads/first.mp4"] }) === "/uploads/first.mp4", "video result must read first videoUrls item");
assert(getResultVideoUrl({
  outputs: [{ type: "video", url: "/uploads/output.mp4" }]
}) === "/uploads/output.mp4", "video result must read video output URL");

const model = {
  allowedOptions: {
    size: ["16:9"],
    resolution: ["720p"],
    duration: [5],
    return_last_frame: [true],
    generate_audio: [true]
  }
};
const selectedOptions = getSelectedVideoOptionsFromModel(model, (kind) => ({
  size: "16:9",
  resolution: "720p",
  duration: "5",
  mode: "last-frame",
  audio: "true"
})[kind] || "");
assert(selectedOptions.duration === 5, "video options must normalize duration to a number");
assert(selectedOptions.return_last_frame === true, "video options must map last-frame mode");
assert(selectedOptions.generate_audio === true, "video options must map audio toggle");
assert(getModeOptions(model.allowedOptions).some((option) => option.value === "last-frame"), "video mode options must include last-frame when supported");
const optionGroups = buildVideoOptionGroups({
  allowed: model.allowedOptions,
  savedOptions: {
    mode: "last-frame",
    size: "16:9",
    resolution: "720p",
    duration: "5",
    audio: "true"
  },
  defaultRatio: "1:1"
});
assert(optionGroups.map((group) => group.kind).join(",") === "mode,size,resolution,duration,audio", "video option groups must keep stable render order");
assert(optionGroups.find((group) => group.kind === "mode")?.selectedValue === "last-frame", "video option groups must prefer saved mode");
assert(optionGroups.find((group) => group.kind === "duration")?.options[0]?.label === "5s", "video option groups must format duration labels");
assert(optionGroups.find((group) => group.kind === "audio")?.options.length === 2, "video option groups must expose audio options when supported");
assert(buildVideoOptionGroups({ allowed: {}, defaultRatio: "1:1" }).find((group) => group.kind === "size")?.selectedValue === "1:1", "video option groups must fall back to the default ratio");
assert(getVideoSelectedModelId({
  controls: { modelSelect: createFakeSelect("video-b") },
  models: [{ id: "video-a" }, { id: "video-b" }],
  selectedModelId: "video-a"
}) === "video-b", "video selected model must prefer control value");
assert(getVideoGenerationModels([
  { id: "image-a", type: "image", priority: 1 },
  { id: "video-b", type: "video", priority: 2, capabilities: ["video_generation"] },
  { id: "video-a", type: "video", priority: 1 }
], (id) => id.startsWith("video") ? "video" : "image").map((item) => item.id).join(",") === "video-a,video-b", "video model list must filter and sort video models");

const generatedOptions = buildGeneratedVideoNodeOptions({
  previewNode: { offsetWidth: 320, querySelector: () => null },
  prompt: "demo",
  videoUrl: "/uploads/video.mp4",
  aspectRatio: "16 / 9",
  result: { requestedModel: "actual-model" },
  model: "fallback-model"
});
assert(generatedOptions.actionType === "video_generation", "generated video node options must preserve action type");
assert(generatedOptions.model === "actual-model", "generated video node options must prefer requested model");
assert(getVideoProgressStatusText(42) === "Waiting for video (42%)", "video progress text must include progress");
const sourceNode = { dataset: { nodeId: "source-1" } };
const replaced = replaceVideoPreviewWithResult({
  replacePreviewWithVideo: (_previewNode, options) => ({ dataset: {}, options }),
  selectNode: (node) => { node.selected = true; },
  previewNode: { offsetWidth: 320, querySelector: () => null },
  prompt: "demo",
  videoUrl: "/uploads/video.mp4",
  aspectRatio: "16 / 9",
  sourceNode,
  result: {},
  model: "fallback-model"
});
assert(replaced.dataset.videoGeneratorSourceNodeId === "source-1", "replacement must preserve source node id");
assert(replaced.selected === true, "replacement must select the created node");

const readItems = await readVideoReferenceFiles([
  { type: "image/png", name: "ref.png" },
  { type: "text/plain", name: "skip.txt" }
], async () => "data:image/png;base64,ref");
assert(readItems.length === 1 && readItems[0].name === "ref.png", "video reference reader must keep image files only");
assert(mergeVideoReferences([{ dataUrl: "a" }], [{ dataUrl: "b" }, { dataUrl: "c" }, { dataUrl: "d" }]).length === 3, "video references must stay capped");
assert(removeVideoReferenceAt([{ dataUrl: "a" }, { dataUrl: "b" }], 0)[0].dataUrl === "b", "video reference removal must remove by index");
assert(renderVideoReferenceThumbnails([{ name: "ref.png", dataUrl: "data:image/png;base64,ref" }]).includes("data-video-reference-index=\"0\""), "video reference thumbnails must expose removable indexes");
const referenceNode = { _videoGeneratorReferences: readItems };
assert(getVideoReferences(referenceNode).length === 1, "video reference getter must read node reference state");

const draftNode = { dataset: {} };
const controls = {
  promptInput: { value: "draft prompt" },
  modelSelect: { value: "video-model", dataset: {} }
};
saveVideoDraftState(draftNode, {
  controls,
  optionKinds: ["size"],
  getOptionValue: () => "16:9"
});
assert(draftNode._videoGeneratorPromptDraft === "draft prompt", "video draft must persist prompt");
assert(draftNode.dataset.videoGeneratorSize === "16:9", "video draft must persist options");
controls.promptInput.value = "";
controls.modelSelect.dataset = {};
restoreVideoDraftState(draftNode, controls);
assert(controls.promptInput.value === "draft prompt", "video draft restore must restore prompt");
assert(controls.modelSelect.dataset.selectedModelId === "video-model", "video draft restore must restore model selection");
const fakeControls = [
  { disabled: false, matches: () => false },
  { disabled: false, matches: (selector) => selector === "[data-video-generator-reference-input]" }
];
setVideoBusyState(draftNode, { querySelectorAll: () => fakeControls }, true);
assert(isVideoGenerationBusy(draftNode), "video busy state must be stored on the node");
assert(fakeControls[0].disabled === true && fakeControls[1].disabled === false, "video busy state must leave reference input enabled");
const status = { textContent: "" };
setVideoStatusText(status, "Ready");
assert(status.textContent === "Ready", "video status helper must write status text");

console.log("Video generator workflow checks passed.");
