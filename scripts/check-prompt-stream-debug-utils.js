import {
  applyCaughtStreamErrorDebugState,
  applyStreamEventErrorDebugState,
  applyStreamFinishedDebugState,
  parseStreamEventLine,
  recordHandledStreamEvent,
  setStreamAbortReason,
  recordStreamEvent
} from "../src/client/features/workspace/chat/workflows/prompt-stream-debug-utils.js";
import {
  runConversationStream
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-stream-workflow.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const record = {
  streamEventTypes: []
};
const updates = [];
recordStreamEvent(record, "message.delta", {
  updateAgentDebugPanel: (nextRecord) => updates.push(nextRecord.lastStreamEventType)
});
assert(record.lastStreamEventType === "message.delta", "Stream event recording should store the last event type");
assert(record.streamEventTypes.length === 1 && record.streamEventTypes[0] === "message.delta", "Stream event recording should append event types");
assert(updates.length === 1 && updates[0] === "message.delta", "Stream event recording should update the debug panel");

recordStreamEvent(record, "", {
  updateAgentDebugPanel: (nextRecord) => updates.push(nextRecord.lastStreamEventType)
});
assert(record.lastStreamEventType === "unknown", "Stream event recording should default empty event types");

const cappedRecord = { streamEventTypes: [] };
for (let index = 0; index < 85; index += 1) {
  recordStreamEvent(cappedRecord, `event-${index}`);
}
assert(cappedRecord.streamEventTypes.length === 80, "Stream event recording should keep only the latest 80 events");
assert(cappedRecord.streamEventTypes[0] === "event-5", "Stream event recording should remove the oldest events first");
assert(cappedRecord.lastStreamEventType === "event-84", "Stream event recording should keep the final event type");

const parsedLogs = [];
const parsedUpdates = [];
const parsedRecord = { streamEventTypes: [] };
const event = parseStreamEventLine("{\"type\":\"message.done\",\"value\":1}", {
  debugRecord: parsedRecord,
  logAgentDebug: (_record, label, data) => parsedLogs.push({ label, data }),
  updateAgentDebugPanel: (nextRecord) => parsedUpdates.push(nextRecord.lastStreamEventType)
});
assert(event.type === "message.done" && event.value === 1, "Stream parsing should return parsed JSON events");
assert(parsedRecord.lastStreamEventType === "message.done", "Stream parsing should record event types");
assert(parsedLogs[0]?.label === "stream.event.parsed", "Stream parsing should preserve debug log labels");
assert(parsedLogs[0]?.data?.textLength === 33, "Stream parsing should log text length");
assert(parsedUpdates.length === 1, "Stream parsing should update debug panels once for parsed events");

const parseErrorRecord = { streamEventTypes: [] };
const warnings = [];
let parseError = null;
try {
  parseStreamEventLine("{bad-json", {
    debugRecord: parseErrorRecord,
    updateAgentDebugPanel: (nextRecord) => updates.push(nextRecord.lastStreamEventType),
    warn: (...args) => warnings.push(args)
  });
} catch (error) {
  parseError = error;
}
assert(parseError, "Stream parsing should rethrow JSON parse errors");
assert(parseErrorRecord.lastStreamEventType === "parse.error", "Stream parsing should mark parse failures");
assert(parseErrorRecord.streamParseError, "Stream parsing should store parse error messages");
assert(warnings[0]?.[0] === "[chat-agent] stream event parse failed", "Stream parsing should preserve warning labels");
assert(warnings[0]?.[1]?.textLength === 9, "Stream parsing warnings should include text length");

const abortRecord = {};
const abortUpdates = [];
setStreamAbortReason(abortRecord, "reader completed", {
  updateAgentDebugPanel: (nextRecord) => abortUpdates.push(nextRecord.streamAbortReason)
});
assert(abortRecord.streamAbortReason === "reader completed", "Stream abort helpers should store abort reasons");
assert(abortUpdates[0] === "reader completed", "Stream abort helpers should update debug panels");

const finishedRecord = {};
const finishedUpdates = [];
assert(
  applyStreamFinishedDebugState(finishedRecord, {
    updateAgentDebugPanel: (nextRecord) => finishedUpdates.push(nextRecord.streamFinished)
  }) === finishedRecord,
  "Stream finished debug sync should return the debug record"
);
assert(finishedRecord.streamFinished === true, "Stream finished debug sync should mark streams as finished");
assert(finishedUpdates[0] === true, "Stream finished debug sync should update debug panels");
assert(applyStreamFinishedDebugState(null) === null, "Stream finished debug sync should ignore missing debug records");

const eventErrorRecord = {};
const eventErrorUpdates = [];
assert(
  applyStreamEventErrorDebugState(eventErrorRecord, "", {
    fallbackMessage: "Conversation run failed",
    updateAgentDebugPanel: (nextRecord) => eventErrorUpdates.push(nextRecord.streamError)
  }) === eventErrorRecord,
  "Stream event error debug sync should return the debug record"
);
assert(eventErrorRecord.streamError === "Conversation run failed", "Stream event error debug sync should use fallback messages");
assert(eventErrorUpdates[0] === "Conversation run failed", "Stream event error debug sync should update debug panels");
applyStreamEventErrorDebugState(eventErrorRecord, "Provider failed");
assert(eventErrorRecord.streamError === "Provider failed", "Stream event error debug sync should preserve event messages");
assert(applyStreamEventErrorDebugState(null, "Provider failed") === null, "Stream event error debug sync should ignore missing debug records");

const caughtErrorRecord = {};
const caughtErrorUpdates = [];
assert(
  applyCaughtStreamErrorDebugState(caughtErrorRecord, new Error("Network failed"), {
    timeoutMessage: "Timed out",
    updateAgentDebugPanel: (nextRecord) => caughtErrorUpdates.push(nextRecord.streamError)
  }) === caughtErrorRecord,
  "Caught stream error debug sync should return the debug record"
);
assert(caughtErrorRecord.streamError === "Network failed", "Caught stream error debug sync should preserve error messages");
assert(caughtErrorRecord.streamTimeout === false, "Caught stream error debug sync should clear timeout flags for normal errors");
assert(caughtErrorUpdates[0] === "Network failed", "Caught stream error debug sync should update debug panels");
applyCaughtStreamErrorDebugState(caughtErrorRecord, { streamTimeout: true, message: "Raw timeout" }, {
  timeoutMessage: "Timed out"
});
assert(caughtErrorRecord.streamError === "Timed out", "Caught stream error debug sync should use timeout messages");
assert(caughtErrorRecord.streamTimeout === true, "Caught stream error debug sync should write timeout flags");
assert(applyCaughtStreamErrorDebugState(null, new Error("Network failed")) === null, "Caught stream error debug sync should ignore missing debug records");

const handledLogs = [];
const continueResult = recordHandledStreamEvent({ type: "message.delta" }, true, {
  debugRecord: abortRecord,
  logAgentDebug: (_record, label, data) => handledLogs.push({ label, data }),
  updateAgentDebugPanel: (nextRecord) => abortUpdates.push(nextRecord.streamAbortReason)
});
assert(continueResult === true, "Handled stream events should continue unless the handler stops");
assert(handledLogs[0]?.label === "stream.event.handled", "Handled stream events should preserve debug log labels");
assert(handledLogs[0]?.data?.type === "message.delta", "Handled stream events should log event types");
assert(handledLogs[0]?.data?.shouldContinue === true, "Handled stream events should log handler results");

const stoppedRecord = {};
const stoppedLogs = [];
const stoppedUpdates = [];
const stoppedResult = recordHandledStreamEvent({ type: "message.done" }, false, {
  debugRecord: stoppedRecord,
  logAgentDebug: (_record, label, data) => stoppedLogs.push({ label, data }),
  updateAgentDebugPanel: (nextRecord) => stoppedUpdates.push(nextRecord.streamAbortReason)
});
assert(stoppedResult === false, "Handled stream events should stop when handlers return false");
assert(stoppedRecord.streamAbortReason === "handler stopped after message.done", "Handled stream events should record stop reasons");
assert(stoppedUpdates[0] === "handler stopped after message.done", "Handled stream events should update debug panels on stop");
assert(stoppedLogs[0]?.data?.shouldContinue === false, "Handled stream events should log stopped handler results");

const streamEvents = [];
const streamLogs = [];
const streamRecord = { streamEventTypes: [] };
let previousAbortCalled = false;
let currentAbort = {
  abort() {
    previousAbortCalled = true;
  }
};
const streamResponse = makeStreamResponse([
  "{\"type\":\"message.delta\",\"text\":\"hel",
  "lo\"}\n{\"type\":\"message.done\"}"
]);
const streamFetchCalls = [];
await runConversationStream({
  conversationId: "conversation 1",
  payload: { prompt: "Hello" },
  onEvent(event) {
    streamEvents.push(event);
    return true;
  },
  debugRecord: streamRecord,
  getCurrentAbort: () => currentAbort,
  setCurrentAbort: (controller) => {
    currentAbort = controller;
  },
  fetchFn: async (url, options = {}) => {
    streamFetchCalls.push({ url, options });
    return streamResponse;
  },
  logAgentDebug: (_record, label, data) => streamLogs.push({ label, data })
});
assert(previousAbortCalled, "Conversation stream runner should abort the previous run");
assert(currentAbort === null, "Conversation stream runner should clear completed current abort controllers");
assert(
  streamFetchCalls[0].url === "/api/conversations/conversation%201/runs",
  "Conversation stream runner should encode conversation ids"
);
assert(streamFetchCalls[0].options.method === "POST", "Conversation stream runner should use POST");
assert(streamFetchCalls[0].options.credentials === "include", "Conversation stream runner should include credentials");
assert(
  streamFetchCalls[0].options.headers["Content-Type"] === "application/json",
  "Conversation stream runner should send JSON content type"
);
assert(
  streamFetchCalls[0].options.body === JSON.stringify({ prompt: "Hello" }),
  "Conversation stream runner should preserve JSON payloads"
);
assert(
  streamEvents.length === 2
    && streamEvents[0].type === "message.delta"
    && streamEvents[0].text === "hello"
    && streamEvents[1].type === "message.done",
  "Conversation stream runner should parse split stream events in order"
);
assert(streamRecord.streamAbortReason === "reader completed", "Conversation stream runner should record completed readers");
assert(
  streamLogs.some((entry) => entry.label === "stream.event.parsed")
    && streamLogs.some((entry) => entry.label === "stream.event.handled"),
  "Conversation stream runner should preserve stream debug logs"
);

const stoppedStreamResponse = makeStreamResponse([
  "{\"type\":\"message.delta\"}\n{\"type\":\"message.done\"}\n"
]);
const stoppedStreamEvents = [];
currentAbort = null;
await runConversationStream({
  conversationId: "conversation-stop",
  payload: {},
  onEvent(event) {
    stoppedStreamEvents.push(event);
    return false;
  },
  getCurrentAbort: () => currentAbort,
  setCurrentAbort: (controller) => {
    currentAbort = controller;
  },
  fetchFn: async () => stoppedStreamResponse
});
assert(stoppedStreamEvents.length === 1, "Conversation stream runner should stop when handlers return false");
assert(stoppedStreamResponse.cancelled === true, "Conversation stream runner should cancel readers when handlers stop");

console.log("Prompt stream debug utility checks passed.");

function makeStreamResponse(chunks = []) {
  let index = 0;
  const encoder = new TextEncoder();
  const response = {
    ok: true,
    status: 200,
    cancelled: false,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) return { done: true };
            const value = encoder.encode(chunks[index]);
            index += 1;
            return { value, done: false };
          },
          cancel() {
            response.cancelled = true;
            return Promise.resolve();
          }
        };
      }
    }
  };
  return response;
}
