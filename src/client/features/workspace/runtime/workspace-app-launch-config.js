import {
  createWorkspaceRuntimeActions,
  createWorkspaceRuntimeBindings,
  createWorkspaceRuntimeConstants,
  createWorkspaceRuntimeElements,
  createWorkspaceRuntimeLaunchConfig,
  createWorkspaceRuntimeStateFromScope,
  createWorkspaceRuntimeStateSettersFromScope,
  createWorkspaceRuntimeWorkflows
} from "./workspace-runtime-launch-config.js?v=20260628-lightweight-prompt-1";

export function createWorkspaceAppLaunchConfig({
  workspaceAppScope,
  workspaceElements,
  constants = {},
  actions = {},
  workflows = {},
  bindings = {}
} = {}) {
  return createWorkspaceRuntimeLaunchConfig({
    stateSetters: createWorkspaceRuntimeStateSettersFromScope(workspaceAppScope),
    constants: createWorkspaceRuntimeConstants(constants),
    state: createWorkspaceRuntimeStateFromScope(workspaceAppScope),
    elements: createWorkspaceRuntimeElements(workspaceElements),
    actions: createWorkspaceRuntimeActions(actions),
    workflows: createWorkspaceRuntimeWorkflows(workflows),
    bindings: createWorkspaceRuntimeBindings(bindings)
  });
}
