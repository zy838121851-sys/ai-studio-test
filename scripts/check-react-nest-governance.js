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
  "docs/architecture/react-nest-migration-state.json"
];

const contents = new Map(requiredFiles.map((file) => [file, readUtf8(file)]));
const agents = contents.get("AGENTS.md");
const prd = contents.get("docs/architecture/saas-governance-prd.md");
const currentState = contents.get("docs/architecture/current-state.md");
const state = parseState(contents.get("docs/architecture/react-nest-migration-state.json"));

assertIncludes(agents, "React + TypeScript", "AGENTS target frontend");
assertIncludes(agents, "NestJS + Fastify", "AGENTS target backend");
assertIncludes(agents, "nextWorkPackage", "AGENTS autonomous state rule");
assertExcludes(agents, "Do not directly switch to Next.js, React, Vue", "obsolete AGENTS framework ban");

assertIncludes(prd, "# AI Studio React/NestJS SaaS 重建 PRD", "PRD title");
assertIncludes(prd, "Stage 0", "PRD Stage 0");
assertIncludes(prd, "Stage 13", "PRD Stage 13");
assertIncludes(prd, "Program Definition Of Done", "PRD completion definition");
assertExcludes(prd, "不直接切 Next.js / React / Vue", "obsolete PRD framework ban");
assertExcludes(prd, "保持原生 ESM，不引入框架", "obsolete PRD target");

if (Buffer.byteLength(currentState, "utf8") > 20000) {
  fail("current-state.md must remain a concise required-reading document");
}

validateState(state);

console.log(
  "React/Nest governance checks passed.",
  "stage=" + state.activeStage,
  "next=" + state.nextWorkPackage,
  "cutoverAllowed=" + state.cutoverAllowed
);

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

  if (text.includes("\uFFFD")) {
    fail("Governance file contains a replacement character: " + file);
  }
  if (text.includes("\u0000")) {
    fail("Governance file contains a NUL byte: " + file);
  }
  return text;
}

function parseState(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("Migration state is not valid JSON: " + error.message);
  }
}

function validateState(state) {
  if (state.schemaVersion !== 1) fail("Migration state schemaVersion must be 1");
  if (state.program !== "react-nest-rewrite") fail("Migration state program is invalid");
  if (!["planned", "active", "blocked", "complete"].includes(state.programStatus)) {
    fail("Migration state programStatus is invalid");
  }
  if (!Number.isInteger(state.activeStage) || state.activeStage < 0 || state.activeStage > 13) {
    fail("Migration state activeStage must be an integer from 0 through 13");
  }
  if (typeof state.nextWorkPackage !== "string" || !state.nextWorkPackage.trim()) {
    fail("Migration state must contain exactly one non-empty nextWorkPackage");
  }
  if (Array.isArray(state.nextWorkPackage)) {
    fail("Migration state nextWorkPackage must not be a list");
  }
  if (!Array.isArray(state.completedWorkPackages)) {
    fail("Migration state completedWorkPackages must be an array");
  }
  if (new Set(state.completedWorkPackages).size !== state.completedWorkPackages.length) {
    fail("Migration state completedWorkPackages must be unique");
  }
  if (state.completedWorkPackages.includes(state.nextWorkPackage)) {
    fail("Migration state nextWorkPackage is already completed");
  }
  if (!state.stageStatus || typeof state.stageStatus !== "object") {
    fail("Migration state stageStatus must be an object");
  }
  for (let stage = 0; stage <= 13; stage += 1) {
    const value = state.stageStatus[String(stage)];
    if (!["not-started", "in-progress", "completed", "blocked"].includes(value)) {
      fail("Migration state stageStatus is invalid for Stage " + stage);
    }
  }
  if (!Array.isArray(state.blockers)) fail("Migration state blockers must be an array");
  const blockerIds = state.blockers.map((blocker) => blocker?.id);
  if (!blockerIds.includes("BLOCK-CROSS-BORDER-PERSONAL-DATA")) {
    fail("Migration state must retain the cross-border production blocker");
  }
  if (state.cutoverAllowed !== false && state.cutoverAllowed !== true) {
    fail("Migration state cutoverAllowed must be boolean");
  }
  const openCutoverBlocker = state.blockers.some(
    (blocker) => blocker?.scope === "production-cutover" && blocker?.status === "open"
  );
  if (state.cutoverAllowed && openCutoverBlocker) {
    fail("Migration state cannot allow cutover while a production-cutover blocker is open");
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
