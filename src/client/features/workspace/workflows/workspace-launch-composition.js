import { launchWorkspaceAppRuntime } from "../runtime/workspace-app-runtime-launch.js?v=20260628-lightweight-prompt-1";

export function launchWorkspaceAppComposition({
  workspaceAppScope,
  workspaceElements,
  constants,
  runtimes,
  actions,
  services,
  bindings
}) {
  return launchWorkspaceAppRuntime({
    workspaceAppScope,
    workspaceElements,
    constants,
    runtimes,
    actions,
    services,
    bindings
  });
}
