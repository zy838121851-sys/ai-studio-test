export function createWorkspaceRuntimeLaunchConfig({
  stateSetters = {},
  constants = {},
  state = {},
  elements = {},
  actions = {},
  workflows = {},
  bindings = {}
} = {}) {
  return {
    stateSetters,
    constants,
    state,
    elements,
    actions,
    workflows,
    bindings
  };
}
