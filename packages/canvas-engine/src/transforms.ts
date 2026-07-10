import type { CanvasDocument, CanvasNode } from "./index.js";

export interface ResizeDelta {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export function moveNodes(document: CanvasDocument, selectedIds: readonly string[], dx: number, dy: number): CanvasDocument {
  const selected = new Set(selectedIds);
  return {
    ...document,
    nodes: document.nodes.map((node) => selected.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node)
  };
}

export function resizeNode(document: CanvasDocument, nodeId: string, delta: ResizeDelta, minimumSize = 16): CanvasDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => node.id === nodeId ? resized(node, delta, minimumSize) : node)
  };
}

function resized(node: CanvasNode, delta: ResizeDelta, minimumSize: number): CanvasNode {
  const width = Math.max(minimumSize, delta.width);
  const height = Math.max(minimumSize, delta.height);
  return {
    ...node,
    width,
    height,
    x: delta.x ?? node.x,
    y: delta.y ?? node.y
  };
}
