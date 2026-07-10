import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "app");
const packageManifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const allowedSizes = new Set([16, 18, 20]);
const allowedStrokeWidths = new Set([1.75, 2]);
const forbiddenGlyphs = ["⌂", "▤", "○", "▦", "◆", "⌄", "⚡", "✓", "×", "↑", "←", "‹", "›"];

if (!packageManifest.dependencies?.["lucide-react"]) {
  fail("apps/web must declare lucide-react as a direct dependency");
}

const sourceFiles = collectFiles(sourceRoot).filter((file) => [".ts", ".tsx"].includes(extname(file)));
let lucideFileCount = 0;

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  if (source.includes('from "lucide-react"')) {
    lucideFileCount += 1;
    if (/import\s+(?!\{)[^;]+from\s+"lucide-react"/.test(source)) {
      fail("Lucide must use named imports for tree shaking: " + file);
    }
    for (const match of source.matchAll(/\bsize=\{([0-9.]+)\}/g)) {
      if (!allowedSizes.has(Number(match[1]))) fail("Unsupported Lucide size in " + file);
    }
    for (const match of source.matchAll(/\bstrokeWidth=\{([0-9.]+)\}/g)) {
      if (!allowedStrokeWidths.has(Number(match[1]))) {
        fail("Unsupported Lucide stroke width in " + file);
      }
    }
  }
  for (const glyph of forbiddenGlyphs) {
    if (source.includes(glyph)) fail(`Character icon ${glyph} remains in ${file}`);
  }
}

if (lucideFileCount === 0) fail("No rewrite Lucide imports were found");

console.log("Lucide usage check passed.", "files=" + lucideFileCount);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
