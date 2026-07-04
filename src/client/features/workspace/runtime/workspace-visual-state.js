export function bootstrapWorkspaceVisualState(runtime = {}) {
  const documentRoot = runtime.documentRoot || globalThis.document || null;
  const body = documentRoot?.body;
  if (body?.dataset) body.dataset.theme = "light";
  localStorage.removeItem("design-ai-theme");
}
