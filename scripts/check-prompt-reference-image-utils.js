import {
  imageSourceToDataUrl,
  inferMimeTypeFromDataUrl
} from "../src/client/features/workspace/chat/workflows/prompt-reference-image-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dataUrl = "data:image/png;base64,abcd";
assert(await imageSourceToDataUrl(dataUrl) === dataUrl, "Image source conversion should return existing data URLs");
assert(await imageSourceToDataUrl("") === "", "Image source conversion should handle empty sources");

let fetchedUrl = "";
const converted = await imageSourceToDataUrl("/uploads/a.png", {
  fetchImpl: async (url) => {
    fetchedUrl = url;
    return {
      ok: true,
      async blob() {
        return { id: "blob-1" };
      }
    };
  },
  blobToDataUrlImpl: async (blob) => `data:image/mock;base64,${blob.id}`
});
assert(fetchedUrl === "/uploads/a.png", "Image source conversion should fetch non-data URLs");
assert(converted === "data:image/mock;base64,blob-1", "Image source conversion should convert fetched blobs");

let failed = false;
try {
  await imageSourceToDataUrl("/uploads/missing.png", {
    fetchImpl: async () => ({
      ok: false,
      status: 404
    })
  });
} catch (error) {
  failed = error.message === "preview fetch failed: 404";
}
assert(failed, "Image source conversion should surface fetch failures");

assert(inferMimeTypeFromDataUrl("data:image/png;base64,abcd") === "image/png", "MIME inference should read base64 data URLs");
assert(inferMimeTypeFromDataUrl("data:image/svg+xml;charset=utf-8,<svg></svg>") === "image/svg+xml", "MIME inference should ignore parameters");
assert(inferMimeTypeFromDataUrl("https://example.com/a.png") === "", "MIME inference should ignore non-data URLs");

console.log("Prompt reference image utility checks passed.");
