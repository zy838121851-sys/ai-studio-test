import type { CanvasDocument, CanvasNode } from "./index.js";

export type AlignMode = "left" | "right" | "top" | "bottom";
export type EditorShortcut =
  | "select-all"
  | "copy"
  | "paste"
  | "duplicate"
  | "delete"
  | "align-left"
  | "align-right"
  | "align-top"
  | "align-bottom"
  | "stack"
  | "bring-front"
  | "send-back";

export function removeNodes(document: CanvasDocument, ids: readonly string[]): CanvasDocument {
  const removed = new Set(ids);
  return { ...document, nodes: document.nodes.filter((node) => !removed.has(node.id)) };
}

export function copyNodes(document: CanvasDocument, ids: readonly string[]): CanvasNode[] {
  const selected = new Set(ids);
  return document.nodes.filter((node) => selected.has(node.id)).map(cloneNode);
}

export function pasteNodes(
  document: CanvasDocument,
  nodes: readonly CanvasNode[],
  createId: () => string,
  offset = 18
): { document: CanvasDocument; ids: string[] } {
  const pasted = nodes.map((node) => ({ ...cloneNode(node), id: createId(), x: node.x + offset, y: node.y + offset }));
  return { document: { ...document, nodes: [...document.nodes, ...pasted] }, ids: pasted.map((node) => node.id) };
}

function cloneNode(node: CanvasNode): CanvasNode {
  return JSON.parse(JSON.stringify(node)) as CanvasNode;
}

export function alignNodes(document: CanvasDocument, ids: readonly string[], mode: AlignMode): CanvasDocument {
  const selected = document.nodes.filter((node) => ids.includes(node.id));
  if (selected.length < 2) return document;
  const edge = mode === "left" ? Math.min(...selected.map((node) => node.x)) : mode === "right" ? Math.max(...selected.map((node) => node.x + node.width)) : mode === "top" ? Math.min(...selected.map((node) => node.y)) : Math.max(...selected.map((node) => node.y + node.height));
  const selectedIds = new Set(ids);
  return { ...document, nodes: document.nodes.map((node) => !selectedIds.has(node.id) ? node : mode === "left" ? { ...node, x: edge } : mode === "right" ? { ...node, x: edge - node.width } : mode === "top" ? { ...node, y: edge } : { ...node, y: edge - node.height }) };
}

export function stackNodes(document: CanvasDocument, ids: readonly string[], offset = 18): CanvasDocument {
  const selected = document.nodes.filter((node) => ids.includes(node.id));
  if (selected.length < 2) return document;
  const originX = Math.min(...selected.map((node) => node.x));
  const originY = Math.min(...selected.map((node) => node.y));
  const index = new Map(ids.map((id, position) => [id, position]));
  return { ...document, nodes: document.nodes.map((node) => index.has(node.id) ? { ...node, x: originX + (index.get(node.id) ?? 0) * offset, y: originY + (index.get(node.id) ?? 0) * offset } : node) };
}

export function reorderNodes(document: CanvasDocument, ids: readonly string[], direction: "front" | "back"): CanvasDocument {
  const selected = new Set(ids);
  const moving = document.nodes.filter((node) => selected.has(node.id));
  const remaining = document.nodes.filter((node) => !selected.has(node.id));
  return { ...document, nodes: direction === "front" ? [...remaining, ...moving] : [...moving, ...remaining] };
}

export function resolveEditorShortcut(input: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean }): EditorShortcut | null {
  const key = input.key.toLowerCase();
  const command = Boolean(input.metaKey || input.ctrlKey);
  if ((key === "delete" || key === "backspace") && !command) return "delete";
  if (command && input.altKey && key === "s") return "stack";
  if (!command || input.altKey) return null;
  if (key === "a") return "select-all";
  if (key === "c") return "copy";
  if (key === "v") return "paste";
  if (key === "d") return "duplicate";
  if (key === "arrowleft") return "align-left";
  if (key === "arrowright") return "align-right";
  if (key === "arrowup") return "align-top";
  if (key === "arrowdown") return "align-bottom";
  if (key === "]") return "bring-front";
  if (key === "[") return "send-back";
  return null;
}
