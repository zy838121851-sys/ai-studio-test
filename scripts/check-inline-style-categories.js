import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["index.html", "app.js", "src/client", "src/server"];
const SOURCE_EXTENSIONS = new Set([".html", ".js"]);

const PATTERNS = {
  inlineAttribute: /(?<![\w-])style\s*=/g,
  styleSetAttribute: /\.setAttribute\(\s*["']style["']/g,
  styleProperty: /\.style(?:\.|\[)/g,
  cssText: /\.style\.cssText\b/g
};

const CATEGORY_LIMITS = {
  "agent-runtime": {
    files: 7,
    inlineAttribute: 2,
    styleSetAttribute: 0,
    styleProperty: 17,
    cssText: 0
  },
  "ai-editor-dynamic-runtime": {
    files: 1,
    inlineAttribute: 0,
    styleSetAttribute: 0,
    styleProperty: 19,
    cssText: 0
  },
  "canvas-dynamic-runtime": {
    files: 32,
    inlineAttribute: 1,
    styleSetAttribute: 6,
    styleProperty: 190,
    cssText: 0
  },
  "serialization-export-snapshot": {
    files: 3,
    inlineAttribute: 5,
    styleSetAttribute: 1,
    styleProperty: 28,
    cssText: 1
  },
  "workspace-floating-ui-runtime": {
    files: 9,
    inlineAttribute: 0,
    styleSetAttribute: 0,
    styleProperty: 44,
    cssText: 0
  }
};

const totals = {};
const errors = [];

for (const filePath of collectSourceFiles()) {
  const text = fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
  const counts = countMatches(text);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (!total) continue;

  const category = getInlineStyleCategory(filePath);
  if (!category) {
    errors.push(`Unclassified inline style dependency in ${filePath}`);
    continue;
  }

  totals[category] ||= emptyCategoryTotals();
  totals[category].files += 1;
  for (const [key, value] of Object.entries(counts)) {
    totals[category][key] += value;
  }
}

for (const [category, limits] of Object.entries(CATEGORY_LIMITS)) {
  const actual = totals[category] || emptyCategoryTotals();
  for (const [key, max] of Object.entries(limits)) {
    if (actual[key] > max) {
      errors.push(`${category} ${key} count increased: expected <= ${max}, got ${actual[key]}`);
    }
  }
}

for (const category of Object.keys(totals)) {
  if (!CATEGORY_LIMITS[category]) {
    errors.push(`Unexpected inline style category ${category}`);
  }
}

if (errors.length) {
  console.error("Inline style category check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(formatCategoryTotals(totals));
  process.exit(1);
}

console.log(`Inline style category checks passed. ${formatCategoryTotals(totals)}`);

function getInlineStyleCategory(filePath) {
  if (filePath.startsWith("src/client/features/agent/")) return "agent-runtime";
  if (filePath.startsWith("src/client/features/ai/")) return "ai-editor-dynamic-runtime";
  if (
    filePath === "src/client/features/projects/snapshot.js"
    || filePath === "src/server/services/snapshot-safety.service.js"
    || filePath === "src/client/features/canvas/workflows/canvas-menu-actions.js"
  ) {
    return "serialization-export-snapshot";
  }
  if (filePath.startsWith("src/client/features/canvas/")) return "canvas-dynamic-runtime";
  if (
    filePath.includes("/asset-library/")
    || filePath.includes("/chat/")
    || filePath.includes("/home/")
    || filePath.includes("/task-log/")
    || filePath.includes("/taskbar/")
    || filePath.startsWith("src/client/lib/")
  ) {
    return "workspace-floating-ui-runtime";
  }
  return "";
}

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

function emptyCategoryTotals() {
  return {
    files: 0,
    inlineAttribute: 0,
    styleSetAttribute: 0,
    styleProperty: 0,
    cssText: 0
  };
}

function formatCategoryTotals(value) {
  return Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, counts]) => {
      const summary = ["files", ...Object.keys(PATTERNS)]
        .map((key) => `${key}=${counts[key] || 0}`)
        .join(" ");
      return `${category}(${summary})`;
    })
    .join(" ");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
