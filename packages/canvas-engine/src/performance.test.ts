import { describe, expect, it } from "vitest";

import { moveNodes, selectNodesInRect, type CanvasDocument } from "./index.js";

function createBenchmarkDocument(): CanvasDocument {
  return {
    schemaVersion: 1,
    projectId: "benchmark",
    nodes: Array.from({ length: 500 }, (_, index) => ({
      id: `node-${index}`,
      kind: "pending-image" as const,
      jobId: `job-${index}`,
      x: (index % 25) * 120,
      y: Math.floor(index / 25) * 120,
      width: 96,
      height: 96
    }))
  };
}

describe("canvas 500-node performance budget", () => {
  it("keeps selection and transform operations within the documented budget", () => {
    const document = createBenchmarkDocument();
    const started = Date.now();
    const selection = selectNodesInRect(document.nodes, { x: 0, y: 0, width: 1200, height: 1200 });
    const moved = moveNodes(document, selection.selectedIds, 12, 8);
    const elapsed = Date.now() - started;
    expect(moved.nodes).toHaveLength(500);
    expect(selection.selectedIds.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });
});
