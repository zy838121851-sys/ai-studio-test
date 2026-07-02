import {
  buildClientFailure,
  classifyGenerationClientError,
  getRetryAfterDelayMs
} from "../src/client/features/workspace/chat/workflows/prompt-error-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failure = buildClientFailure("CODE", "Message", "stage");

assert(failure.failureCode === "CODE", "Client failure should preserve failureCode");
assert(failure.failureMessage === "Message", "Client failure should preserve failureMessage");
assert(failure.stage === "stage", "Client failure should preserve stage");
assert(Object.keys(failure).join(",") === "failureCode,failureMessage,stage", "Client failure shape should stay stable");
assert(getRetryAfterDelayMs(makeResponse("3"), 4000) === 3000, "Retry-After should be interpreted as seconds");
assert(getRetryAfterDelayMs(makeResponse("0"), 4000) === 4000, "Non-positive Retry-After should use fallback");
assert(getRetryAfterDelayMs(makeResponse("invalid"), 2500) === 2500, "Invalid Retry-After should use fallback");

assertFailure(
  classifyGenerationClientError({ status: 401, message: "Authentication required" }),
  { failureCode: "LOGIN_REQUIRED", failureMessage: "Authentication required", stage: "auth" },
  "Auth errors"
);

assertFailure(
  classifyGenerationClientError({ status: 402, message: "Insufficient credits" }),
  { failureCode: "INSUFFICIENT_CREDITS", failureMessage: "Insufficient credits", stage: "billing" },
  "Billing errors"
);

assertFailure(
  classifyGenerationClientError({ status: 404, message: "Project not found" }),
  { failureCode: "PROJECT_NOT_FOUND", failureMessage: "Project not found", stage: "conversation" },
  "Missing project errors"
);

assertFailure(
  classifyGenerationClientError({ message: "save current project failed" }),
  { failureCode: "PROJECT_SAVE_FAILED", failureMessage: "save current project failed", stage: "saveProject" },
  "Project save errors"
);

assertFailure(
  classifyGenerationClientError({ message: "still running" }),
  { failureCode: "JOB_TIMEOUT", failureMessage: "still running", stage: "jobPoll" },
  "Job timeout errors"
);

assertFailure(
  classifyGenerationClientError({ errorCode: "SAVE_FAILED", errorMessage: "output save failed" }),
  { failureCode: "SAVE_FAILED", failureMessage: "output save failed", stage: "outputPersist" },
  "Output save errors"
);

assertFailure(
  classifyGenerationClientError(
    { failureCode: "BAD_PROVIDER", failureMessage: "provider exploded", stage: "provider" },
    { generateRequestStarted: true }
  ),
  { failureCode: "BAD_PROVIDER", failureMessage: "provider exploded", stage: "provider" },
  "Provider errors"
);

assertFailure(
  classifyGenerationClientError({ message: "unknown" }, { generationStage: "conversationResult" }),
  { failureCode: "CONVERSATION_FAILED", failureMessage: "unknown", stage: "conversationResult" },
  "Fallback errors"
);

console.log("Prompt error utility checks passed.");

function assertFailure(actual, expected, label) {
  assert(actual.failureCode === expected.failureCode, `${label} should preserve failureCode`);
  assert(actual.failureMessage === expected.failureMessage, `${label} should preserve failureMessage`);
  assert(actual.stage === expected.stage, `${label} should preserve stage`);
}

function makeResponse(retryAfter) {
  return {
    headers: {
      get(name) {
        return name === "Retry-After" ? retryAfter : "";
      }
    }
  };
}
