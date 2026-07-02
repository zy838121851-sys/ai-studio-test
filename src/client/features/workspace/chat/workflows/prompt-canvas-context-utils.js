import { getRecentCanvasEvents } from "../../../canvas/canvas-events.js";

export function collectCanvasContext(root = globalThis.document) {
  const nodes = Array.from(root?.querySelectorAll?.("#canvasWorld .node-card") || [])
    .filter((node) => !node.classList.contains("stack-member-hidden"))
    .slice(-20)
    .map((node) => snapshotCanvasNode(node));
  const selected = nodes.filter((node) => node.selected);
  return {
    target: selected[0] || nodes[nodes.length - 1] || null,
    selected,
    nodes,
    recentEvents: getRecentCanvasEvents(12)
  };
}

export function snapshotCanvasNode(node) {
  const image = node?.querySelector?.("img");
  return {
    id: node?.dataset?.nodeId || "",
    kind: node?.dataset?.kind || "",
    title: node?.dataset?.title || node?.querySelector?.(".node-title")?.textContent?.trim?.() || "",
    assetType: node?.dataset?.assetType || "",
    productName: node?.dataset?.productName || "",
    sourceMode: node?.dataset?.sourceMode || "",
    createdBy: node?.dataset?.createdBy || "",
    generationPrompt: node?.dataset?.generationPrompt || node?.dataset?.editPrompt || "",
    generationModel: node?.dataset?.generationModel || node?.dataset?.editModel || "",
    analysisStatus: node?.dataset?.aiCoreAnalysisStatus || "",
    analysis: parseDatasetJson(node?.dataset?.aiCoreAnalysis),
    selected: node?.classList?.contains("selected") || node?.dataset?.activeSelection === "true",
    hasImage: Boolean(image?.src),
    imageUrl: image?.src?.startsWith?.("data:") ? "" : (image?.src || "")
  };
}

export function parseDatasetJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
