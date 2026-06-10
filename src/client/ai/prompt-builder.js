export function buildImagePrompt({ userPrompt = "", references = [], intent = "" } = {}) {
  return {
    prompt: [intent, userPrompt].filter(Boolean).join("\n"),
    references
  };
}

export function buildSuggestionPrompt(context) {
  return {
    role: "hidden_canvas_agent",
    context
  };
}
