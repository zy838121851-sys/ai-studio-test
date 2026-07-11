import type { CanvasNodeBase } from "./index.js";

export interface CanvasModelNode extends CanvasNodeBase {
  kind: "model";
  sourceUrl: string;
  title: string;
}

export function createModelNode(
  id: string,
  sourceUrl: string,
  title: string,
  x: number,
  y: number
): CanvasModelNode {
  return { id, kind: "model", sourceUrl, title, x, y, width: 360, height: 280 };
}
