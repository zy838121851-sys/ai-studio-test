export function getGenerationToolNameFromEvent(event = {}) {
  const names = [
    event.toolCall?.name,
    event.tool?.name,
    event.name,
    ...(Array.isArray(event.toolCalls) ? event.toolCalls.map((item) => item?.name) : []),
    ...(Array.isArray(event.message?.toolCalls) ? event.message.toolCalls.map((item) => item?.name) : [])
  ];
  return names.map((name) => String(name || "").trim()).find(isGenerationTool) || "";
}

export function isGenerationTool(name = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(name || "").trim());
}

export function isGenerationIntent(intent = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(intent || "").trim());
}

export function buildConversationRunPayload({
  runId = "",
  prompt = "",
  model = "",
  attachments = [],
  images = [],
  files = [],
  canvasContext = {}
} = {}) {
  return {
    runId,
    text: prompt,
    model,
    mode: "auto",
    attachments: attachments.length ? attachments : images.map((dataUrl, index) => ({
      type: files[index]?.type || "image",
      name: files[index]?.name || `Reference ${index + 1}`,
      source: "upload",
      dataUrl
    })),
    canvasContext
  };
}

export function shouldEnterMessageDoneExecution({
  shouldGenerate = false,
  autoExecute = false,
  runId = "",
  activeRunId = ""
} = {}) {
  return Boolean(shouldGenerate && autoExecute && isActiveRun({ runId, activeRunId }));
}

export function getMessageDoneSkipReason({
  shouldGenerate = false,
  autoExecute = false,
  runId = "",
  activeRunId = ""
} = {}) {
  if (!isActiveRun({ runId, activeRunId })) return "skipped because runId mismatch";
  if (!autoExecute) return "skipped because autoExecute false";
  if (!shouldGenerate) return "skipped because shouldGenerate false";
  return "";
}

export function buildMessageDoneReceivedPayload(details = {}) {
  const {
    runId = "",
    activeRunId = "",
    intent = "",
    shouldGenerate = false,
    generationType = "",
    autoExecute = false,
    generationStarted = false
  } = details;
  const payload = {
    runId,
    activeRunId,
    intent,
    shouldGenerate: Boolean(shouldGenerate),
    generationType,
    autoExecute: Boolean(autoExecute),
    generationStarted: Boolean(generationStarted),
    enterExecuteGeneration: shouldEnterMessageDoneExecution({
      shouldGenerate,
      autoExecute,
      runId,
      activeRunId
    }),
    skipReason: getMessageDoneSkipReason({
      shouldGenerate,
      autoExecute,
      runId,
      activeRunId
    })
  };
  if (Object.prototype.hasOwnProperty.call(details, "taskType")) payload.taskType = details.taskType || "";
  if (Object.prototype.hasOwnProperty.call(details, "promptStrategy")) payload.promptStrategy = details.promptStrategy || "";
  return payload;
}

function isActiveRun({ runId = "", activeRunId = "" } = {}) {
  return !runId || activeRunId === runId;
}
