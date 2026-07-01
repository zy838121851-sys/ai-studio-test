import { createWorkspaceRuntimeActions } from "./launch-actions-config.js?v=20260628-boot-inline-1";
import { createWorkspaceRuntimeLaunchConfig } from "./launch-config-base.js";
import {
  createWorkspaceRuntimeConstants,
  createWorkspaceRuntimeElements
} from "./launch-elements-config.js";
import {
  createWorkspaceRuntimeStateFromScope,
  createWorkspaceRuntimeStateSettersFromScope
} from "./launch-state-config.js";
import {
  createWorkspaceRuntimeBindings,
  createWorkspaceRuntimeWorkflows
} from "./launch-workflow-bindings-config.js";

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
