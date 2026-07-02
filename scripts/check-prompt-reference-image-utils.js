import {
  imageSourceToDataUrl,
  inferMimeTypeFromDataUrl,
  readSelectedImageReference
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

const selectedRoot = makeSelectedImageRoot({
  title: "Canvas title",
  imageSource: "/uploads/selected.png"
});
const selectedReference = await readSelectedImageReference(async (source) => {
  assert(source === "/uploads/selected.png", "Selected image reference should read the selected image source");
  return "data:image/png;base64,selected";
}, { root: selectedRoot });
assert(selectedReference.type === "image", "Selected image reference should use image type");
assert(selectedReference.name === "Canvas title", "Selected image reference should prefer dataset title");
assert(selectedReference.source === "canvas-selection", "Selected image reference should keep canvas source marker");
assert(selectedReference.dataUrl === "data:image/png;base64,selected", "Selected image reference should include data URL");

const fallbackTitleReference = await readSelectedImageReference(async () => "data:image/png;base64,fallback", {
  root: makeSelectedImageRoot({
    title: "",
    nodeTitle: "Visible node title",
    objectUrl: "/uploads/object.png"
  })
});
assert(fallbackTitleReference.name === "Visible node title", "Selected image reference should use visible title fallback");

const defaultTitleReference = await readSelectedImageReference(async () => "data:image/png;base64,default", {
  root: makeSelectedImageRoot({
    title: "",
    nodeTitle: "",
    imageSource: "/uploads/default.png"
  })
});
assert(defaultTitleReference.name === "Selected canvas image", "Selected image reference should use default title fallback");

assert(await readSelectedImageReference(null, { root: selectedRoot }) === null, "Selected image reference should ignore missing reader");
assert(await readSelectedImageReference(async () => "", { root: selectedRoot }) === null, "Selected image reference should ignore empty data URLs");
assert(await readSelectedImageReference(async () => "data:image/png;base64,none", { root: { querySelector: () => null } }) === null, "Selected image reference should ignore missing selection");

const warnings = [];
const failedReference = await readSelectedImageReference(async () => {
  throw new Error("read failed");
}, {
  root: selectedRoot,
  warn: (...args) => warnings.push(args)
});
assert(failedReference === null, "Selected image reference should return null after read failure");
assert(warnings.length === 1, "Selected image reference should warn on read failure");

console.log("Prompt reference image utility checks passed.");

function makeSelectedImageRoot({
  title = "Canvas title",
  nodeTitle = "",
  imageSource = "",
  objectUrl = ""
} = {}) {
  const node = {
    dataset: {
      title,
      objectUrl
    },
    querySelector(selector) {
      if (selector === "img" && imageSource) {
        return {
          currentSrc: imageSource,
          src: imageSource
        };
      }
      if (selector === ".node-title") {
        return {
          textContent: nodeTitle
        };
      }
      return null;
    }
  };
  return {
    querySelector(selector) {
      if (selector === "#canvasWorld .node-image.selected[data-active-selection='true']") return node;
      return null;
    }
  };
}
