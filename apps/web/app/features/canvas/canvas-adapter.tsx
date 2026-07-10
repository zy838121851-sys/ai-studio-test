import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { moveNodes, selectNode, type CanvasDocument, type CanvasNode, type SelectionState } from "@ai-studio/canvas-engine";
import type { AiJobDto } from "@ai-studio/contracts";
import { CircleAlert, LoaderCircle } from "lucide-react";

import { useCanvasReceiverStore } from "./canvas-store.js";

export function CanvasAdapter({ document, job }: { document: CanvasDocument; job: AiJobDto | undefined }) {
  const setDocument = useCanvasReceiverStore((state) => state.setDocument);
  const [selection, setSelection] = useState<SelectionState>({ selectedIds: [], focusedId: null });
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<{ nodeId: string; pointerId: number; startX: number; startY: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, nodeId: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelection((current) => selectNode(current, nodeId, { additive: event.shiftKey || event.metaKey || event.ctrlKey }));
    dragRef.current = { nodeId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    nodesRef.current.get(drag.nodeId)?.style.setProperty("transform", `translate(${event.clientX - drag.startX}px, ${event.clientY - drag.startY}px)`);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const element = nodesRef.current.get(drag.nodeId);
    if (element) element.style.transform = "";
    dragRef.current = null;
    if (dx || dy) setDocument(moveNodes(document, selection.selectedIds.includes(drag.nodeId) ? selection.selectedIds : [drag.nodeId], dx, dy));
  };
  return <div className="canvas-adapter" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerDown={() => setSelection({ selectedIds: [], focusedId: null })}>{document.nodes.map((node) => <CanvasAdapterNode key={node.id} node={node} job={job} selected={selection.selectedIds.includes(node.id)} register={(element) => { if (element) nodesRef.current.set(node.id, element); else nodesRef.current.delete(node.id); }} onPointerDown={onPointerDown} />)}</div>;
}

function CanvasAdapterNode({ node, job, selected, register, onPointerDown }: { node: CanvasNode; job: AiJobDto | undefined; selected: boolean; register: (element: HTMLElement | null) => void; onPointerDown: (event: ReactPointerEvent<HTMLElement>, nodeId: string) => void }) {
  const scale = Math.min(1, 640 / Math.max(node.width, node.height));
  const style = { left: node.x, top: node.y, width: Math.round(node.width * scale), height: Math.round(node.height * scale) };
  if (node.kind === "image") return <figure ref={register} className={`canvas-result-node${selected ? " is-selected" : ""}`} style={style} data-node-kind="image" onPointerDown={(event) => onPointerDown(event, node.id)}><img src={node.sourceUrl} alt={node.alt} draggable={false} /></figure>;
  const failed = job?.id === node.jobId && job.status === "failed";
  return <article ref={register} className={`canvas-pending-node${failed ? " is-failed" : ""}${selected ? " is-selected" : ""}`} style={style} data-node-kind="pending-image" onPointerDown={(event) => onPointerDown(event, node.id)}>{failed ? <CircleAlert className="canvas-pending-node__indicator is-failed" size={20} aria-hidden="true" /> : <LoaderCircle className="canvas-pending-node__indicator is-spinning" size={20} aria-hidden="true" />}<strong>{failed ? "生成失败" : "正在生成图片"}</strong><p>{failed ? (job.error?.message ?? "任务未完成，请返回首页重试。") : "生成结果会自动保存到项目"}</p></article>;
}
