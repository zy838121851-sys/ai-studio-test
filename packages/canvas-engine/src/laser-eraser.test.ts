import { describe, expect, it } from "vitest";

import { appendLaserPoint, createCanvasDocument, eraseAt, pruneLaserPoints, upsertCanvasNode } from "./index.js";

describe("laser and eraser state machines", () => {
  it("keeps only laser samples within the actual timing window", () => {
    const points = appendLaserPoint(appendLaserPoint([], { x: 0, y: 0, at: 100 }), { x: 20, y: 20, at: 500 });
    expect(pruneLaserPoints(points, 520, 420)).toEqual([{ x: 0, y: 0, at: 100 }, { x: 20, y: 20, at: 500 }]);
    expect(pruneLaserPoints(points, 521, 420)).toEqual([{ x: 20, y: 20, at: 500 }]);
  });

  it("erases only nodes hit by the actual pointer radius", () => {
    const document = upsertCanvasNode(upsertCanvasNode(createCanvasDocument("project-1"), { id: "a", kind: "pending-image", jobId: "a", x: 0, y: 0, width: 50, height: 50 }), { id: "b", kind: "pending-image", jobId: "b", x: 200, y: 200, width: 50, height: 50 });
    expect(eraseAt(document, { x: 60, y: 25 }, 11).nodes.map((node) => node.id)).toEqual(["b"]);
  });
});
