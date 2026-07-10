import { describe, expect, it } from "vitest";

import { CanvasHistory, createCanvasDocument, createDocumentReplaceCommand, upsertCanvasNode } from "./index.js";

describe("canvas command history", () => {
  it("supports bounded undo and redo while preserving project identity", () => {
    const initial = createCanvasDocument("project-1");
    const first = upsertCanvasNode(initial, { id: "node-1", kind: "pending-image", jobId: "job-1", x: 0, y: 0, width: 10, height: 10 });
    const second = upsertCanvasNode(first, { id: "node-2", kind: "pending-image", jobId: "job-2", x: 20, y: 20, width: 10, height: 10 });
    const history = new CanvasHistory(initial, 1);
    history.execute(createDocumentReplaceCommand("add-1", "Add first", initial, first));
    history.execute(createDocumentReplaceCommand("add-2", "Add second", first, second));
    expect(history.state.past).toHaveLength(1);
    expect(history.undo().nodes).toHaveLength(1);
    expect(history.redo().nodes).toHaveLength(2);
    expect(history.current.projectId).toBe("project-1");
  });

  it("clears redo after a new branch", () => {
    const initial = createCanvasDocument("project-1");
    const next = { ...initial, nodes: [] };
    const history = new CanvasHistory(initial);
    history.execute(createDocumentReplaceCommand("noop", "Noop", initial, next));
    history.undo();
    history.execute(createDocumentReplaceCommand("noop-2", "Noop 2", initial, next));
    expect(history.canRedo).toBe(false);
  });
});
