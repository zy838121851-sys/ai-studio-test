import { describe, expect, it } from "vitest";

import { selectedCanvasImageReferences } from "./canvas-reference.js";

describe("selectedCanvasImageReferences", () => {
  it("keeps only selected image nodes and supplies a default name", () => {
    const references = selectedCanvasImageReferences(
      {
        schemaVersion: 1,
        projectId: "project-1",
        nodes: [
          {
            id: "image-1",
            kind: "image",
            sourceUrl: "/uploads/one.png",
            alt: "One",
            x: 0,
            y: 0,
            width: 100,
            height: 100
          },
          {
            id: "shape-1",
            kind: "shape",
            shapeType: "rectangle",
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            style: { fill: "#fff", stroke: "#000", strokeWidth: 1 }
          },
          {
            id: "image-2",
            kind: "image",
            sourceUrl: "/uploads/two.png",
            alt: "",
            x: 20,
            y: 20,
            width: 100,
            height: 100
          }
        ]
      },
      { selectedIds: ["shape-1", "image-2"], focusedId: "image-2" }
    );

    expect(references).toEqual([
      { nodeId: "image-2", sourceUrl: "/uploads/two.png", name: "Canvas image" }
    ]);
  });
});
