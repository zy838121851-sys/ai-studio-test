import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const imageService = readFileSync("src/server/services/providers/apimart/apimart-image.service.js", "utf8");
const client = readFileSync("src/server/services/providers/apimart/apimart.client.js", "utf8");

assert(!imageService.includes("buildMidjourneyPrompt"), "Midjourney must not concatenate reference images into prompt");
assert(imageService.includes("normalizeMidjourneyReferenceImages"), "Midjourney references should be normalized separately");
assert(imageService.includes("body.image_urls = imageUrls"), "Midjourney references should be sent as image_urls");
assert(imageService.includes("uploadApimartImage"), "Midjourney data URLs should be uploaded before generation");
assert(client.includes("APIMART_IMAGE_UPLOAD_ENDPOINT = \"/uploads/images\""), "APIMart upload endpoint should be configured");
assert(client.includes("form.append(\"file\""), "APIMart upload should send multipart file field");

console.log("APIMart Midjourney payload checks passed.");
