import {
  collectCanvasContext,
  getPublicImageUrlFromNode,
  parseDatasetJson,
  snapshotCanvasNode
} from "../src/client/features/workspace/chat/workflows/prompt-canvas-context-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(parseDatasetJson("") === null, "Dataset JSON parsing should ignore empty input");
assert(parseDatasetJson("{broken") === null, "Dataset JSON parsing should ignore invalid JSON");
assert(parseDatasetJson("{\"ok\":true}").ok === true, "Dataset JSON parsing should parse valid JSON");

const visibleImageNode = makeCanvasNode({
  nodeId: "image-1",
  kind: "image",
  title: "Dataset title",
  assetType: "image/png",
  productName: "Product",
  sourceMode: "generated",
  createdBy: "ai",
  generationPrompt: "A prompt",
  generationModel: "qwen-image",
  analysisStatus: "ready",
  analysis: "{\"score\":1}",
  selected: true,
  imageSrc: "https://cdn.example.test/image.png"
});
const imageSnapshot = snapshotCanvasNode(visibleImageNode);
assert(imageSnapshot.id === "image-1", "Canvas node snapshot should preserve node id");
assert(imageSnapshot.kind === "image", "Canvas node snapshot should preserve kind");
assert(imageSnapshot.title === "Dataset title", "Canvas node snapshot should prefer dataset title");
assert(imageSnapshot.productName === "Product", "Canvas node snapshot should preserve product metadata");
assert(imageSnapshot.generationPrompt === "A prompt", "Canvas node snapshot should preserve generation prompt");
assert(imageSnapshot.generationModel === "qwen-image", "Canvas node snapshot should preserve generation model");
assert(imageSnapshot.analysis.score === 1, "Canvas node snapshot should parse AI analysis JSON");
assert(imageSnapshot.selected === true, "Canvas node snapshot should mark selected nodes");
assert(imageSnapshot.hasImage === true, "Canvas node snapshot should report image presence");
assert(imageSnapshot.imageUrl === "https://cdn.example.test/image.png", "Canvas node snapshot should keep non-data image URLs");

const fallbackTitle = snapshotCanvasNode(makeCanvasNode({
  title: "",
  visibleTitle: "Visible title",
  imageSrc: "data:image/png;base64,private"
}));
assert(fallbackTitle.title === "Visible title", "Canvas node snapshot should use visible title fallback");
assert(fallbackTitle.imageUrl === "", "Canvas node snapshot should not expose data URLs");

assert(
  getPublicImageUrlFromNode(makeCanvasNode({
    objectUrl: "https://cdn.example.test/object.png",
    currentSrc: "https://cdn.example.test/current.png",
    imageSrc: "https://cdn.example.test/src.png"
  })) === "https://cdn.example.test/object.png",
  "Public image URL helper should prefer persisted object URLs"
);
assert(
  getPublicImageUrlFromNode(makeCanvasNode({
    objectUrl: "blob:http://localhost/private",
    currentSrc: "https://cdn.example.test/current.png",
    imageSrc: "https://cdn.example.test/src.png"
  })) === "https://cdn.example.test/current.png",
  "Public image URL helper should fall back to public currentSrc values"
);
assert(
  getPublicImageUrlFromNode(makeCanvasNode({
    objectUrl: "/uploads/local.png",
    imageSrc: "data:image/png;base64,private"
  })) === "",
  "Public image URL helper should ignore non-HTTP image URLs"
);

const rootNodes = Array.from({ length: 25 }, (_item, index) => makeCanvasNode({
  nodeId: `node-${index}`,
  title: `Node ${index}`,
  selected: index === 24
}));
rootNodes.splice(8, 0, makeCanvasNode({
  nodeId: "hidden",
  title: "Hidden",
  hidden: true
}));
const context = collectCanvasContext(makeRoot(rootNodes));
assert(context.nodes.length === 20, "Canvas context should keep only the last 20 visible nodes");
assert(context.nodes[0].id === "node-5", "Canvas context should slice after hidden node filtering");
assert(context.nodes.at(-1).id === "node-24", "Canvas context should keep the latest visible node");
assert(context.selected.length === 1, "Canvas context should collect selected nodes");
assert(context.target.id === "node-24", "Canvas context should prefer selected target");
assert(Array.isArray(context.recentEvents), "Canvas context should include recent canvas events");

const unselectedContext = collectCanvasContext(makeRoot([
  makeCanvasNode({ nodeId: "first" }),
  makeCanvasNode({ nodeId: "last" })
]));
assert(unselectedContext.target.id === "last", "Canvas context should fall back to the latest node");

const emptyContext = collectCanvasContext(makeRoot([]));
assert(emptyContext.target === null, "Canvas context should handle empty canvases");
assert(emptyContext.selected.length === 0, "Canvas context should return no selected nodes for empty canvases");
assert(emptyContext.nodes.length === 0, "Canvas context should return no nodes for empty canvases");

console.log("Prompt canvas context utility checks passed.");

function makeRoot(nodes = []) {
  return {
    querySelectorAll(selector) {
      return selector === "#canvasWorld .node-card" ? nodes : [];
    }
  };
}

function makeCanvasNode({
  nodeId = "",
  kind = "",
  title = "",
  visibleTitle = "",
  assetType = "",
  productName = "",
  sourceMode = "",
  createdBy = "",
  generationPrompt = "",
  editPrompt = "",
  generationModel = "",
  editModel = "",
  analysisStatus = "",
  analysis = "",
  selected = false,
  activeSelection = false,
  hidden = false,
  objectUrl = "",
  currentSrc = "",
  imageSrc = ""
} = {}) {
  return {
    dataset: {
      nodeId,
      kind,
      title,
      assetType,
      productName,
      sourceMode,
      createdBy,
      generationPrompt,
      editPrompt,
      generationModel,
      editModel,
      aiCoreAnalysisStatus: analysisStatus,
      aiCoreAnalysis: analysis,
      activeSelection: activeSelection ? "true" : "",
      objectUrl
    },
    classList: {
      contains(name) {
        if (name === "selected") return selected;
        if (name === "stack-member-hidden") return hidden;
        return false;
      }
    },
    querySelector(selector) {
      if ((selector === "img" || selector === ".image-frame img, img") && (imageSrc || currentSrc)) {
        return { src: imageSrc, currentSrc };
      }
      if (selector === ".node-title" && visibleTitle) {
        return { textContent: visibleTitle };
      }
      return null;
    }
  };
}
