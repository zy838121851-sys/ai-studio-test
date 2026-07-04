import { readFileSync } from "node:fs";
import {
  pasteNodeFromClipboard,
  snapshotNodeForClipboard
} from "../src/client/features/canvas/workflows/canvas-menu-clipboard-utils.js";
import {
  blobToDataUrl,
  canvasToBlob,
  downloadBlob,
  drawImageIntoRect,
  getImageExportRect,
  getImageExportFileName,
  getUniqueExportFileName,
  isHttpUrl,
  prepareExportClone,
  rasterizeSvg
} from "../src/client/features/canvas/workflows/canvas-menu-export-utils.js";
import {
  areLayoutSnapshotsEqual,
  getImageDisplayAspectRatio,
  getImageFrameHeightFromAspect,
  getLayerOrderedNodes,
  getLayoutUnionBounds,
  getNodeLayoutBounds,
  getNodeSortIndex,
  getNodesUnionBounds,
  layoutNodesByColumns,
  layoutNodesByRows,
  layoutNodesInCompactGallery,
  normalizeLayerZIndex,
  normalizeNodesByMode,
  recordLayoutMutation,
  reorderLayerNodesByMode,
  getRectUnionBounds,
  getViewportCenterWorldPoint,
  getViewportUnionRect,
  parseAspectRatio,
  restoreLayoutNodes,
  setNodeLayoutFrameSize,
  setNodeLayoutHeight,
  setNodeLayoutSize,
  setNodeLayoutWidth,
  snapshotLayoutNodes,
  sortNodesByCanvasPosition,
  stackNodesByOffset
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
assertIncludes(menuExportUtils, "export function blobToDataUrl", "blob data URL reader must live in export utils");
assertIncludes(menuExportUtils, "export function canvasToBlob", "canvas toBlob wrapper must live in export utils");
assertIncludes(menuExportUtils, "export function downloadBlob", "canvas download helper must live in export utils");
assertIncludes(menuExportUtils, "export function drawImageIntoRect", "canvas image draw helper must live in export utils");
assertIncludes(menuExportUtils, "export function getImageExportRect", "canvas image export rect must live in export utils");
assertIncludes(menuExportUtils, "export function getImageExportFileName", "canvas image export filename must live in export utils");
assertIncludes(menuExportUtils, "export function getUniqueExportFileName", "canvas unique export filename must live in export utils");
assertIncludes(menuExportUtils, "export function isHttpUrl", "canvas HTTP URL check must live in export utils");
assertIncludes(menuExportUtils, "export function prepareExportClone", "canvas export clone cleanup must live in export utils");
assertIncludes(menuExportUtils, "export function rasterizeSvg", "canvas SVG rasterizer must live in export utils");
assertIncludes(menuLayoutUtils, "export function areLayoutSnapshotsEqual", "canvas layout snapshot equality must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getImageDisplayAspectRatio", "canvas image display aspect ratio must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getImageFrameHeightFromAspect", "canvas image frame aspect height must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getLayerOrderedNodes", "canvas layer ordering must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getLayoutUnionBounds", "canvas layout union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getNodeLayoutBounds", "canvas node layout bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getNodeSortIndex", "canvas node sort index must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getNodesUnionBounds", "canvas node union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function layoutNodesInCompactGallery", "canvas compact gallery layout must live in layout utils");
assertIncludes(menuLayoutUtils, "export function layoutNodesByRows", "canvas row layout must live in layout utils");
assertIncludes(menuLayoutUtils, "export function layoutNodesByColumns", "canvas column layout must live in layout utils");
assertIncludes(menuLayoutUtils, "export function normalizeLayerZIndex", "canvas layer z-index normalization must live in layout utils");
assertIncludes(menuLayoutUtils, "export function normalizeNodesByMode", "canvas normalize layout command must live in layout utils");
assertIncludes(menuLayoutUtils, "export function reorderLayerNodesByMode", "canvas layer reorder calculation must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getRectUnionBounds", "canvas rect union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getViewportCenterWorldPoint", "canvas viewport center world point must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getViewportUnionRect", "canvas viewport union rect must live in layout utils");
assertIncludes(menuLayoutUtils, "export function parseAspectRatio", "canvas aspect ratio parsing must live in layout utils");
assertIncludes(menuLayoutUtils, "export function recordLayoutMutation", "canvas layout mutation recorder must live in layout utils");
assertIncludes(menuLayoutUtils, "export function snapshotLayoutNodes", "canvas layout snapshot capture must live in layout utils");
assertIncludes(menuLayoutUtils, "export function stackNodesByOffset", "canvas stack layout command must live in layout utils");
assertIncludes(menuLayoutUtils, "export function restoreLayoutNodes", "canvas layout snapshot restore must live in layout utils");
assertIncludes(menuLayoutUtils, "export function setNodeLayoutFrameSize", "canvas layout frame size writer must live in layout utils");
assertIncludes(menuLayoutUtils, "export function setNodeLayoutHeight", "canvas layout height writer must live in layout utils");
assertIncludes(menuLayoutUtils, "export function setNodeLayoutSize", "canvas layout size writer must live in layout utils");
assertIncludes(menuLayoutUtils, "export function setNodeLayoutWidth", "canvas layout width writer must live in layout utils");
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
assertIncludes(menuLayoutUtils, "export function sortNodesByCanvasPosition", "canvas position sort must live in layout utils");
assert(normalizeLayerZIndex("12", 3) === 12, "layer z-index normalization should parse numeric strings");
assert(normalizeLayerZIndex("12px", 3) === 12, "layer z-index normalization should preserve parseInt behavior");
assert(normalizeLayerZIndex("", 3) === 13, "layer z-index normalization should use fallback for empty values");
assert(normalizeLayerZIndex("bad", 4) === 14, "layer z-index normalization should use fallback for invalid values");
const layerNodeA = { style: { zIndex: "20" } };
const layerNodeB = { style: { zIndex: "" } };
const layerNodeC = { style: { zIndex: "11" } };
const layerNodeD = { style: { zIndex: "20" } };
const orderedLayerNodes = getLayerOrderedNodes([layerNodeA, layerNodeB, layerNodeC, layerNodeD]);
assert(
  orderedLayerNodes[0] === layerNodeB
    && orderedLayerNodes[1] === layerNodeC
    && orderedLayerNodes[2] === layerNodeA
    && orderedLayerNodes[3] === layerNodeD,
  "layer ordering should preserve z-index sort with original index fallback"
);
const layerA = { id: "a" };
const layerB = { id: "b" };
const layerC = { id: "c" };
const layerD = { id: "d" };
const layerOrder = [layerA, layerB, layerC, layerD];
const layerIds = (nodes) => nodes.map((node) => node.id).join("|");
assert(
  layerIds(reorderLayerNodesByMode(layerOrder, [layerB, layerD], "front")) === "a|c|b|d",
  "layer reorder should preserve front behavior"
);
assert(
  layerIds(reorderLayerNodesByMode(layerOrder, [layerB, layerD], "back")) === "b|d|a|c",
  "layer reorder should preserve back behavior"
);
assert(
  layerIds(reorderLayerNodesByMode(layerOrder, [layerB, layerC], "up")) === "a|d|b|c",
  "layer reorder should preserve one-step up behavior for grouped selection"
);
assert(
  layerIds(reorderLayerNodesByMode(layerOrder, [layerB, layerC], "down")) === "b|c|a|d",
  "layer reorder should preserve one-step down behavior for grouped selection"
);
assert(
  reorderLayerNodesByMode(layerOrder, [layerB], "unknown").every((node, index) => node === layerOrder[index]),
  "layer reorder should preserve unknown mode no-op behavior"
);
assert(
  reorderLayerNodesByMode(layerOrder, [], "front").every((node, index) => node === layerOrder[index]),
  "layer reorder should preserve empty selection no-op behavior"
);

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
const viewportCenterPoint = getViewportCenterWorldPoint(
  {
    clientWidth: 300,
    clientHeight: 180,
    getBoundingClientRect: () => ({ left: 40, top: 60 })
  },
  (x, y) => ({ x: x / 2, y: y / 3 })
);
assert(
  viewportCenterPoint.x === 95 && viewportCenterPoint.y === 50,
  "viewport center world point should preserve viewport midpoint conversion"
);

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
assertIncludes(menuLayoutUtils, "return getRectUnionBounds(rects);", "node union bounds should reuse rect union calculation");

assert(parseAspectRatio("16 / 9") === 16 / 9, "aspect ratio parser should support ratio strings");
assert(parseAspectRatio("1.5") === 1.5, "aspect ratio parser should support numeric strings");
assert(parseAspectRatio("auto") === 0, "aspect ratio parser should preserve auto fallback");
assert(parseAspectRatio("0 / 3") === 0, "aspect ratio parser should reject non-positive ratio parts");
assert(parseAspectRatio("invalid") === 0, "aspect ratio parser should reject invalid values");

const OriginalWindowForLayout = globalThis.window;
try {
  globalThis.window = {
    getComputedStyle(target) {
      return { aspectRatio: target?.computedAspectRatio || "" };
    }
  };
  const plainLayoutNode = {
    offsetWidth: 0,
    offsetHeight: 48,
    style: { left: "12.5px", top: "bad", width: "240px", minHeight: "60px" },
    classList: { contains: () => false }
  };
  const plainBounds = getNodeLayoutBounds(plainLayoutNode);
  assert(plainBounds.x === 12.5 && plainBounds.y === 0, "node layout bounds should parse position styles");
  assert(plainBounds.width === 240 && plainBounds.height === 48, "node layout bounds should prefer offset height and style width fallback");

  const nodeUnionBounds = getNodesUnionBounds([
    {
      offsetWidth: 0,
      offsetHeight: 20,
      style: { left: "10px", top: "30px", width: "40px", minHeight: "20px" },
      classList: { contains: () => false }
    },
    {
      offsetWidth: 0,
      offsetHeight: 60,
      style: { left: "-5px", top: "10px", width: "20px", minHeight: "60px" },
      classList: { contains: () => false }
    }
  ]);
  assert(
    nodeUnionBounds.x === -5
      && nodeUnionBounds.y === 10
      && nodeUnionBounds.width === 55
      && nodeUnionBounds.height === 60,
    "node union bounds should derive rect union from layout bounds"
  );

  const imageFrame = {
    offsetWidth: 320,
    offsetHeight: 0,
    style: { aspectRatio: "16 / 9" }
  };
  const imageLayoutNode = {
    offsetWidth: 0,
    offsetHeight: 0,
    style: { left: "4px", top: "8px", width: "0", minHeight: "120px" },
    classList: { contains: (name) => name === "node-image" },
    querySelector(selector) {
      if (selector === ".image-frame") return imageFrame;
      return null;
    }
  };
  const imageBounds = getNodeLayoutBounds(imageLayoutNode);
  assert(imageBounds.x === 4 && imageBounds.y === 8, "image layout bounds should parse image position");
  assert(imageBounds.width === 320 && imageBounds.height === 180, "image layout bounds should derive height from frame aspect ratio");
  assert(getImageFrameHeightFromAspect(imageLayoutNode, 320) === 180, "image frame aspect height should preserve ratio calculation");

  imageFrame.style.aspectRatio = "";
  imageFrame.computedAspectRatio = "4 / 3";
  assert(getImageFrameHeightFromAspect(imageLayoutNode, 300) === 225, "image frame aspect height should fall back to computed style");

  imageFrame.offsetWidth = 0;
  imageFrame.offsetHeight = 0;
  imageFrame.style.aspectRatio = "";
  imageFrame.computedAspectRatio = "";
  const fallbackImageBounds = getNodeLayoutBounds(imageLayoutNode);
  assert(fallbackImageBounds.width === 1 && fallbackImageBounds.height === 120, "image layout bounds should preserve width minimum and minHeight fallback");

  function createLayoutSortNode({ id, left, top }) {
    return {
      dataset: { nodeId: id },
      offsetWidth: 20,
      offsetHeight: 20,
      style: { left: `${left}px`, top: `${top}px`, width: "20px", minHeight: "20px" },
      parentElement: { children: [] },
      classList: { contains: () => false }
    };
  }

  const lowerRowNode = createLayoutSortNode({ id: "node-10", left: 0, top: 100 });
  const sameRowRightNode = createLayoutSortNode({ id: "node-20", left: 50, top: 0 });
  const sameRowFarRightNode = createLayoutSortNode({ id: "node-30", left: 200, top: 10 });
  const sameRowLeftNode = createLayoutSortNode({ id: "node-40", left: 10, top: 22 });
  const sortedCanvasNodes = sortNodesByCanvasPosition([
    lowerRowNode,
    sameRowRightNode,
    sameRowFarRightNode,
    sameRowLeftNode
  ]);
  assert(
    sortedCanvasNodes[0] === sameRowLeftNode
      && sortedCanvasNodes[1] === sameRowRightNode
      && sortedCanvasNodes[2] === sameRowFarRightNode
      && sortedCanvasNodes[3] === lowerRowNode,
    "canvas position sort should preserve visual row threshold before y ordering"
  );

  const sameSpotEarlyNode = createLayoutSortNode({ id: "node-2", left: 10, top: 22 });
  const sameSpotLateNode = createLayoutSortNode({ id: "node-9", left: 10, top: 22 });
  assert(
    sortNodesByCanvasPosition([sameSpotLateNode, sameSpotEarlyNode])[0] === sameSpotEarlyNode,
    "canvas position sort should preserve node id fallback for identical bounds"
  );

  function createCompactLayoutNode({ left = 0, top = 0, width = 40, height = 20, locked = false } = {}) {
    return {
      isConnected: true,
      dataset: { locked: locked ? "true" : "false" },
      offsetWidth: width,
      offsetHeight: height,
      style: {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        minHeight: `${height}px`,
        zIndex: ""
      },
      classList: { contains: () => false },
      querySelector: () => null
    };
  }

  const rowNodeA = createCompactLayoutNode();
  const rowNodeB = createCompactLayoutNode();
  const rowNodeC = createCompactLayoutNode();
  layoutNodesByRows(
    [rowNodeA, rowNodeB, rowNodeC],
    [
      { width: 50, height: 20 },
      { width: 60, height: 30 },
      { width: 70, height: 40 }
    ],
    {
      gap: 10,
      left: 0,
      right: 200,
      bottom: 100,
      top: 0,
      targetWidth: 130,
      anchorX: "right",
      anchorY: "bottom"
    }
  );
  assert(
    rowNodeA.style.left === "80px"
      && rowNodeB.style.left === "140px"
      && rowNodeC.style.left === "130px",
    "row layout should preserve right anchoring across wrapped rows"
  );
  assert(
    rowNodeA.style.top === "20px"
      && rowNodeB.style.top === "20px"
      && rowNodeC.style.top === "60px"
      && rowNodeC.style.zIndex === "22",
    "row layout should preserve bottom anchoring and original index z order"
  );

  const columnNodeA = createCompactLayoutNode();
  const columnNodeB = createCompactLayoutNode();
  const columnNodeC = createCompactLayoutNode();
  layoutNodesByColumns(
    [columnNodeA, columnNodeB, columnNodeC],
    [
      { width: 50, height: 20 },
      { width: 60, height: 30 },
      { width: 70, height: 40 }
    ],
    {
      gap: 10,
      left: 0,
      top: 0,
      bottom: 100,
      targetHeight: 60,
      anchorY: "bottom"
    }
  );
  assert(
    columnNodeA.style.left === "0px"
      && columnNodeB.style.left === "0px"
      && columnNodeC.style.left === "70px",
    "column layout should preserve column width spacing"
  );
  assert(
    columnNodeA.style.top === "40px"
      && columnNodeB.style.top === "70px"
      && columnNodeC.style.top === "60px"
      && columnNodeC.style.zIndex === "22",
    "column layout should preserve bottom anchoring and original index z order"
  );

  const galleryNodeA = createCompactLayoutNode({ left: 0, top: 0, width: 40, height: 20 });
  const galleryNodeB = createCompactLayoutNode({ left: 120, top: 0, width: 40, height: 20, locked: true });
  const galleryNodeC = createCompactLayoutNode({ left: 240, top: 0, width: 40, height: 20 });
  let galleryMutation = null;
  assert(
    layoutNodesInCompactGallery([galleryNodeA, galleryNodeB, galleryNodeC], {
      gap: 8,
      recordUndoAction: (entry) => {
        galleryMutation = entry;
      },
      type: "test-gallery"
    }) === true,
    "compact gallery layout should record changed unlocked nodes"
  );
  assert(galleryMutation?.type === "test-gallery", "compact gallery layout should preserve mutation type");
  assert(galleryNodeB.style.left === "120px", "compact gallery layout should skip locked nodes");

  const stackNodeA = createCompactLayoutNode({ left: 12, top: 24, width: 40, height: 20 });
  const stackNodeB = createCompactLayoutNode({ left: 90, top: 90, width: 40, height: 20 });
  let stackMutation = null;
  assert(
    stackNodesByOffset([stackNodeA, stackNodeB], {
      offset: 18,
      recordUndoAction: (entry) => {
        stackMutation = entry;
      },
      type: "stack-test"
    }) === true,
    "stack layout should record changed node positions"
  );
  assert(
    stackNodeA.style.left === "12px"
      && stackNodeA.style.top === "24px"
      && stackNodeB.style.left === "30px"
      && stackNodeB.style.top === "42px"
      && stackNodeB.style.zIndex === "21",
    "stack layout should preserve anchor offset behavior"
  );
  assert(stackMutation?.type === "stack-test", "stack layout should preserve mutation type");

  function createLayoutWriterNode(classes = [], options = {}) {
    const frame = options.frame || { style: { aspectRatio: options.aspectRatio || "" } };
    const image = options.image || { naturalWidth: 0, naturalHeight: 0 };
    return {
      dataset: { ...(options.dataset || {}) },
      style: {
        width: options.width || "",
        minHeight: options.minHeight || "",
        height: options.height || ""
      },
      classList: {
        contains(name) {
          return classes.includes(name);
        }
      },
      querySelector(selector) {
        if (selector === ".image-frame") return classes.includes("node-image") ? frame : null;
        if (selector === ".model-frame") return classes.includes("node-model") ? frame : null;
        if (selector === ".image-frame img") return classes.includes("node-image") ? image : null;
        return null;
      },
      frame,
      image
    };
  }

  const ratioNode = createLayoutWriterNode(["node-image"], {
    dataset: { imageNaturalWidth: "400", imageNaturalHeight: "200" },
    aspectRatio: "1 / 1"
  });
  assert(getImageDisplayAspectRatio(ratioNode) === 2, "image display aspect ratio should prefer natural dimensions dataset");

  const imageWidthNode = createLayoutWriterNode(["node-image"], {
    dataset: { imageNaturalWidth: "400", imageNaturalHeight: "200" }
  });
  setNodeLayoutWidth(imageWidthNode, 101.4);
  assert(imageWidthNode.dataset.manualSize === "true", "layout width writer should mark manual size");
  assert(imageWidthNode.style.width === "101px", "layout width writer should round requested width");
  assert(imageWidthNode.frame.style.aspectRatio === "101 / 51", "layout width writer should update image frame ratio");
  assert(imageWidthNode.style.minHeight === "" && imageWidthNode.style.height === "", "layout width writer should clear image height styles");

  const imageHeightNode = createLayoutWriterNode(["node-image"], {
    dataset: { imageNaturalWidth: "400", imageNaturalHeight: "200" }
  });
  setNodeLayoutHeight(imageHeightNode, 50.2);
  assert(imageHeightNode.style.width === "100px", "layout height writer should compute image width from ratio");
  assert(imageHeightNode.frame.style.aspectRatio === "100 / 50", "layout height writer should update image frame ratio");
  assert(imageHeightNode.style.minHeight === "" && imageHeightNode.style.height === "", "layout height writer should clear image height styles");

  const plainSizeNode = createLayoutWriterNode([]);
  setNodeLayoutSize(plainSizeNode, 10, 70.6);
  assert(plainSizeNode.dataset.manualSize === "true", "layout size writer should mark manual size");
  assert(plainSizeNode.style.width === "24px", "layout size writer should clamp normal node width");
  assert(plainSizeNode.style.minHeight === "71px", "layout size writer should delegate normal node height");

  const modelHeightNode = createLayoutWriterNode(["node-model"], { aspectRatio: "16 / 9" });
  setNodeLayoutHeight(modelHeightNode, 12);
  assert(modelHeightNode.frame.style.aspectRatio === "auto", "layout height writer should reset model frame aspect ratio");
  assert(modelHeightNode.style.minHeight === "24px", "layout height writer should clamp model height");

  const imageSizeNode = createLayoutWriterNode(["node-image"], {
    dataset: { imageNaturalWidth: "400", imageNaturalHeight: "200" }
  });
  setNodeLayoutSize(imageSizeNode, 80, 40);
  assert(imageSizeNode.style.width === "80px", "layout size writer should preserve image area with ratio");
  assert(imageSizeNode.frame.style.aspectRatio === "80 / 40", "layout size writer should update image frame ratio");

  const imageFrameSizeNode = createLayoutWriterNode(["node-image"]);
  setNodeLayoutFrameSize(imageFrameSizeNode, 90.6, 45.2);
  assert(imageFrameSizeNode.style.width === "91px", "layout frame size writer should round image width");
  assert(imageFrameSizeNode.frame.style.aspectRatio === "91 / 45", "layout frame size writer should write image frame ratio");
  assert(imageFrameSizeNode.style.minHeight === "" && imageFrameSizeNode.style.height === "", "layout frame size writer should clear image height styles");

  const normalizeWidthNodeA = createLayoutWriterNode([], { width: "120px", minHeight: "60px" });
  const normalizeWidthNodeB = createLayoutWriterNode([], { width: "240px", minHeight: "60px" });
  let normalizeWidthMutation = null;
  assert(
    normalizeNodesByMode([normalizeWidthNodeA, normalizeWidthNodeB], "width", (entry) => {
      normalizeWidthMutation = entry;
    }) === true,
    "normalize width command should record changed widths"
  );
  assert(
    normalizeWidthNodeA.style.width === "180px" && normalizeWidthNodeB.style.width === "180px",
    "normalize width command should set average width"
  );
  assert(normalizeWidthMutation?.type === "normalize-images", "normalize width command should preserve mutation type");

  const normalizeRatioNodeA = createLayoutWriterNode(["node-image"], {
    width: "120px",
    minHeight: "60px",
    dataset: { imageNaturalWidth: "120", imageNaturalHeight: "60" }
  });
  const normalizeRatioNodeB = createLayoutWriterNode(["node-image"], {
    width: "80px",
    minHeight: "80px",
    dataset: { imageNaturalWidth: "80", imageNaturalHeight: "80" }
  });
  let normalizeRatioMutation = null;
  assert(
    normalizeNodesByMode([normalizeRatioNodeA, normalizeRatioNodeB], "ratio", (entry) => {
      normalizeRatioMutation = entry;
    }) === true,
    "normalize ratio command should record changed frame sizes"
  );
  assert(
    normalizeRatioNodeA.frame.style.aspectRatio
      && normalizeRatioNodeB.frame.style.aspectRatio
      && normalizeRatioMutation?.type === "normalize-images",
    "normalize ratio command should update frame ratios and preserve mutation type"
  );

  const unchangedNormalizeNode = createLayoutWriterNode([], { width: "100px", minHeight: "50px" });
  assert(
    normalizeNodesByMode([unchangedNormalizeNode], "width", () => {}) === false,
    "normalize command should preserve single-node no-op behavior"
  );
  assert(
    normalizeNodesByMode([normalizeWidthNodeA, normalizeWidthNodeB], "unknown", () => {}) === false,
    "normalize command should reject unknown modes"
  );
} finally {
  globalThis.window = OriginalWindowForLayout;
}

const snapshotFrame = { style: { aspectRatio: "4 / 3" } };
const snapshotNode = {
  isConnected: true,
  dataset: { manualSize: "true" },
  style: {
    left: "10px",
    top: "20px",
    width: "300px",
    height: "",
    minHeight: "120px",
    zIndex: "5"
  },
  querySelector(selector) {
    if (selector === ".image-frame, .model-frame") return snapshotFrame;
    return null;
  }
};
const [capturedLayout] = snapshotLayoutNodes([snapshotNode]);
assert(capturedLayout.node === snapshotNode, "layout snapshot should preserve node reference");
assert(capturedLayout.left === "10px" && capturedLayout.top === "20px", "layout snapshot should capture position styles");
assert(capturedLayout.width === "300px" && capturedLayout.minHeight === "120px", "layout snapshot should capture size styles");
assert(capturedLayout.manualSize === "true", "layout snapshot should capture manual size dataset");
assert(capturedLayout.frameAspectRatio === "4 / 3", "layout snapshot should capture frame aspect ratio");

restoreLayoutNodes([{
  node: snapshotNode,
  left: "1px",
  top: "2px",
  width: "30px",
  height: "40px",
  minHeight: "50px",
  zIndex: "6",
  manualSize: undefined,
  frameAspectRatio: "16 / 9"
}]);
assert(snapshotNode.style.left === "1px" && snapshotNode.style.top === "2px", "layout restore should restore position styles");
assert(snapshotNode.style.width === "30px" && snapshotNode.style.height === "40px", "layout restore should restore size styles");
assert(snapshotNode.style.minHeight === "50px" && snapshotNode.style.zIndex === "6", "layout restore should restore min height and z index");
assert(snapshotNode.dataset.manualSize === undefined, "layout restore should delete missing manual size dataset");
assert(snapshotFrame.style.aspectRatio === "16 / 9", "layout restore should restore frame aspect ratio");
restoreLayoutNodes([{ node: { ...snapshotNode, isConnected: false }, left: "99px" }]);
assert(snapshotNode.style.left === "1px", "layout restore should ignore disconnected nodes");

const unchangedBefore = snapshotLayoutNodes([snapshotNode]);
let unchangedRecorded = false;
assert(recordLayoutMutation([snapshotNode], unchangedBefore, "noop-layout", () => {
  unchangedRecorded = true;
}) === false, "layout mutation recorder should reject unchanged snapshots");
assert(unchangedRecorded === false, "layout mutation recorder should not record unchanged snapshots");

const mutationBefore = snapshotLayoutNodes([snapshotNode]);
snapshotNode.style.left = "44px";
snapshotFrame.style.aspectRatio = "1 / 1";
let recordedMutation = null;
assert(recordLayoutMutation([snapshotNode], mutationBefore, "move-layout", (entry) => {
  recordedMutation = entry;
}) === true, "layout mutation recorder should accept changed snapshots");
assert(recordedMutation?.type === "move-layout", "layout mutation recorder should preserve mutation type");
recordedMutation.undo();
assert(snapshotNode.style.left === "1px", "layout mutation undo should restore before snapshot");
assert(snapshotFrame.style.aspectRatio === "16 / 9", "layout mutation undo should restore before frame ratio");
recordedMutation.redo();
assert(snapshotNode.style.left === "44px", "layout mutation redo should restore after snapshot");
assert(snapshotFrame.style.aspectRatio === "1 / 1", "layout mutation redo should restore after frame ratio");

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
const exportRectImage = { currentSrc: "/uploads/export.png" };
const exportRectFrame = {
  offsetWidth: 320,
  offsetHeight: 180,
  offsetLeft: 12,
  offsetTop: 18,
  querySelector(selector) {
    if (selector === "img") return exportRectImage;
    return null;
  }
};
const exportRectNode = {
  offsetWidth: 640,
  offsetHeight: 360,
  querySelector(selector) {
    if (selector === ".image-frame") return exportRectFrame;
    return null;
  }
};
const exportRect = getImageExportRect(exportRectNode, () => ({ x: 100, y: 200, width: 500, height: 400 }));
assert(exportRect.image === exportRectImage, "image export rect should preserve image reference");
assert(exportRect.x === 112 && exportRect.y === 218, "image export rect should offset frame from node bounds");
assert(exportRect.width === 320 && exportRect.height === 180, "image export rect should prefer frame dimensions");
const fallbackRect = getImageExportRect({
  offsetWidth: 0,
  offsetHeight: 0,
  querySelector(selector) {
    if (selector === ".image-frame") {
      return {
        offsetWidth: 0,
        offsetHeight: 0,
        offsetLeft: 0,
        offsetTop: 0,
        querySelector: () => exportRectImage
      };
    }
    return null;
  }
}, () => ({ x: 0, y: 0, width: 0, height: 0 }));
assert(fallbackRect.width === 1 && fallbackRect.height === 1, "image export rect should preserve minimum size fallback");
assert(getImageExportRect({ querySelector: () => null }, () => ({ x: 0, y: 0, width: 10, height: 10 })) === null, "image export rect should reject missing frames");
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
const OriginalURL = globalThis.URL;
const OriginalDocumentForDownload = globalThis.document;
const OriginalWindowForDownload = globalThis.window;
try {
  const downloadEvents = [];
  globalThis.URL = {
    createObjectURL(blob) {
      downloadEvents.push(["createObjectURL", blob]);
      return "blob:download-url";
    },
    revokeObjectURL(url) {
      downloadEvents.push(["revokeObjectURL", url]);
    }
  };
  globalThis.document = {
    body: {
      appendChild(link) {
        downloadEvents.push(["appendChild", link.href, link.download]);
      }
    },
    createElement(tagName) {
      assert(tagName === "a", "download helper should create an anchor");
      return {
        href: "",
        download: "",
        click() {
          downloadEvents.push(["click", this.href, this.download]);
        },
        remove() {
          downloadEvents.push(["remove", this.href, this.download]);
        }
      };
    }
  };
  globalThis.window = {
    setTimeout(callback, delay) {
      downloadEvents.push(["setTimeout", delay]);
      callback();
    }
  };
  downloadBlob("download-blob", "canvas.png");
  assert(JSON.stringify(downloadEvents) === JSON.stringify([
    ["createObjectURL", "download-blob"],
    ["appendChild", "blob:download-url", "canvas.png"],
    ["click", "blob:download-url", "canvas.png"],
    ["remove", "blob:download-url", "canvas.png"],
    ["setTimeout", 1000],
    ["revokeObjectURL", "blob:download-url"]
  ]), "download helper should preserve object URL download flow");
} finally {
  globalThis.URL = OriginalURL;
  globalThis.document = OriginalDocumentForDownload;
  globalThis.window = OriginalWindowForDownload;
}
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
const OriginalFileReader = globalThis.FileReader;
try {
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      this.result = `data:${blob}`;
      this.onload();
    }
  };
  assert(await blobToDataUrl("image/png;base64,abc") === "data:image/png;base64,abc", "blob data URL reader should resolve reader result");
  globalThis.FileReader = class {
    constructor() {
      this.error = new Error("read failed");
    }

    readAsDataURL() {
      this.onerror();
    }
  };
  let blobReadRejected = false;
  try {
    await blobToDataUrl("broken");
  } catch (error) {
    blobReadRejected = error.message === "read failed";
  }
  assert(blobReadRejected === true, "blob data URL reader should reject reader errors");
} finally {
  globalThis.FileReader = OriginalFileReader;
}
const OriginalImage = globalThis.Image;
const OriginalDocument = globalThis.document;
const OriginalWindow = globalThis.window;
try {
  const createdCanvases = [];
  let nextBlob = "rasterized-blob";
  let failNextImage = false;
  globalThis.window = { devicePixelRatio: 4 };
  globalThis.document = {
    createElement(tagName) {
      assert(tagName === "canvas", "SVG rasterizer should create a canvas");
      const calls = [];
      const canvas = {
        width: 0,
        height: 0,
        calls,
        getContext(type) {
          assert(type === "2d", "SVG rasterizer should request a 2d context");
          return {
            scale: (...args) => calls.push(["scale", ...args]),
            fillRect: (...args) => calls.push(["fillRect", ...args]),
            drawImage: (...args) => calls.push(["drawImage", ...args]),
            set fillStyle(value) {
              calls.push(["fillStyle", value]);
            }
          };
        },
        toBlob(callback, type, quality) {
          calls.push(["toBlob", type, quality]);
          callback(nextBlob);
        }
      };
      createdCanvases.push(canvas);
      return canvas;
    }
  };
  globalThis.Image = class {
    set src(value) {
      this.srcValue = value;
      if (failNextImage) {
        this.onerror();
      } else {
        this.onload();
      }
    }
  };

  const pngBlob = await rasterizeSvg("<svg><text>A&B</text></svg>", 2, 3, "png");
  assert(pngBlob === "rasterized-blob", "SVG rasterizer should resolve PNG blobs");
  assert(createdCanvases[0].width === 6 && createdCanvases[0].height === 9, "SVG rasterizer should clamp DPR scale to 3");
  assert(createdCanvases[0].calls.some((call) => JSON.stringify(call) === JSON.stringify(["toBlob", "image/png", 0.94])), "SVG rasterizer should request PNG output");

  const jpgBlob = await rasterizeSvg("<svg></svg>", 4, 5, "jpg");
  assert(jpgBlob === "rasterized-blob", "SVG rasterizer should resolve JPG blobs");
  assert(createdCanvases[1].calls.some((call) => JSON.stringify(call) === JSON.stringify(["fillStyle", "#ffffff"])), "SVG rasterizer should preserve JPG white background");
  assert(createdCanvases[1].calls.some((call) => JSON.stringify(call) === JSON.stringify(["fillRect", 0, 0, 4, 5])), "SVG rasterizer should fill JPG background bounds");
  assert(createdCanvases[1].calls.some((call) => JSON.stringify(call) === JSON.stringify(["toBlob", "image/jpeg", 0.94])), "SVG rasterizer should request JPEG output");

  nextBlob = null;
  let emptyRasterRejected = false;
  try {
    await rasterizeSvg("<svg></svg>", 1, 1, "png");
  } catch (error) {
    emptyRasterRejected = error.message === "Canvas export returned an empty blob";
  }
  assert(emptyRasterRejected === true, "SVG rasterizer should reject empty canvas blobs");

  nextBlob = "unused";
  failNextImage = true;
  let imageRasterRejected = false;
  try {
    await rasterizeSvg("<svg></svg>", 1, 1, "png");
  } catch (error) {
    imageRasterRejected = error.message === "Unable to render SVG export";
  }
  assert(imageRasterRejected === true, "SVG rasterizer should reject image load failures");
} finally {
  globalThis.Image = OriginalImage;
  globalThis.document = OriginalDocument;
  globalThis.window = OriginalWindow;
}

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
