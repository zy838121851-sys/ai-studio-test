import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "src", "client");

const LAZY_SPLITS = [
  {
    label: "model viewer",
    modulePath: "src/client/features/canvas/model-viewer.js",
    loaderPath: "src/client/features/canvas/model-viewer-loader.js",
    dynamicSpecifier: "./model-viewer.js"
  },
  {
    label: "image edit workflow",
    modulePath: "src/client/features/canvas/workflows/image-edit-workflow.js",
    loaderPath: "src/client/features/canvas/workflows/image-edit-workflow-loader.js",
    dynamicSpecifier: "./image-edit-workflow.js"
  },
  {
    label: "image generator workflow",
    modulePath: "src/client/features/canvas/workflows/image-generator-workflow.js",
    loaderPath: "src/client/features/canvas/workflows/image-generator-workflow-loader.js",
    dynamicSpecifier: "./image-generator-workflow.js"
  },
  {
    label: "video generator workflow",
    modulePath: "src/client/features/canvas/workflows/video-generator-workflow.js",
    loaderPath: "src/client/features/canvas/workflows/video-generator-workflow-loader.js",
    dynamicSpecifier: "./video-generator-workflow.js"
  },
  {
    label: "model viewer workflow",
    modulePath: "src/client/features/canvas/workflows/model-viewer-workflow.js",
    loaderPath: "src/client/features/canvas/workflows/model-viewer-workflow-loader.js",
    dynamicSpecifier: "./model-viewer-workflow.js"
  }
];

const ENTRY_EXPECTATIONS = [
  {
    filePath: "src/client/features/canvas/index.js",
    required: [
      "from \"./model-viewer-loader.js\"",
      "from \"./workflows/image-edit-workflow-loader.js\"",
      "from \"./workflows/image-generator-workflow-loader.js\"",
      "from \"./workflows/model-viewer-workflow-loader.js\""
    ],
    forbidden: [
      "from \"./model-viewer.js\"",
      "from \"./workflows/image-edit-workflow.js\"",
      "from \"./workflows/image-generator-workflow.js\"",
      "from \"./workflows/video-generator-workflow.js\"",
      "from \"./workflows/model-viewer-workflow.js\""
    ]
  },
  {
    filePath: "src/client/features/canvas/runtime/canvas-interaction-bootstrap.js",
    required: [
      "from \"../workflows/image-edit-workflow-loader.js\""
    ],
    forbidden: [
      "from \"../workflows/image-edit-workflow.js\""
    ]
  },
  {
    filePath: "src/client/features/canvas/runtime/canvas-generation-bootstrap.js",
    required: [
      "from \"../workflows/image-generator-workflow-loader.js\"",
      "from \"../workflows/video-generator-workflow-loader.js\"",
      "from \"../workflows/model-viewer-workflow-loader.js\""
    ],
    forbidden: [
      "from \"../workflows/image-generator-workflow.js\"",
      "from \"../workflows/video-generator-workflow.js\"",
      "from \"../workflows/model-viewer-workflow.js\""
    ]
  }
];

const FORBIDDEN_STATIC_PACKAGE_IMPORTS = [
  {
    specifier: "three",
    label: "Three.js"
  },
  {
    specifier: "three/examples/jsm/loaders/GLTFLoader.js",
    label: "GLTFLoader"
  },
  {
    specifier: "three/examples/jsm/controls/OrbitControls.js",
    label: "OrbitControls"
  }
];

const errors = [];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function absolutePath(filePath) {
  return path.resolve(ROOT, filePath);
}

function relativePath(filePath) {
  return toPosixPath(path.relative(ROOT, filePath));
}

function readText(filePath) {
  return fs.readFileSync(absolutePath(filePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  errors.push(message);
}

function assertFileContains(filePath, snippet) {
  const text = readText(filePath);
  if (!text.includes(snippet)) {
    fail(`${filePath} must contain ${snippet}`);
  }
}

function assertFileDoesNotContain(filePath, snippet) {
  const text = readText(filePath);
  if (text.includes(snippet)) {
    fail(`${filePath} must not contain ${snippet}`);
  }
}

function assertLoaderUsesDynamicImport(split) {
  const text = readText(split.loaderPath);
  const dynamicImportPattern = new RegExp(
    `import\\(\\s*["']${escapeRegExp(split.dynamicSpecifier)}(?:\\?[^"']*)?["']\\s*\\)`
  );

  if (!dynamicImportPattern.test(text)) {
    fail(`${split.loaderPath} must dynamically import ${split.dynamicSpecifier}`);
  }

  const staticImportPattern = new RegExp(
    `(?:^|\\n)\\s*(?:import|export)\\s+(?:[^;"']+?\\s+from\\s+)?["']${escapeRegExp(split.dynamicSpecifier)}(?:\\?[^"']*)?["']`,
    "m"
  );

  if (staticImportPattern.test(text)) {
    fail(`${split.loaderPath} must not statically import ${split.dynamicSpecifier}`);
  }
}

function walkJsFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

function parseStaticSpecifiers(text) {
  const specifiers = [];
  const importExportFromPattern = /\b(?:import|export)\s+(?:[^;"']+?\s+from\s+)?["']([^"']+)["']/g;
  let match;

  while ((match = importExportFromPattern.exec(text))) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function normalizeImportTarget(importerAbsPath, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return null;

  const cleanSpecifier = specifier.split("?")[0];
  const baseDir = specifier.startsWith("/")
    ? ROOT
    : path.dirname(importerAbsPath);
  const resolved = path.resolve(baseDir, cleanSpecifier);
  return relativePath(resolved);
}

function assertNoRuntimeStaticImportsToLazyModules() {
  const lazyModules = new Set(LAZY_SPLITS.map((split) => split.modulePath));

  for (const filePath of walkJsFiles(CLIENT_DIR)) {
    const relPath = relativePath(filePath);
    const text = fs.readFileSync(filePath, "utf8");

    for (const specifier of parseStaticSpecifiers(text)) {
      const target = normalizeImportTarget(filePath, specifier);
      if (!target || !lazyModules.has(target)) continue;

      fail(`${relPath} statically references lazy module ${target}; use the loader instead`);
    }
  }
}

function assertNoRuntimeStaticImportsToHeavyPackages() {
  const forbiddenSpecifiers = new Map(
    FORBIDDEN_STATIC_PACKAGE_IMPORTS.map((item) => [item.specifier, item.label])
  );

  for (const filePath of walkJsFiles(CLIENT_DIR)) {
    const relPath = relativePath(filePath);
    const text = fs.readFileSync(filePath, "utf8");

    for (const specifier of parseStaticSpecifiers(text)) {
      const label = forbiddenSpecifiers.get(specifier);
      if (!label) continue;
      fail(`${relPath} statically imports ${label}; load it behind the model viewer lazy path`);
    }
  }
}

for (const expectation of ENTRY_EXPECTATIONS) {
  for (const snippet of expectation.required) {
    assertFileContains(expectation.filePath, snippet);
  }
  for (const snippet of expectation.forbidden) {
    assertFileDoesNotContain(expectation.filePath, snippet);
  }
}

for (const split of LAZY_SPLITS) {
  assertLoaderUsesDynamicImport(split);
}

assertNoRuntimeStaticImportsToLazyModules();
assertNoRuntimeStaticImportsToHeavyPackages();

if (errors.length > 0) {
  console.error("Lazy workflow split check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Lazy workflow split checks passed.");
