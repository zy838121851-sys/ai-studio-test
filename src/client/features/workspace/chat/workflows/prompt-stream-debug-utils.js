export function recordStreamEvent(debugRecord, eventType = "", { updateAgentDebugPanel = () => {} } = {}) {
  if (!debugRecord) return;
  const type = eventType || "unknown";
  debugRecord.lastStreamEventType = type;
  if (!Array.isArray(debugRecord.streamEventTypes)) debugRecord.streamEventTypes = [];
  debugRecord.streamEventTypes.push(type);
  if (debugRecord.streamEventTypes.length > 80) {
    debugRecord.streamEventTypes.splice(0, debugRecord.streamEventTypes.length - 80);
  }
  updateAgentDebugPanel(debugRecord);
}

export function parseStreamEventLine(
  text,
  {
    debugRecord = null,
    logAgentDebug = () => {},
    updateAgentDebugPanel = () => {},
    warn = console.warn
  } = {}
) {
  try {
    const event = JSON.parse(text);
    recordStreamEvent(debugRecord, event?.type || "", { updateAgentDebugPanel });
    logAgentDebug(debugRecord, "stream.event.parsed", {
      type: event?.type || "",
      textLength: text.length
    });
    return event;
  } catch (error) {
    if (debugRecord) {
      debugRecord.streamParseError = error.message || String(error);
      debugRecord.lastStreamEventType = "parse.error";
      updateAgentDebugPanel(debugRecord);
    }
    warn("[chat-agent] stream event parse failed", {
      message: error.message || String(error),
      textLength: text.length
    });
    throw error;
  }
}

export function setStreamAbortReason(debugRecord, reason = "", { updateAgentDebugPanel = () => {} } = {}) {
  if (!debugRecord) return;
  debugRecord.streamAbortReason = reason;
  updateAgentDebugPanel(debugRecord);
}

export function applyStreamFinishedDebugState(debugRecord, { updateAgentDebugPanel = () => {} } = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.streamFinished = true;
  updateAgentDebugPanel(debugRecord);
  return debugRecord;
}

export function applyStreamEventErrorDebugState(
  debugRecord,
  message = "",
  { fallbackMessage = "Conversation run failed", updateAgentDebugPanel = () => {} } = {}
) {
  if (!debugRecord) return debugRecord;
  debugRecord.streamError = message || fallbackMessage;
  updateAgentDebugPanel(debugRecord);
  return debugRecord;
}

export function applyCaughtStreamErrorDebugState(
  debugRecord,
  error,
  { timeoutMessage = "", updateAgentDebugPanel = () => {} } = {}
) {
  if (!debugRecord) return debugRecord;
  debugRecord.streamError = error?.streamTimeout
    ? timeoutMessage
    : (error?.message || String(error));
  debugRecord.streamTimeout = Boolean(error?.streamTimeout);
  updateAgentDebugPanel(debugRecord);
  return debugRecord;
}

export function recordHandledStreamEvent(
  event,
  shouldContinue,
  {
    debugRecord = null,
    logAgentDebug = () => {},
    updateAgentDebugPanel = () => {}
  } = {}
) {
  logAgentDebug(debugRecord, "stream.event.handled", {
    type: event?.type || "",
    shouldContinue
  });
  if (shouldContinue === false) {
    setStreamAbortReason(debugRecord, `handler stopped after ${event?.type || "unknown"}`, {
      updateAgentDebugPanel
    });
    return false;
  }
  return true;
}
