import {
  normalizeApimartImageSize,
  normalizeImageGenerationSize
} from "../src/server/services/image-size-normalization.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertApimart(input, expected, message) {
  const result = normalizeApimartImageSize({
    modelId: input.modelId || "gpt-image-2",
    providerModel: input.providerModel || input.modelId || "gpt-image-2",
    size: input.size,
    defaultSize: input.defaultSize || "1024*1024"
  });
  for (const [key, value] of Object.entries(expected)) {
    assert(result[key] === value, `${message}: expected ${key}=${value}, got ${result[key]}`);
  }
  return result;
}

const tall = assertApimart(
  { size: "1648*2048" },
  { providerSize: "auto", providerResolution: "2K", normalizedSize: "2K" },
  "Arbitrary star dimensions should fall back to auto plus resolution"
);
assert(tall.providerSize !== "103:128", "Arbitrary dimensions must not be reduced to 103:128");

const tallX = assertApimart(
  { size: "1648x2048" },
  { providerSize: "auto", providerResolution: "2K", normalizedSize: "2K" },
  "Arbitrary x dimensions should fall back to auto plus resolution"
);
assert(tallX.providerSize !== "103:128", "Arbitrary x dimensions must not be reduced to 103:128");

assertApimart(
  { size: "1024x1024" },
  { providerSize: "1024x1024", providerResolution: "1K", normalizedSize: "1024x1024" },
  "Standard pixel dimensions should be preserved"
);

assertApimart(
  { size: "1024*1024" },
  { providerSize: "1024x1024", providerResolution: "1K", normalizedSize: "1024x1024" },
  "Standard star dimensions should be normalized to x pixels"
);

assertApimart(
  { size: "16:9" },
  { providerSize: "16:9", providerResolution: "1K", normalizedSize: "16:9" },
  "Standard ratios should be preserved"
);

assertApimart(
  { size: "2K" },
  { providerSize: "auto", providerResolution: "2K", normalizedSize: "2K" },
  "Resolution tokens should map to auto plus resolution"
);

assertApimart(
  { size: "", defaultSize: "1024*1024" },
  { providerSize: "1024x1024", providerResolution: "1K", normalizedSize: "1024x1024" },
  "Empty sizes should use the model default"
);

assertApimart(
  { size: "not-a-size" },
  { providerSize: "auto", providerResolution: "1K", normalizedSize: "auto" },
  "Invalid sizes should fall back to auto"
);

const midjourney = assertApimart(
  { modelId: "midjourney", providerModel: "midjourney", size: "1648*2048" },
  { providerSize: "3:4", providerResolution: "", normalizedSize: "3:4" },
  "Midjourney arbitrary dimensions should map to a standard ratio"
);
assert(!/^\d{2,}:\d{2,}$/.test(midjourney.providerSize), "Midjourney must not receive an arbitrary ratio");

const serviceLevel = normalizeImageGenerationSize({
  providerId: "apimart",
  modelId: "gpt-image-2",
  providerModel: "gpt-image-2",
  size: "1648*2048",
  defaultSize: "1024*1024"
});
assert(serviceLevel.providerSize === "auto", "Service normalization should return providerSize auto");
assert(serviceLevel.providerResolution === "2K", "Service normalization should return providerResolution 2K");

console.log("Image size normalization checks passed.");
