import type { CanvasDocument, SelectionState } from "@ai-studio/canvas-engine";

export interface CanvasImageReference {
  nodeId: string;
  sourceUrl: string;
  name: string;
}

export function selectedCanvasImageReferences(
  document: CanvasDocument,
  selection: SelectionState
): CanvasImageReference[] {
  const selectedIds = new Set(selection.selectedIds);
  return document.nodes.flatMap((node) =>
    node.kind === "image" && selectedIds.has(node.id)
      ? [{ nodeId: node.id, sourceUrl: node.sourceUrl, name: node.alt || "Canvas image" }]
      : []
  );
}
