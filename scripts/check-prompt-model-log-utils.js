import {
  logSubmittedModel,
  resolveGenerationResultModel,
  warnIfModelMismatch
} from "../src/client/features/workspace/chat/workflows/prompt-model-log-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalWarn = console.warn;
const originalDebug = console.debug;
const originalLocation = globalThis.location;
const warnings = [];
const debugs = [];

console.warn = (...args) => warnings.push(args);
console.debug = (...args) => debugs.push(args);

try {
  assert(resolveGenerationResultModel({ requestedModel: "requested", model: "returned" }, "fallback") === "requested", "Result model resolution should prefer requested models");
  assert(resolveGenerationResultModel({ requestedModel: "", model: "returned" }, "fallback") === "returned", "Result model resolution should fall back to returned models");
  assert(resolveGenerationResultModel({ requestedModel: "", model: "" }, "fallback") === "fallback", "Result model resolution should fall back to selected models");
  let nullResultError = null;
  try {
    resolveGenerationResultModel(null, "fallback");
  } catch (error) {
    nullResultError = error;
  }
  assert(nullResultError instanceof TypeError, "Result model resolution should preserve null result errors");

  warnIfModelMismatch(" seedream ", "seedream", { jobId: "same" });
  assert(warnings.length === 0, "Matching models should not warn");

  warnIfModelMismatch("seedream", "qwen", { job: { id: "job-1" } });
  assert(warnings.length === 1, "Mismatched models should warn once");
  assert(warnings[0][0] === "[models] Response model does not match selected model", "Mismatch warning label should stay stable");
  assert(warnings[0][1].selectedModel === "seedream", "Mismatch warning should trim selected model");
  assert(warnings[0][1].returnedModel === "qwen", "Mismatch warning should trim returned model");
  assert(warnings[0][1].jobId === "job-1", "Mismatch warning should include nested job id");

  setLocationHostname("example.com");
  logSubmittedModel("chat", "seedream");
  assert(debugs.length === 0, "Submitted model logging should stay local-only");

  setLocationHostname("localhost");
  logSubmittedModel("chat", "seedream");
  assert(debugs.length === 1, "Submitted model logging should run on localhost");
  assert(debugs[0][0] === "[models] submitting generation", "Submitted model debug label should stay stable");
  assert(debugs[0][1].surface === "chat", "Submitted model debug should preserve surface");
  assert(debugs[0][1].selectedModel === "seedream", "Submitted model debug should preserve selected model");
  assert(debugs[0][1].payloadModel === "seedream", "Submitted model debug should preserve payload model");
} finally {
  console.warn = originalWarn;
  console.debug = originalDebug;
  restoreLocation();
}

console.log("Prompt model log utility checks passed.");

function setLocationHostname(hostname) {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { hostname }
  });
}

function restoreLocation() {
  if (originalLocation === undefined) {
    delete globalThis.location;
    return;
  }
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: originalLocation
  });
}
