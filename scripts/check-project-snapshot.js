import {
  createProjectSavePatch,
  isRestorableSnapshotItem,
  normalizePersistentMediaUrl,
  restoreCanvasSnapshotJson
} from "../src/client/features/projects/snapshot.js";
import {
  getProjectMediaUrls,
  projectHasRestorableCanvasContent,
  snapshotHasUnresolvedMedia,
  snapshotNeedsUrlRepair
} from "../src/client/features/projects/snapshot-repair-utils.js";
import {
  sanitizeCanvasSnapshotJson
} from "../src/server/services/snapshot-safety.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  normalizePersistentMediaUrl("http://localhost:3000/uploads/a.png") === "/uploads/a.png",
  "Localhost uploads URLs should be stored as stable relative paths"
);
assert(
  normalizePersistentMediaUrl("http://127.0.0.1:3000/uploads/a.png?x=1#top") === "/uploads/a.png?x=1#top",
  "Loopback uploads URLs should preserve path, query, and hash"
);
assert(
  normalizePersistentMediaUrl("https://cdn.example.com/uploads/a.png") === "https://cdn.example.com/uploads/a.png",
  "External HTTPS uploads URLs should not be rewritten"
);
assert(
  normalizePersistentMediaUrl("blob:http://localhost:3000/generated") === "",
  "Blob URLs should not be persisted"
);

assert(
  !isRestorableSnapshotItem({
    kind: "loading-image",
    className: "node-card node-loading-image generation-frame",
    html: "<figure class=\"image-frame generation-frame\"></figure>"
  }),
  "Loading image snapshot nodes should not be restorable"
);
assert(
  isRestorableSnapshotItem({
    kind: "image",
    className: "node-card node-image",
    html: "<figure class=\"image-frame\"><img src=\"/uploads/a.png\" /></figure>"
  }),
  "Completed image snapshot nodes should remain restorable"
);

const restored = [];
const restoredCount = restoreCanvasSnapshotJson({
  snapshotJson: JSON.stringify({
    version: 1,
    nodes: [
      {
        kind: "loading-image",
        className: "node-card node-loading-image",
        html: "<figure class=\"image-frame generation-frame\"></figure>",
        media: { url: "" }
      },
      {
        kind: "image",
        title: "Generated Image.png",
        className: "node-card node-image",
        html: "<figure class=\"image-frame\"><img src=\"http://localhost:3000/uploads/a.png\" /></figure>",
        dataset: { objectUrl: "http://localhost:3000/uploads/a.png" },
        media: {
          url: "http://localhost:3000/uploads/a.png",
          name: "Generated Image.png",
          type: "image/png"
        }
      }
    ]
  }),
  addNode(config) {
    restored.push(config);
    return {
      className: "",
      dataset: {},
      style: {},
      setAttribute(name, value) {
        this[name] = value;
      }
    };
  }
});

assert(restoredCount === 1, "Restoring snapshots should skip loading nodes");
assert(restored.length === 1, "Only completed media nodes should be restored");
assert(restored[0].kind === "image", "Restored node should preserve completed image kind");
assert(restored[0].media.url === "/uploads/a.png", "Restored media URL should be normalized");

const savedPatch = createProjectSavePatch({
  project: { title: "Snapshot test" },
  canvasWorld: makeCanvasWorld([
    makeCanvasNode({
      kind: "loading-image",
      className: "node-card node-loading-image",
      html: "<figure class=\"image-frame generation-frame\"></figure>"
    }),
    makeCanvasNode({
      kind: "image",
      className: "node-card node-image",
      objectUrl: "http://localhost:3000/uploads/a.png",
      imageUrl: "http://localhost:3000/uploads/a.png",
      html: "<figure class=\"image-frame\"><img src=\"http://localhost:3000/uploads/a.png\" /></figure>"
    })
  ])
});
const savedSnapshot = JSON.parse(savedPatch.canvasSnapshotJson);
assert(savedSnapshot.nodes.length === 1, "Saving snapshots should skip loading image nodes");
assert(savedSnapshot.nodes[0].kind === "image", "Saving snapshots should keep completed image nodes");
assert(savedSnapshot.nodes[0].media.url === "/uploads/a.png", "Saved media URLs should be stable relative paths");
assert(savedSnapshot.nodes[0].dataset.objectUrl === "/uploads/a.png", "Saved dataset media URLs should be stable relative paths");
assert(savedSnapshot.nodes[0].html.includes("src=\"/uploads/a.png\""), "Saved snapshot HTML should use stable relative media paths");

const savedVideoPatch = createProjectSavePatch({
  project: { title: "Video snapshot test" },
  canvasWorld: makeCanvasWorld([
    makeCanvasNode({
      kind: "video",
      className: "node-card node-video",
      objectUrl: "http://localhost:3000/uploads/video.mp4",
      videoUrl: "http://localhost:3000/uploads/video.mp4",
      html: "<video src=\"http://localhost:3000/uploads/video.mp4\" poster=\"http://localhost:3000/uploads/poster.png\"></video>"
    })
  ])
});
const savedVideoSnapshot = JSON.parse(savedVideoPatch.canvasSnapshotJson);
assert(savedVideoSnapshot.nodes[0].media.url === "/uploads/video.mp4", "Saved video media URLs should be stable relative paths");
assert(savedVideoSnapshot.nodes[0].dataset.objectUrl === "/uploads/video.mp4", "Saved video dataset URLs should be stable relative paths");
assert(savedVideoSnapshot.nodes[0].html.includes("src=\"/uploads/video.mp4\""), "Saved video HTML src should use stable relative media paths");
assert(savedVideoSnapshot.nodes[0].html.includes("poster=\"/uploads/poster.png\""), "Saved video HTML poster should use stable relative media paths");

assert(
  projectHasRestorableCanvasContent({
    thumbnail: "blob:http://localhost:3000/thumb",
    canvasSnapshotJson: JSON.stringify({
      nodes: [
        {
          kind: "loading-image",
          className: "node-card node-loading-image",
          html: "<figure class=\"image-frame generation-frame\"></figure>"
        }
      ]
    }),
    itemCount: 0
  }) === false,
  "Project restore content detection should ignore transient thumbnails and loading nodes"
);
assert(
  projectHasRestorableCanvasContent({
    thumbnail: "http://localhost:3000/uploads/thumb.png",
    canvasSnapshotJson: JSON.stringify({ nodes: [] }),
    itemCount: 0
  }) === true,
  "Project restore content detection should accept stable thumbnails"
);
assert(
  snapshotNeedsUrlRepair(JSON.stringify({
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: "<img src=\"http://localhost:3000/uploads/repair.png\" />",
        media: { url: "http://localhost:3000/uploads/repair.png" }
      }
    ]
  })) === true,
  "Snapshot repair detection should catch same-origin absolute media URLs"
);
assert(
  snapshotHasUnresolvedMedia(JSON.stringify({
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: "<img src=\"/uploads/ready.png\" />",
        media: { url: "/uploads/ready.png" }
      }
    ]
  })) === false,
  "Snapshot unresolved-media detection should allow stable upload URLs"
);
assert(
  getProjectMediaUrls({
    thumbnail: "http://localhost:3000/uploads/thumb.png",
    canvasSnapshotJson: JSON.stringify({
      nodes: [
        {
          kind: "image",
          html: "<img src=\"/uploads/html.png\" />",
          dataset: { objectUrl: "blob:http://localhost:3000/transient" },
          media: { url: "/uploads/media.png" }
        }
      ]
    })
  }).join("|") === "/uploads/thumb.png|/uploads/media.png|/uploads/html.png",
  "Project media preload URL detection should normalize stable media and skip transient URLs"
);

process.env.APP_BASE_URL = "https://ai-studio.example.test";
const serverSanitizedSnapshot = JSON.parse(sanitizeCanvasSnapshotJson(JSON.stringify({
  version: 1,
  savedAt: 2000,
  nodes: [
    {
      kind: "loading-image",
      className: "node-card node-loading-image",
      html: "<figure class=\"image-frame generation-frame\"></figure>",
      media: { url: "" }
    },
    {
      kind: "image",
      className: "node-card generation-frame",
      html: "<figure class=\"image-frame\"></figure>",
      media: { url: "" }
    },
    {
      kind: "image",
      className: "node-card node-image",
      html: "<figure><img src=\"https://ai-studio.example.test/uploads/server.png?cache=1\" /></figure>",
      dataset: {
        objectUrl: "https://ai-studio.example.test/uploads/server.png?cache=1",
        externalUrl: "https://cdn.example.com/uploads/server.png"
      },
      media: { url: "https://ai-studio.example.test/uploads/server.png?cache=1" }
    }
  ]
})));

assert(serverSanitizedSnapshot.nodes.length === 1, "Server snapshot sanitizer should skip loading image nodes");
assert(serverSanitizedSnapshot.nodes[0].media.url === "/uploads/server.png?cache=1", "Server snapshot sanitizer should normalize local media URLs");
assert(serverSanitizedSnapshot.nodes[0].dataset.objectUrl === "/uploads/server.png?cache=1", "Server snapshot sanitizer should normalize dataset media URLs");
assert(serverSanitizedSnapshot.nodes[0].dataset.externalUrl === "https://cdn.example.com/uploads/server.png", "Server snapshot sanitizer should keep external HTTPS URLs");
assert(serverSanitizedSnapshot.nodes[0].html.includes("src=\"/uploads/server.png?cache=1\""), "Server snapshot sanitizer should normalize HTML media URLs");

console.log("Project snapshot checks passed.");

function makeCanvasWorld(nodes = []) {
  return {
    querySelectorAll(selector) {
      return selector === ".node-card" ? nodes : [];
    },
    querySelector(selector) {
      if (selector === ".node-image") return nodes.find((node) => node.classList.contains("node-image")) || null;
      return null;
    }
  };
}

function makeCanvasNode({
  kind = "image",
  className = "node-card node-image",
  objectUrl = "",
  imageUrl = "",
  videoUrl = "",
  html = ""
} = {}) {
  const image = imageUrl ? makeImageElement(imageUrl) : null;
  const video = videoUrl ? makeVideoElement(videoUrl) : null;
  return {
    dataset: {
      kind,
      title: "Generated Image.png",
      ...(objectUrl ? { objectUrl } : {})
    },
    className,
    classList: {
      contains(name) {
        return className.split(/\s+/).includes(name);
      }
    },
    style: {
      left: "0",
      top: "0"
    },
    innerHTML: html,
    getAttribute(name) {
      if (name === "style") return "left: 0px; top: 0px;";
      return "";
    },
    querySelector(selector) {
      if (selector === ".generation-frame") return className.includes("node-loading-image") ? {} : null;
      if (selector === ".image-frame img") return image;
      if (selector === "video") return video;
      if (selector === ".canvas-text-editor" || selector === "p") return null;
      if (selector === ".image-file-name" || selector === "h3") return { textContent: "Generated Image.png" };
      return null;
    },
    cloneNode() {
      const clone = {
        innerHTML: html,
        querySelector(selector) {
          if (selector === ".image-frame img") return makeSnapshotImageElement(clone, imageUrl);
          if (selector === "video") return makeSnapshotImageElement(clone, videoUrl);
          return null;
        },
        querySelectorAll() {
          return [];
        }
      };
      return clone;
    }
  };
}

function makeImageElement(url = "") {
  return {
    src: url,
    currentSrc: url,
    setAttribute(name, value) {
      if (name === "src") this.src = value;
    },
    removeAttribute(name) {
      if (name === "src") this.src = "";
    }
  };
}

function makeVideoElement(url = "") {
  return makeImageElement(url);
}

function makeSnapshotImageElement(clone, url = "") {
  return {
    src: url,
    currentSrc: url,
    setAttribute(name, value) {
      if (name !== "src") return;
      this.src = value;
      clone.innerHTML = clone.innerHTML.replace(/\bsrc=["'][^"']*["']/, `src="${value}"`);
    },
    removeAttribute(name) {
      if (name !== "src") return;
      this.src = "";
      clone.innerHTML = clone.innerHTML.replace(/\s+\bsrc=["'][^"']*["']/, "");
    }
  };
}
