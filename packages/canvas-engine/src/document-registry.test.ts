import { describe, expect, it } from "vitest";

import {
  CANVAS_NODE_REGISTRY,
  CURRENT_CANVAS_SCHEMA_VERSION,
  migrateCanvasSnapshot,
  normalizeCanvasDocument,
  serializeCanvasDocument
} from "./index.js";

describe("canvas document registry", () => {
  it("keeps only registered persistent node kinds", () => {
    const document = normalizeCanvasDocument({
      schemaVersion: 1,
      projectId: "stale",
      nodes: [
        { id: "image", kind: "image", sourceUrl: "/uploads/a.png", x: 0, y: 0, width: 10, height: 10 },
        { id: "loading", kind: "loading-image", x: 0, y: 0, width: 10, height: 10 }
      ]
    }, "project-1");

    expect(Object.keys(CANVAS_NODE_REGISTRY)).toEqual([
      "image",
      "video",
      "pending-image",
      "shape",
      "arrow",
      "text",
      "pen",
      "model"
    ]);
    expect(serializeCanvasDocument(document).nodes).toHaveLength(1);
  });

  it("rejects unknown snapshot versions without silently claiming migration", () => {
    const snapshot = { schemaVersion: CURRENT_CANVAS_SCHEMA_VERSION + 99, nodes: [] };
    expect(migrateCanvasSnapshot(snapshot, "project-1")).toBe(snapshot);
  });
});
