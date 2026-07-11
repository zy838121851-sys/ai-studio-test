import type { CanvasNodeBase } from "./index.js";

export interface CanvasPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface CanvasPenNode extends CanvasNodeBase {
  kind: "pen";
  points: readonly CanvasPoint[];
  color: string;
  strokeWidth: number;
}

export interface PenStrokeState {
  id: string;
  points: readonly CanvasPoint[];
  color: string;
  width: number;
}

export function startPenStroke(id: string, point: CanvasPoint, color = "#1b2330", width = 4): PenStrokeState {
  return { id, points: [normalizePoint(point)], color, width: normalizeWidth(width) };
}

export function appendPenPoint(stroke: PenStrokeState, point: CanvasPoint): PenStrokeState {
  const next = normalizePoint(point);
  const previous = stroke.points.at(-1);
  if (previous && previous.x === next.x && previous.y === next.y && previous.pressure === next.pressure) return stroke;
  return { ...stroke, points: [...stroke.points, next] };
}

export function finishPenStroke(stroke: PenStrokeState): CanvasPenNode | null {
  if (stroke.points.length < 2) return null;
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { id: stroke.id, kind: "pen", points: stroke.points, color: stroke.color, strokeWidth: stroke.width, x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
}

export function penPathData(points: readonly CanvasPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function normalizePoint(point: CanvasPoint): CanvasPoint {
  return { x: Number.isFinite(point.x) ? point.x : 0, y: Number.isFinite(point.y) ? point.y : 0, pressure: Math.min(1, Math.max(0, Number.isFinite(point.pressure) ? point.pressure : 0.5)) };
}

function normalizeWidth(width: number): number {
  return Number.isFinite(width) ? Math.max(1, width) : 4;
}
