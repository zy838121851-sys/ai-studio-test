import { readFile } from "node:fs/promises";
import { superResolutionImage } from "../src/server/services/ai.service.js";
import { registerAIProvider } from "../src/server/services/providers/index.js";
import {
  buildImageUpscalePrompt,
  getImageUpscaleFactor
} from "../src/client/features/canvas/node-controls.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const prompt = buildImageUpscalePrompt();

assert(prompt.includes("Image super resolution"), "Upscale prompt should request image super resolution");
assert(prompt.includes("Preserve the original image content exactly"), "Upscale prompt should preserve the original exactly");
assert(!prompt.includes("Reconstruct real-looking fine detail"), "Upscale prompt should not ask the model to reconstruct details");
assert(!prompt.includes("infer plausible fine texture"), "Upscale prompt should not ask the model to infer texture");
assert(!prompt.includes("genuinely sharper 4K"), "Upscale prompt should not be target-size generative copy");

assert(
  getImageUpscaleFactor({ naturalWidth: 480, naturalHeight: 320 }, 2048) === 4,
  "2K upscale should clamp a small source to 4x"
);
assert(
  getImageUpscaleFactor({ naturalWidth: 1600, naturalHeight: 900 }, 2048) === 2,
  "2K upscale should use 2x for a 1600px long edge"
);
assert(
  getImageUpscaleFactor({ naturalWidth: 3000, naturalHeight: 2000 }, 4096) === 2,
  "4K upscale should use 2x for a 3000px long edge"
);
assert(
  getImageUpscaleFactor({ naturalWidth: 4096, naturalHeight: 2736 }, 4096) === 1,
  "4K upscale should use 1x when the source is already 4096px long edge"
);

const editActions = await readFile(new URL("../src/client/features/ai/image-edit-actions.js", import.meta.url), "utf8");
assert(!editActions.includes("upscaleImageSourceToLongEdge"), "Client-side upscale helper should not exist");
assert(!editActions.includes("drawImage(image, 0, 0, canvas.width, canvas.height)"), "Client should not upscale the result with canvas interpolation");

const providerSource = await readFile(new URL("../src/server/services/providers/qwen.provider.js", import.meta.url), "utf8");
assert(providerSource.includes('function: "super_resolution"'), "Provider should call Wan super_resolution");
assert(providerSource.includes("upscale_factor"), "Provider should send upscale_factor");

const routesSource = await readFile(new URL("../src/server/routes/ai.routes.js", import.meta.url), "utf8");
assert(routesSource.includes('actionType === "upscale"'), "Image edit route should branch on upscale");
assert(routesSource.includes("superResolutionImage({"), "Upscale route should call superResolutionImage");

const restoreProvider = registerAIProvider({
  id: "qwen",
  async superResolutionImage({ image, prompt: providerPrompt, upscaleFactor }) {
    assert(image === "data:image/mock;base64,abc", "Super resolution should receive the source image");
    assert(providerPrompt.includes("Image super resolution"), "Super resolution should receive the minimal prompt");
    assert(providerPrompt.includes("Preserve the original image content exactly"), "Super resolution should receive the preservation instruction");
    assert(upscaleFactor === 4, "Super resolution should receive the computed factor");
    return {
      imageUrl: "mock://upscaled",
      upscaleFactor,
      model: "wanx2.1-imageedit"
    };
  },
  async generateImage() {
    throw new Error("generateImage should not be called for upscale checks");
  },
  async expandImage() {
    throw new Error("expandImage should not be called for upscale checks");
  },
  async analyzeImage() {
    throw new Error("analyzeImage should not be called for upscale checks");
  },
  async generateText() {
    throw new Error("generateText should not be called for upscale checks");
  }
});

const result = await superResolutionImage({
  image: "data:image/mock;base64,abc",
  prompt,
  upscaleFactor: 4
});
assert(result.imageUrl === "mock://upscaled", "Upscale service should return the provider result");
restoreProvider();

console.log("Upscale super-resolution checks passed.");
