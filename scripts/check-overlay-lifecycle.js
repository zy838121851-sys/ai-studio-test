import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const selectionWorkflow = read("src/client/features/canvas/workflows/selection-workflow.js");
assert(
  selectionWorkflow.includes("canvas:selection-changed"),
  "selection workflow must broadcast canvas:selection-changed"
);
assert(
  selectionWorkflow.includes("dispatchSelectionChanged(null)") &&
  selectionWorkflow.includes("dispatchSelectionChanged(node)") &&
  selectionWorkflow.includes("dispatchSelectionChanged(nodes[nodes.length - 1] || null)"),
  "selection workflow must broadcast clear, single-select, and multi-select changes"
);

const projectWorkflow = read("src/client/features/projects/workflows/project-workflow.js");
assert(
  projectWorkflow.includes("canvas:context-overlay-close") &&
  projectWorkflow.includes('reason: "view-change"') &&
  projectWorkflow.includes('reason: "canvas-reset"'),
  "project workflow must close context overlays on view changes and canvas resets"
);

const generatorWorkflow = read("src/client/features/canvas/workflows/image-generator-workflow.js");
assert(
  generatorWorkflow.includes("canvas:selection-changed") &&
  generatorWorkflow.includes("handleGeneratorSelectionChange"),
  "image generator must react to selection changes"
);
assert(
  generatorWorkflow.includes("canvas:context-overlay-close") &&
  generatorWorkflow.includes("hideGeneratorPopover();"),
  "image generator must close on context overlay close"
);

const imageEditWorkflow = read("src/client/features/canvas/workflows/image-edit-workflow.js");
assert(
  imageEditWorkflow.includes("canvas:selection-changed") &&
  imageEditWorkflow.includes("handleImageEditSelectionChange"),
  "image edit popover must react to selection changes"
);
assert(
  imageEditWorkflow.includes("canvas:context-overlay-close") &&
  imageEditWorkflow.includes("hideImageEditPopover({ preserveDraft: true })"),
  "image edit popover must close on context overlay close while preserving draft"
);

console.log("Overlay lifecycle checks passed.");
