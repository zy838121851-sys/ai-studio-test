import { createCanvasNodeElement } from "./node-factory.js";
import {
  applyNodePreviewSize,
  buildGenerationPreviewConfig
} from "./upload-nodes.js";

export function createWorkspaceNode({
  config,
  renderTemplate,
  emptyState,
  canvasWorld,
  ensureNodeId,
  makeDraggable,
  selectNode,
  initModelViewer,
  onImageLoaded,
  onImageDoubleClick
}) {
  const { kind, title, desc, x, y, media } = config;
  emptyState?.classList.add("hidden");

  const node = createCanvasNodeElement({
    kind,
    title,
    x,
    y,
    media,
    html: renderTemplate(kind, title, desc, media)
  });

  ensureNodeId(node);
  makeDraggable(node);

  if (kind === "image") {
    const image = node.querySelector(".image-frame img");
    image?.addEventListener("load", () => onImageLoaded?.(node, image), { once: true });
    node.addEventListener("dblclick", (event) => onImageDoubleClick?.(event, node));
  }

  canvasWorld.appendChild(node);
  if (kind === "model" && media?.file) initModelViewer(node, media.file);
  selectNode(node);
  return node;
}

export function createGenerationPreviewNode({
  addNode,
  title,
  desc,
  x,
  y,
  width,
  aspectRatio
}) {
  const node = addNode(buildGenerationPreviewConfig({ title, desc, x, y }));
  applyNodePreviewSize(node, { width, aspectRatio });
  if (!aspectRatio) node.dataset.manualSize = "true";
  return node;
}

export function replacePreviewNodeWithImage({
  previewNode,
  addNode,
  applyGeneratedContext,
  recordGenerationCreated,
  title,
  desc,
  url,
  width,
  aspectRatio,
  prompt = "",
  sourceNode = null,
  actionType = "",
  model = ""
}) {
  const x = parseFloat(previewNode.style.left || "0");
  const y = parseFloat(previewNode.style.top || "0");
  previewNode.remove();

  const node = addNode({
    kind: "image",
    title,
    desc,
    x,
    y,
    media: {
      url,
      name: title,
      type: "image/png"
    }
  });

  applyNodePreviewSize(node, { width, aspectRatio });
  applyGeneratedContext(node, { prompt, sourceNode, actionType, model });
  recordGenerationCreated(node, { sourceNode, actionType, model });
  return node;
}
