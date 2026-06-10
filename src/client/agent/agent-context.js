import { getRecentCanvasEvents } from "../canvas/canvas-events.js";

export function buildAgentContext({ canvasState, target = null, recentEvents = getRecentCanvasEvents() } = {}) {
  return {
    time: Date.now(),
    target,
    canvas: canvasState || { nodeCount: 0, nodes: [], selectedIds: [] },
    recentEvents
  };
}
