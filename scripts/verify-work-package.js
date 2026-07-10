import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workPackageId = process.argv[2];

if (!workPackageId) {
  fail("Usage: npm run governance:verify -- <work-package-id>");
}

const catalog = readJson("docs/architecture/react-nest-work-packages.json");
const workPackage = catalog.packages.find((item) => item.id === workPackageId);
if (!workPackage) fail("Unknown work package: " + workPackageId);

const profile = catalog.verificationProfiles?.[workPackage.verificationTier];
if (!profile) fail("Unknown verification tier for " + workPackageId);

const stagedPaths = gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMRD"]);
if (stagedPaths.length === 0) fail("Stage the explicit work-package paths before verification");

runFile(process.execPath, ["scripts/check-work-package-scope.js", workPackageId, "--cached"]);

const workspaces = loadWorkspaces();
const affectedWorkspaceNames = resolveAffectedWorkspaces(stagedPaths, workspaces);
const commands = dedupe(
  dedupe([
    ...(workPackage.verificationCommands ?? []),
    ...(profile.commands ?? [])
  ]).flatMap((command) => expandCommand(command, affectedWorkspaceNames, workspaces))
);

console.log(
  "Work-package verification plan.",
  "id=" + workPackageId,
  "tier=" + workPackage.verificationTier,
  "workspaces=" + (affectedWorkspaceNames.join(",") || "none"),
  "commands=" + commands.length
);

for (const command of commands) {
  console.log("\n> " + command);
  try {
    execSync(command, { cwd: root, stdio: "inherit", shell: true });
  } catch {
    fail("Verification command failed: " + command);
  }
}

if (workPackage.externalVerification?.mode === "deferred") {
  console.log(
    "External verification remains deferred.",
    "blocker=" + workPackage.externalVerification.blockerId,
    "deadlineStage=" + workPackage.externalVerification.deadlineStage
  );
}

console.log("Work-package verification passed.", "id=" + workPackageId);

function loadWorkspaces() {
  const entries = [];
  for (const parent of ["apps", "packages"]) {
    const parentPath = resolve(root, parent);
    if (!existsSync(parentPath)) continue;
    for (const child of readdirSync(parentPath, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const packagePath = resolve(parentPath, child.name, "package.json");
      if (!existsSync(packagePath)) continue;
      const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
      entries.push({
        name: manifest.name,
        path: normalizePath(relative(root, resolve(parentPath, child.name))),
        scripts: manifest.scripts ?? {},
        dependencies: {
          ...(manifest.dependencies ?? {}),
          ...(manifest.devDependencies ?? {}),
          ...(manifest.peerDependencies ?? {})
        }
      });
    }
  }
  return entries;
}

function resolveAffectedWorkspaces(stagedPaths, workspaces) {
  const affected = new Set();
  const allWorkspaceNames = workspaces.map((workspace) => workspace.name);
  const normalizedPaths = stagedPaths.map(normalizePath);
  const rootWideFiles = new Set([
    "package.json",
    "tsconfig.base.json",
    "eslint.config.js",
    "prettier.config.js"
  ]);

  if (normalizedPaths.some((path) => rootWideFiles.has(path))) {
    allWorkspaceNames.forEach((name) => affected.add(name));
  }

  for (const path of normalizedPaths) {
    for (const workspace of workspaces) {
      if (path === workspace.path || path.startsWith(workspace.path + "/")) {
        affected.add(workspace.name);
      }
    }
  }

  if (normalizedPaths.includes("compose.rewrite.yml")) {
    ["@ai-studio/api", "@ai-studio/worker", "@ai-studio/server-core"].forEach((name) =>
      affected.add(name)
    );
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const workspace of workspaces) {
      if (affected.has(workspace.name)) continue;
      if (Object.keys(workspace.dependencies).some((dependency) => affected.has(dependency))) {
        affected.add(workspace.name);
        changed = true;
      }
    }
  }

  return workspaces.map((workspace) => workspace.name).filter((name) => affected.has(name));
}

function expandCommand(command, affectedWorkspaceNames, workspaces) {
  if (!command.startsWith("workspace:")) return [command];
  const script = command.slice("workspace:".length);
  if (!script) fail("Invalid workspace command in verification profile: " + command);
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  return affectedWorkspaceNames
    .filter((name) => byName.get(name)?.scripts?.[script])
    .map((name) => `npm run ${script} --workspace ${name}`);
}

function dedupe(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function gitLines(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runFile(file, args) {
  try {
    execFileSync(file, args, { cwd: root, stdio: "inherit" });
  } catch {
    fail("Verification command failed: " + [file, ...args].join(" "));
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
