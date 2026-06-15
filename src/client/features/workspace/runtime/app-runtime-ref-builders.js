import {
  buildAgentRuntimeActionRefGroup,
  buildAgentRuntimeDependencyActionInputs
} from "../../agent/runtime/index.js";
import {
  buildAICoreRuntimeRefGroup,
  buildAICoreRuntimeDependencyInputs
} from "../../ai/runtime/index.js";
import { buildChatRuntimeDependencyInputs, buildChatRuntimeRefGroup } from "../chat/runtime/chat-runtime.js";
import { buildHomeRuntimeDependencyInputs, buildHomeRuntimeRefGroup } from "../home/runtime/home-runtime.js";
import {
  buildWorkspaceWorkflowRuntimeDependencyInputs,
  buildWorkspaceWorkflowRuntimeRefGroup
} from "../workflows/runtime/workflow-runtime.js";
import { buildRuntimeDependencyStateInputs } from "./state/runtime-state-dependencies.js";
import {
  buildRuntimeStateForAppRuntime,
  buildRuntimeStateRefGroup
} from "./state/runtime-state-builders.js";

export function buildAppRuntimeInputsFromRuntimeRefs({
  runtimeState = {},
  ...refs
}) {
  const {
    state = {},
    action = {},
    home = {},
    workflow = {},
    chat = {},
    aiCore = {},
    ...directInputs
  } = refs;

  const legacyRuntimeState = {
    ...runtimeState,
    ...state,
    ...directInputs
  };
  return {
    runtimeState,
    stateInputs: buildRuntimeDependencyStateInputs(legacyRuntimeState),
    actionInputs: buildAgentRuntimeDependencyActionInputs({
      ...action,
      ...directInputs
    }),
    homeInputs: buildHomeRuntimeDependencyInputs({
      ...home,
      ...directInputs
    }),
    workflowInputs: buildWorkspaceWorkflowRuntimeDependencyInputs({
      ...workflow,
      ...directInputs
    }),
    chatInputs: buildChatRuntimeDependencyInputs({
      ...chat,
      ...directInputs
    }),
    aiCoreInputs: buildAICoreRuntimeDependencyInputs({
      ...aiCore,
      ...directInputs
    })
  };
}

export function buildAppRuntimeRefGroups({
  stateBindings = {},
  actionBindings = {},
  homeBindings = {},
  workflowBindings = {},
  chatBindings = {},
  aiCoreBindings = {}
} = {}) {
  const stateGroup = buildRuntimeStateRefGroup(stateBindings);

  return {
    runtimeState: stateGroup.runtimeState,
    state: stateGroup.state,
    action: buildAgentRuntimeActionRefGroup(actionBindings),
    home: buildHomeRuntimeRefGroup(homeBindings),
    workflow: buildWorkspaceWorkflowRuntimeRefGroup(workflowBindings),
    chat: buildChatRuntimeRefGroup(chatBindings),
    aiCore: buildAICoreRuntimeRefGroup(aiCoreBindings)
  };
}

export function buildAppRuntimeRefs({
  runtimeState = {},
  state = {},
  action = {},
  home = {},
  workflow = {},
  chat = {},
  aiCore = {}
} = {}) {
  return {
    runtimeState,
    ...buildRuntimeDependencyStateInputs({
      ...runtimeState,
      ...state
    }),
    ...buildAgentRuntimeDependencyActionInputs(action),
    ...buildHomeRuntimeDependencyInputs(home),
    ...buildWorkspaceWorkflowRuntimeDependencyInputs(workflow),
    ...buildChatRuntimeDependencyInputs(chat),
    ...buildAICoreRuntimeDependencyInputs(aiCore)
  };
}

export function buildAppRuntimeRefsFromState({
  runtimeState = {},
  state = {},
  action = {},
  home = {},
  workflow = {},
  chat = {},
  aiCore = {}
} = {}) {
  return buildAppRuntimeRefs({
    runtimeState: buildRuntimeStateForAppRuntime(runtimeState),
    state,
    action,
    home,
    workflow,
    chat,
    aiCore
  });
}
