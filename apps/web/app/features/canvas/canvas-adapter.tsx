import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  LASER_TRAIL_MS,
  appendLaserPoint,
  eraseAt,
  appendPenPoint,
  finishPenStroke,
  moveNodes,
  penPathData,
  selectNode,
  pruneLaserPoints,
  startPenStroke,
  updateShapeStyle,
  upsertCanvasNode,
  updateTextNode,
  type CanvasDocument,
  type CanvasNode,
  type CanvasShapeNode,
  type CanvasTextNode,
  type SelectionState
} from "@ai-studio/canvas-engine";
import type { AiJobDto } from "@ai-studio/contracts";
import { CircleAlert, LoaderCircle } from "lucide-react";

import { useCanvasReceiverStore } from "./canvas-store.js";

export function CanvasAdapter({
  document,
  job,
  activeTool = "select"
}: {
  document: CanvasDocument;
  job: AiJobDto | undefined;
  activeTool?: string;
}) {
  const setDocument = useCanvasReceiverStore((state) => state.setDocument);
  const [selection, setSelection] = useState<SelectionState>({ selectedIds: [], focusedId: null });
  const [laserPoints, setLaserPoints] = useState<readonly { x: number; y: number; at: number }[]>(
    []
  );
  const adapterRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(document);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<{
    nodeId: string;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const penRef = useRef<ReturnType<typeof startPenStroke> | null>(null);
  useEffect(() => {
    documentRef.current = document;
  }, [document]);
  useEffect(() => {
    const newest = laserPoints.at(-1);
    if (!newest) return;
    const delay = Math.max(0, LASER_TRAIL_MS - (Date.now() - newest.at));
    const timeout = window.setTimeout(
      () => setLaserPoints((points) => pruneLaserPoints(points, Date.now())),
      delay + 1
    );
    return () => window.clearTimeout(timeout);
  }, [laserPoints]);
  const canvasPoint = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = adapterRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (bounds?.left ?? 0),
      y: event.clientY - (bounds?.top ?? 0)
    };
  };
  const startLaser = (event: ReactPointerEvent<HTMLElement>) => {
    const now = Date.now();
    setLaserPoints([{ ...canvasPoint(event), at: now }]);
  };
  const eraseAtPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const next = eraseAt(documentRef.current, canvasPoint(event), 18);
    documentRef.current = next;
    setDocument(next);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, nodeId: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (activeTool === "laser") {
      startLaser(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "eraser") {
      eraseAtPointer(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    setSelection((current) =>
      selectNode(current, nodeId, { additive: event.shiftKey || event.metaKey || event.ctrlKey })
    );
    dragRef.current = {
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (activeTool === "laser" && event.buttons) {
      const now = Date.now();
      setLaserPoints((points) =>
        pruneLaserPoints(appendLaserPoint(points, { ...canvasPoint(event), at: now }), now)
      );
      return;
    }
    if (activeTool === "eraser" && event.buttons) {
      eraseAtPointer(event);
      return;
    }
    if (activeTool === "pen" && penRef.current) {
      penRef.current = appendPenPoint(penRef.current, {
        ...canvasPoint(event),
        pressure: event.pressure
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    nodesRef.current
      .get(drag.nodeId)
      ?.style.setProperty(
        "transform",
        `translate(${event.clientX - drag.startX}px, ${event.clientY - drag.startY}px)`
      );
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (activeTool === "pen" && penRef.current) {
      const completed = finishPenStroke(
        appendPenPoint(penRef.current, { ...canvasPoint(event), pressure: event.pressure })
      );
      penRef.current = null;
      if (completed) setDocument(upsertCanvasNode(document, completed));
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const element = nodesRef.current.get(drag.nodeId);
    if (element) element.style.transform = "";
    dragRef.current = null;
    if (dx || dy)
      setDocument(
        moveNodes(
          document,
          selection.selectedIds.includes(drag.nodeId) ? selection.selectedIds : [drag.nodeId],
          dx,
          dy
        )
      );
  };
  const selectedNode =
    selection.selectedIds.length === 1
      ? document.nodes.find((node) => node.id === selection.selectedIds[0])
      : undefined;
  const updateSelectedNode = (node: CanvasNode) => {
    documentRef.current = upsertCanvasNode(documentRef.current, node);
    setDocument(documentRef.current);
  };
  return (
    <div
      ref={adapterRef}
      className="canvas-adapter"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (activeTool === "laser") {
          startLaser(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        if (activeTool === "eraser") {
          eraseAtPointer(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        if (activeTool === "pen") {
          penRef.current = startPenStroke(crypto.randomUUID(), {
            ...canvasPoint(event),
            pressure: event.pressure
          });
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        setSelection({ selectedIds: [], focusedId: null });
      }}
    >
      {document.nodes.map((node) => (
        <CanvasAdapterNode
          key={node.id}
          node={node}
          job={job}
          selected={selection.selectedIds.includes(node.id)}
          register={(element) => {
            if (element) nodesRef.current.set(node.id, element);
            else nodesRef.current.delete(node.id);
          }}
          onPointerDown={onPointerDown}
          onTextCommit={(nodeId, text) =>
            setDocument({
              ...document,
              nodes: document.nodes.map((candidate) =>
                candidate.id === nodeId && candidate.kind === "text"
                  ? updateTextNode(candidate, { text })
                  : candidate
              )
            })
          }
        />
      ))}
      {selectedNode?.kind === "shape" || selectedNode?.kind === "arrow" ? (
        <ShapeFormatToolbar
          node={selectedNode}
          onChange={(patch) => updateSelectedNode(updateShapeStyle(selectedNode, patch))}
        />
      ) : null}
      {selectedNode?.kind === "text" ? (
        <TextFormatToolbar
          node={selectedNode}
          onChange={(patch) => updateSelectedNode(updateTextNode(selectedNode, patch))}
        />
      ) : null}
      {laserPoints.length > 1 ? (
        <svg className="canvas-laser-overlay" aria-hidden="true">
          <polyline points={laserPoints.map((point) => `${point.x},${point.y}`).join(" ")} />
        </svg>
      ) : null}
    </div>
  );
}

function CanvasAdapterNode({
  node,
  job,
  selected,
  register,
  onPointerDown,
  onTextCommit
}: {
  node: CanvasNode;
  job: AiJobDto | undefined;
  selected: boolean;
  register: (element: HTMLElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, nodeId: string) => void;
  onTextCommit: (nodeId: string, text: string) => void;
}) {
  const scale = Math.min(1, 640 / Math.max(node.width, node.height));
  const style = {
    left: node.x,
    top: node.y,
    width: Math.round(node.width * scale),
    height: Math.round(node.height * scale)
  };
  if (node.kind === "image")
    return (
      <figure
        ref={register}
        className={`canvas-result-node${selected ? " is-selected" : ""}`}
        style={style}
        data-node-kind="image"
        onPointerDown={(event) => onPointerDown(event, node.id)}
      >
        <img src={node.sourceUrl} alt={node.alt} draggable={false} />
      </figure>
    );
  if (node.kind === "text")
    return (
      <div
        ref={register}
        className={`canvas-text-node${selected ? " is-selected" : ""}`}
        data-node-kind="text"
        style={{
          ...style,
          color: node.color,
          fontFamily: node.fontFamily,
          fontSize: node.fontSize,
          fontWeight:
            node.fontWeight === "regular" ? 400 : node.fontWeight === "medium" ? 500 : 700,
          textAlign: node.align
        }}
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onTextCommit(node.id, event.currentTarget.textContent ?? "")}
        onPointerDown={(event) => onPointerDown(event, node.id)}
      >
        {node.text}
      </div>
    );
  if (node.kind === "pen")
    return (
      <svg
        className={`canvas-pen-node${selected ? " is-selected" : ""}`}
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        data-node-kind="pen"
      >
        <path
          d={penPathData(node.points)}
          fill="none"
          stroke={node.color}
          strokeWidth={node.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (node.kind === "shape")
    return (
      <div
        ref={register}
        className={`canvas-shape-node${selected ? " is-selected" : ""}`}
        style={style}
        data-node-kind="shape"
        onPointerDown={(event) => onPointerDown(event, node.id)}
      >
        <ShapeGraphic node={node} />
      </div>
    );
  if (node.kind === "arrow")
    return (
      <div
        ref={register}
        className={`canvas-shape-node canvas-arrow-node${selected ? " is-selected" : ""}`}
        style={style}
        data-node-kind="arrow"
        onPointerDown={(event) => onPointerDown(event, node.id)}
      >
        <ArrowGraphic node={node} />
      </div>
    );
  if (node.kind !== "pending-image") return null;
  const failed = job?.id === node.jobId && job.status === "failed";
  return (
    <article
      ref={register}
      className={`canvas-pending-node${failed ? " is-failed" : ""}${selected ? " is-selected" : ""}`}
      style={style}
      data-node-kind="pending-image"
      onPointerDown={(event) => onPointerDown(event, node.id)}
    >
      {failed ? (
        <CircleAlert
          className="canvas-pending-node__indicator is-failed"
          size={20}
          aria-hidden="true"
        />
      ) : (
        <LoaderCircle
          className="canvas-pending-node__indicator is-spinning"
          size={20}
          aria-hidden="true"
        />
      )}
      <strong>{failed ? "生成失败" : "正在生成图片"}</strong>
      <p>
        {failed
          ? (job.error?.message ?? "任务未完成，请返回首页重试。")
          : "生成结果会自动保存到项目"}
      </p>
    </article>
  );
}

function ShapeGraphic({ node }: { node: CanvasShapeNode }) {
  const { fill, stroke, strokeWidth } = node.style;
  const common = { fill, stroke, strokeWidth, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox={`0 0 ${node.width} ${node.height}`} aria-hidden="true">
      {node.shapeType === "rectangle" ? (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={node.width - strokeWidth}
          height={node.height - strokeWidth}
          rx={8}
          {...common}
        />
      ) : null}
      {node.shapeType === "ellipse" ? (
        <ellipse
          cx={node.width / 2}
          cy={node.height / 2}
          rx={Math.max(1, (node.width - strokeWidth) / 2)}
          ry={Math.max(1, (node.height - strokeWidth) / 2)}
          {...common}
        />
      ) : null}
      {node.shapeType === "diamond" ? (
        <polygon
          points={`${node.width / 2},${strokeWidth / 2} ${node.width - strokeWidth / 2},${node.height / 2} ${node.width / 2},${node.height - strokeWidth / 2} ${strokeWidth / 2},${node.height / 2}`}
          {...common}
        />
      ) : null}
      {node.shapeType === "triangle" ? (
        <polygon
          points={`${node.width / 2},${strokeWidth / 2} ${node.width - strokeWidth / 2},${node.height - strokeWidth / 2} ${strokeWidth / 2},${node.height - strokeWidth / 2}`}
          {...common}
        />
      ) : null}
      {node.shapeType === "star" ? (
        <polygon points={starPoints(node.width, node.height)} {...common} />
      ) : null}
    </svg>
  );
}

function ArrowGraphic({ node }: { node: Extract<CanvasNode, { kind: "arrow" }> }) {
  const startX = node.startX - node.x;
  const startY = node.startY - node.y;
  const endX = node.endX - node.x;
  const endY = node.endY - node.y;
  const angle = Math.atan2(endY - startY, endX - startX);
  const wing = 12;
  const left = `${endX - wing * Math.cos(angle - Math.PI / 6)},${endY - wing * Math.sin(angle - Math.PI / 6)}`;
  const right = `${endX - wing * Math.cos(angle + Math.PI / 6)},${endY - wing * Math.sin(angle + Math.PI / 6)}`;
  return (
    <svg viewBox={`0 0 ${node.width} ${node.height}`} aria-hidden="true">
      <path
        d={`M${startX} ${startY} L${endX} ${endY} M${left} L${endX} ${endY} L${right}`}
        fill="none"
        stroke={node.style.stroke}
        strokeWidth={node.style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ShapeFormatToolbar({
  node,
  onChange
}: {
  node: Extract<CanvasNode, { kind: "shape" | "arrow" }>;
  onChange: (patch: Partial<CanvasShapeNode["style"]>) => void;
}) {
  const isArrow = node.kind === "arrow";
  return (
    <div
      className="canvas-format-toolbar canvas-shape-format-toolbar"
      style={formatToolbarPosition(node)}
      role="toolbar"
      aria-label="Shape formatting"
    >
      {!isArrow ? (
        <label title="Fill color">
          <span className="sr-only">Fill color</span>
          <input
            aria-label="Fill color"
            type="color"
            value={node.style.fill === "transparent" ? "#ffffff" : node.style.fill}
            onChange={(event) => onChange({ fill: event.target.value })}
          />
        </label>
      ) : null}
      <label title="Stroke color">
        <span className="sr-only">Stroke color</span>
        <input
          aria-label="Stroke color"
          type="color"
          value={node.style.stroke}
          onChange={(event) => onChange({ stroke: event.target.value })}
        />
      </label>
      <label className="canvas-format-toolbar__range">
        <span>Stroke</span>
        <input
          aria-label="Stroke width"
          type="range"
          min="1"
          max="12"
          value={node.style.strokeWidth}
          onChange={(event) => onChange({ strokeWidth: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

function TextFormatToolbar({
  node,
  onChange
}: {
  node: CanvasTextNode;
  onChange: (
    patch: Partial<Pick<CanvasTextNode, "fontFamily" | "fontSize" | "fontWeight" | "color">>
  ) => void;
}) {
  return (
    <div
      className="canvas-format-toolbar canvas-text-format-toolbar"
      style={formatToolbarPosition(node)}
      role="toolbar"
      aria-label="Text formatting"
    >
      <label title="Text color">
        <span className="sr-only">Text color</span>
        <input
          aria-label="Text color"
          type="color"
          value={node.color}
          onChange={(event) => onChange({ color: event.target.value })}
        />
      </label>
      <select
        aria-label="Font family"
        value={node.fontFamily}
        onChange={(event) => onChange({ fontFamily: event.target.value })}
      >
        <option value="Inter">Inter</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">Mono</option>
      </select>
      <select
        aria-label="Font weight"
        value={node.fontWeight}
        onChange={(event) =>
          onChange({ fontWeight: event.target.value as CanvasTextNode["fontWeight"] })
        }
      >
        <option value="regular">Regular</option>
        <option value="medium">Medium</option>
        <option value="bold">Bold</option>
      </select>
      <select
        aria-label="Font size"
        value={node.fontSize}
        onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
      >
        {[32, 48, 64, 80, 96, 120].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatToolbarPosition(node: CanvasNode) {
  return { left: node.x + node.width / 2, top: Math.max(10, node.y - 56) };
}

function starPoints(width: number, height: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 0.48 : 0.2;
    const angle = -Math.PI / 2 + (Math.PI * index) / 5;
    return `${width / 2 + width * radius * Math.cos(angle)},${height / 2 + height * radius * Math.sin(angle)}`;
  }).join(" ");
}
