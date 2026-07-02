import {
  getImageNodePreviewMetrics,
  getPreviewHeight,
  readImageFilePreviewMetrics
} from "../../../canvas/upload-nodes.js";
import {
  getQwenImageSizeForDimensions,
  getQwenImageSizeForElement
} from "../../../ai/image-generator.js";

export function findActiveImageNode(root = globalThis.document) {
  return root?.querySelector?.("#canvasWorld .node-image.selected[data-active-selection='true']")
    || root?.querySelector?.("#canvasWorld .node-image.selected")
    || null;
}

export async function resolveGenerationMetrics(files = [], root = globalThis.document) {
  const sourceNode = findActiveImageNode(root);
  if (sourceNode) {
    const metrics = getImageNodePreviewMetrics(sourceNode);
    return {
      ...metrics,
      sourceNode,
      outputSize: metrics.naturalWidth && metrics.naturalHeight
        ? getQwenImageSizeForDimensions(metrics.naturalWidth, metrics.naturalHeight)
        : (metrics.image ? getQwenImageSizeForElement(metrics.image) : "")
    };
  }

  const fileMetrics = await readImageFilePreviewMetrics(files[0]);
  if (fileMetrics) {
    return {
      ...fileMetrics,
      sourceNode: null,
      outputSize: getQwenImageSizeForDimensions(fileMetrics.naturalWidth, fileMetrics.naturalHeight)
    };
  }

  return {
    width: 320,
    height: 320,
    aspectRatio: "",
    sourceNode: null,
    outputSize: ""
  };
}

export function getGenerationPlacement(metrics, target) {
  const width = metrics.width || 320;
  const height = metrics.height || getPreviewHeight(width, metrics.aspectRatio, width);
  if (metrics.sourceNode) {
    const sourceX = Number.parseFloat(metrics.sourceNode.style.left || "0");
    const sourceY = Number.parseFloat(metrics.sourceNode.style.top || "0");
    return {
      x: sourceX + (metrics.sourceNode.offsetWidth || width) + 48,
      y: sourceY
    };
  }
  return {
    x: target.x - width / 2,
    y: target.y - height / 2
  };
}
