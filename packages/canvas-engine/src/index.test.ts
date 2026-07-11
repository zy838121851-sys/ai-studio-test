import { describe, expect, it } from "vitest";

import {
  createCanvasDocument,
  fitCanvasNodeSize,
  normalizeCanvasDocument,
  replacePendingImage,
  upsertCanvasNode
} from "./index.js";

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

  it("normalizes a persisted document and rejects malformed nodes", () => {
    const result = normalizeCanvasDocument(
      {
        schemaVersion: 1,
        projectId: "stale-project",
        nodes: [
          {
            id: "result-1",
            kind: "image",
            sourceUrl: "/api/v1/uploads/upload-1/content",
            x: 10,
            y: 20,
            width: 1024,
            height: 768
          },
          { id: "temporary", kind: "loading-image" }
        ]
      },
      "project-1"
    );

    expect(result).toEqual({
      schemaVersion: 1,
      projectId: "project-1",
      nodes: [
        {
          id: "result-1",
          kind: "image",
          sourceUrl: "/api/v1/uploads/upload-1/content",
          alt: "生成图片",
          x: 10,
          y: 20,
          width: 1024,
          height: 768
        }
      ]
    });
  });

  it("fits native image dimensions into a stable canvas preview", () => {
    expect(fitCanvasNodeSize(1616, 2048)).toEqual({ width: 505, height: 640 });
    expect(fitCanvasNodeSize(320, 240)).toEqual({ width: 320, height: 240 });
  });

  it("normalizes persistent video nodes for restored job output", () => {
    const document = normalizeCanvasDocument({
      schemaVersion: 1,
      projectId: "project-1",
      nodes: [
        { id: "video-1", kind: "video", sourceUrl: "/api/v1/uploads/video/content", x: 10, y: 20, width: 640, height: 360 }
      ]
    }, "project-1");
    expect(document.nodes).toEqual([
      { id: "video-1", kind: "video", sourceUrl: "/api/v1/uploads/video/content", title: "Generated video", x: 10, y: 20, width: 640, height: 360 }
    ]);
  });
});
