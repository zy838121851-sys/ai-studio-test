import { buildRuntimeDependencyStateAdaptersFromRuntime } from "./state/runtime-state-dependencies.js";
import { bootstrapAppRuntimeFromDependencyGroups } from "./app-runtime-launch.js?v=20260627-library-bulk-select-1";
import { buildAppRuntimeDependencyGroupsFromInputs } from "./app-runtime-dependency-groups.js";
import { buildAppRuntimeInputsFromRuntimeRefs } from "./app-runtime-ref-builders.js";

export function bootstrapAppRuntimeFromRuntimeRefs({
  runtimeState = {},
  ...refs
}) {
  return bootstrapAppRuntimeFromInputs({
    ...buildAppRuntimeInputsFromRuntimeRefs({
      runtimeState,
      ...refs
    })
  });
}

export function launchAppRuntimeFromRuntimeRefs(runtimeRefs = {}) {
  return bootstrapAppRuntimeFromRuntimeRefs(runtimeRefs);
}

export function bootstrapAppRuntimeFromInputs({
  runtimeState = {},
  stateInputs = {},
  actionInputs = {},
  homeInputs = {},
  workflowInputs = {},
  chatInputs = {},
  aiCoreInputs = {}
}) {
  const runtimeDependencyStateAdapters = buildRuntimeDependencyStateAdaptersFromRuntime(runtimeState);

  const dependenciesByGroup = buildAppRuntimeDependencyGroupsFromInputs({
    stateInputs: {
      ...runtimeDependencyStateAdapters,
      ...stateInputs
    },
    actionInputs,
    homeInputs,
    workflowInputs,
    chatInputs,
    aiCoreInputs
  });

  return bootstrapAppRuntimeFromDependencyGroups(dependenciesByGroup);
}
