import type { CanvasNodeBase } from "./index.js";

export type ShapeType = "rectangle" | "ellipse" | "diamond" | "triangle" | "star";

export const SHAPE_REGISTRY: readonly ShapeType[] = ["rectangle", "ellipse", "diamond", "triangle", "star"];

export interface CanvasShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface CanvasShapeNode extends CanvasNodeBase {
  kind: "shape";
  shapeType: ShapeType;
  style: CanvasShapeStyle;
}

export interface CanvasArrowNode extends CanvasNodeBase {
  kind: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  style: CanvasShapeStyle;
}

export interface ArrowGeometry {
  angle: number;
  length: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export function createArrowGeometry(start: { x: number; y: number }, end: { x: number; y: number }): ArrowGeometry {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return { angle: Math.atan2(dy, dx), length: Math.hypot(dx, dy), start, end };
}

export function createShapeNode(id: string, shapeType: ShapeType, x: number, y: number, width: number, height: number): CanvasShapeNode {
  if (!SHAPE_REGISTRY.includes(shapeType)) throw new Error(`Unknown shape: ${shapeType}`);
  return { id, kind: "shape", shapeType, x, y, width, height, style: defaultShapeStyle() };
}

export function createArrowNode(id: string, start: { x: number; y: number }, end: { x: number; y: number }): CanvasArrowNode {
  return {
    id,
    kind: "arrow",
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(1, Math.abs(end.x - start.x)),
    height: Math.max(1, Math.abs(end.y - start.y)),
    style: { ...defaultShapeStyle(), fill: "transparent" }
  };
}

export function defaultShapeStyle(): CanvasShapeStyle {
  return { fill: "#ffffff", stroke: "#1f2933", strokeWidth: 3 };
}

export function updateShapeStyle<T extends CanvasShapeNode | CanvasArrowNode>(
  node: T,
  patch: Partial<CanvasShapeStyle>
): T {
  return {
    ...node,
    style: {
      fill: typeof patch.fill === "string" ? patch.fill : node.style.fill,
      stroke: typeof patch.stroke === "string" ? patch.stroke : node.style.stroke,
      strokeWidth:
        typeof patch.strokeWidth === "number" && patch.strokeWidth > 0
          ? patch.strokeWidth
          : node.style.strokeWidth
    }
  };
}
