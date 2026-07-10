import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const workPackageId = process.argv[2];
const cached = process.argv.includes("--cached");
if (!workPackageId) fail("Usage: node scripts/check-work-package-scope.js <work-package-id> --cached");
if (!cached) fail("Work-package scope must be checked against explicitly staged files with --cached");

const catalog = JSON.parse(
  readFileSync(resolve(root, "docs/architecture/react-nest-work-packages.json"), "utf8")
);
const workPackage = catalog.packages.find((item) => item.id === workPackageId);
if (!workPackage) fail("Unknown work package: " + workPackageId);

const output = execFileSync(
  "git",
  ["diff", "--cached", "--name-status", "--diff-filter=ACMRD"],
  { cwd: root, encoding: "utf8" }
);
const changes = output
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [status, ...pathParts] = line.split("\t");
    return { status, path: normalizePath(pathParts.at(-1)) };
  });
if (changes.length === 0) fail("No staged files to validate for " + workPackageId);

const forbiddenAreas = catalog.defaults?.forbiddenAreas ?? [];
const legacyAreas = ["app.js", "server.js", "src/", "styles/", "index.html", "styles.css", "vite.config.js"];
for (const change of changes) {
  if (forbiddenAreas.some((area) => pathMatches(change.path, area))) {
    fail("Staged file is always forbidden: " + change.path);
  }
  if (!workPackage.legacyMutationAllowed && legacyAreas.some((area) => pathMatches(change.path, area))) {
    fail("Legacy mutation is not allowed for " + workPackageId + ": " + change.path);
  }
  if (!workPackage.allowedAreas.some((area) => pathMatches(change.path, area))) {
    fail("Staged file is outside " + workPackageId + " allowedAreas: " + change.path);
  }
  if (change.status === "D" && workPackageId !== catalog.terminalWorkPackage) {
    fail("File deletion is reserved for the terminal deletion package: " + change.path);
  }
}

console.log(
  "Work-package staged scope passed.",
  "id=" + workPackageId,
  "files=" + changes.length
);

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function pathMatches(file, area) {
  const normalizedArea = normalizePath(area);
  return normalizedArea.endsWith("/") ? file.startsWith(normalizedArea) : file === normalizedArea;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
