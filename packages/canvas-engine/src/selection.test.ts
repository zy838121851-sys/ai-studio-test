import { describe, expect, it } from "vitest";

import { clearSelection, createSelectionState, selectNode, selectNodesInRect } from "./index.js";

const nodes = [
  { id: "a", kind: "pending-image" as const, jobId: "job-a", x: 0, y: 0, width: 100, height: 100 },
  { id: "b", kind: "pending-image" as const, jobId: "job-b", x: 200, y: 200, width: 100, height: 100 }
];

describe("canvas selection model", () => {
  it("supports single and additive selection", () => {
    let state = createSelectionState();
    state = selectNode(state, "a");
    state = selectNode(state, "b", { additive: true });
    expect(state.selectedIds).toEqual(["a", "b"]);
    expect(selectNode(state, "a", { additive: true }).selectedIds).toEqual(["b"]);
  });

  it("selects intersecting nodes and clears safely", () => {
    const state = selectNodesInRect(nodes, { x: -10, y: -10, width: 150, height: 150 });
    expect(state.selectedIds).toEqual(["a"]);
    expect(clearSelection()).toEqual({ selectedIds: [], focusedId: null });
  });
});
