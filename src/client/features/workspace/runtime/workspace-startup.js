export function initializeWorkspaceRuntimeView(runtime = {}) {
  runtime.renderAssets?.();
  runtime.renderProjectLibrary?.();
  runtime.renderHomeHistory?.();
  runtime.syncHomeModelPicker?.();
  runtime.updateProjectTitle?.(runtime.getActiveProject?.());
  runtime.setChatCollapsed?.(true);
  runtime.showView?.("home");
  runtime.applyTransform?.();
}
