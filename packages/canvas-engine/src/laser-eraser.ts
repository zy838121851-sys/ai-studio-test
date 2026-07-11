import type { CanvasDocument, CanvasNode } from "./index.js";

export interface TimedPointerPoint {
  x: number;
  y: number;
  at: number;
}

export const LASER_TRAIL_MS = 420;

export function appendLaserPoint(points: readonly TimedPointerPoint[], point: TimedPointerPoint): TimedPointerPoint[] {
  return [...points, point];
}

export function pruneLaserPoints(points: readonly TimedPointerPoint[], now: number, duration = LASER_TRAIL_MS): TimedPointerPoint[] {
  return points.filter((point) => now - point.at <= duration);
}

export function eraseAt(document: CanvasDocument, point: { x: number; y: number }, radius: number): CanvasDocument {
  const safeRadius = Math.max(0, radius);
  return { ...document, nodes: document.nodes.filter((node) => !hitsNode(node, point, safeRadius)) };
}

function hitsNode(node: CanvasNode, point: { x: number; y: number }, radius: number): boolean {
  const closestX = Math.max(node.x, Math.min(point.x, node.x + node.width));
  const closestY = Math.max(node.y, Math.min(point.y, node.y + node.height));
  return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
}
