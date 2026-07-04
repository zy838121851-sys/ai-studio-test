import {
  createConversationStreamRunner
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-stream-workflow.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const calls = [];
const debugRecord = { runId: "run-1" };
const payload = { text: "hello" };
const events = [];
const logAgentDebug = () => {};
const updateAgentDebugPanel = () => {};
const runner = createConversationStreamRunner({
  timeoutMs: 30,
  logAgentDebug,
  updateAgentDebugPanel,
  runStreamFn: async (options) => {
    calls.push(options);
    const controller = {
      aborted: false,
      abort() {
        this.aborted = true;
      }
    };
    options.setCurrentAbort(controller);
    options.onEvent({ type: "message.delta" });
    return { ok: true, controller };
  }
});

const result = await runner.run("conversation-1", payload, (event) => {
  events.push(event);
}, { debugRecord });

assert(result.ok === true, "Conversation stream runner should return the wrapped stream result");
assert(result.controller.aborted === false, "Conversation stream runner should not abort active runs by default");
assert(calls.length === 1, "Conversation stream runner should call the wrapped stream once");
assert(calls[0].conversationId === "conversation-1", "Conversation stream runner should pass conversation ids");
assert(calls[0].payload === payload, "Conversation stream runner should pass payloads by reference");
assert(calls[0].timeoutMs === 30, "Conversation stream runner should use the configured default timeout");
assert(calls[0].debugRecord === debugRecord, "Conversation stream runner should pass debug records");
assert(calls[0].logAgentDebug === logAgentDebug, "Conversation stream runner should pass debug loggers");
assert(calls[0].updateAgentDebugPanel === updateAgentDebugPanel, "Conversation stream runner should pass debug panel updaters");
assert(events[0]?.type === "message.delta", "Conversation stream runner should preserve event handlers");
assert(calls[0].getCurrentAbort() === result.controller, "Conversation stream runner should expose current abort controllers");

runner.abortCurrentConversation();
assert(result.controller.aborted === true, "Conversation stream runner should abort the current run");
assert(calls[0].getCurrentAbort() === null, "Conversation stream runner should clear aborted controllers");

await runner.run("conversation-2", payload, () => {}, {
  timeoutMs: 5,
  debugRecord
});
assert(calls[1].timeoutMs === 5, "Conversation stream runner should allow per-run timeout overrides");

console.log("Prompt conversation stream workflow checks passed.");
