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
  "./workspace-layout.css"
];
const EXPECTED_LEGACY_SPLIT_IMPORTS = [
  "./legacy-base.css",
  "./legacy-assets.css",
  "./legacy-canvas.css",
  "./legacy-canvas-visual.css",
  "./legacy-chat.css",
  "./legacy-node.css",
  "./legacy-overrides.css",
  "./legacy-compact-controls.css",
  "./legacy-rail-polish.css",
  "./legacy-light-refinements.css",
  "./legacy-theme-ios.css",
  "./legacy-theme-sync.css",
  "./legacy-ai-core.css",
  "./legacy-ai-core-analysis.css",
  "./legacy-ai-core-workspace.css",
  "./legacy-ai-core-ambient.css",
  "./menu-select-overrides.css"
];

const errors = [];

function readText(filePath) {
  return fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
}

function stripQuery(value = "") {
  return String(value || "").split("?")[0];
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

const stylesImports = parseCssImports("styles.css");
const workspaceImports = parseCssImports("styles/workspace.css");
const legacySplitImports = parseCssImports("styles/legacy-split.css");

checkIndexStylesheet();
assertListEqual("styles.css", stylesImports, EXPECTED_STYLES_IMPORTS);
assertListEqual("styles/workspace.css", workspaceImports, EXPECTED_WORKSPACE_IMPORTS);
assertListEqual("styles/legacy-split.css", legacySplitImports, EXPECTED_LEGACY_SPLIT_IMPORTS);
checkImportedFilesExist(stylesImports, ".");
checkImportedFilesExist(workspaceImports, "styles");
checkImportedFilesExist(legacySplitImports, "styles");

if (errors.length > 0) {
  console.error("Style entry check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Style entry checks passed.");
