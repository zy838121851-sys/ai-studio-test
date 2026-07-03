export function bindProjectAuthSync({
  target = globalThis.window,
  workflowRuntime = {},
  runtimeBootstrap = {},
  state = {}
} = {}) {
  const handleAuthChanged = (event) => {
    if (event.detail?.user) {
      workflowRuntime.syncRemoteProjects?.();
      return;
    }
    runtimeBootstrap.projectRuntime?.replace?.([]);
    state.setProjects?.([]);
    state.setActiveProjectIdInMemory?.("");
    workflowRuntime.renderProjectLibrary?.();
    workflowRuntime.renderHomeHistory?.();
    workflowRuntime.updateProjectTitle?.(null);
  };

  target?.addEventListener?.("ai-studio-auth-changed", handleAuthChanged);
  return () => target?.removeEventListener?.("ai-studio-auth-changed", handleAuthChanged);
}
