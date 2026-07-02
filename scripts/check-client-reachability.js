import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "src", "client");
const ENTRY_FILES = ["app.js", "server.js"].map((filePath) => path.resolve(ROOT, filePath));
const DEPRECATED_CLIENT_MODULES = [
  "src/client/features/workspace/workflows/workspace-app-bootstrap-composition.js",
  "src/client/features/workspace/workflows/workspace-launch-composition.js",
  "src/client/features/workspace/runtime/actions-context.js",
  "src/client/features/workspace/runtime/launch-config-base.js",
  "src/client/features/workspace/runtime/launcher-ai-context.js",
  "src/client/features/workspace/runtime/launcher-safe-bindings.js",
  "src/client/features/workspace/runtime/workspace-app-state.js"
];
const ENTRY_IMPORT_EXPECTATIONS = [
  {
    filePath: "app.js",
    required: ["./src/client/main.js"],
    forbidden: ["./src/main.js"]
  },
  {
    filePath: "src/client/main.js",
    required: ["./core/app-init.js"],
    forbidden: ["../features/workspace/index.js", "../features/workspace/runtime/index.js"]
  },
  {
    filePath: "src/client/core/app-init.js",
    required: ["../features/workspace/workflows/workspace-app-mount.js"],
    forbidden: ["../features/workspace/index.js", "../features/workspace/runtime/index.js"]
  }
];
const MODULE_SURFACE_EXPECTATIONS = [
  {
    filePath: "src/client/features/workspace/workflows/workspace-composition-dependencies.js",
    forbidden: [
      "export * from"
    ]
  },
  {
    filePath: "src/client/features/workspace/workflows/workspace-ai-composition.js",
    forbidden: [
      "export function createWorkspaceImageEditCompositionRuntime"
    ]
  }
];

const errors = [];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePath(filePath) {
  return toPosixPath(path.relative(ROOT, filePath));
}

function collectJsFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return targetPath.endsWith(".js") ? [targetPath] : [];

  const files = [];
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    files.push(...collectJsFiles(path.join(targetPath, entry.name)));
  }
  return files;
}

function stripImportQuery(specifier) {
  return String(specifier || "").split("?")[0];
}

function resolveLocalImport(importerPath, specifier, knownFiles) {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return null;

  const baseDir = specifier.startsWith("/") ? ROOT : path.dirname(importerPath);
  const basePath = path.resolve(baseDir, stripImportQuery(specifier));
  const candidates = [
    basePath,
    `${basePath}.js`,
    path.join(basePath, "index.js")
  ];
  return candidates.find((candidate) => knownFiles.has(candidate)) || null;
}

function parseImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:[^;"']+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:[^;"']+?\s+from\s+)["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function readSource(filePath) {
  return fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
}

function normalizeImportSpecifiers(source) {
  return parseImportSpecifiers(source).map(stripImportQuery);
}

function checkEntryImportExpectations() {
  for (const expectation of ENTRY_IMPORT_EXPECTATIONS) {
    const specifiers = normalizeImportSpecifiers(readSource(expectation.filePath));
    for (const required of expectation.required) {
      if (!specifiers.includes(required)) {
        errors.push(`${expectation.filePath} must import ${required}`);
      }
    }
    for (const forbidden of expectation.forbidden) {
      if (specifiers.includes(forbidden)) {
        errors.push(`${expectation.filePath} must not import ${forbidden}`);
      }
    }
  }
}

function checkModuleSurfaceExpectations() {
  for (const expectation of MODULE_SURFACE_EXPECTATIONS) {
    const source = readSource(expectation.filePath);
    for (const forbidden of expectation.forbidden) {
      if (source.includes(forbidden)) {
        errors.push(`${expectation.filePath} must not expose broad dependency re-exports via ${forbidden}`);
      }
    }
  }
}

function buildReachabilityGraph() {
  const allFiles = new Set([
    ...collectJsFiles(CLIENT_DIR),
    ...collectJsFiles(path.join(ROOT, "src", "server")),
    ...ENTRY_FILES
  ].map((filePath) => path.resolve(filePath)));
  const reachable = new Set();
  const stack = [...ENTRY_FILES];

  while (stack.length) {
    const filePath = stack.pop();
    if (!filePath || reachable.has(filePath) || !fs.existsSync(filePath)) continue;

    reachable.add(filePath);
    const source = fs.readFileSync(filePath, "utf8");
    for (const specifier of parseImportSpecifiers(source)) {
      const resolved = resolveLocalImport(filePath, specifier, allFiles);
      if (resolved) {
        if (!reachable.has(resolved)) stack.push(resolved);
        continue;
      }
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        errors.push(`${relativePath(filePath)} imports missing local module ${specifier}`);
      }
    }
  }

  return { allFiles, reachable };
}

const { allFiles, reachable } = buildReachabilityGraph();
checkEntryImportExpectations();
checkModuleSurfaceExpectations();
const deprecatedClientFiles = DEPRECATED_CLIENT_MODULES
  .filter((filePath) => fs.existsSync(path.resolve(ROOT, filePath)));
const unreachableClientFiles = Array.from(allFiles)
  .filter((filePath) => filePath.startsWith(CLIENT_DIR + path.sep) && !reachable.has(filePath))
  .map(relativePath)
  .sort();

if (deprecatedClientFiles.length > 0) {
  errors.push(
    `Deprecated frontend wrapper modules were reintroduced:\n${deprecatedClientFiles.map((filePath) => `- ${filePath}`).join("\n")}`
  );
}

if (unreachableClientFiles.length > 0) {
  errors.push(
    `Unreachable client modules found from app.js/server.js:\n${unreachableClientFiles.map((filePath) => `- ${filePath}`).join("\n")}`
  );
}

if (errors.length > 0) {
  console.error("Client reachability check failed:");
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(`Client reachability checks passed. reachable=${reachable.size} client_unreachable=0`);
