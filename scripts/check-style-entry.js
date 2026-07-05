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
const EXPECTED_LEGACY_THEME_SYNC_IMPORTS = [
  "./legacy-theme-sync-base.css",
  "./legacy-theme-sync-surfaces.css",
  "./legacy-theme-sync-image-edit.css",
  "./legacy-theme-sync-crop-expand.css",
  "./legacy-theme-sync-media-edit.css",
  "./legacy-theme-sync-node-media.css",
  "./legacy-theme-sync-compact-select.css",
  "./legacy-theme-sync-model-preference.css",
  "./legacy-theme-sync-credit-submit.css"
];
const EXPECTED_LEGACY_CANVAS_IMPORTS = [
  "./legacy-canvas-shell.css",
  "./legacy-canvas-image-edit.css",
  "./legacy-canvas-add-node.css",
  "./legacy-canvas-choice-overlays.css",
  "./legacy-canvas-world.css",
  "./legacy-canvas-video-generator.css",
  "./legacy-canvas-project-header.css",
  "./legacy-canvas-library.css"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_IMPORTS = [
  "./legacy-canvas-visual-shape-tools.css",
  "./legacy-canvas-visual-media.css",
  "./legacy-canvas-visual-shell.css"
];
const EXPECTED_NODE_IMPORTS = [
  "./node-base.css",
  "./node-image-edit.css",
  "./node-state.css",
  "./node-image-toolbar.css",
  "./node-image-panels.css",
  "./node-stack.css",
  "./node-director.css",
  "./node-media.css",
  "./node-generation.css",
  "./node-image-generator.css",
  "./node-preview.css"
];
const EXPECTED_ASSET_IMPORTS = [
  "./assets-page.css",
  "./assets-board.css",
  "./assets-save.css",
  "./assets-picker.css",
  "./assets-canvas-picker.css",
  "./assets-context-menu.css",
  "./assets-pinterest.css"
];
const EXPECTED_ASSET_PINTEREST_IMPORTS = [
  "./assets-pinterest-board.css",
  "./assets-pinterest-shell.css",
  "./assets-pinterest-board-refresh.css",
  "./assets-pinterest-pin.css"
];
const EXPECTED_HOME_IMPORTS = [
  "./home-history.css",
  "./home-community.css",
  "./home-shell.css"
];
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
  "@media (max-width: 1100px)",
  "@media (max-width: 760px)",
  ".home-prompt",
  ".home-model-picker"
];
const EXPECTED_HOME_SHELL_SELECTORS = [
  "body.app-booting",
  ".home-stage",
  ".home-prompt",
  ".home-model-picker",
  ".home-file-preview",
  ".home-model-menu",
  ".home-send",
  "@keyframes homeBootSkeleton",
  "@keyframes homeSendOut",
  "@keyframes canvasEnterSoft",
  "@keyframes chatEnterSoft"
];
const EXPECTED_HOME_HISTORY_SELECTORS = [
  ".home-history",
  ".home-history-trigger",
  ".home-history-grid",
  ".home-history-card",
  ".home-history-delete",
  ".project-preview-fallback"
];
const EXPECTED_HOME_COMMUNITY_SELECTORS = [
  ".home-community-section",
  ".home-channel-shell",
  ".home-channel-strip",
  ".home-channel-scroll",
  ".home-masonry-feed",
  ".home-masonry-card",
  "@keyframes masonryPlaceholderSweep",
  ".home-back-top",
  ".home-inspiration-grid",
  ".inspiration-card"
];
const EXPECTED_AUTH_IMPORTS = [
  "./auth-account.css"
];
const EXPECTED_AUTH_SELECTORS = [
  ".credit-detail-dialog",
  ".credit-profile-card",
  ".auth-dialog",
  ".auth-form",
  ".auth-submit"
];
const EXPECTED_AUTH_ACCOUNT_SELECTORS = [
  ".auth-entry",
  ".auth-entry-button",
  ".auth-entry.is-authenticated .auth-entry-button",
  ".auth-account-popover",
  ".auth-account-card",
  ".auth-points-row",
  ".auth-menu-list"
];
const EXPECTED_ASSET_PAGE_SELECTORS = [
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
  ".asset-pinterest-empty"
];
const EXPECTED_ASSET_BOARD_SELECTORS = [
  ".asset-board-bar",
  ".asset-board-card",
  ".asset-board-cover",
  ".asset-item",
  ".asset-thumb",
  ".asset-empty"
];
const EXPECTED_ASSET_SAVE_SELECTORS = [
  ".asset-save-popover",
  ".canvas-asset-board-popover",
  ".asset-save-section",
  ".asset-save-new-board"
];
const EXPECTED_ASSET_PICKER_SELECTORS = [
  ".asset-picker-popover",
  ".asset-picker-card",
  ".asset-picker-item",
  ".asset-preview-overlay",
  ".asset-preview-dialog"
];
const EXPECTED_ASSET_CANVAS_PICKER_SELECTORS = [
  ".asset-canvas-picker",
  ".asset-canvas-picker-card",
  ".asset-canvas-picker-project",
  ".asset-canvas-picker-thumb",
  ".asset-canvas-picker-meta"
];
const EXPECTED_ASSET_CONTEXT_MENU_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-card-context-menu",
  "body[data-view=\"assetsPage\"] .asset-card-context-menu[hidden]",
  "body[data-view=\"assetsPage\"] .asset-card-context-icon",
  "body[data-view=\"assetsPage\"] .asset-card-context-submenu",
  "body[data-view=\"assetsPage\"] .asset-card-context-submenu-panel"
];
const EXPECTED_ASSET_PINTEREST_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  ".asset-selection-bar"
];
const EXPECTED_ASSET_PINTEREST_SHELL_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-shell",
  "body[data-view=\"assetsPage\"] .asset-pinterest-profile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-upload",
  "body[data-view=\"assetsPage\"] .asset-pinterest-stats",
  "body[data-view=\"assetsPage\"] .asset-stat-card",
  "body[data-view=\"assetsPage\"] .asset-pinterest-tabs",
  "body[data-view=\"assetsPage\"] .asset-pinterest-section-title",
  "body[data-view=\"assetsPage\"] .asset-pinterest-back"
];
const EXPECTED_ASSET_PINTEREST_BOARD_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-profile",
  ".asset-pinterest-board-grid",
  ".asset-pinterest-board-cover-large",
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.asset-item",
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty",
  ".floating-library .asset-item"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-tile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large",
  "body[data-view=\"assetsPage\"] .asset-board-cover-cell",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-create-card",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-title",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-delete"
];
const EXPECTED_ASSET_PINTEREST_PIN_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.asset-item",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-thumb",
  "body[data-view=\"assetsPage\"] .asset-card-check",
  "body[data-view=\"assetsPage\"] .asset-image-placeholder",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-meta",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-actions",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-delete",
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty",
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty-actions"
];
const EXPECTED_ASSET_SELECTORS = [];
const EXPECTED_CHAT_SELECTORS = [
  ".conversation-history-popover",
  ".conversation-history-popover[hidden]",
  ".conversation-history-list",
  ".conversation-history-item",
  ".conversation-history-empty"
];
const EXPECTED_LEGACY_THEME_SYNC_BASE_SELECTORS = [
  "body[data-theme=\"light\"]",
  "body[data-theme=\"dark\"]",
  "body[data-theme=\"dark\"] .canvas-area",
  ".theme-switch",
  ".theme-track",
  ".theme-orb",
  ".theme-sun"
];
const EXPECTED_LEGACY_THEME_SYNC_SURFACES_SELECTORS = [
  ".project-header",
  ".canvas-context-menu button",
  ".image-node-toolbar",
  ".asset-generation-toolbar",
  ".composer",
  "#chatModelSelect"
];
const EXPECTED_LEGACY_THEME_SYNC_IMAGE_EDIT_SELECTORS = [
  ".image-edit-popover",
  "#imageGeneratorPopover [data-generator-model]",
  "#imageGeneratorPopover .generator-select-wrap[data-generator-select-kind=\"model\"]",
  "#imageGeneratorPopover .image-generator-reference-thumb",
  "#imageEditCancel"
];
const EXPECTED_LEGACY_THEME_SYNC_SELECTORS = [];
const EXPECTED_LEGACY_THEME_SYNC_CREDIT_SUBMIT_SELECTORS = [
  ".home-send.credit-submit-button",
  "#imageEditSubmit.credit-submit-button",
  "#imageGeneratorPopover [data-generator-submit].credit-submit-button",
  ".composer-actions .send.credit-submit-button",
  ".credit-submit-cost",
  ".credit-submit-bolt",
  ".credit-submit-button.is-credit-quote-error .credit-submit-cost"
];
const EXPECTED_LEGACY_THEME_SYNC_CROP_EXPAND_SELECTORS = [
  ".canvas-context-menu button:first-child",
  ".crop-actions:not(.image-expand-actions)",
  ".image-expand-actions",
  ".crop-actions:not(.image-expand-actions) .crop-confirm",
  "body[data-theme=\"dark\"] .crop-actions:not(.image-expand-actions)"
];
const EXPECTED_LEGACY_THEME_SYNC_MEDIA_EDIT_SELECTORS = [
  ".canvas-context-menu .context-submenu-panel button:first-child",
  ".image-expand-prompt-field textarea",
  ".edit-reference-remove",
  ".node-image.cropping .image-frame",
  ".crop-box",
  ".image-expand-box",
  ".image-lightbox"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_SELECTORS = [
  "body[data-theme=\"dark\"] .node-card",
  ".generation-choice-overlay",
  ".ai-suggestion-panel",
  ".director-generate-all",
  "body[data-view=\"canvas\"] .node-card.node-image",
  "body[data-view=\"canvas\"] .node-card.node-loading-image .generation-frame::before",
  "body[data-view=\"canvas\"] .node-card.stack-drop-target"
];
const EXPECTED_LEGACY_THEME_SYNC_COMPACT_SELECT_SELECTORS = [
  ".native-compact-select",
  ".compact-select",
  ".compact-select-trigger",
  ".compact-select-menu",
  ".compact-select-option",
  ".image-edit-popover .compact-select-trigger",
  ".composer-actions .compact-select-trigger"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_SELECTORS = [
  ".home-model-menu.model-preference-menu",
  ".compact-select-menu.model-preference-menu",
  ".compact-select-menu-portal.model-preference-menu",
  ".chat-model-menu .model-preference-panel",
  "#imageGeneratorPopover .generator-select-wrap[data-generator-select-kind=\"model\"] .generator-select-menu.model-preference-menu",
  ".model-preference-panel",
  ".model-preference-option",
  ".model-preference-tags"
];
const EXPECTED_LEGACY_CANVAS_SHELL_SELECTORS = [
  ".canvas-area",
  ".tool-rail",
  ".add-node-menu",
  ".canvas-context-menu",
  ".selection-action-bar",
  ".selection-color-swatch"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_SELECTORS = [
  ".image-edit-popover",
  ".edit-head",
  ".edit-actions",
  "#imageGeneratorPopover .generator-select-wrap",
  ".image-edit-popover .compact-select",
  "#imageGeneratorPopover.generator-panel-expanded"
];
const EXPECTED_LEGACY_CANVAS_ADD_NODE_SELECTORS = [
  ".add-menu-title",
  ".add-node-menu button",
  ".add-node-menu em",
  "body[data-view=\"canvas\"] .add-node-menu",
  "body[data-view=\"canvas\"] .add-node-menu button"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_SELECTORS = [
  ".canvas-viewport",
  ".upload-choice-bubbles",
  ".generation-choice-overlay",
  ".floating-suggestions",
  "@keyframes bubbleIn",
  "@keyframes overlayFade",
  "@keyframes imageFloatIn",
  "@keyframes suggestionPop"
];
const EXPECTED_LEGACY_CANVAS_WORLD_SELECTORS = [
  ".canvas-world",
  ".selection-box",
  ".empty-state",
  ".empty-state-action",
  ".hint-line",
  ".hint-line span",
  ".quick-actions",
  ".quick-actions button:hover"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SELECTORS = [
  ".video-generator-popover",
  ".video-generator-popover.open",
  ".video-generator-reference-list",
  ".video-generator-reference-thumb",
  ".video-generator-tool",
  ".video-generator-model",
  ".video-generator-group",
  ".video-generator-status"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SELECTORS = [
  "body[data-view=\"canvas\"] .project-header",
  "body[data-view=\"canvas\"] .project-header h1",
  "body[data-view=\"canvas\"] .project-header p",
  "body[data-view=\"canvas\"] .project-header p.show",
  "body[data-view=\"canvas\"] .project-header p.is-success",
  "body[data-view=\"canvas\"] .project-header p.is-error",
  "body[data-view=\"canvas\"] .project-header p.is-pending",
  "body[data-view=\"canvas\"] .return-to-content"
];
const EXPECTED_LEGACY_CANVAS_LIBRARY_SELECTORS = [
  ".library-head"
];
const EXPECTED_LEGACY_CANVAS_SELECTORS = [];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_SELECTORS = [
  "body[data-view=\"canvas\"] .canvas-object.selected",
  "body[data-view=\"canvas\"] .draw-node",
  "body[data-view=\"canvas\"] .draw-shape",
  "body[data-view=\"canvas\"] .canvas-text-editor",
  ".shape-format-toolbar",
  ".shape-color-popover",
  ".stroke-width-control",
  "body[data-view=\"canvas\"] .text-format-toolbar",
  "body[data-view=\"canvas\"] .text-color-picker"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_MEDIA_SELECTORS = [
  "body[data-view=\"canvas\"] .canvas-area",
  "body[data-view=\"canvas\"] .canvas-world",
  "body[data-view=\"canvas\"] .node-image",
  "body[data-view=\"canvas\"] .node-model",
  "body[data-view=\"canvas\"] .node-loading-image",
  "body[data-view=\"canvas\"] .resize-handle"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SELECTORS = [
  ".brand-mark",
  ".brand-menu",
  ".home-side-menu",
  ".simple-page-view"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SELECTORS = [];
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
const EXPECTED_NODE_IMAGE_PANELS_SELECTORS = [
  ".image-text-panel",
  ".image-text-status",
  ".image-text-list",
  ".image-lightbox",
  ".image-lightbox-close"
];
const EXPECTED_NODE_STACK_SELECTORS = [
  ".node-card.stack-member-hidden",
  ".node-card.has-stack::after",
  ".node-card.stack-drop-target",
  ".stack-toggle",
  ".stack-tray",
  ".stack-row",
  ".stack-thumb"
];
const EXPECTED_NODE_DIRECTOR_SELECTORS = [
  ".node-director",
  ".director-head",
  ".director-refresh",
  ".director-actions",
  ".director-tile"
];
const EXPECTED_NODE_MEDIA_SELECTORS = [
  ".node-2d",
  ".node-video",
  ".node-image",
  ".node-model",
  ".node-loading-image",
  ".video-file-preview",
  ".image-file-name",
  ".image-frame",
  ".image-frame img"
];
const EXPECTED_NODE_GENERATION_SELECTORS = [
  ".generation-frame",
  ".generation-content",
  ".generation-spinner",
  ".generation-failed .generation-frame",
  "@keyframes shimmerPreview"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SELECTORS = [
  ".node-image-generator",
  ".image-generator-frame",
  ".image-generator-panel",
  ".image-generator-panel.image-edit-popover-inline",
  ".image-generator-bottom.edit-actions"
];
const EXPECTED_NODE_PREVIEW_SELECTORS = [
  ".media-preview",
  ".model-preview",
  ".model-viewer",
  ".model-viewer-mode-toggle",
  ".cube-scene",
  ".video-preview",
  ".bottom-controls",
  "@keyframes spinCube"
];
const EXPECTED_NODE_SELECTORS = [];
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
const legacyThemeSyncImports = parseCssImports("styles/legacy-theme-sync.css");
const legacyCanvasImports = parseCssImports("styles/legacy-canvas.css");
const legacyCanvasVisualImports = parseCssImports("styles/legacy-canvas-visual.css");
const authImports = parseCssImports("styles/features/auth.css");
const nodeImports = parseCssImports("styles/features/node.css");
const assetImports = parseCssImports("styles/features/assets.css");
const assetPinterestImports = parseCssImports("styles/features/assets-pinterest.css");
const homeImports = parseCssImports("styles/features/home.css");

checkIndexStylesheet();
assertListEqual("styles.css", stylesImports, EXPECTED_STYLES_IMPORTS);
assertListEqual("styles/workspace.css", workspaceImports, EXPECTED_WORKSPACE_IMPORTS);
assertListEqual("styles/legacy-split.css", legacySplitImports, EXPECTED_LEGACY_SPLIT_IMPORTS);
assertListEqual("styles/legacy-base.css", legacyBaseImports, EXPECTED_LEGACY_BASE_IMPORTS);
assertListEqual("styles/legacy-theme-sync.css", legacyThemeSyncImports, EXPECTED_LEGACY_THEME_SYNC_IMPORTS);
assertListEqual("styles/legacy-canvas.css", legacyCanvasImports, EXPECTED_LEGACY_CANVAS_IMPORTS);
assertListEqual("styles/legacy-canvas-visual.css", legacyCanvasVisualImports, EXPECTED_LEGACY_CANVAS_VISUAL_IMPORTS);
assertListEqual("styles/features/auth.css", authImports, EXPECTED_AUTH_IMPORTS);
assertListEqual("styles/features/node.css", nodeImports, EXPECTED_NODE_IMPORTS);
assertListEqual("styles/features/assets.css", assetImports, EXPECTED_ASSET_IMPORTS);
assertListEqual("styles/features/assets-pinterest.css", assetPinterestImports, EXPECTED_ASSET_PINTEREST_IMPORTS);
assertListEqual("styles/features/home.css", homeImports, EXPECTED_HOME_IMPORTS);
checkImportedFilesExist(stylesImports, ".");
checkImportedFilesExist(workspaceImports, "styles");
checkImportedFilesExist(legacySplitImports, "styles");
checkImportedFilesExist(legacyThemeSyncImports, "styles");
checkImportedFilesExist(legacyCanvasImports, "styles");
checkImportedFilesExist(legacyCanvasVisualImports, "styles");
checkImportedFilesExist(authImports, "styles/features");
checkImportedFilesExist(nodeImports, "styles/features");
checkImportedFilesExist(assetImports, "styles/features");
checkImportedFilesExist(assetPinterestImports, "styles/features");
checkImportedFilesExist(homeImports, "styles/features");
checkCssReachability();
checkFileContains("styles/features/auth.css", EXPECTED_AUTH_SELECTORS);
checkFileContains("styles/features/auth-account.css", EXPECTED_AUTH_ACCOUNT_SELECTORS);
checkFileContains("styles/features/assets-page.css", EXPECTED_ASSET_PAGE_SELECTORS);
checkFileContains("styles/features/assets-board.css", EXPECTED_ASSET_BOARD_SELECTORS);
checkFileContains("styles/features/assets-save.css", EXPECTED_ASSET_SAVE_SELECTORS);
checkFileContains("styles/features/assets-picker.css", EXPECTED_ASSET_PICKER_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker.css", EXPECTED_ASSET_CANVAS_PICKER_SELECTORS);
checkFileContains("styles/features/assets-context-menu.css", EXPECTED_ASSET_CONTEXT_MENU_SELECTORS);
checkFileContains("styles/features/assets-pinterest.css", EXPECTED_ASSET_PINTEREST_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell.css", EXPECTED_ASSET_PINTEREST_SHELL_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board.css", EXPECTED_ASSET_PINTEREST_BOARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin.css", EXPECTED_ASSET_PINTEREST_PIN_SELECTORS);
checkFileContains("styles/features/assets.css", EXPECTED_ASSET_SELECTORS);
checkFileContains("styles/features/chat.css", EXPECTED_CHAT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-base.css", EXPECTED_LEGACY_THEME_SYNC_BASE_SELECTORS);
checkFileContains("styles/legacy-theme-sync-surfaces.css", EXPECTED_LEGACY_THEME_SYNC_SURFACES_SELECTORS);
checkFileContains("styles/legacy-theme-sync-image-edit.css", EXPECTED_LEGACY_THEME_SYNC_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-crop-expand.css", EXPECTED_LEGACY_THEME_SYNC_CROP_EXPAND_SELECTORS);
checkFileContains("styles/legacy-theme-sync-media-edit.css", EXPECTED_LEGACY_THEME_SYNC_MEDIA_EDIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-node-media.css", EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_SELECTORS);
checkFileContains("styles/legacy-theme-sync-compact-select.css", EXPECTED_LEGACY_THEME_SYNC_COMPACT_SELECT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_SELECTORS);
checkFileContains("styles/legacy-theme-sync-credit-submit.css", EXPECTED_LEGACY_THEME_SYNC_CREDIT_SUBMIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync.css", EXPECTED_LEGACY_THEME_SYNC_SELECTORS);
checkFileContains("styles/legacy-canvas-shell.css", EXPECTED_LEGACY_CANVAS_SHELL_SELECTORS);
checkFileContains("styles/legacy-canvas-image-edit.css", EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/legacy-canvas-add-node.css", EXPECTED_LEGACY_CANVAS_ADD_NODE_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-overlays.css", EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_SELECTORS);
checkFileContains("styles/legacy-canvas-world.css", EXPECTED_LEGACY_CANVAS_WORLD_SELECTORS);
checkFileContains("styles/legacy-canvas-video-generator.css", EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SELECTORS);
checkFileContains("styles/legacy-canvas-library.css", EXPECTED_LEGACY_CANVAS_LIBRARY_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shape-tools.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-media.css", EXPECTED_LEGACY_CANVAS_VISUAL_MEDIA_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shell.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SELECTORS);
checkFileContains("styles/features/home.css", EXPECTED_HOME_SELECTORS);
checkFileContains("styles/features/home-shell.css", EXPECTED_HOME_SHELL_SELECTORS);
checkFileContains("styles/features/home-history.css", EXPECTED_HOME_HISTORY_SELECTORS);
checkFileContains("styles/features/home-community.css", EXPECTED_HOME_COMMUNITY_SELECTORS);
checkFileContains("styles/features/node-base.css", EXPECTED_NODE_BASE_SELECTORS);
checkFileContains("styles/features/node-image-edit.css", EXPECTED_NODE_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/features/node-state.css", EXPECTED_NODE_STATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar.css", EXPECTED_NODE_IMAGE_TOOLBAR_SELECTORS);
checkFileContains("styles/features/node-image-panels.css", EXPECTED_NODE_IMAGE_PANELS_SELECTORS);
checkFileContains("styles/features/node-stack.css", EXPECTED_NODE_STACK_SELECTORS);
checkFileContains("styles/features/node-director.css", EXPECTED_NODE_DIRECTOR_SELECTORS);
checkFileContains("styles/features/node-media.css", EXPECTED_NODE_MEDIA_SELECTORS);
checkFileContains("styles/features/node-generation.css", EXPECTED_NODE_GENERATION_SELECTORS);
checkFileContains("styles/features/node-image-generator.css", EXPECTED_NODE_IMAGE_GENERATOR_SELECTORS);
checkFileContains("styles/features/node-preview.css", EXPECTED_NODE_PREVIEW_SELECTORS);
checkFileContains("styles/features/node.css", EXPECTED_NODE_SELECTORS);
checkFileContains("styles/features/project-library.css", EXPECTED_PROJECT_LIBRARY_SELECTORS);
checkFileContains("styles/legacy-canvas.css", EXPECTED_LEGACY_CANVAS_SELECTORS);
checkFileContains("styles/legacy-canvas-visual.css", EXPECTED_LEGACY_CANVAS_VISUAL_SELECTORS);
checkFileContains("styles/legacy-node.css", EXPECTED_LEGACY_NODE_SELECTORS);
checkFileContains("styles/legacy-chat.css", EXPECTED_LEGACY_CHAT_SELECTORS);

if (errors.length > 0) {
  console.error("Style entry check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Style entry checks passed.");
