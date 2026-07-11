import { describe, expect, it } from "vitest";

import { createCanvasDocument, replaceImageTransformResult, upsertCanvasNode } from "./index.js";

describe("image transform result replacement", () => {
  it("replaces only the transformed image without discarding other canvas nodes", () => {
    const document = upsertCanvasNode(
      upsertCanvasNode(createCanvasDocument("project-1"), { id: "image-1", kind: "image", sourceUrl: "/old.png", alt: "old", x: 10, y: 20, width: 100, height: 80 }),
      { id: "image-2", kind: "image", sourceUrl: "/other.png", alt: "other", x: 200, y: 20, width: 100, height: 80 }
    );
    expect(replaceImageTransformResult(document, "image-1", { sourceUrl: "/new.png", alt: "new" }).nodes).toEqual([
      { id: "image-1", kind: "image", sourceUrl: "/new.png", alt: "new", x: 10, y: 20, width: 100, height: 80 },
      { id: "image-2", kind: "image", sourceUrl: "/other.png", alt: "other", x: 200, y: 20, width: 100, height: 80 }
    ]);
  });
});
