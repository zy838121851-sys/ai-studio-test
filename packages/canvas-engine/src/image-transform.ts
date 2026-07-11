import type { CanvasDocument, CanvasImageNode } from "./index.js";

export type ImageTransformKind = "crop" | "upscale" | "remove-background" | "expand" | "edit-text";

export interface ImageCropGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageTransformRequest {
  kind: ImageTransformKind;
  sourceNodeId: string;
  crop?: ImageCropGeometry;
  upscaleSize?: "2k" | "4k";
  expand?: "top" | "right" | "bottom" | "left" | "all";
  textPrompt?: string;
}

export function replaceImageTransformResult(
  document: CanvasDocument,
  sourceNodeId: string,
  image: Omit<CanvasImageNode, "id" | "kind" | "x" | "y" | "width" | "height">
): CanvasDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === sourceNodeId && node.kind === "image"
        ? { ...node, ...image }
        : node
    )
  };
}

export function normalizeCropGeometry(value: ImageCropGeometry): ImageCropGeometry | null {
  if (![value.x, value.y, value.width, value.height].every(Number.isFinite)) return null;
  if (value.width <= 0 || value.height <= 0) return null;
  return { ...value };
}
