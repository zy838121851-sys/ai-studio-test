export function bootstrapWorkspaceVisualState(runtime = {}) {
  const documentRoot = runtime.documentRoot || globalThis.document || null;
  const body = documentRoot?.body;
  if (body?.dataset) body.dataset.theme = "light";
  localStorage.removeItem("design-ai-theme");

  runtime.aiCore?.classList.add("agent-disabled", "agent-idle");
  if (runtime.aiCoreHint) runtime.aiCoreHint.textContent = "Click to enable AI Core";
}
