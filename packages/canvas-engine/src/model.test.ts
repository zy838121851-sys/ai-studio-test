import { describe, expect, it } from "vitest";

import { createModelNode, normalizeCanvasDocument } from "./index.js";

describe("canvas model node", () => {
  it("creates and restores a persistent model node", () => {
    const node = createModelNode("model-1", "/model.glb", "Product model", 20, 30);
    expect(node).toMatchObject({ kind: "model", width: 360, height: 280 });
    expect(
      normalizeCanvasDocument(
        { schemaVersion: 1, projectId: "project-1", nodes: [node] },
        "project-1"
      ).nodes
    ).toEqual([node]);
  });
});
