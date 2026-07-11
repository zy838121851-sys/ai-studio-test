import type { CanvasNodeBase } from "./index.js";

export interface CanvasVideoNode extends CanvasNodeBase {
  kind: "video";
  sourceUrl: string;
  title: string;
}
