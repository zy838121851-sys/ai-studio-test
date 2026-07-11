import {
  defaultShapeStyle,
  SHAPE_REGISTRY,
  type CanvasArrowNode,
  type CanvasShapeNode
} from "./shapes.js";
import type { CanvasTextNode } from "./text.js";
import type { CanvasPenNode } from "./pen.js";
import type { CanvasModelNode } from "./model.js";
import type { CanvasVideoNode } from "./video.js";

export type CanvasNode = CanvasImageNode | CanvasPendingImageNode | CanvasShapeNode | CanvasArrowNode | CanvasTextNode | CanvasPenNode | CanvasModelNode | CanvasVideoNode;

export type { CanvasNodeDefinition, CanvasNodeKind, CanvasSnapshotMigration } from "./document-registry.js";

export interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasImageNode extends CanvasNodeBase {
  kind: "image";
  sourceUrl: string;
  alt: string;
}

export interface CanvasPendingImageNode extends CanvasNodeBase {
  kind: "pending-image";
  jobId: string;
}

export interface CanvasDocument {
  schemaVersion: 1;
  projectId: string;
  nodes: CanvasNode[];
}

export function createCanvasDocument(projectId: string): CanvasDocument {
  return {
    schemaVersion: 1,
    projectId,
    nodes: []
  };
}

export function upsertCanvasNode(document: CanvasDocument, node: CanvasNode): CanvasDocument {
  const existingIndex = document.nodes.findIndex((candidate) => candidate.id === node.id);
  const nodes = [...document.nodes];

  if (existingIndex === -1) {
    nodes.push(node);
  } else {
    nodes[existingIndex] = node;
  }

  return { ...document, nodes };
}

export function replacePendingImage(
  document: CanvasDocument,
  jobId: string,
  image: Omit<CanvasImageNode, "id" | "x" | "y" | "width" | "height">
): CanvasDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => {
      if (node.kind !== "pending-image" || node.jobId !== jobId) {
        return node;
      }

      return {
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        ...image
      };
    })
  };
}

export function normalizeCanvasDocument(value: unknown, projectId: string): CanvasDocument {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.nodes)) {
    return createCanvasDocument(projectId);
  }

  return {
    schemaVersion: 1,
    projectId,
    nodes: value.nodes.flatMap((node) => {
      const normalized = normalizeCanvasNode(node);
      return normalized ? [normalized] : [];
    })
  };
}

export { CANVAS_NODE_REGISTRY, CANVAS_SNAPSHOT_MIGRATIONS, CURRENT_CANVAS_SCHEMA_VERSION, isRegisteredCanvasNodeKind, migrateCanvasSnapshot, serializeCanvasDocument } from "./document-registry.js";
export * from "./viewport.js";
export * from "./history.js";
export * from "./selection.js";
export * from "./transforms.js";
export * from "./shapes.js";
export * from "./text.js";
export * from "./pen.js";
export * from "./laser-eraser.js";
export * from "./image-transform.js";
export * from "./model.js";
export * from "./video.js";
export * from "./editor-commands.js";

export function fitCanvasNodeSize(
  width: number,
  height: number,
  maximumEdge = 640
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maximumEdge, height: maximumEdge };
  }

  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

function normalizeCanvasNode(value: unknown): CanvasNode | null {
  if (!isRecord(value)) return null;
  const base = normalizeCanvasNodeBase(value);
  if (!base) return null;

  if (value.kind === "pending-image" && isNonEmptyString(value.jobId)) {
    return { ...base, kind: "pending-image", jobId: value.jobId };
  }

  if (value.kind === "image" && isNonEmptyString(value.sourceUrl)) {
    return {
      ...base,
      kind: "image",
      sourceUrl: value.sourceUrl,
      alt: typeof value.alt === "string" && value.alt.trim() ? value.alt : "生成图片"
    };
  }

  if (value.kind === "video" && isNonEmptyString(value.sourceUrl)) {
    return {
      ...base,
      kind: "video",
      sourceUrl: value.sourceUrl,
      title: typeof value.title === "string" && value.title.trim() ? value.title : "Generated video"
    };
  }

  if (value.kind === "model" && isNonEmptyString(value.sourceUrl)) {
    return { ...base, kind: "model", sourceUrl: value.sourceUrl, title: typeof value.title === "string" ? value.title : "3D model" };
  }

  if (value.kind === "shape" && isNonEmptyString(value.shapeType) && SHAPE_REGISTRY.includes(value.shapeType as CanvasShapeNode["shapeType"])) {
    return {
      ...base,
      kind: "shape",
      shapeType: value.shapeType as CanvasShapeNode["shapeType"],
      style: normalizeShapeStyle(value.style)
    };
  }

  const arrowValues = [value.startX, value.startY, value.endX, value.endY];
  if (value.kind === "arrow" && arrowValues.every(isFiniteNumber)) {
    const [startX, startY, endX, endY] = arrowValues as [number, number, number, number];
    return { ...base, kind: "arrow", startX, startY, endX, endY, style: normalizeShapeStyle(value.style, true) };
  }

  if (value.kind === "text" && typeof value.text === "string") {
    return {
      ...base,
      kind: "text",
      text: value.text,
      fontFamily: typeof value.fontFamily === "string" ? value.fontFamily : "Inter",
      fontSize: isPositiveFiniteNumber(value.fontSize) ? value.fontSize : 32,
      fontWeight: value.fontWeight === "bold" || value.fontWeight === "medium" ? value.fontWeight : "regular",
      color: typeof value.color === "string" ? value.color : "#1b2330",
      align: value.align === "center" || value.align === "right" ? value.align : "left"
    };
  }

  if (value.kind === "pen" && Array.isArray(value.points) && isNonEmptyString(value.color) && isPositiveFiniteNumber(value.strokeWidth)) {
    const points = value.points.flatMap((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y) && isFiniteNumber(point.pressure) ? [{ x: point.x, y: point.y, pressure: point.pressure }] : []);
    return points.length >= 2 ? { ...base, kind: "pen", points, color: value.color, strokeWidth: value.strokeWidth } : null;
  }

  return null;
}

function normalizeShapeStyle(value: unknown, linear = false) {
  const defaults = defaultShapeStyle();
  const style = isRecord(value) ? value : {};
  return {
    fill: typeof style.fill === "string" ? style.fill : linear ? "transparent" : defaults.fill,
    stroke: typeof style.stroke === "string" ? style.stroke : defaults.stroke,
    strokeWidth: isPositiveFiniteNumber(style.strokeWidth) ? style.strokeWidth : defaults.strokeWidth
  };
}

function normalizeCanvasNodeBase(value: Record<string, unknown>): CanvasNodeBase | null {
  if (
    !isNonEmptyString(value.id) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isPositiveFiniteNumber(value.width) ||
    !isPositiveFiniteNumber(value.height)
  ) {
    return null;
  }

  return {
    id: value.id,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
