process.env.VOLCENGINE_API_KEY = "test-volcengine-key";
process.env.VOLCENGINE_IMAGE_URL = "https://mock.volcengine.test/api/v3/images/generations";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalFetch = globalThis.fetch;
const requests = [];

globalThis.fetch = async (url, options) => {
  requests.push({ url, body: JSON.parse(options.body), headers: options.headers });
  return {
    ok: true,
    async json() {
      return { data: [{ url: "mock://seedream-result" }] };
    }
  };
};

try {
  const { callVolcengineSeedreamImage } = await import("../src/server/services/providers/volcengine.provider.js");

  await callVolcengineSeedreamImage({
    model: "doubao-seedream-5-0-lite-260128",
    prompt: "single reference",
    images: ["data:image/png;base64,one"],
    size: "2048*2048"
  });

  await callVolcengineSeedreamImage({
    model: "doubao-seedream-4-5-251128",
    prompt: "multiple references",
    images: ["data:image/png;base64,one", "data:image/png;base64,two"],
    size: "4096*4096"
  });

  const [single, multi] = requests;
  assert(single.url === process.env.VOLCENGINE_IMAGE_URL, "Volcengine should call the configured image endpoint");
  assert(single.headers.Authorization === "Bearer test-volcengine-key", "Volcengine should use VOLCENGINE_API_KEY");
  assert(single.body.model === "doubao-seedream-5-0-lite-260128", "Single reference should keep selected model");
  assert(single.body.response_format === "url", "Volcengine should request URL output");
  assert(single.body.output_format === "png", "Seedream 5.0-lite should request PNG output");
  assert(single.body.watermark === false, "Volcengine should disable watermark");
  assert(!("images" in single.body), "Single reference should not use images field");
  assert(typeof single.body.image === "string", "Single reference should use image string");
  assert(single.body.image.endsWith(",one"), "Single reference order should be preserved");
  assert(single.body.prompt.includes("图生图任务"), "Reference prompt should explicitly request image-to-image");
  assert(single.body.prompt.includes("用户提示：single reference"), "Reference prompt should preserve the user request");

  assert(multi.body.model === "doubao-seedream-4-5-251128", "Multiple references should keep selected model");
  assert(!("output_format" in multi.body), "Seedream 4.5 should omit unsupported output_format");
  assert(!("images" in multi.body), "Multiple references should not use images field");
  assert(Array.isArray(multi.body.image), "Multiple references should use image array");
  assert(multi.body.image.length === 2, "Multiple references should preserve all inputs");
  assert(multi.body.prompt.includes("第 1 张是主体锚点"), "Multiple reference prompt should keep the first image as the subject anchor");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Volcengine payload checks passed.");
