import { buildRuntimeStateInputs } from "./state/runtime-state-builders.js";
import { buildRuntimeStateSources } from "./state/runtime-state-builders.js";
import { buildCanvasViewportRuntimeInputs } from "../../canvas/runtime/viewport-runtime-inputs.js";
import { buildAgentRuntimeActionInputs, buildAgentRuntimeActionSources } from "../../agent/runtime/action-runtime.js";
import { buildAICoreRuntimeInputs, buildAICoreRuntimeSources } from "../../ai/runtime/ai-core-runtime.js";
import { buildChatRuntimeInputs, buildChatRuntimeSources } from "../chat/runtime/chat-runtime.js";
import { buildHomeRuntimeInputs, buildHomeRuntimeSources } from "../home/runtime/home-runtime.js?v=20260627-library-bulk-select-1";
import { buildWorkspaceWorkflowRuntimeInputs, buildWorkspaceWorkflowRuntimeSources } from "../workflows/runtime/workflow-runtime.js";

export function buildAppRuntimeInputs(deps) {
  return {
    ...buildCanvasViewportRuntimeInputs(deps),
    ...buildAgentRuntimeActionInputs(deps),
    ...buildHomeRuntimeInputs(deps),
    ...buildWorkspaceWorkflowRuntimeInputs(deps),
    ...buildChatRuntimeInputs(deps),
    ...buildAICoreRuntimeInputs(deps)
  };
}

export function buildAppRuntimeInputSources(deps = {}) {
  const groupedDeps = deps.state || deps.action || deps.home || deps.workflow || deps.chat || deps.aicore;
  if (groupedDeps) {
    return {
      state: buildRuntimeStateSources(deps.state || {}),
      action: buildAgentRuntimeActionSources(deps.action || {}),
      home: buildHomeRuntimeSources(deps.home || {}),
      workflow: buildWorkspaceWorkflowRuntimeSources(deps.workflow || {}),
      chat: buildChatRuntimeSources(deps.chat || {}),
      aicore: buildAICoreRuntimeSources(deps.aicore || {})
    };
  }

  return {
    state: buildRuntimeStateSources(deps),
    action: buildAgentRuntimeActionSources(deps),
    home: buildHomeRuntimeSources(deps),
    workflow: buildWorkspaceWorkflowRuntimeSources(deps),
    chat: buildChatRuntimeSources(deps),
    aicore: buildAICoreRuntimeSources(deps)
  };
}

export function buildAppRuntimeInputsFromSources(sources) {
  const {
    state = {},
    action = {},
    home = {},
    workflow = {},
    chat = {},
    aicore = {}
  } = sources ?? {};

  return buildAppRuntimeInputs({
    ...buildRuntimeStateInputs(state),
    ...buildAgentRuntimeActionInputs(action),
    ...buildHomeRuntimeInputs(home),
    ...buildWorkspaceWorkflowRuntimeInputs(workflow),
    ...buildChatRuntimeInputs(chat),
    ...buildAICoreRuntimeInputs(aicore)
  });
}
