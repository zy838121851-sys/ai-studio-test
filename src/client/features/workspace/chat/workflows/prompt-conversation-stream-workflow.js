import {
  parseStreamEventLine,
  recordHandledStreamEvent,
  setStreamAbortReason
} from "./prompt-stream-debug-utils.js";

export async function runConversationStream({
  conversationId,
  payload,
  onEvent,
  timeoutMs = 0,
  debugRecord = null,
  getCurrentAbort = () => null,
  setCurrentAbort = () => {},
  fetchFn = globalThis.fetch,
  timerApi = globalThis.window || globalThis,
  AbortControllerCtor = globalThis.AbortController,
  TextDecoderCtor = globalThis.TextDecoder,
  logAgentDebug = () => {},
  updateAgentDebugPanel = () => {}
} = {}) {
  getCurrentAbort()?.abort?.();
  const controller = new AbortControllerCtor();
  setCurrentAbort(controller);
  let timedOut = false;
  const safeTimeoutMs = Number(timeoutMs || 0);
  const timer = safeTimeoutMs > 0
    ? timerApi.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, safeTimeoutMs)
    : null;
  try {
    const response = await fetchFn(`/api/conversations/${encodeURIComponent(conversationId)}/runs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload?.message || `Conversation run failed: ${response.status}`);
    }
    const reader = response.body?.getReader?.();
    if (!reader) throw new Error("Conversation stream is not readable");
    const decoder = new TextDecoderCtor();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const text = line.trim();
        if (!text) continue;
        const event = parseStreamEventLine(text, {
          debugRecord,
          logAgentDebug,
          updateAgentDebugPanel
        });
        const shouldContinue = onEvent(event);
        if (!recordHandledStreamEvent(event, shouldContinue, {
          debugRecord,
          logAgentDebug,
          updateAgentDebugPanel
        })) {
          reader.cancel?.().catch?.(() => {});
          return;
        }
      }
    }
    if (buffer.trim()) {
      const event = parseStreamEventLine(buffer.trim(), {
        debugRecord,
        logAgentDebug,
        updateAgentDebugPanel
      });
      const shouldContinue = onEvent(event);
      if (!recordHandledStreamEvent(event, shouldContinue, {
        debugRecord,
        logAgentDebug,
        updateAgentDebugPanel
      })) {
        reader.cancel?.().catch?.(() => {});
        return;
      }
    }
    setStreamAbortReason(debugRecord, "reader completed", { updateAgentDebugPanel });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error("Agent 流程超时，请重试");
      timeoutError.streamTimeout = true;
      setStreamAbortReason(debugRecord, "timeout", { updateAgentDebugPanel });
      throw timeoutError;
    }
    if (error?.name === "AbortError") {
      setStreamAbortReason(debugRecord, "aborted by new run or stop", { updateAgentDebugPanel });
      throw new Error("Conversation run was stopped.");
    }
    throw error;
  } finally {
    if (timer) timerApi.clearTimeout(timer);
    if (getCurrentAbort() === controller) setCurrentAbort(null);
  }
}

export function createConversationStreamRunner({
  timeoutMs = 0,
  runStreamFn = runConversationStream,
  logAgentDebug = () => {},
  updateAgentDebugPanel = () => {}
} = {}) {
  let currentAbort = null;

  return {
    abortCurrentConversation() {
      currentAbort?.abort?.();
      currentAbort = null;
    },
    run(conversationId, payload, onEvent, {
      timeoutMs: runTimeoutMs = timeoutMs,
      debugRecord = null
    } = {}) {
      return runStreamFn({
        conversationId,
        payload,
        onEvent,
        timeoutMs: runTimeoutMs,
        debugRecord,
        getCurrentAbort: () => currentAbort,
        setCurrentAbort: (controller) => {
          currentAbort = controller;
        },
        logAgentDebug,
        updateAgentDebugPanel
      });
    }
  };
}
