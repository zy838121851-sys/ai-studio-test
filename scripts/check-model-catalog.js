import {
  DEFAULT_EXPAND_MODEL,
  DEFAULT_IMAGE_MODEL,
  listImageModels
} from "../src/server/services/model-catalog.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredModels = [
  "doubao-seedream-5-0-lite-260128",
  "doubao-seedream-4-5-251128",
  "doubao-seedream-4-0-250828",
  "wan2.7-image-pro",
  "wan2.7-image",
  "z-image-turbo",
  "qwen-image-2.0-pro",
  "qwen-image-2.0",
  "qwen-image-max",
  "qwen-image-plus",
  "qwen-image-edit-max",
  "qwen-image-edit-plus"
];

const allModels = listImageModels();
const allIds = allModels.map((model) => model.id);

assert(DEFAULT_IMAGE_MODEL === "doubao-seedream-5-0-lite-260128", "Default image model should be Seedream 5.0 Lite");
assert(DEFAULT_EXPAND_MODEL === "wan2.7-image-pro", "Default expand model should be Wan 2.7 Image Pro");
assert(allIds[0] === DEFAULT_IMAGE_MODEL, "Default model should sort first");
requiredModels.forEach((id) => assert(allIds.includes(id), `Missing model catalog entry: ${id}`));
assert(!allIds.some((id) => /seedance/i.test(id)), "Seedance video model should not be in the image catalog");

["home", "chat", "generator", "imageEdit"].forEach((surface) => {
  const models = listImageModels({ surface });
  assert(models[0]?.id === DEFAULT_IMAGE_MODEL, `${surface} should show the default model first`);
});

process.env.VOLCENGINE_API_KEY = "test-volcengine-key";
process.env.VOLCENGINE_IMAGE_URL = "https://mock.volcengine.test/images";
process.env.DASHSCOPE_API_KEY = "test-dashscope-key";
process.env.DASHSCOPE_URL = "https://mock.dashscope.test/multimodal";

const originalFetch = globalThis.fetch;
let volcengineBody;
globalThis.fetch = async (url, options) => {
  assert(url === process.env.VOLCENGINE_IMAGE_URL, "Seedream should call the Ark images endpoint");
  assert(options.headers.Authorization === "Bearer test-volcengine-key", "Seedream should use VOLCENGINE_API_KEY");
  volcengineBody = JSON.parse(options.body);
  return {
    ok: true,
    async json() {
      return {
        data: [
          { url: "mock://seedream-result" }
        ]
      };
    }
  };
};
const { callVolcengineSeedreamImage } = await import("../src/server/services/providers/volcengine.provider.js");
const seedreamResult = await callVolcengineSeedreamImage({
  model: DEFAULT_IMAGE_MODEL,
  prompt: "test prompt",
  images: ["data:image/png;base64,abc"],
  size: "2048*2048"
});
assert(seedreamResult.imageUrl === "mock://seedream-result", "Seedream provider should return imageUrl");
assert(volcengineBody.model === DEFAULT_IMAGE_MODEL, "Seedream request should keep selected model");
assert(volcengineBody.response_format === "url", "Seedream request should ask for URL output");
assert(volcengineBody.watermark === false, "Seedream request should disable watermark");
assert(volcengineBody.size === "2K", "Seedream request should normalize pixel sizes to 2K");
assert(!("images" in volcengineBody), "Seedream request should not use the unsupported images field");
assert(volcengineBody.image === "data:image/png;base64,abc", "Seedream request should preserve a single reference as image");
assert(seedreamResult.providerCalls?.[0]?.provider === "volcengine", "Seedream provider should return providerCalls");

let dashScopeBody;
globalThis.fetch = async (url, options) => {
  assert(url === process.env.DASHSCOPE_URL, "Wan2.7 expand should use multimodal generation endpoint");
  dashScopeBody = JSON.parse(options.body);
  return {
    ok: true,
    async json() {
      return {
        output: {
          choices: [
            {
              message: {
                content: [
                  { image: "mock://wan27-expanded" }
                ]
              }
            }
          ]
        }
      };
    }
  };
};
const { callQwenImage, callWan27ImageExpand } = await import("../src/server/services/providers/qwen.provider.js");
const qwenReferenceResult = await callQwenImage({
  model: "qwen-image-plus",
  prompt: "edit the reference",
  images: ["data:image/png;base64,qwenref"],
  size: "1024*1024"
});
assert(qwenReferenceResult.imageUrl === "mock://wan27-expanded", "Qwen reference generation should return imageUrl");
assert(dashScopeBody.model === "qwen-image-edit-plus", "Qwen legacy reference generation may resolve to qwen-image-edit-plus");
assert(qwenReferenceResult.providerCalls?.[0]?.provider === "qwen", "Qwen reference generation should expose qwen providerCalls");
const expandResult = await callWan27ImageExpand({
  image: "data:image/png;base64,abc",
  prompt: "expand the left and right sides"
});
assert(expandResult.imageUrl === "mock://wan27-expanded", "Wan2.7 expand should return imageUrl");
assert(dashScopeBody.model === "wan2.7-image-pro", "Wan2.7 expand should use Pro model by default");
assert(!("function" in (dashScopeBody.input || {})), "Wan2.7 expand should not send legacy edit function");
assert(dashScopeBody.parameters?.size === "2K", "Wan2.7 expand should request 2K output");
assert(dashScopeBody.parameters?.watermark === false, "Wan2.7 expand should disable watermark");
assert(dashScopeBody.parameters?.n === 1, "Wan2.7 expand should request one output");

globalThis.fetch = originalFetch;
console.log("Model catalog checks passed.");
