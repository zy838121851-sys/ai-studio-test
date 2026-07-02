import {
  imageSourceToDataUrl,
  inferMimeTypeFromDataUrl,
  readDomPreviewReferences,
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

const registeredLogs = [];
const registeredReferences = await readDomPreviewReferences({
  root: makePreviewRoot([
    makePreviewButton({
      attachmentId: "att-1",
      attachmentName: "button-name.png",
      attachmentType: "image/jpeg",
      attachmentSize: "999",
      imageAlt: "alt-name.png"
    })
  ]),
  getAttachmentFile: () => ({
    name: "registered.png",
    type: "image/png",
    size: 123
  }),
  readFileAsDataUrl: async () => "data:image/png;base64,registered",
  logDebug: (label, data) => registeredLogs.push({ label, data })
});
assert(registeredReferences.length === 1, "DOM preview references should recover registered files");
assert(registeredReferences[0].type === "image/png", "DOM preview references should prefer registered file type");
assert(registeredReferences[0].name === "registered.png", "DOM preview references should prefer registered file name");
assert(registeredReferences[0].source === "upload", "DOM preview references should mark upload source");
assert(registeredReferences[0].attachmentId === "att-1", "DOM preview references should preserve attachment id");
assert(registeredLogs[0].label === "attachments.dom_preview_complete", "DOM preview references should log completion");
assert(registeredLogs[0].data.recoveredReferenceCount === 1, "DOM preview completion log should include recovered count");

const fallbackLogs = [];
const fallbackReferences = await readDomPreviewReferences({
  root: makePreviewRoot([
    makePreviewButton({
      attachmentId: "att-2",
      attachmentName: "fallback-name.png",
      attachmentType: "",
      attachmentSize: "456",
      imageSrc: "/uploads/fallback.png",
      imageAlt: "fallback-alt.png"
    })
  ]),
  getAttachmentFile: () => ({
    name: "broken.png",
    type: "",
    size: 456
  }),
  readFileAsDataUrl: async () => {
    throw new Error("registry failed");
  },
  imageSourceToDataUrlImpl: async (source) => {
    assert(source === "/uploads/fallback.png", "DOM preview fallback should read image source");
    return "data:image/webp;base64,fallback";
  },
  logDebug: (label, data) => fallbackLogs.push({ label, data })
});
assert(fallbackReferences.length === 1, "DOM preview references should fall back to image sources");
assert(fallbackReferences[0].type === "image/webp", "DOM preview fallback should infer MIME type");
assert(fallbackReferences[0].name === "fallback-name.png", "DOM preview fallback should prefer attachment name");
assert(fallbackLogs.some((item) => item.label === "attachments.dom_registry_failed"), "DOM preview fallback should log registry failure");
assert(fallbackLogs.some((item) => item.label === "attachments.dom_preview_complete"), "DOM preview fallback should log completion");

const failedPreviewLogs = [];
const failedPreviewReferences = await readDomPreviewReferences({
  root: makePreviewRoot([
    makePreviewButton({
      attachmentId: "att-3",
      imageSrc: "/uploads/missing.png"
    })
  ]),
  getAttachmentFile: () => null,
  imageSourceToDataUrlImpl: async () => {
    throw new Error("preview failed");
  },
  logDebug: (label, data) => failedPreviewLogs.push({ label, data })
});
assert(failedPreviewReferences.length === 0, "DOM preview references should skip unreadable previews");
assert(failedPreviewLogs.some((item) => item.label === "attachments.dom_preview_failed"), "DOM preview references should log preview failures");
assert(failedPreviewLogs.at(-1).data.recoveredReferenceCount === 0, "DOM preview completion should report zero recovered references");

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

function makePreviewRoot(buttons = []) {
  return {
    querySelectorAll(selector) {
      return selector === ".chat-image-preview button" ? buttons : [];
    }
  };
}

function makePreviewButton({
  attachmentId = "",
  attachmentName = "",
  attachmentType = "",
  attachmentSize = "",
  imageSrc = "",
  imageAlt = ""
} = {}) {
  return {
    dataset: {
      attachmentId,
      attachmentName,
      attachmentType,
      attachmentSize
    },
    querySelector(selector) {
      if (selector !== "img") return null;
      return {
        currentSrc: imageSrc,
        src: imageSrc,
        alt: imageAlt
      };
    }
  };
}
