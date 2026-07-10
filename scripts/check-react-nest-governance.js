import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TextDecoder } from "node:util";

const root = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  "docs/architecture/current-state.md",
  "docs/architecture/saas-governance-prd.md",
  "docs/architecture/react-nest-target-architecture.md",
  "docs/architecture/react-nest-execution-runbook.md",
  "docs/architecture/react-nest-parity-matrix.md",
  "docs/architecture/react-nest-migration-state.json",
  "docs/architecture/react-nest-work-packages.json"
];

const contents = new Map(requiredFiles.map((file) => [file, readUtf8(file)]));
const agents = contents.get("AGENTS.md");
const prd = contents.get("docs/architecture/saas-governance-prd.md");
const currentState = contents.get("docs/architecture/current-state.md");
const parityMatrix = contents.get("docs/architecture/react-nest-parity-matrix.md");
const state = parseJson(
  contents.get("docs/architecture/react-nest-migration-state.json"),
  "Migration state"
);
const catalog = parseJson(
  contents.get("docs/architecture/react-nest-work-packages.json"),
  "Work-package catalog"
);

assertIncludes(agents, "React + TypeScript", "AGENTS target frontend");
assertIncludes(agents, "NestJS + Fastify", "AGENTS target backend");
assertIncludes(agents, "react-nest-work-packages.json", "AGENTS work-package authority");
assertIncludes(agents, "Work-Package: <id>", "AGENTS commit trailer rule");
assertExcludes(agents, "Do not directly switch to Next.js, React, Vue", "obsolete framework ban");

assertIncludes(prd, "# AI Studio React/NestJS SaaS 重建 PRD", "PRD title");
assertIncludes(prd, "Stage 3.5", "PRD SaaS foundation stage");
assertIncludes(prd, "Stage 13", "PRD final stage");
assertIncludes(prd, "Program Definition Of Done", "PRD completion definition");
assertIncludes(prd, "react-nest-work-packages.json", "PRD work-package authority");

if (Buffer.byteLength(currentState, "utf8") > 20_000) {
  fail("current-state.md must remain a concise required-reading document");
}

const parityIds = new Set(
  [...parityMatrix.matchAll(/^\|\s*([A-Z]+-\d{3})\s*\|/gm)].map((match) => match[1])
);
const catalogResult = validateCatalog(catalog, parityIds);
validateState(state, catalogResult);
validateCommitTrailerWhenClean(state);

console.log(
  "React/Nest governance checks passed.",
  "catalogPackages=" + catalogResult.chain.length,
  "stage=" + state.activeStage,
  "next=" + state.nextWorkPackage,
  "cutoverAllowed=" + state.cutoverAllowed
);

function validateCatalog(value, knownParityIds) {
  if (value.schemaVersion !== 1) fail("Work-package catalog schemaVersion must be 1");
  if (value.program !== "react-nest-rewrite") fail("Work-package catalog program is invalid");
  if (!Array.isArray(value.packages) || value.packages.length === 0) {
    fail("Work-package catalog packages must be a non-empty array");
  }
  if (!value.defaults || typeof value.defaults !== "object") {
    fail("Work-package catalog defaults are required");
  }

  const byId = new Map();
  for (const workPackage of value.packages) {
    if (!workPackage || typeof workPackage !== "object") fail("Catalog package must be an object");
    if (typeof workPackage.id !== "string" || !/^WP-[A-Z0-9.]+-[a-z0-9-]+$/.test(workPackage.id)) {
      fail("Invalid work-package id: " + String(workPackage.id));
    }
    if (byId.has(workPackage.id)) fail("Duplicate work-package id: " + workPackage.id);
    byId.set(workPackage.id, workPackage);
    requireString(workPackage.stage, workPackage.id + ".stage");
    requireString(workPackage.title, workPackage.id + ".title");
    requireString(workPackage.objective, workPackage.id + ".objective");
    requireStringArray(workPackage.prerequisites, workPackage.id + ".prerequisites", true);
    requireStringArray(workPackage.allowedAreas, workPackage.id + ".allowedAreas");
    requireStringArray(
      workPackage.allowedDependencyFamilies,
      workPackage.id + ".allowedDependencyFamilies",
      true
    );
    requireStringArray(workPackage.deliverables, workPackage.id + ".deliverables");
    requireStringArray(workPackage.parityIds, workPackage.id + ".parityIds", true);
    requireStringArray(workPackage.targetedChecks, workPackage.id + ".targetedChecks");
    requireStringArray(workPackage.acceptance, workPackage.id + ".acceptance");
    if (typeof workPackage.legacyMutationAllowed !== "boolean") {
      fail(workPackage.id + ".legacyMutationAllowed must be boolean");
    }
    if (!workPackage.externalVerification || typeof workPackage.externalVerification !== "object") {
      fail(workPackage.id + ".externalVerification is required");
    }
    if (!['none', 'deferred', 'required'].includes(workPackage.externalVerification.mode)) {
      fail(workPackage.id + ".externalVerification.mode is invalid");
    }
    if (workPackage.externalVerification.mode !== "none") {
      requireString(workPackage.externalVerification.blockerId, workPackage.id + ".blockerId");
      requireString(workPackage.externalVerification.deadlineStage, workPackage.id + ".deadlineStage");
    }
    for (const parityId of workPackage.parityIds) {
      if (!knownParityIds.has(parityId)) fail(workPackage.id + " references unknown parity ID " + parityId);
    }
  }

  if (!byId.has(value.firstWorkPackage)) fail("Catalog firstWorkPackage does not exist");
  if (!byId.has(value.terminalWorkPackage)) fail("Catalog terminalWorkPackage does not exist");
  for (const workPackage of value.packages) {
    for (const prerequisite of workPackage.prerequisites) {
      if (!byId.has(prerequisite)) fail(workPackage.id + " has unknown prerequisite " + prerequisite);
    }
    if (workPackage.successor !== null && !byId.has(workPackage.successor)) {
      fail(workPackage.id + " has unknown successor " + String(workPackage.successor));
    }
    if (workPackage.id === value.terminalWorkPackage && workPackage.successor !== null) {
      fail("Terminal work package must have a null successor");
    }
    if (workPackage.id !== value.terminalWorkPackage && typeof workPackage.successor !== "string") {
      fail(workPackage.id + " must have exactly one successor");
    }
  }

  const chain = [];
  const visited = new Set();
  let currentId = value.firstWorkPackage;
  while (currentId !== null) {
    if (visited.has(currentId)) fail("Work-package successor cycle detected at " + currentId);
    visited.add(currentId);
    chain.push(currentId);
    currentId = byId.get(currentId).successor;
  }
  if (chain.at(-1) !== value.terminalWorkPackage) fail("Catalog chain does not end at terminalWorkPackage");
  if (visited.size !== byId.size) {
    const disconnected = [...byId.keys()].filter((id) => !visited.has(id));
    fail("Disconnected work packages: " + disconnected.join(", "));
  }

  const chainIndex = new Map(chain.map((id, index) => [id, index]));
  for (const workPackage of value.packages) {
    for (const prerequisite of workPackage.prerequisites) {
      if (chainIndex.get(prerequisite) >= chainIndex.get(workPackage.id)) {
        fail(workPackage.id + " prerequisite must appear earlier in the catalog chain: " + prerequisite);
      }
    }
    if (
      workPackage.externalVerification.mode === "deferred" &&
      Number(workPackage.externalVerification.deadlineStage) > 11
    ) {
      fail(workPackage.id + " deferred external verification must be due by Stage 11");
    }
  }

  return { byId, chain };
}

function validateState(value, catalogResult) {
  if (value.schemaVersion !== 2) fail("Migration state schemaVersion must be 2");
  if (value.catalogVersion !== 1) fail("Migration state catalogVersion must be 1");
  if (value.program !== "react-nest-rewrite") fail("Migration state program is invalid");
  if (!['planned', 'active', 'blocked', 'complete'].includes(value.programStatus)) {
    fail("Migration state programStatus is invalid");
  }
  requireString(value.activeStage, "Migration state activeStage");
  if (!Array.isArray(value.completedWorkPackages)) {
    fail("Migration state completedWorkPackages must be an array");
  }
  if (new Set(value.completedWorkPackages).size !== value.completedWorkPackages.length) {
    fail("Migration state completedWorkPackages must be unique");
  }
  for (let index = 0; index < value.completedWorkPackages.length; index += 1) {
    if (value.completedWorkPackages[index] !== catalogResult.chain[index]) {
      fail("Completed work packages must be an ordered prefix of the catalog chain");
    }
  }
  const expectedNext = catalogResult.chain[value.completedWorkPackages.length] ?? null;
  if (value.programStatus === "complete") {
    if (expectedNext !== null || value.nextWorkPackage !== null) {
      fail("Complete migration state must have no next work package");
    }
  } else if (value.nextWorkPackage !== expectedNext) {
    fail("Migration state nextWorkPackage must be the next catalog successor: " + expectedNext);
  }
  const nextPackage = value.nextWorkPackage ? catalogResult.byId.get(value.nextWorkPackage) : null;
  if (nextPackage && value.activeStage !== nextPackage.stage) {
    fail("Migration state activeStage must match the next work package stage");
  }
  const completedSet = new Set(value.completedWorkPackages);
  for (const prerequisite of nextPackage?.prerequisites ?? []) {
    if (!completedSet.has(prerequisite)) fail("Next work-package prerequisite is incomplete: " + prerequisite);
  }
  if (value.lastCompletedWorkPackage !== value.completedWorkPackages.at(-1)) {
    fail("lastCompletedWorkPackage must match the completed chain tail");
  }
  if (value.lastVerification?.workPackage !== value.lastCompletedWorkPackage) {
    fail("lastVerification must describe lastCompletedWorkPackage");
  }
  if (!Array.isArray(value.deferredExternalWorkPackages)) {
    fail("deferredExternalWorkPackages must be an array");
  }
  for (const packageId of value.deferredExternalWorkPackages) {
    if (!catalogResult.byId.has(packageId)) fail("Unknown deferred work package: " + packageId);
  }
  if (Number(value.activeStage) >= 11 && value.deferredExternalWorkPackages.length > 0) {
    fail("Deferred external work packages must be closed before Stage 11");
  }
  if (!value.stageStatus || typeof value.stageStatus !== "object") {
    fail("Migration state stageStatus must be an object");
  }
  const catalogStages = new Set([...catalogResult.byId.values()].map((item) => item.stage));
  for (const stage of catalogStages) {
    if (!['not-started', 'in-progress', 'completed', 'blocked'].includes(value.stageStatus[stage])) {
      fail("Migration state stageStatus is invalid for Stage " + stage);
    }
  }
  if (!Array.isArray(value.blockers)) fail("Migration state blockers must be an array");
  const blockerIds = new Set(value.blockers.map((blocker) => blocker?.id));
  for (const workPackage of catalogResult.byId.values()) {
    const blockerId = workPackage.externalVerification.blockerId;
    if (blockerId && !blockerIds.has(blockerId)) {
      fail(workPackage.id + " references blocker missing from migration state: " + blockerId);
    }
  }
  if (!blockerIds.has("BLOCK-CROSS-BORDER-PERSONAL-DATA")) {
    fail("Migration state must retain the cross-border production blocker");
  }
  if (typeof value.cutoverAllowed !== "boolean") fail("Migration state cutoverAllowed must be boolean");
  const openCutoverBlocker = value.blockers.some(
    (blocker) => blocker?.scope === "production-cutover" && blocker?.status === "open"
  );
  if (value.cutoverAllowed && (openCutoverBlocker || value.deferredExternalWorkPackages.length > 0)) {
    fail("Migration state cannot allow cutover while blockers or deferred verification remain");
  }
}

function validateCommitTrailerWhenClean(state) {
  if (!state.lastCompletedWorkPackage) return;
  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  } catch {
    return;
  }
  if (status.trim()) return;
  const message = execFileSync("git", ["log", "-1", "--format=%B"], {
    cwd: root,
    encoding: "utf8"
  });
  assertIncludes(
    message,
    "Work-Package: " + state.lastCompletedWorkPackage,
    "latest commit work-package trailer"
  );
}

function readUtf8(file) {
  const path = resolve(root, file);
  let buffer;
  try {
    buffer = readFileSync(path);
  } catch (error) {
    fail("Missing required governance file: " + file + " (" + error.message + ")");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    fail("Governance file is not valid UTF-8: " + file);
  }
  if (text.includes("\uFFFD")) fail("Governance file contains a replacement character: " + file);
  if (text.includes("\u0000")) fail("Governance file contains a NUL byte: " + file);
  return text;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(label + " is not valid JSON: " + error.message);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(label + " must be a non-empty string");
}

function requireStringArray(value, label, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(label + " must be " + (allowEmpty ? "an array" : "a non-empty array"));
  }
  if (value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(label + " must contain only non-empty strings");
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) fail("Missing " + label + ": " + expected);
}

function assertExcludes(value, unexpected, label) {
  if (value.includes(unexpected)) fail("Found " + label + ": " + unexpected);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
