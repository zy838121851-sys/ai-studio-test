import {
  DEFAULT_EXPAND_MODEL,
  DEFAULT_IMAGE_MODEL,
  listImageModels
} from "../src/server/services/model-catalog.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expectedImageIds = [
  "gpt-image-2",
  "nano-banana-pro",
  "midjourney",
  "nano-banana",
  "nano-banana-2",
  "qwen-image-2.0-pro",
  "wan2.7-image-pro",
  "qwen-image-edit-plus",
  "seedream-5-lite",
  "seedream-4-5"
];

const expectedVideoIds = [
  "seedance-2",
  "seedance-1-5-pro",
  "kling-v3",
  "kling-v3-omni"
];

const models = listImageModels();
const imageModels = models.filter((model) => model.type !== "video");
const videoModels = models.filter((model) => model.type === "video");
const imageIds = imageModels.map((model) => model.id);
const videoIds = videoModels.map((model) => model.id);
const ids = models.map((model) => model.id);

assert(DEFAULT_IMAGE_MODEL === "gpt-image-2", "Default image model should match the first visible image model");
assert(DEFAULT_EXPAND_MODEL === "wan2.7-image-pro", "Default expand model should remain Wan 2.7 Image Pro");
assert(JSON.stringify(imageIds) === JSON.stringify(expectedImageIds), `Visible image models are out of order: ${imageIds.join(", ")}`);
assert(JSON.stringify(videoIds) === JSON.stringify(expectedVideoIds), `Visible video models are out of order: ${videoIds.join(", ")}`);
assert(imageModels.every((model) => model.displayGroup === "图像模型"), "All image models should use the unified image group");
assert(videoModels.every((model) => model.displayGroup === "视频模型"), "All video models should use the unified video group");

[
  "seedream",
  "qwen-image",
  "gpt-image",
  "seedance",
  "kling",
  "doubao-seedream-5-0-lite-260128",
  "doubao-seedream-4-5-251128",
  "wan2.7-image",
  "qwen-image-max",
  "qwen-image-plus"
].forEach((id) => assert(!ids.includes(id), `Hidden compatibility model should not be listed: ${id}`));

assert(models.every((model) => !("provider" in model)), "Public model catalog must not expose provider");
assert(models.every((model) => !("providerId" in model)), "Public model catalog must not expose providerId");
assert(models.every((model) => !("providerModel" in model)), "Public model catalog must not expose providerModel");
assert(models.every((model) => !("vendor" in model)), "Public model catalog must not expose vendor");

["home", "chat"].forEach((surface) => {
  const surfaceModels = listImageModels({ surface });
  assert(surfaceModels.some((model) => model.type === "video"), `${surface} should include video models`);
});

["generator", "imageEdit"].forEach((surface) => {
  const surfaceModels = listImageModels({ surface });
  assert(surfaceModels.every((model) => model.type !== "video"), `${surface} should not include video models`);
});

const imageEditIds = listImageModels({ surface: "imageEdit" }).map((model) => model.id);
assert(imageEditIds.includes("qwen-image-edit-plus"), "Image edit menu should include Qwen Image Edit Plus");
assert(!imageEditIds.includes("midjourney"), "Image edit menu should not include image-generation-only models");

console.log("Model catalog checks passed.");
