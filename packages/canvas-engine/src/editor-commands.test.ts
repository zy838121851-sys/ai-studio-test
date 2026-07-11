import { describe, expect, it } from "vitest";

import { alignNodes, copyNodes, createCanvasDocument, pasteNodes, removeNodes, resolveEditorShortcut, stackNodes, upsertCanvasNode } from "./index.js";

const node = (id: string, x: number, y: number) => ({ id, kind: "pending-image" as const, jobId: id, x, y, width: 50, height: 50 });

describe("canvas editor commands", () => {
  it("copies, pastes, and removes without mutating source nodes", () => {
    const document = upsertCanvasNode(createCanvasDocument("p"), node("a", 10, 20));
    const copied = copyNodes(document, ["a"]);
    const pasted = pasteNodes(document, copied, () => "b");
    expect(pasted.ids).toEqual(["b"]);
    expect(pasted.document.nodes[1]).toMatchObject({ id: "b", x: 28, y: 38 });
    expect(removeNodes(pasted.document, ["a"]).nodes.map((item) => item.id)).toEqual(["b"]);
  });

  it("aligns and stacks selected nodes deterministically", () => {
    let document = upsertCanvasNode(upsertCanvasNode(createCanvasDocument("p"), node("a", 10, 20)), node("b", 100, 80));
    document = alignNodes(document, ["a", "b"], "left");
    expect(document.nodes.map((item) => item.x)).toEqual([10, 10]);
    expect(stackNodes(document, ["a", "b"]).nodes[1]).toMatchObject({ x: 28, y: 38 });
  });

  it("resolves shortcuts and preserves focus exclusions for the adapter", () => {
    expect(resolveEditorShortcut({ key: "d", ctrlKey: true })).toBe("duplicate");
    expect(resolveEditorShortcut({ key: "ArrowLeft", metaKey: true })).toBe("align-left");
    expect(resolveEditorShortcut({ key: "d" })).toBeNull();
  });
});
