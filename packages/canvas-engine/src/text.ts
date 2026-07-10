import type { CanvasNodeBase } from "./index.js";

export type TextAlign = "left" | "center" | "right";

export interface CanvasTextNode extends CanvasNodeBase {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "regular" | "medium" | "bold";
  color: string;
  align: TextAlign;
}

export function createTextNode(id: string, text: string, x: number, y: number): CanvasTextNode {
  return { id, kind: "text", text, x, y, width: 240, height: 80, fontFamily: "Inter", fontSize: 32, fontWeight: "regular", color: "#1b2330", align: "left" };
}

export function updateTextNode(node: CanvasTextNode, patch: Partial<Pick<CanvasTextNode, "text" | "fontFamily" | "fontSize" | "fontWeight" | "color" | "align">>): CanvasTextNode {
  return { ...node, ...patch, fontSize: patch.fontSize && patch.fontSize > 0 ? patch.fontSize : node.fontSize };
}
