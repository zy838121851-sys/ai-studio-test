import { readFileSync } from "node:fs";

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

assertIncludes(menuActions, "export function bindCanvasMenuActions", "canvas menu must expose bindCanvasMenuActions");
assertIncludes(menuActions, "export function runCanvasImageMenuCommand", "canvas image command wrapper must stay exported");
assertIncludes(menuActions, "export function runCanvasObjectMenuCommand", "canvas object command runner must stay exported");
assertIncludes(menuActions, "const CANVAS_NODE_SELECTOR = \".node-card, .canvas-object\"", "canvas menu node selector must include node cards and canvas objects");

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

console.log("Canvas menu action checks passed.");
