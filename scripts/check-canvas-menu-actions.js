import { readFileSync } from "node:fs";
import {
  areLayoutSnapshotsEqual,
  getLayoutUnionBounds,
  getNodeSortIndex,
  getRectUnionBounds,
  getViewportUnionRect,
  parseAspectRatio
} from "../src/client/features/canvas/workflows/canvas-menu-layout-utils.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, value, message) {
  assert(source.includes(value), message);
}

const menuActions = read("src/client/features/canvas/workflows/canvas-menu-actions.js");
const menuLayoutUtils = read("src/client/features/canvas/workflows/canvas-menu-layout-utils.js");

assertIncludes(menuActions, "export function bindCanvasMenuActions", "canvas menu must expose bindCanvasMenuActions");
assertIncludes(menuActions, "export function runCanvasImageMenuCommand", "canvas image command wrapper must stay exported");
assertIncludes(menuActions, "export function runCanvasObjectMenuCommand", "canvas object command runner must stay exported");
assertIncludes(menuActions, 'from "./canvas-menu-layout-utils.js"', "canvas menu must import layout utility helpers");
assertIncludes(menuActions, "const CANVAS_NODE_SELECTOR = \".node-card, .canvas-object\"", "canvas menu node selector must include node cards and canvas objects");
assertIncludes(menuLayoutUtils, "export function areLayoutSnapshotsEqual", "canvas layout snapshot equality must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getLayoutUnionBounds", "canvas layout union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getNodeSortIndex", "canvas node sort index must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getRectUnionBounds", "canvas rect union bounds must live in layout utils");
assertIncludes(menuLayoutUtils, "export function getViewportUnionRect", "canvas viewport union rect must live in layout utils");
assertIncludes(menuLayoutUtils, "export function parseAspectRatio", "canvas aspect ratio parsing must live in layout utils");

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
assertIncludes(menuActions, "x: point.x + 24", "clipboard paste must preserve x offset");
assertIncludes(menuActions, "y: point.y + 24", "clipboard paste must preserve y offset");
assertIncludes(menuActions, 'pasted.dataset.locked = "false"', "clipboard paste must unlock pasted nodes");

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

console.log("Canvas menu action checks passed.");
