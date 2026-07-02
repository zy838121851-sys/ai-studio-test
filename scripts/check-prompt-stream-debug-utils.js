import {
  parseStreamEventLine,
  recordHandledStreamEvent,
  setStreamAbortReason,
  recordStreamEvent
} from "../src/client/features/workspace/chat/workflows/prompt-stream-debug-utils.js";

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

console.log("Prompt stream debug utility checks passed.");
