import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const EXPECTED_INDEX_STYLESHEET = "./styles.css";
const EXPECTED_STYLES_IMPORTS = [
  "./styles/globals.css",
  "./styles/workspace.css",
  "./styles/components.css",
  "./styles/image-compare.css",
  "./styles/task-log.css",
  "./styles/legacy-split.css"
];
const EXPECTED_WORKSPACE_IMPORTS = [
  "./workspace-layout.css",
  "./features/auth.css",
  "./features/home.css",
  "./features/project-library.css"
];
const EXPECTED_LEGACY_SPLIT_IMPORTS = [
  "./legacy-base.css",
  "./features/assets.css",
  "./legacy-canvas.css",
  "./legacy-canvas-visual.css",
  "./features/chat.css",
  "./legacy-chat.css",
  "./features/node.css",
  "./legacy-overrides.css",
  "./legacy-compact-controls.css",
  "./legacy-rail-polish.css",
  "./legacy-light-refinements.css",
  "./legacy-theme-ios.css",
  "./legacy-theme-sync.css",
  "./menu-select-overrides.css"
];
const EXPECTED_LEGACY_BASE_IMPORTS = [];
const ALLOWED_UNREACHABLE_CSS = [
  "styles/legacy-node.css"
];
const EXPECTED_PROJECT_LIBRARY_SELECTORS = [
  ".library-shell",
  ".library-title",
  ".project-grid",
  ".library-page-header",
  ".project-card-board",
  ".library-small-card",
  "body[data-view=\"library\"] .project-card-board"
];
const EXPECTED_HOME_SELECTORS = [
  "body.app-booting",
  ".home-stage",
  ".home-prompt",
  ".home-model-picker",
  ".home-history",
  ".home-masonry-feed",
  "@keyframes homeBootSkeleton"
];
const EXPECTED_AUTH_SELECTORS = [
  ".auth-entry",
  ".auth-account-popover",
  ".credit-detail-dialog",
  ".credit-profile-card",
  ".auth-dialog",
  ".auth-form",
  ".auth-submit"
];
const EXPECTED_ASSET_SELECTORS = [
  ".floating-library",
  ".upload-asset",
  ".asset-list",
  ".assets-page-toolbar",
  ".assets-page-list",
  "body[data-view=\"assetsPage\"] .assets-page-view",
  "body[data-view=\"assetsPage\"] .simple-page-shell",
  ".asset-pinterest-shell",
  ".asset-pinterest-board",
  ".asset-pinterest-pin.asset-item",
  ".asset-pinterest-empty",
  ".asset-board-bar",
  ".asset-board-card",
  ".asset-board-cover",
  ".asset-item",
  ".asset-thumb",
  ".asset-save-popover",
  ".canvas-asset-board-popover",
  ".asset-save-section",
  ".asset-save-new-board",
  "body[data-view=\"assetsPage\"] .asset-pinterest-shell",
  "body[data-view=\"assetsPage\"] .asset-pinterest-stats",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  "body[data-view=\"assetsPage\"] .asset-card-context-menu",
  ".asset-picker-popover",
  ".asset-preview-overlay",
  ".asset-canvas-picker"
];
const EXPECTED_CHAT_SELECTORS = [
  ".conversation-history-popover",
  ".conversation-history-popover[hidden]",
  ".conversation-history-list",
  ".conversation-history-item",
  ".conversation-history-empty"
];
const EXPECTED_LEGACY_CANVAS_SELECTORS = [
  ".canvas-area",
  ".tool-rail",
  ".add-node-menu",
  ".canvas-context-menu",
  ".selection-action-bar",
  ".selection-color-swatch",
  ".image-edit-popover",
  ".video-generator-popover"
];
const EXPECTED_LEGACY_NODE_SELECTORS = [];
const EXPECTED_NODE_BASE_SELECTORS = [
  ".node-card",
  ".resize-handle",
  ".node-card.node-group",
  ".node-expand",
  ".node-download"
];
const EXPECTED_NODE_IMAGE_EDIT_SELECTORS = [
  ".node-image.cropping",
  ".node-image.expanding",
  ".node-crop-layer",
  ".crop-box",
  ".crop-actions",
  ".image-expand-box",
  ".image-expand-source",
  ".image-expand-actions",
  ".image-expand-prompt-field",
  ".image-expand-action-row"
];
const EXPECTED_NODE_STATE_SELECTORS = [
  ".node-card.node-zoomed",
  ".node-loading-image.node-zoomed",
  ".node-card.selected",
  ".source-badge",
  ".node-label",
  "@keyframes sourcePulse"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SELECTORS = [
  ".image-node-toolbar",
  ".image-toolbar-menu",
  ".image-toolbar-upscale-controls",
  ".canvas-asset-savebar",
  ".canvas-asset-board-select",
  ".canvas-asset-save-submit",
  ".image-toolbar-label",
  ".image-toolbar-compare"
];
const EXPECTED_NODE_SELECTORS = [
  ".image-text-panel",
  ".image-text-status",
  ".image-text-list",
  ".image-lightbox",
  ".image-lightbox-close",
  ".node-card.has-stack::after",
  ".stack-toggle",
  ".stack-tray",
  ".node-director",
  ".director-tile",
  ".node-video",
  ".image-frame",
  ".generation-frame",
  ".node-image-generator",
  ".image-generator-frame",
  ".image-generator-panel",
  ".image-generator-panel.image-edit-popover-inline",
  ".image-generator-bottom.edit-actions",
  ".media-preview",
  ".model-preview",
  ".model-viewer",
  ".model-viewer-mode-toggle",
  ".cube-scene",
  ".video-preview",
  ".bottom-controls",
  "@keyframes spinCube"
];
const EXPECTED_LEGACY_CHAT_SELECTORS = [
  ".chat-panel",
  ".chat-float",
  ".chat-log",
  ".message",
  ".image-message",
  ".agent-result-card",
  ".composer",
  ".composer-actions"
];

const errors = [];

function readText(filePath) {
  return fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
}

function stripQuery(value = "") {
  return String(value || "").split("?")[0];
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function fail(message) {
  errors.push(message);
}

function parseCssImports(filePath) {
  const text = readText(filePath);
  const imports = [];
  const importPattern = /@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;/g;
  let match;

  while ((match = importPattern.exec(text))) {
    imports.push(stripQuery(match[1]));
  }

  return imports;
}

function assertListEqual(label, actual, expected) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail(`${label} import order changed.\nexpected:\n${expected.join("\n")}\nactual:\n${actual.join("\n")}`);
  }
}

function assertFileExists(filePath) {
  if (!fs.existsSync(path.resolve(ROOT, filePath))) {
    fail(`${filePath} is missing`);
  }
}

function checkIndexStylesheet() {
  const html = readText("index.html");
  const stylesheetPattern = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const stylesheets = [];
  let match;

  while ((match = stylesheetPattern.exec(html))) {
    stylesheets.push(stripQuery(match[1]));
  }

  assertListEqual("index.html stylesheet", stylesheets, [EXPECTED_INDEX_STYLESHEET]);
}

function checkImportedFilesExist(imports, baseDir) {
  imports.forEach((specifier) => {
    const filePath = path.join(baseDir, specifier);
    assertFileExists(filePath);
  });
}

function collectCssFiles(dirPath) {
  const entries = fs.readdirSync(path.resolve(ROOT, dirPath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(toPosixPath(entryPath));
    }
  }

  return files.sort();
}

function resolveCssImport(importerPath, specifier) {
  if (!specifier.startsWith(".")) return "";
  const importerDir = path.dirname(importerPath);
  const resolvedPath = path.normalize(path.join(importerDir, specifier));
  return toPosixPath(resolvedPath);
}

function buildReachableCssGraph(entryPath = "styles.css") {
  const reachable = new Set();
  const stack = [entryPath];

  while (stack.length) {
    const filePath = toPosixPath(stack.pop());
    if (reachable.has(filePath)) continue;
    reachable.add(filePath);

    for (const specifier of parseCssImports(filePath)) {
      const resolved = resolveCssImport(filePath, specifier);
      if (!resolved) continue;
      assertFileExists(resolved);
      if (!reachable.has(resolved)) stack.push(resolved);
    }
  }

  return reachable;
}

function checkCssReachability() {
  const reachable = buildReachableCssGraph();
  const allowedUnreachable = new Set(ALLOWED_UNREACHABLE_CSS);
  const cssFiles = ["styles.css", ...collectCssFiles("styles")];
  const unexpectedUnreachable = cssFiles
    .filter((filePath) => !reachable.has(filePath) && !allowedUnreachable.has(filePath));
  const importedCompatibilityShims = ALLOWED_UNREACHABLE_CSS
    .filter((filePath) => reachable.has(filePath));

  if (unexpectedUnreachable.length) {
    fail(`Unexpected unreachable CSS files:\n${unexpectedUnreachable.join("\n")}`);
  }
  if (importedCompatibilityShims.length) {
    fail(`Compatibility shim CSS files should stay outside the active entry graph:\n${importedCompatibilityShims.join("\n")}`);
  }
}

function checkFileContains(filePath, snippets) {
  const text = readText(filePath);
  snippets.forEach((snippet) => {
    if (!text.includes(snippet)) {
      fail(`${filePath} is missing expected snippet: ${snippet}`);
    }
  });
}

const stylesImports = parseCssImports("styles.css");
const workspaceImports = parseCssImports("styles/workspace.css");
const legacySplitImports = parseCssImports("styles/legacy-split.css");
const legacyBaseImports = parseCssImports("styles/legacy-base.css");

checkIndexStylesheet();
assertListEqual("styles.css", stylesImports, EXPECTED_STYLES_IMPORTS);
assertListEqual("styles/workspace.css", workspaceImports, EXPECTED_WORKSPACE_IMPORTS);
assertListEqual("styles/legacy-split.css", legacySplitImports, EXPECTED_LEGACY_SPLIT_IMPORTS);
assertListEqual("styles/legacy-base.css", legacyBaseImports, EXPECTED_LEGACY_BASE_IMPORTS);
checkImportedFilesExist(stylesImports, ".");
checkImportedFilesExist(workspaceImports, "styles");
checkImportedFilesExist(legacySplitImports, "styles");
checkCssReachability();
checkFileContains("styles/features/auth.css", EXPECTED_AUTH_SELECTORS);
checkFileContains("styles/features/assets.css", EXPECTED_ASSET_SELECTORS);
checkFileContains("styles/features/chat.css", EXPECTED_CHAT_SELECTORS);
checkFileContains("styles/features/home.css", EXPECTED_HOME_SELECTORS);
checkFileContains("styles/features/node-base.css", EXPECTED_NODE_BASE_SELECTORS);
checkFileContains("styles/features/node-image-edit.css", EXPECTED_NODE_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/features/node-state.css", EXPECTED_NODE_STATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar.css", EXPECTED_NODE_IMAGE_TOOLBAR_SELECTORS);
checkFileContains("styles/features/node.css", EXPECTED_NODE_SELECTORS);
checkFileContains("styles/features/project-library.css", EXPECTED_PROJECT_LIBRARY_SELECTORS);
checkFileContains("styles/legacy-canvas.css", EXPECTED_LEGACY_CANVAS_SELECTORS);
checkFileContains("styles/legacy-node.css", EXPECTED_LEGACY_NODE_SELECTORS);
checkFileContains("styles/legacy-chat.css", EXPECTED_LEGACY_CHAT_SELECTORS);

if (errors.length > 0) {
  console.error("Style entry check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Style entry checks passed.");
