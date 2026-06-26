import { listImageModels } from "../src/server/services/model-catalog.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const forbidden = [
  /apimart/i,
  /via apimart/i,
  /gateway/i,
  /proxy/i,
  /中转/,
  /provider:\s*"?apimart/i
];

const models = listImageModels();
const text = JSON.stringify(models);
for (const pattern of forbidden) {
  assert(!pattern.test(text), `Public model catalog leaked forbidden provider wording: ${pattern}`);
}

const imageModels = models.filter((model) => model.type !== "video");
const videoModels = models.filter((model) => model.type === "video");
assert(imageModels.length === 10, `Expected 10 visible image models, got ${imageModels.length}`);
assert(videoModels.length === 4, `Expected 4 visible video models, got ${videoModels.length}`);
assert(imageModels.every((model) => model.displayGroup === "图像模型"), "Image models should use one unified group");
assert(videoModels.every((model) => model.displayGroup === "视频模型"), "Video models should use one unified group");

console.log("APIMart public catalog checks passed.");
