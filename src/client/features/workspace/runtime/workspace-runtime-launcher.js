import { launchAppRuntimeFromState } from "./app-runtime-bootstrap.js?v=20260628-boot-inline-1";
import { createWorkspaceLauncherContext } from "./launcher-context.js";
import { createWorkspaceLauncherSafeBindings } from "./launcher-safe-bindings.js?v=20260628-boot-inline-1";

export function launchWorkspaceRuntimeFromCompatibilityLayer({
  state = {},
  stateSetters = {},
  constants = {},
  elements = {},
  actions = {},
  workflows = {},
  bindings = {}
} = {}) {
  const safeBindings = createWorkspaceLauncherSafeBindings({ state, actions });

  return launchAppRuntimeFromState({
    stateSetters,
    context: createWorkspaceLauncherContext({
      state,
      stateSetters,
      constants,
      elements,
      actions,
      workflows,
      bindings,
      safeBindings
    })
  });
}
