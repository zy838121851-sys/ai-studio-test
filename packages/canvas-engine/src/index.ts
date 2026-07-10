export type CanvasNode = CanvasImageNode | CanvasPendingImageNode;

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

  return null;
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
