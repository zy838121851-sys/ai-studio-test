import { useState } from "react";
import { SHAPE_REGISTRY, type ShapeType } from "@ai-studio/canvas-engine";
import {
  Eraser,
  MousePointer2,
  PenLine,
  Shapes,
  SquareDashedMousePointer,
  TextCursorInput,
  Zap
} from "lucide-react";

type ToolId = "select" | "shape" | "text" | "pen" | "eraser" | "laser";

const tools: readonly { id: ToolId; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "shape", label: "Shape", icon: Shapes },
  { id: "text", label: "Text", icon: TextCursorInput },
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "laser", label: "Laser", icon: Zap }
];

export function CanvasToolRail({ onToolChange, onShapeChange }: { onToolChange?: (tool: ToolId) => void; onShapeChange?: (shape: ShapeType | "arrow") => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [openPanel, setOpenPanel] = useState<ToolId | null>(null);
  const chooseTool = (tool: ToolId) => {
    setActiveTool(tool);
    setOpenPanel(tool === "shape" || tool === "pen" ? tool : null);
    onToolChange?.(tool);
  };
  return (
    <aside className={`canvas-tool-rail${collapsed ? " is-collapsed" : ""}`} aria-label="Canvas tools" data-collapsed={collapsed}>
      <button className="canvas-tool-rail__collapse" type="button" aria-label={collapsed ? "Expand tools" : "Collapse tools"} title={collapsed ? "Expand tools" : "Collapse tools"} onClick={() => setCollapsed((value) => !value)}><SquareDashedMousePointer size={18} aria-hidden="true" /></button>
      {!collapsed ? <div className="canvas-tool-rail__items">{tools.map(({ id, label, icon: Icon }) => <div className="canvas-tool-rail__item" key={id}><button className={`rail-btn${activeTool === id ? " is-active" : ""}`} type="button" data-tool={id} aria-label={label} aria-expanded={openPanel === id} title={label} onClick={() => chooseTool(id)}><Icon size={20} aria-hidden="true" /></button>{openPanel === id ? <div className="canvas-tool-rail__submenu" role="menu" aria-label={`${label} options`}>{id === "shape" ? <>{SHAPE_REGISTRY.map((shape) => <button key={shape} type="button" data-shape-tool={shape} role="menuitem" onClick={() => onShapeChange?.(shape)}>{shape}</button>)}<button type="button" data-shape-tool="arrow" role="menuitem" onClick={() => onShapeChange?.("arrow")}>arrow</button></> : null}{id === "pen" ? <button type="button" data-pen-tool="pen" role="menuitem" onClick={() => chooseTool("pen")}>Pen</button> : null}</div> : null}</div>)}</div> : null}
    </aside>
  );
}
