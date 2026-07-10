import { describe, expect, it } from "vitest";

import { createCanvasDocument, moveNodes, resizeNode, upsertCanvasNode } from "./index.js";

describe("canvas drag and resize transforms", () => {
  it("moves only selected nodes using pointer deltas", () => {
    const document = upsertCanvasNode(upsertCanvasNode(createCanvasDocument("project-1"), { id: "a", kind: "pending-image", jobId: "a", x: 0, y: 0, width: 20, height: 20 }), { id: "b", kind: "pending-image", jobId: "b", x: 40, y: 40, width: 20, height: 20 });
    const moved = moveNodes(document, ["a"], 12.5, -4);
    expect(moved.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([{ id: "a", x: 12.5, y: -4 }, { id: "b", x: 40, y: 40 }]);
  });

  it("clamps resize to a stable minimum and preserves origin unless supplied", () => {
    const document = upsertCanvasNode(createCanvasDocument("project-1"), { id: "a", kind: "pending-image", jobId: "a", x: 10, y: 20, width: 100, height: 80 });
    const resized = resizeNode(document, "a", { width: 2, height: 3 });
    expect(resized.nodes[0]).toMatchObject({ x: 10, y: 20, width: 16, height: 16 });
  });
});
