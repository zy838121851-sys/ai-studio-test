import {
  buildAgentRuntimeActionSources,
  buildAgentRuntimeDependencyActionInputs
} from "../../agent/runtime/index.js";
import {
  buildAICoreRuntimeSources,
  buildAICoreRuntimeDependencyInputs
} from "../../ai/runtime/index.js";
import { buildChatRuntimeDependencyInputs, buildChatRuntimeSources } from "../chat/runtime/chat-runtime.js";
import { buildHomeRuntimeDependencyInputs, buildHomeRuntimeSources } from "../home/runtime/home-runtime.js";
import {
  buildWorkspaceWorkflowRuntimeDependencyInputs,
  buildWorkspaceWorkflowRuntimeSources
} from "../workflows/runtime/workflow-runtime.js";
import { buildRuntimeDependencyStateInputs } from "./state/runtime-state-dependencies.js";
import { buildRuntimeStateSources } from "./state/runtime-state-builders.js";

export function buildAppRuntimeDependencyInputs(deps = {}) {
  return {
    ...buildRuntimeDependencyStateInputs(deps),
    ...buildAgentRuntimeDependencyActionInputs(deps),
    ...buildHomeRuntimeDependencyInputs(deps),
    ...buildWorkspaceWorkflowRuntimeDependencyInputs(deps),
    ...buildChatRuntimeDependencyInputs(deps),
    ...buildAICoreRuntimeDependencyInputs(deps)
  };
}

export function buildAppRuntimeDependencyGroups(deps = {}) {
  return {
    state: buildRuntimeStateSources(deps),
    action: buildAgentRuntimeActionSources(deps),
    home: buildHomeRuntimeSources(deps),
    workflow: buildWorkspaceWorkflowRuntimeSources(deps),
    chat: buildChatRuntimeSources(deps),
    aicore: buildAICoreRuntimeSources(deps)
  };
}

export function buildAppRuntimeDependencyGroupsFromInputs({
  stateInputs = {},
  actionInputs = {},
  homeInputs = {},
  workflowInputs = {},
  chatInputs = {},
  aiCoreInputs = {}
}) {
  const dependencyInputs = buildAppRuntimeDependencyInputs({
    ...buildRuntimeDependencyStateInputs(stateInputs),
    ...buildAgentRuntimeDependencyActionInputs(actionInputs),
    ...buildHomeRuntimeDependencyInputs(homeInputs),
    ...buildWorkspaceWorkflowRuntimeDependencyInputs(workflowInputs),
    ...buildChatRuntimeDependencyInputs(chatInputs),
    ...buildAICoreRuntimeDependencyInputs(aiCoreInputs)
  });

  return buildAppRuntimeDependencyGroups(dependencyInputs);
}
