import { readFile } from "node:fs/promises";
import { getQwenImageSizeForDimensions } from "../src/client/features/ai/image-generator.js";
import { buildImageUpscalePrompt } from "../src/client/features/canvas/node-controls.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const twoKPrompt = buildImageUpscalePrompt(2048);
const fourKPrompt = buildImageUpscalePrompt(4096);

assert(twoKPrompt.includes("genuinely sharper 2K super-resolution"), "2K prompt should request real super-resolution");
assert(fourKPrompt.includes("genuinely sharper 4K super-resolution"), "4K prompt should request real super-resolution");
assert(fourKPrompt.includes("Do not merely resize or interpolate pixels"), "Upscale prompt should reject simple interpolation");
assert(fourKPrompt.includes("Reconstruct real-looking fine detail"), "Upscale prompt should ask the model to reconstruct detail");
assert(fourKPrompt.includes("Remove blur"), "Upscale prompt should explicitly remove blur");
assert(fourKPrompt.includes("hair/fur/fabric/material grain"), "Upscale prompt should cover texture restoration");

assert(
  getQwenImageSizeForDimensions(480, 320, { maxSize: 4096 }) === "4096*2736",
  "4K upscale should request a 4096-long-edge model output size"
);
assert(
  getQwenImageSizeForDimensions(480, 320, { maxSize: 2048 }) === "2048*1360",
  "2K upscale should request a 2048-long-edge model output size"
);

const editActions = await readFile(new URL("../src/client/features/ai/image-edit-actions.js", import.meta.url), "utf8");
assert(!editActions.includes("upscaleImageSourceToLongEdge"), "Client-side upscale helper should not exist");
assert(!editActions.includes("drawImage(image, 0, 0, canvas.width, canvas.height)"), "Client should not upscale the result with canvas interpolation");

console.log("Upscale prompt checks passed.");
