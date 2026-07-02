import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

const projectWorkflow = read("src/client/features/projects/workflows/project-workflow.js");
assert(
  projectWorkflow.includes("let generationAutosaveQueue = Promise.resolve();"),
  "project workflow must initialize a generation autosave queue"
);
assert(
  projectWorkflow.includes("function saveCurrentProjectAfterGeneration()"),
  "project workflow must expose generation autosave"
);
assert(
  projectWorkflow.includes("generationAutosaveQueue") && projectWorkflow.includes(".then(() => saveCurrentProject({"),
  "generation autosave must serialize saveCurrentProject calls"
);
assert(
  projectWorkflow.includes("saveCurrentProjectAfterGeneration,"),
  "project workflow must export generation autosave"
);

const promptWorkflow = read("src/client/features/workspace/chat/workflows/prompt-workflow.js");
assert(
  promptWorkflow.includes("saveCurrentProjectAfterGeneration = saveCurrentProject"),
  "prompt workflow must accept generation autosave"
);
assert(
  promptWorkflow.includes("await saveCurrentProjectAfterGeneration?.();"),
  "prompt workflow must autosave after successful image generation"
);
assert(
  promptWorkflow.includes("async function commitGeneratedProjectPatch(patch)") &&
    promptWorkflow.includes("updateActiveProject(patch);") &&
    promptWorkflow.includes("await saveCurrentProjectAfterGeneration?.();") &&
    promptWorkflow.includes("onProjectTitleRefresh();"),
  "prompt workflow must keep generated project update, autosave, and title refresh sequenced"
);

const generatorWorkflow = read("src/client/features/canvas/workflows/image-generator-workflow.js");
assert(
  generatorWorkflow.includes("saveCurrentProjectAfterGeneration = saveCurrentProject"),
  "image generator must accept generation autosave"
);
assert(
  count(generatorWorkflow, "await saveCurrentProjectAfterGeneration?.();") >= 2,
  "image generator must autosave both single-node and batch success paths"
);
assert(
  !generatorWorkflow.includes("await saveCurrentProject?.();"),
  "image generator must not save failed previews through the old save call"
);

const taskbar = read("src/client/features/workspace/taskbar/task-bar.js");
assert(
  taskbar.includes("saveCurrentProjectAfterGeneration = null") &&
  taskbar.includes("await saveCurrentProjectAfterGeneration?.();"),
  "taskbar generation must autosave after successful image replacement"
);

const directorWorkflow = read("src/client/features/agent/workflows/director-action-workflow.js");
assert(
  directorWorkflow.includes("saveCurrentProjectAfterGeneration = null") &&
  directorWorkflow.includes("await saveCurrentProjectAfterGeneration?.();"),
  "director image action must autosave after successful image replacement"
);

const imageEditCommand = read("src/client/features/ai/runtime/image-edit-command.js");
assert(
  imageEditCommand.includes("(result?.imageUrl || result?.videoUrl) && !result?.error") &&
  imageEditCommand.includes("await saveCurrentProjectAfterGeneration?.();"),
  "image edit command must autosave only successful image outputs"
);

const uploadWorkflow = read("src/client/features/canvas/workflows/generation-upload-workflow.js");
const canvasGenerationBootstrap = read("src/client/features/canvas/runtime/canvas-generation-bootstrap.js");
assert(
  uploadWorkflow.includes("saveCurrentProjectAfterGeneration = null") &&
  uploadWorkflow.includes("asset?.url && node.isConnected") &&
  uploadWorkflow.includes("saveCurrentProjectAfterGeneration?.();"),
  "uploaded canvas assets must autosave after persistent asset URLs are applied"
);
assert(
  canvasGenerationBootstrap.includes("saveCurrentProjectAfterGeneration: services.saveCurrentProjectAfterGeneration"),
  "canvas upload workflow must receive generation autosave service"
);

const canvasStatusCss = read("styles/legacy-ai-core-workspace.css");
assert(
  canvasStatusCss.includes("body[data-view=\"canvas\"] .project-header") &&
  canvasStatusCss.includes("z-index: 14000") &&
  canvasStatusCss.includes("body[data-view=\"canvas\"] .project-header p.show"),
  "canvas save status must be visible in the top-left project header"
);

console.log("Generation autosave checks passed.");
