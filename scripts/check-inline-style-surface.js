import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["index.html", "app.js", "src/client", "src/server"];
const SOURCE_EXTENSIONS = new Set([".html", ".js"]);

const BASELINE_MAX = {
  inlineAttribute: 9,
  styleSetAttribute: 7,
  styleProperty: 298,
  cssText: 1
};
const BASELINE_FILE_MAX = 52;

const ALLOWED_FILES = new Set([
  "src/client/features/agent/agent-actions.js",
  "src/client/features/agent/agent-ui.js",
  "src/client/features/agent/ai-core-interactions.js",
  "src/client/features/agent/ai-core-workspace.js",
  "src/client/features/agent/runtime/ai-core-workspace-controller.js",
  "src/client/features/agent/workflows/director-action-workflow.js",
  "src/client/features/agent/workflows/director-card-workflow.js",
  "src/client/features/ai/image-edit-actions.js",
  "src/client/features/canvas/canvas-geometry.js",
  "src/client/features/canvas/canvas-renderer.js",
  "src/client/features/canvas/canvas-toolbar.js",
  "src/client/features/canvas/canvas-viewport.js",
  "src/client/features/canvas/components/upload-choice-bubbles.js",
  "src/client/features/canvas/image-compare-modal.js",
  "src/client/features/canvas/image-crop.js",
  "src/client/features/canvas/image-text-panel.js",
  "src/client/features/canvas/node-controls.js",
  "src/client/features/canvas/node-creation.js",
  "src/client/features/canvas/node-factory.js",
  "src/client/features/canvas/runtime/canvas-view-state.js",
  "src/client/features/canvas/runtime/node-runtime-helpers.js",
  "src/client/features/canvas/shape-tool.js",
  "src/client/features/canvas/shape-toolbar-controller.js",
  "src/client/features/canvas/text-tool.js",
  "src/client/features/canvas/tool-bindings.js",
  "src/client/features/canvas/upload-nodes.js",
  "src/client/features/canvas/workflows/canvas-crop-workflow.js",
  "src/client/features/canvas/workflows/canvas-drawing-workflow.js",
  "src/client/features/canvas/workflows/canvas-expand-workflow.js",
  "src/client/features/canvas/workflows/canvas-menu-actions.js",
  "src/client/features/canvas/workflows/canvas-menu-clipboard-utils.js",
  "src/client/features/canvas/workflows/canvas-menu-layout-utils.js",
  "src/client/features/canvas/workflows/canvas-menu-node-utils.js",
  "src/client/features/canvas/workflows/eraser-workflow.js",
  "src/client/features/canvas/workflows/image-generator-result-utils.js",
  "src/client/features/canvas/workflows/image-generator-sizing-utils.js",
  "src/client/features/canvas/workflows/image-generator-workflow.js",
  "src/client/features/canvas/workflows/node-drag-workflow.js",
  "src/client/features/canvas/workflows/text-edit-workflow.js",
  "src/client/features/canvas/workflows/video-generator-position-utils.js",
  "src/client/features/canvas/workflows/viewport-workflow.js",
  "src/client/features/projects/snapshot.js",
  "src/client/features/workspace/asset-library/asset-library-context-menu.js",
  "src/client/features/workspace/chat/workflows/prompt-conversation-dom-utils.js",
  "src/client/features/workspace/chat/workflows/prompt-generation-metrics-utils.js",
  "src/client/features/workspace/chat/workflows/prompt-workflow.js",
  "src/client/features/workspace/home/components/home-inspiration-feed.js",
  "src/client/features/workspace/task-log/task-log-runtime.js",
  "src/client/features/workspace/taskbar/task-bar.js",
  "src/client/lib/compact-select.js",
  "src/client/lib/menu-position.js",
  "src/server/services/snapshot-safety.service.js"
]);

const PATTERNS = {
  inlineAttribute: /(?<![\w-])style\s*=/g,
  styleSetAttribute: /\.setAttribute\(\s*["']style["']/g,
  styleProperty: /\.style(?:\.|\[)/g,
  cssText: /\.style\.cssText\b/g
};

const totals = Object.fromEntries(Object.keys(PATTERNS).map((key) => [key, 0]));
const filesWithInlineStyle = [];
const errors = [];

for (const filePath of collectSourceFiles()) {
  const text = fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
  const counts = countMatches(text);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (!total) continue;

  filesWithInlineStyle.push({ filePath, total, counts });
  for (const [key, value] of Object.entries(counts)) {
    totals[key] += value;
  }
  if (!ALLOWED_FILES.has(filePath)) {
    errors.push(`Unexpected inline style dependency in ${filePath}`);
  }
}

for (const [key, max] of Object.entries(BASELINE_MAX)) {
  if (totals[key] > max) {
    errors.push(`${key} count increased: expected <= ${max}, got ${totals[key]}`);
  }
}

if (filesWithInlineStyle.length > BASELINE_FILE_MAX) {
  errors.push(`Inline style file count increased: expected <= ${BASELINE_FILE_MAX}, got ${filesWithInlineStyle.length}`);
}

if (errors.length) {
  console.error("Inline style surface check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(`Current totals: ${formatTotals(totals)}`);
  process.exit(1);
}

console.log(`Inline style surface checks passed. files=${filesWithInlineStyle.length} ${formatTotals(totals)}`);

function collectSourceFiles() {
  return SCAN_ROOTS.flatMap((entry) => walk(entry)).sort();
}

function walk(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return [];

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(path.extname(relativePath)) ? [toPosixPath(relativePath)] : [];
  }

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = path.join(relativePath, entry.name);
    return entry.isDirectory() || entry.isFile() ? walk(childPath) : [];
  });
}

function countMatches(text) {
  return Object.fromEntries(
    Object.entries(PATTERNS).map(([key, pattern]) => [key, (text.match(pattern) || []).length])
  );
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function formatTotals(value) {
  return Object.entries(value).map(([key, count]) => `${key}=${count}`).join(" ");
}
