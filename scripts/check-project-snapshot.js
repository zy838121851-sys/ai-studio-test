import {
  isRestorableSnapshotItem,
  normalizePersistentMediaUrl,
  restoreCanvasSnapshotJson
} from "../src/client/features/projects/snapshot.js";

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
    className: "node-card node-loading-image",
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

console.log("Project snapshot checks passed.");
