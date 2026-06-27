import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(file, patterns) {
  const source = read(file);
  for (const pattern of patterns) {
    if (!source.includes(pattern)) {
      throw new Error(`${file} is missing ${pattern}`);
    }
  }
}

assertContains("src/client/features/projects/components/project-library.js", [
  "data-project-select-mode",
  "data-project-bulk-delete",
  "library-card-check",
  "selectedProjectIds"
]);

const projectLibrarySource = read("src/client/features/projects/components/project-library.js");
for (const removedPattern of [
  "data-library-mode",
  "data-library-step",
  "project-stack",
  "project-timeline",
  "renderLibraryViewSwitch",
  "renderProjectStack"
]) {
  if (projectLibrarySource.includes(removedPattern)) {
    throw new Error(`project-library.js should not include removed stack UI marker ${removedPattern}`);
  }
}

assertContains("src/client/features/projects/workflows/project-workflow.js", [
  "selectedProjectIds",
  "toggleProjectSelection",
  "toggleAllProjectSelection",
  "deleteSelectedProjects"
]);

assertContains("src/client/features/workspace/home/home-library-interactions.js", [
  "data-project-select-mode",
  "data-project-select-all",
  "data-project-bulk-delete",
  "toggleProjectSelection"
]);

const homeInteractionsSource = read("src/client/features/workspace/home/home-library-interactions.js");
for (const removedPattern of ["data-library-mode", "data-library-step", ".project-stack", ".project-timeline"]) {
  if (homeInteractionsSource.includes(removedPattern)) {
    throw new Error(`home-library-interactions.js should not include removed stack interaction ${removedPattern}`);
  }
}

assertContains("src/client/features/workspace/runtime/launch-actions-config.js", [
  "setProjectSelectionMode",
  "toggleProjectSelection",
  "toggleAllProjectSelection",
  "deleteSelectedProjects"
]);

assertContains("src/client/features/workspace/asset-library/asset-panel.js", [
  "data-asset-select-mode",
  "data-asset-bulk-delete",
  "asset-card-check",
  "selectedAssetIds"
]);

assertContains("src/client/features/workspace/asset-library/asset-library-runtime.js", [
  "selectedAssetIds",
  "toggleAssetSelection",
  "toggleAllAssetSelection",
  "deleteSelectedAssets"
]);

assertContains("styles/workspace-layout.css", [
  ".library-selection-bar",
  ".library-card-check",
  ".library-small-card.selected"
]);

assertContains("styles/legacy-assets.css", [
  ".asset-selection-bar",
  ".asset-card-check",
  ".asset-pinterest-pin.selected"
]);

console.log("Library bulk select checks passed");
