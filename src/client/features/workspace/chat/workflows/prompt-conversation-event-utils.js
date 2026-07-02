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
