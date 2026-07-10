import type { CanvasNode } from "./index.js";

export interface SelectionState {
  selectedIds: readonly string[];
  focusedId: string | null;
}

export interface SelectionModifiers {
  additive?: boolean;
  range?: boolean;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const EMPTY_SELECTION: Readonly<SelectionState> = { selectedIds: [], focusedId: null };

export function createSelectionState(ids: readonly string[] = []): SelectionState {
  const selectedIds = unique(ids);
  return { selectedIds, focusedId: selectedIds.at(-1) ?? null };
}

export function selectNode(
  state: SelectionState,
  nodeId: string,
  modifiers: SelectionModifiers = {}
): SelectionState {
  if (!nodeId) return state;
  if (modifiers.additive || modifiers.range) {
    const selectedIds = state.selectedIds.includes(nodeId)
      ? state.selectedIds.filter((id) => id !== nodeId)
      : [...state.selectedIds, nodeId];
    return { selectedIds, focusedId: nodeId };
  }
  return { selectedIds: [nodeId], focusedId: nodeId };
}

export function clearSelection(): SelectionState {
  return { ...EMPTY_SELECTION, selectedIds: [] };
}

export function selectNodesInRect(
  nodes: readonly CanvasNode[],
  rect: SelectionRect,
  additive = false,
  state: SelectionState = EMPTY_SELECTION
): SelectionState {
  const selected = nodes.filter((node) => intersects(node, rect)).map((node) => node.id);
  const selectedIds = additive ? unique([...state.selectedIds, ...selected]) : selected;
  return { selectedIds, focusedId: selectedIds.at(-1) ?? null };
}

export function removeMissingSelection(state: SelectionState, nodes: readonly CanvasNode[]): SelectionState {
  const available = new Set(nodes.map((node) => node.id));
  const selectedIds = state.selectedIds.filter((id) => available.has(id));
  return { selectedIds, focusedId: selectedIds.includes(state.focusedId ?? "") ? state.focusedId : selectedIds.at(-1) ?? null };
}

function intersects(node: CanvasNode, rect: SelectionRect): boolean {
  const right = Math.max(rect.x, rect.x + rect.width);
  const bottom = Math.max(rect.y, rect.y + rect.height);
  const left = Math.min(rect.x, rect.x + rect.width);
  const top = Math.min(rect.y, rect.y + rect.height);
  return node.x < right && node.x + node.width > left && node.y < bottom && node.y + node.height > top;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
