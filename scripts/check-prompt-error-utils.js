import { buildClientFailure } from "../src/client/features/workspace/chat/workflows/prompt-error-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failure = buildClientFailure("CODE", "Message", "stage");

assert(failure.failureCode === "CODE", "Client failure should preserve failureCode");
assert(failure.failureMessage === "Message", "Client failure should preserve failureMessage");
assert(failure.stage === "stage", "Client failure should preserve stage");
assert(Object.keys(failure).join(",") === "failureCode,failureMessage,stage", "Client failure shape should stay stable");

console.log("Prompt error utility checks passed.");
