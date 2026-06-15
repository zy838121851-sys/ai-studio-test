import { launchAppRuntimeFromState } from "./app-runtime-bootstrap.js";
import { createWorkspaceLauncherContext } from "./launcher-context.js";
import { createWorkspaceLauncherSafeBindings } from "./launcher-safe-bindings.js";

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
