import { launchWorkspaceAppRuntime } from "../runtime/workspace-app-runtime-launch.js";

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
