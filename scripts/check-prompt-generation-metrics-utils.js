import {
  findActiveImageNode,
  getGenerationPlacement,
  resolveGenerationMetrics
} from "../src/client/features/workspace/chat/workflows/prompt-generation-metrics-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const preferredNode = { id: "preferred" };
const fallbackNode = { id: "fallback" };
const root = {
  querySelector(selector) {
    if (selector === "#canvasWorld .node-image.selected[data-active-selection='true']") return preferredNode;
    if (selector === "#canvasWorld .node-image.selected") return fallbackNode;
    return null;
  }
};
assert(findActiveImageNode(root) === preferredNode, "Active image lookup should prefer active selection node");

const fallbackRoot = {
  querySelector(selector) {
    return selector === "#canvasWorld .node-image.selected" ? fallbackNode : null;
  }
};
assert(findActiveImageNode(fallbackRoot) === fallbackNode, "Active image lookup should fall back to selected image node");
assert(findActiveImageNode({ querySelector: () => null }) === null, "Active image lookup should handle missing nodes");

const centered = getGenerationPlacement({ width: 200, height: 100 }, { x: 500, y: 300 });
assert(centered.x === 400 && centered.y === 250, "Generation placement should center when no source node exists");

const aspectCentered = getGenerationPlacement({ width: 200, aspectRatio: "2 / 1" }, { x: 500, y: 300 });
assert(aspectCentered.x === 400 && aspectCentered.y === 250, "Generation placement should derive height from aspect ratio");

const sourceNode = {
  style: { left: "120px", top: "80px" },
  offsetWidth: 260
};
const nextToSource = getGenerationPlacement({ width: 200, height: 100, sourceNode }, { x: 500, y: 300 });
assert(nextToSource.x === 428 && nextToSource.y === 80, "Generation placement should place output beside source node");

const defaultMetrics = await resolveGenerationMetrics([], { querySelector: () => null });
assert(defaultMetrics.width === 320, "Default generation metrics should use fallback width");
assert(defaultMetrics.height === 320, "Default generation metrics should use fallback height");
assert(defaultMetrics.aspectRatio === "", "Default generation metrics should use empty aspect ratio");
assert(defaultMetrics.sourceNode === null, "Default generation metrics should not include a source node");
assert(defaultMetrics.outputSize === "", "Default generation metrics should not include output size");

console.log("Prompt generation metrics utility checks passed.");
