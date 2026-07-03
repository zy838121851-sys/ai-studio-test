import { readFileSync } from "node:fs";
import {
  pasteNodeFromClipboard,
  snapshotNodeForClipboard
} from "../src/client/features/canvas/workflows/canvas-menu-clipboard-utils.js";
import {
  canvasToBlob,
  drawImageIntoRect,
  getImageExportFileName,
  getUniqueExportFileName,
  isHttpUrl,
  prepareExportClone
} from "../src/client/features/canvas/workflows/canvas-menu-export-utils.js";
import {
  areLayoutSnapshotsEqual,
  getLayoutUnionBounds,
  getNodeSortIndex,
  getRectUnionBounds,
  getViewportUnionRect,
  parseAspectRatio
} from "../src/client/features/canvas/workflows/canvas-menu-layout-utils.js";
import {
  getCommandNodesFromSelection,
  getEarliestDomNode,
  getGroupableSelection,
  getGroupMembers,
  getGroupNodeForTarget,
  getImageLayoutCommandNodesFromSelection,
  getImageNodesForExportFromSelection,
  getLayerCommandNodesFromSelection,
  getNodeKind,
  getVisibleUniqueCanvasNodes,
  isExportableImageNode,
  isNodeLocked
} from "../src/client/features/canvas/workflows/canvas-menu-node-utils.js";
import {
  cleanFileName,
  cleanText,
  escapeAttributeValue,
  escapeHtml,
  stripImageExtension
} from "../src/client/features/canvas/workflows/canvas-menu-text-utils.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, value, message) {
  assert(source.includes(value), message);
}

function assertNotIncludes(source, value, message) {
  assert(!source.includes(value), message);
}

const menuActions = read("src/client/features/canvas/workflows/canvas-menu-actions.js");
const menuClipboardUtils = read("src/client/features/canvas/workflows/canvas-menu-clipboard-utils.js");
const menuExportUtils = read("src/client/features/canvas/workflows/canvas-menu-export-utils.js");
const menuLayoutUtils = read("src/client/features/canvas/workflows/canvas-menu-layout-utils.js");
const menuNodeUtils = read("src/client/features/canvas/workflows/canvas-menu-node-utils.js");
const menuTextUtils = read("src/client/features/canvas/workflows/canvas-menu-text-utils.js");

assertIncludes(menuActions, "export function bindCanvasMenuActions", "canvas menu must expose bindCanvasMenuActions");
assertIncludes(menuActions, "export function runCanvasImageMenuCommand", "canvas image command wrapper must stay exported");
assertIncludes(menuActions, "export function runCanvasObjectMenuCommand", "canvas object command runner must stay exported");
assertIncludes(menuActions, 'from "./canvas-menu-clipboard-utils.js"', "canvas menu must import clipboard utility helpers");
assertIncludes(menuActions, 'from "./canvas-menu-export-utils.js"', "canvas menu must import export utility helpers");
assertIncludes(menuActions, 'from "./canvas-menu-layout-utils.js"', "canvas menu must import layout utility helpers");
assertIncludes(menuActions, 'from "./canvas-menu-node-utils.js"', "canvas menu must import node utility helpers");
assertIncludes(menuActions, 'from "./canvas-menu-text-utils.js"', "canvas menu must import text utility helpers");
assertIncludes(menuActions, "const CANVAS_NODE_SELECTOR = \".node-card, .canvas-object\"", "canvas menu node selector must include node cards and canvas objects");
assertIncludes(menuClipboardUtils, "export function snapshotNodeForClipboard", "canvas clipboard snapshot must live in clipboard utils");
assertIncludes(menuClipboardUtils, "export function pasteNodeFromClipboard", "canvas clipboard paste must live in clipboard utils");
assertIncludes(menuExportUtils, "export function canvasToBlob", "canvas toBlob wrapper must live in export utils");
assertIncludes(menuExportUtils, "export function drawImageIntoRect", "canvas image draw helper must live in export utils");
assertIncludes(menuExportUtils, "export function getImageExportFileName", "canvas image export filename must live in export utils");
assertIncludes(menuExportUtils, "export function getUniqueExportFileName", "canvas unique export filename must live in export utils");
assertIncludes(menuExportUtils, "export function isHttpUrl", "canvas HTTP URL check must live in export utils");
assertIncludes(menuExportUtils, "export function prepareExportClone", "canvas export clone cleanup must live in export utils");
assertIncludes(menuLayoutUtils, "export function areLayoutSnapshotsEqual", "canvas layout snapshot equality must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getLayoutUnionBounds", "canvas layout union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getNodeSortIndex", "canvas node sort index must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getRectUnionBounds", "canvas rect union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getViewportUnionRect", "canvas viewport union rect must live in layout utils");
assertIncludes(menuLayoutUtils, "export function parseAspectRatio", "canvas aspect ratio parsing must live in layout utils");
assertIncludes(menuNodeUtils, "export function isNodeLocked", "canvas node lock check must live in node utils");
assertIncludes(menuNodeUtils, "export function getNodeKind", "canvas node kind check must live in node utils");
assertIncludes(menuNodeUtils, "export function getVisibleUniqueCanvasNodes", "canvas visible unique node filtering must live in node utils");
assertIncludes(menuNodeUtils, "export function getGroupableSelection", "canvas groupable selection check must live in node utils");
assertIncludes(menuNodeUtils, "export function getGroupMembers", "canvas group members check must live in node utils");
assertIncludes(menuNodeUtils, "export function getGroupNodeForTarget", "canvas group target lookup must live in node utils");
assertIncludes(menuNodeUtils, "export function getEarliestDomNode", "canvas earliest DOM node check must live in node utils");
assertIncludes(menuNodeUtils, "export function getCommandNodesFromSelection", "canvas command node filtering must live in node utils");
assertIncludes(menuNodeUtils, "export function getImageLayoutCommandNodesFromSelection", "canvas image command node filtering must live in node utils");
assertIncludes(menuNodeUtils, "export function getLayerCommandNodesFromSelection", "canvas layer command node filtering must live in node utils");
assertIncludes(menuNodeUtils, "export function isExportableImageNode", "canvas exportable image node check must live in node utils");
assertIncludes(menuNodeUtils, "export function getImageNodesForExportFromSelection", "canvas export image filtering must live in node utils");
assertIncludes(menuTextUtils, "export function cleanText", "canvas clean text must live in text utils");
assertIncludes(menuTextUtils, "export function cleanFileName", "canvas clean file name must live in text utils");
assertIncludes(menuTextUtils, "export function stripImageExtension", "canvas strip image extension must live in text utils");
assertIncludes(menuTextUtils, "export function escapeAttributeValue", "canvas attribute escaping must live in text utils");
assertIncludes(menuTextUtils, "export function escapeHtml", "canvas html escaping must live in text utils");
assertNotIncludes(menuActions, "function getSelectedOrTargetNodes", "unused selected/target helper must stay removed");

[
  "text:",
  '"image-generator":',
  "audio:",
  "playlist:"
].forEach((preset) => {
  assertIncludes(menuActions, preset, `canvas add-node presets must include ${preset}`);
});
assertIncludes(menuActions, 'button = event.target.closest("[data-add-node]")', "add-node menu must keep data-add-node event delegation");
assertIncludes(menuActions, 'assetUploadInput.dataset.uploadIntent = "canvas"', "canvas uploads must preserve upload intent");

[
  "copy",
  "canvas-command",
  "image-command",
  "upload",
  "asset",
  "node",
  "tool",
  "paste",
  "delete",
  "lock",
  "group",
  "ungroup",
  "group-color",
  "unlock-all",
  "save",
  "export"
].forEach((action) => {
  assertIncludes(menuActions, `action === "${action}"`, `context menu must keep ${action} action handling`);
});
assertIncludes(menuActions, 'action === "undo" || action === "redo"', "context menu must keep undo/redo reservation handling");
assertIncludes(menuActions, 'button.dataset.canvasCommand || button.dataset.imageCommand', "context menu must route canvas and image commands through the shared runner");

[
  "select-all",
  "select-current",
  "relink-image",
  "arrange-best",
  "arrange-name",
  "arrange-added"
].forEach((command) => {
  assertIncludes(menuActions, `command === "${command}"`, `canvas command runner must keep ${command}`);
});
["layer-", "align-", "normalize-"].forEach((prefix) => {
  assertIncludes(menuActions, `command.startsWith("${prefix}")`, `canvas command runner must keep ${prefix} command prefix`);
});

assertIncludes(menuActions, "snapshotNodeForClipboard", "canvas menu must keep node clipboard snapshots");
assertIncludes(menuActions, "pasteNodeFromClipboard", "canvas menu must keep node clipboard paste");
assertIncludes(menuClipboardUtils, "x: point.x + 24", "clipboard paste must preserve x offset");
assertIncludes(menuClipboardUtils, "y: point.y + 24", "clipboard paste must preserve y offset");
assertIncludes(menuClipboardUtils, 'pasted.dataset.locked = "false"', "clipboard paste must unlock pasted nodes");

assertIncludes(menuActions, 'data-selection-action="group-toggle"', "selection action bar must keep group toggle action");
assertIncludes(menuActions, 'data-selection-action="compare"', "selection action bar must keep compare action");
assertIncludes(menuActions, 'data-selection-action="group-color"', "selection action bar must keep group color action");
assertIncludes(menuActions, "getSelectionToolbarState", "selection action bar must keep selection state calculation");

const layoutSnapshot = {
  left: "10px",
  top: "20px",
  width: "300px",
  height: "",
  minHeight: "120px",
  zIndex: "3",
  manualSize: "true",
  frameAspectRatio: "4 / 3"
};
assert(areLayoutSnapshotsEqual(layoutSnapshot, { ...layoutSnapshot }) === true, "layout snapshots with matching fields should be equal");
assert(areLayoutSnapshotsEqual(layoutSnapshot, { ...layoutSnapshot, left: "11px" }) === false, "layout snapshot equality should compare left");
assert(areLayoutSnapshotsEqual(layoutSnapshot, { ...layoutSnapshot, frameAspectRatio: "1 / 1" }) === false, "layout snapshot equality should compare frame aspect ratio");
assert(areLayoutSnapshotsEqual(null, layoutSnapshot) === false, "layout snapshot equality should reject missing snapshots");

const unionBounds = getLayoutUnionBounds([
  { x: 10, y: 20, width: 100, height: 40 },
  { x: -5, y: 30, width: 20, height: 90 },
  { x: 80, y: -10, width: 10, height: 10 }
]);
assert(unionBounds.x === -5, "layout union bounds should preserve minimum x");
assert(unionBounds.y === -10, "layout union bounds should preserve minimum y");
assert(unionBounds.width === 115, "layout union bounds should span to maximum right edge");
assert(unionBounds.height === 130, "layout union bounds should span to maximum bottom edge");
assert(getLayoutUnionBounds([]).width === -Infinity, "layout union bounds should preserve empty input behavior");

const sortedNode = { dataset: { nodeId: "node-42" }, parentElement: { children: [] } };
const noDigitNode = { dataset: { nodeId: "node" }, parentElement: { children: [sortedNode] } };
assert(getNodeSortIndex(sortedNode) === 42, "node sort index should preserve numeric id parsing");
assert(getNodeSortIndex(noDigitNode) === 0, "node sort index should preserve no-digit id behavior");
assertIncludes(menuLayoutUtils, "parentElement?.children", "node sort index fallback must stay available");

const viewportRect = getViewportUnionRect([
  {
    isConnected: true,
    getBoundingClientRect: () => ({ left: 10, top: 20, right: 60, bottom: 80, width: 50, height: 60 })
  },
  {
    isConnected: false,
    getBoundingClientRect: () => ({ left: -100, top: -100, right: 500, bottom: 500, width: 600, height: 600 })
  },
  {
    isConnected: true,
    getBoundingClientRect: () => ({ left: -5, top: 30, right: 25, bottom: 120, width: 30, height: 90 })
  },
  {
    isConnected: true,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 })
  }
]);
assert(viewportRect.left === -5, "viewport union rect should preserve minimum left");
assert(viewportRect.top === 20, "viewport union rect should preserve minimum top");
assert(viewportRect.width === 65, "viewport union rect should span maximum right");
assert(viewportRect.height === 100, "viewport union rect should span maximum bottom");
assert(getViewportUnionRect([]) === null, "viewport union rect should preserve empty input fallback");

const rectUnionBounds = getRectUnionBounds([
  { x: 12.2, y: 8.1, width: 20.4, height: 10.2 },
  { x: -3.7, y: 14.5, width: 4.1, height: 30.1 }
]);
assert(rectUnionBounds.x === -3.7, "rect union bounds should preserve minimum x");
assert(rectUnionBounds.y === 8.1, "rect union bounds should preserve minimum y");
assert(rectUnionBounds.width === 37, "rect union bounds should ceil total width");
assert(rectUnionBounds.height === 37, "rect union bounds should ceil total height");
assert(getRectUnionBounds([]).width === 1, "rect union bounds should preserve empty input width fallback");
assert(getRectUnionBounds([]).height === 1, "rect union bounds should preserve empty input height fallback");
assertIncludes(menuActions, "return getRectUnionBounds(rects);", "node union bounds should reuse rect union calculation");

assert(parseAspectRatio("16 / 9") === 16 / 9, "aspect ratio parser should support ratio strings");
assert(parseAspectRatio("1.5") === 1.5, "aspect ratio parser should support numeric strings");
assert(parseAspectRatio("auto") === 0, "aspect ratio parser should preserve auto fallback");
assert(parseAspectRatio("0 / 3") === 0, "aspect ratio parser should reject non-positive ratio parts");
assert(parseAspectRatio("invalid") === 0, "aspect ratio parser should reject invalid values");

function fakeNode({ classes = [], dataset = {} } = {}) {
  return {
    dataset,
    classList: {
      contains(name) {
        return classes.includes(name);
      }
    }
  };
}

assert(isNodeLocked(fakeNode({ dataset: { locked: "true" } })) === true, "node lock check should read locked dataset");
assert(isNodeLocked(fakeNode({ classes: ["node-locked"], dataset: { locked: "false" } })) === true, "node lock check should read locked class");
assert(isNodeLocked(fakeNode({ dataset: { locked: "false" } })) === false, "node lock check should preserve unlocked dataset behavior");
assert(getNodeKind(fakeNode({ classes: ["node-image"], dataset: { kind: "video" } })) === "image", "node kind should prioritize image class");
assert(getNodeKind(fakeNode({ classes: ["node-group"] })) === "group", "node kind should detect group class");
assert(getNodeKind(fakeNode({ classes: ["node-model"] })) === "model", "node kind should detect model class");
assert(getNodeKind(fakeNode({ classes: ["node-video"] })) === "video", "node kind should detect video class");
assert(getNodeKind(fakeNode({ classes: ["canvas-text"], dataset: { kind: "custom" } })) === "2d", "node kind should preserve canvas text class priority");
assert(getNodeKind(fakeNode({ dataset: { kind: "custom" } })) === "custom", "node kind should fall back to dataset kind");
assert(getNodeKind(fakeNode()) === "2d", "node kind should preserve default 2d fallback");

const visibleNode = fakeNode();
visibleNode.isConnected = true;
const hiddenNode = fakeNode({ classes: ["hidden"] });
hiddenNode.isConnected = true;
const stackHiddenNode = fakeNode({ classes: ["stack-member-hidden"] });
stackHiddenNode.isConnected = true;
const disconnectedNode = fakeNode();
disconnectedNode.isConnected = false;
assert(getVisibleUniqueCanvasNodes([visibleNode, visibleNode, hiddenNode, stackHiddenNode, disconnectedNode]).length === 1, "visible unique canvas nodes should dedupe and filter hidden nodes");
assert(getVisibleUniqueCanvasNodes([visibleNode, visibleNode])[0] === visibleNode, "visible unique canvas nodes should preserve first unique node");

const selectedGroupable = fakeNode({ classes: ["selected"], dataset: {} });
const selectedGrouped = fakeNode({ classes: ["selected"], dataset: { groupId: "group-a" } });
const selectedGroupNode = fakeNode({ classes: ["selected", "node-group"], dataset: {} });
const targetGroupable = fakeNode({ dataset: {} });
targetGroupable.isConnected = true;
const targetGrouped = fakeNode({ dataset: { groupId: "group-a" } });
targetGrouped.isConnected = true;
assert(getGroupableSelection(null, [selectedGrouped, selectedGroupNode, selectedGroupable])[0] === selectedGroupable, "groupable selection should prefer selected ungrouped non-group nodes");
assert(getGroupableSelection(targetGroupable, [selectedGrouped]).length === 1, "groupable selection should use target fallback when no selected nodes qualify");
assert(getGroupableSelection(targetGrouped, []).length === 0, "groupable selection should reject grouped target fallback");

const memberA = fakeNode({ dataset: { groupId: "group-a" } });
const memberB = fakeNode({ dataset: { groupId: "group-b" } });
const groupCard = fakeNode({ classes: ["node-group"], dataset: { groupId: "group-a" } });
assert(getGroupMembers("group-a", [memberA, memberB, groupCard]).length === 1, "group members should include only matching non-group nodes");
assert(getGroupMembers("", [memberA]).length === 0, "group members should reject empty group id");

const directGroup = fakeNode({ classes: ["node-group"], dataset: { groupId: "group-a" } });
directGroup.isConnected = true;
assert(getGroupNodeForTarget(directGroup) === directGroup, "group target lookup should return direct group target");
let groupLookupSelector = "";
const groupedTarget = fakeNode({ dataset: { groupId: 'group"1' } });
groupedTarget.isConnected = true;
const lookedUpGroup = fakeNode({ classes: ["node-group"], dataset: { groupId: 'group"1' } });
assert(getGroupNodeForTarget(groupedTarget, {
  querySelector(selector) {
    groupLookupSelector = selector;
    return lookedUpGroup;
  }
}) === lookedUpGroup, "group target lookup should query grouped targets");
assert(groupLookupSelector === '.node-group[data-group-id="group\\"1"]', "group target lookup should preserve escaped selector");
assert(getGroupNodeForTarget(fakeNode()) === null, "group target lookup should reject disconnected targets");

function fakeDomNode(order, { hasParent = true } = {}) {
  return {
    order,
    parentElement: hasParent ? {} : null,
    compareDocumentPosition(other) {
      return other.order < this.order ? 2 : 4;
    }
  };
}

const firstNode = fakeDomNode(1);
const middleNode = fakeDomNode(2);
const lastNode = fakeDomNode(3);
const detachedNode = fakeDomNode(0, { hasParent: false });
assert(getEarliestDomNode([lastNode, detachedNode, middleNode, firstNode], { documentPositionPreceding: 2 }) === firstNode, "earliest DOM node should sort by document position");
assert(getEarliestDomNode([detachedNode], { documentPositionPreceding: 2 }) === null, "earliest DOM node should reject detached nodes");

const selectedCommand = fakeNode({ classes: ["selected"], dataset: {} });
selectedCommand.isConnected = true;
const lockedSelectedCommand = fakeNode({ classes: ["selected"], dataset: { locked: "true" } });
lockedSelectedCommand.isConnected = true;
const targetCommand = fakeNode({ dataset: {} });
targetCommand.isConnected = true;
assert(getCommandNodesFromSelection([selectedCommand, lockedSelectedCommand], { targetNode: targetCommand }).length === 1, "command nodes should prefer unlocked selected nodes");
assert(getCommandNodesFromSelection([], { targetNode: targetCommand })[0] === targetCommand, "command nodes should fall back to target node");

const selectedImageCommand = fakeNode({ classes: ["selected", "node-image"], dataset: {} });
selectedImageCommand.isConnected = true;
const selectedTextCommand = fakeNode({ classes: ["selected"], dataset: {} });
selectedTextCommand.isConnected = true;
assert(getImageLayoutCommandNodesFromSelection([selectedImageCommand, selectedTextCommand], {
  isCanvasImageNode: (node) => node.classList.contains("node-image")
})[0] === selectedImageCommand, "image command nodes should keep only image nodes");

const layerSelected = fakeNode({ classes: ["selected"], dataset: {} });
layerSelected.isConnected = true;
const layerTarget = fakeNode({ classes: ["selected"], dataset: {} });
layerTarget.isConnected = true;
assert(getLayerCommandNodesFromSelection([layerSelected, layerTarget], { targetNode: layerTarget }).length === 2, "layer command nodes should use all selected nodes when target is selected");
const unselectedLayerTarget = fakeNode({ dataset: {} });
unselectedLayerTarget.isConnected = true;
assert(getLayerCommandNodesFromSelection([layerSelected], { targetNode: unselectedLayerTarget })[0] === unselectedLayerTarget, "layer command nodes should prefer unselected target when target is not selected");

function fakeImageNode({ selected = false, connected = true, hasImage = true } = {}) {
  const classes = ["node-image"];
  if (selected) classes.push("selected");
  const node = fakeNode({ classes, dataset: {} });
  node.isConnected = connected;
  node.querySelector = (selector) => selector === ".image-frame img" && hasImage ? {} : null;
  return node;
}

const exportImage = fakeImageNode();
const selectedExportImage = fakeImageNode({ selected: true });
const disconnectedExportImage = fakeImageNode({ connected: false });
const emptyExportImage = fakeImageNode({ hasImage: false });
const targetExportImage = fakeImageNode();
assert(isExportableImageNode(exportImage) === true, "exportable image node should require connected image node with image");
assert(isExportableImageNode(disconnectedExportImage) === false, "exportable image node should reject disconnected image nodes");
assert(isExportableImageNode(emptyExportImage) === false, "exportable image node should reject image nodes without image element");
assert(getImageNodesForExportFromSelection([exportImage, selectedExportImage], "all", targetExportImage).length === 2, "export image filtering should return all images for all scope");
assert(getImageNodesForExportFromSelection([exportImage, selectedExportImage], "selected", targetExportImage)[0] === selectedExportImage, "export image filtering should prefer selected images");
assert(getImageNodesForExportFromSelection([], "selected", targetExportImage)[0] === targetExportImage, "export image filtering should fall back to exportable target");
assert(getImageNodesForExportFromSelection([], "selected", emptyExportImage).length === 0, "export image filtering should reject non-exportable target");

const exportNameNode = {
  querySelector(selector) {
    if (selector === ".image-file-name, h3, .node-title, [data-node-title]") return { textContent: " Scene/One.PNG " };
    if (selector === ".image-frame img") return { alt: "fallback-alt" };
    return null;
  }
};
const exportAltNameNode = {
  querySelector(selector) {
    if (selector === ".image-frame img") return { alt: "Alt:Shot.webp" };
    return null;
  }
};
assert(getImageExportFileName(exportNameNode) === "Scene-One.PNG.png", "image export file name should preserve current strip-before-clean behavior");
assert(getImageExportFileName(exportAltNameNode) === "Alt-Shot.png", "image export file name should fall back to image alt");
assert(getUniqueExportFileName([], "Scene-One.png") === "Scene-One.png", "unique export file name should keep unused name");
assert(getUniqueExportFileName([{ fileName: "Scene-One.png" }, { fileName: "Scene-One-2.png" }], "Scene-One.png") === "Scene-One-3.png", "unique export file name should increment conflicting names");
assert(isHttpUrl("http://example.com/a.png") === true, "HTTP URL check should accept http URLs");
assert(isHttpUrl("https://example.com/a.png") === true, "HTTP URL check should accept https URLs");
assert(isHttpUrl("HTTPS://example.com/a.png") === true, "HTTP URL check should preserve case-insensitive behavior");
assert(isHttpUrl("/uploads/a.png") === false, "HTTP URL check should reject relative uploads");
assert(isHttpUrl("data:image/png;base64,abc") === false, "HTTP URL check should reject data URLs");
assert(isHttpUrl(null) === false, "HTTP URL check should reject nullish values");
const canvasBlob = await canvasToBlob({
  toBlob(callback, type) {
    assert(type === "image/png", "canvas toBlob wrapper should pass through the requested MIME type");
    callback("blob-result");
  }
}, "image/png");
assert(canvasBlob === "blob-result", "canvas toBlob wrapper should resolve with a returned blob");
let canvasBlobRejected = false;
try {
  await canvasToBlob({ toBlob: (callback) => callback(null) }, "image/png");
} catch (error) {
  canvasBlobRejected = error.message === "Canvas export returned an empty blob";
}
assert(canvasBlobRejected === true, "canvas toBlob wrapper should reject empty canvas exports");
const containDrawCalls = [];
drawImageIntoRect({
  context: { drawImage: (...args) => containDrawCalls.push(args) },
  image: { naturalWidth: 400, naturalHeight: 200 },
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  objectFit: "contain"
});
assert(JSON.stringify(containDrawCalls[0].slice(1)) === JSON.stringify([0, 50, 200, 100]), "image draw helper should preserve contain centering");
const coverDrawCalls = [];
drawImageIntoRect({
  context: { drawImage: (...args) => coverDrawCalls.push(args) },
  image: { naturalWidth: 400, naturalHeight: 200 },
  x: 0,
  y: 0,
  width: 200,
  height: 200
});
assert(JSON.stringify(coverDrawCalls[0].slice(1)) === JSON.stringify([100, 0, 200, 200, 0, 0, 200, 200]), "image draw helper should preserve cover crop math");
const emptyDrawCalls = [];
drawImageIntoRect({
  context: { drawImage: (...args) => emptyDrawCalls.push(args) },
  image: { naturalWidth: 0, naturalHeight: 200 },
  x: 0,
  y: 0,
  width: 200,
  height: 200
});
assert(emptyDrawCalls.length === 0, "image draw helper should skip missing source dimensions");
const removedCloneClasses = [];
const removedExportSelectors = [];
prepareExportClone({
  classList: {
    remove: (...classes) => removedCloneClasses.push(...classes)
  },
  querySelectorAll(selector) {
    removedExportSelectors.push(selector);
    return [
      { remove: () => removedExportSelectors.push("resize-handle removed") },
      { remove: () => removedExportSelectors.push("toolbar removed") }
    ];
  }
});
assert(JSON.stringify(removedCloneClasses) === JSON.stringify(["selected", "node-locked"]), "export clone cleanup should preserve removed classes");
assert(removedExportSelectors[0] === ".resize-handle, .image-node-toolbar, .canvas-asset-savebar, .node-download, .node-expand, .stack-toggle, .stack-tray", "export clone cleanup should preserve removed selector list");
assert(removedExportSelectors.includes("resize-handle removed") && removedExportSelectors.includes("toolbar removed"), "export clone cleanup should remove matched controls");

assert(cleanText("  first\n\tsecond   third  ") === "first second third", "clean text should collapse whitespace");
assert(cleanText("x".repeat(130)).length === 120, "clean text should preserve 120 character limit");
assert(cleanFileName(' a/b:c*d?e"f<g>h|i ') === "a-b-c-d-e-f-g-h-i", "clean file name should replace invalid filename characters");
assert(cleanFileName("   ") === "canvas-node", "clean file name should preserve empty fallback");
assert(stripImageExtension("sample.preview.PNG") === "sample.preview", "strip image extension should remove supported image extensions");
assert(stripImageExtension("sample.preview.txt") === "sample.preview.txt", "strip image extension should preserve unknown extensions");
assert(escapeAttributeValue('group"1') === 'group\\"1', "attribute escaping should preserve quote behavior");
assert(escapeAttributeValue("group\\1") === "group\\\\1", "attribute escaping should preserve backslash behavior");
assert(escapeHtml('<div title="A&B">') === "&lt;div title=&quot;A&amp;B&quot;&gt;", "html escaping should preserve export svg escaping");

const clipboardImage = {
  alt: "Alt title",
  currentSrc: "/uploads/generated.png",
  src: "/uploads/fallback.png",
  dataset: { mimeType: "image/jpeg" }
};
const clipboardNode = {
  dataset: { title: "Dataset title", desc: "Dataset desc" },
  style: { width: "320px", minHeight: "180px" },
  textContent: "Text title",
  querySelector(selector) {
    if (selector === ".image-frame img") return clipboardImage;
    if (selector === "h3, .node-title, [data-node-title]") return { textContent: "  Snapshot\nTitle  " };
    if (selector === "p, .node-desc, [data-node-desc]") return { textContent: "  Snapshot   Description  " };
    return null;
  }
};
const clipboardSnapshot = snapshotNodeForClipboard(clipboardNode, { getNodeKind: () => "image" });
assert(clipboardSnapshot.kind === "image", "clipboard snapshot should preserve node kind");
assert(clipboardSnapshot.title === "Snapshot Title", "clipboard snapshot should clean title text");
assert(clipboardSnapshot.desc === "Snapshot Description", "clipboard snapshot should clean description text");
assert(clipboardSnapshot.media.url === "/uploads/generated.png", "clipboard snapshot should prefer current image source");
assert(clipboardSnapshot.media.type === "image/jpeg", "clipboard snapshot should preserve image mime type");
assert(clipboardSnapshot.width === "320px", "clipboard snapshot should preserve width style");
assert(clipboardSnapshot.minHeight === "180px", "clipboard snapshot should preserve min height style");

let pasteArgs = null;
let selectedPasteNode = null;
const pastedNode = {
  style: {},
  dataset: { locked: "true" },
  classList: {
    removed: [],
    contains: () => false,
    remove(...names) {
      this.removed.push(...names);
    }
  }
};
const pastedResult = pasteNodeFromClipboard({
  snapshot: clipboardSnapshot,
  point: { x: 10, y: 20 },
  addNode(args) {
    pasteArgs = args;
    return pastedNode;
  },
  selectNode(node) {
    selectedPasteNode = node;
  }
});
assert(pastedResult === pastedNode, "clipboard paste should return pasted node");
assert(pasteArgs.x === 34 && pasteArgs.y === 44, "clipboard paste should preserve paste offset");
assert(pasteArgs.kind === "image", "clipboard paste should pass snapshot kind");
assert(pastedNode.style.width === "320px", "clipboard paste should restore width");
assert(pastedNode.style.minHeight === "180px", "clipboard paste should restore non-image min height");
assert(pastedNode.dataset.locked === "false", "clipboard paste should unlock pasted node");
assert(pastedNode.classList.removed.includes("node-locked") && pastedNode.classList.removed.includes("selected"), "clipboard paste should clear lock and selection classes");
assert(selectedPasteNode === pastedNode, "clipboard paste should select pasted node");
assert(pasteNodeFromClipboard({ snapshot: null, point: { x: 0, y: 0 }, addNode: () => pastedNode, selectNode: () => {} }) === null, "clipboard paste should ignore empty snapshot");

console.log("Canvas menu action checks passed.");
