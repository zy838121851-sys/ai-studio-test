import { describe, expect, it } from "vitest";

import { createCanvasDocument, replacePendingImage, upsertCanvasNode } from "./index.js";

describe("CanvasDocument", () => {
  it("replaces a matching pending image without changing its geometry", () => {
    const pending = upsertCanvasNode(createCanvasDocument("project-1"), {
      id: "node-1",
      kind: "pending-image",
      jobId: "job-1",
      x: 40,
      y: 80,
      width: 512,
      height: 512
    });

    const completed = replacePendingImage(pending, "job-1", {
      kind: "image",
      sourceUrl: "/api/v1/uploads/result.png",
      alt: "生成图片"
    });

    expect(completed.nodes).toEqual([
      {
        id: "node-1",
        kind: "image",
        sourceUrl: "/api/v1/uploads/result.png",
        alt: "生成图片",
        x: 40,
        y: 80,
        width: 512,
        height: 512
      }
    ]);
  });
});
