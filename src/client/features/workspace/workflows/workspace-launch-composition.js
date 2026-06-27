import { launchWorkspaceAppRuntime } from "../runtime/workspace-app-runtime-launch.js?v=20260627-library-bulk-select-1";

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
