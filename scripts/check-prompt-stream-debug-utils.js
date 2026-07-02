import {
  parseStreamEventLine,
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

console.log("Prompt stream debug utility checks passed.");
