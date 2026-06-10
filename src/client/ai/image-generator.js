import { generateImage } from "./ai-client.js";
import { buildImagePrompt } from "./prompt-builder.js";

export function generateCanvasImage(input) {
  return generateImage(buildImagePrompt(input));
}
