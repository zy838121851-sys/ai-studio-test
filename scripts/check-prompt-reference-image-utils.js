import {
  collectReferenceImages,
  getSelectedImageReferenceCount,
  getSelectedImageReferenceNodes,
  getSelectedImageReferencePreviews,
  imageSourceToDataUrl,
  inferMimeTypeFromDataUrl,
  readDomPreviewReferences,
  readSelectedImageReference,
  readSelectedImageReferences
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

const skippedCanvasPreviewReferences = await readDomPreviewReferences({
  root: makePreviewRoot([
    makePreviewButton({
      canvasReference: "true",
      imageSrc: "/uploads/canvas-selected.png"
    })
  ]),
  getAttachmentFile: () => null,
  imageSourceToDataUrlImpl: async () => {
    throw new Error("canvas reference previews should be skipped");
  }
});
assert(skippedCanvasPreviewReferences.length === 0, "DOM preview references should skip selected canvas reference thumbnails");

const selectedRoot = makeSelectedImageRoot({
  title: "Canvas title",
  imageSource: "/uploads/selected.png"
});
assert(getSelectedImageReferenceCount(selectedRoot) === 1, "Selected image count should include readable selected canvas images");
assert(getSelectedImageReferenceNodes(selectedRoot).length === 1, "Selected image lookup should include active selected image node");
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

const multiSelectedRoot = makeMultiSelectedImageRoot([
  makeSelectedImageNode({
    title: "First selected",
    imageSource: "/uploads/first.png"
  }),
  makeSelectedImageNode({
    title: "Second selected",
    imageSource: "/uploads/second.png"
  })
]);
const multiSources = [];
const multiReferences = await readSelectedImageReferences(async (source) => {
  multiSources.push(source);
  return `data:image/png;base64,${source.split("/").pop().replace(".png", "")}`;
}, { root: multiSelectedRoot });
assert(getSelectedImageReferenceCount(multiSelectedRoot) === 2, "Selected image count should include every selected image node");
const multiPreviews = getSelectedImageReferencePreviews(multiSelectedRoot);
assert(multiPreviews.length === 2, "Selected image previews should include every selected image node");
assert(multiPreviews[0].src === "/uploads/first.png", "Selected image previews should preserve image source");
assert(multiPreviews[1].name === "Second selected", "Selected image previews should preserve names");
assert(multiReferences.length === 2, "Selected image references should include every selected canvas image");
assert(multiReferences[0].name === "First selected", "Selected image references should keep active selection first");
assert(multiReferences[1].name === "Second selected", "Selected image references should preserve additional selections");
assert(multiSources.join(",") === "/uploads/first.png,/uploads/second.png", "Selected image references should read every selected image source");

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

const uploadDebug = {};
const uploadLogs = [];
const uploadFile = { name: "upload.png", type: "image/png", size: 12 };
const uploadBundle = await collectReferenceImages({
  files: [uploadFile],
  readFileAsDataUrl: async (file) => {
    assert(file === uploadFile, "Reference collection should read uploaded files");
    return "data:image/png;base64,upload";
  },
  debugRecord: uploadDebug,
  logDebug: (label, data) => uploadLogs.push({ label, data })
});
assert(uploadBundle.attachments.length === 1, "Reference collection should keep uploaded references");
assert(uploadBundle.attachments[0].source === "upload", "Reference collection should mark upload source");
assert(uploadBundle.images[0] === "data:image/png;base64,upload", "Reference collection should expose data URLs");
assert(uploadDebug.dataUrlSuccessCount === 1, "Reference collection should record upload success count");
assert(uploadDebug.dataUrlFailureCount === 0, "Reference collection should record upload failure count");
assert(uploadLogs.some((item) => item.label === "attachments.collect.input"), "Reference collection should log inputs");
assert(uploadLogs.some((item) => item.label === "attachments.dataurl_complete"), "Reference collection should log completion");

const uploadFailureLogs = [];
let uploadCollectionFailed = false;
try {
  await collectReferenceImages({
    files: [{ name: "bad.png", type: "image/png", size: 1 }],
    readFileAsDataUrl: async () => "",
    logDebug: (label, data) => uploadFailureLogs.push({ label, data })
  });
} catch (error) {
  uploadCollectionFailed = error.message === "No uploaded reference images could be converted to dataURL.";
}
assert(uploadCollectionFailed, "Reference collection should fail when every uploaded file is unreadable");
assert(uploadFailureLogs.some((item) => item.label === "attachments.dataurl_failed"), "Reference collection should log upload conversion failures");

const domCollectionLogs = [];
const domBundle = await collectReferenceImages({
  domPreviewAttachments: [{ attachmentId: "dom-1" }],
  readFileAsDataUrl: async () => "data:image/png;base64,unused",
  readDomPreviewReferencesImpl: async ({ readFileAsDataUrl, logDebug }) => {
    assert(typeof readFileAsDataUrl === "function", "Reference collection should pass file reader to DOM fallback");
    logDebug("attachments.dom_preview_complete", {
      domPreviewCount: 1,
      recoveredReferenceCount: 1,
      sources: ["upload"]
    });
    return [{
      type: "image/png",
      name: "dom.png",
      source: "upload",
      dataUrl: "data:image/png;base64,dom"
    }];
  },
  logDebug: (label, data) => domCollectionLogs.push({ label, data })
});
assert(domBundle.attachments.length === 1, "Reference collection should use DOM preview references");
assert(domBundle.attachments[0].name === "dom.png", "Reference collection should preserve DOM preview metadata");
assert(domBundle.images[0] === "data:image/png;base64,dom", "Reference collection should expose DOM preview data URLs");
assert(domCollectionLogs.some((item) => item.label === "attachments.dom_preview_complete"), "Reference collection should pass debug logger to DOM fallback");

let domCollectionFailed = false;
let domCollectionError = null;
try {
  await collectReferenceImages({
    domPreviewAttachments: [{ attachmentId: "missing" }],
    readDomPreviewReferencesImpl: async () => [],
    logDebug: () => {}
  });
} catch (error) {
  domCollectionFailed = true;
  domCollectionError = error;
}
assert(domCollectionFailed, "Reference collection should fail when DOM previews are unreadable");
assert(domCollectionError.failureCode === "REFERENCE_ATTACHMENT_UNREADABLE", "Reference collection should preserve unreadable attachment code");
assert(domCollectionError.stage === "attachments", "Reference collection should preserve unreadable attachment stage");

const selectedBundle = await collectReferenceImages({
  readImageSourceAsDataUrl: async () => "data:image/png;base64,selected",
  readSelectedImageReferenceImpl: async (reader) => {
    assert(typeof reader === "function", "Reference collection should pass selected image reader");
    return {
      type: "image",
      name: "Selected",
      source: "canvas-selection",
      dataUrl: "data:image/png;base64,selected"
    };
  },
  logDebug: () => {}
});
assert(selectedBundle.attachments.length === 1, "Reference collection should use selected canvas image fallback");
assert(selectedBundle.attachments[0].source === "canvas-selection", "Reference collection should preserve selected canvas source");
assert(selectedBundle.images[0] === "data:image/png;base64,selected", "Reference collection should expose selected canvas data URL");

const mixedBundle = await collectReferenceImages({
  files: [{ name: "upload.png", type: "image/png", size: 1 }],
  readFileAsDataUrl: async () => "data:image/png;base64,upload",
  readImageSourceAsDataUrl: async () => "data:image/png;base64,unused",
  readSelectedImageReferencesImpl: async () => ([
    {
      type: "image",
      name: "Canvas one",
      source: "canvas-selection",
      dataUrl: "data:image/png;base64,canvas-one"
    },
    {
      type: "image",
      name: "Canvas two",
      source: "canvas-selection",
      dataUrl: "data:image/png;base64,canvas-two"
    }
  ]),
  logDebug: () => {}
});
assert(mixedBundle.attachments.length === 3, "Reference collection should append selected canvas images to uploaded references");
assert(mixedBundle.attachments.filter((item) => item.source === "canvas-selection").length === 2, "Reference collection should keep all selected canvas references");

console.log("Prompt reference image utility checks passed.");

function makeSelectedImageNode({
  title = "Canvas title",
  nodeTitle = "",
  imageSource = "",
  objectUrl = ""
} = {}) {
  return {
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
}

function makeSelectedImageRoot(options = {}) {
  const node = makeSelectedImageNode(options);
  return {
    querySelector(selector) {
      if (selector === "#canvasWorld .node-image.selected[data-active-selection='true']") return node;
      return null;
    },
    querySelectorAll(selector) {
      return selector === "#canvasWorld .node-image.selected" ? [node] : [];
    }
  };
}

function makeMultiSelectedImageRoot(nodes = []) {
  return {
    querySelector(selector) {
      if (selector === "#canvasWorld .node-image.selected[data-active-selection='true']") return nodes[0] || null;
      if (selector === "#canvasWorld .node-image.selected") return nodes[0] || null;
      return null;
    },
    querySelectorAll(selector) {
      return selector === "#canvasWorld .node-image.selected" ? nodes : [];
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
  imageAlt = "",
  canvasReference = ""
} = {}) {
  return {
    dataset: {
      attachmentId,
      attachmentName,
      attachmentType,
      attachmentSize,
      canvasReference
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
