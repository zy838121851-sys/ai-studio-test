export function createSuggestionCard(suggestion) {
  return {
    label: suggestion?.label || "",
    action: suggestion?.action || "",
    payload: suggestion?.payload || {}
  };
}
