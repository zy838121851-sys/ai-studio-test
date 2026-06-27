import { buildAppRuntimeRefGroups, buildAppRuntimeRefsFromState, launchAppRuntimeFromRuntimeRefs } from "./app-runtime-dependencies.js";
import { bootstrapAppRuntimeFromInputs } from "./app-runtime-host.js?v=20260627-library-bulk-select-1";
import { buildAppRuntimeInputSources, buildAppRuntimeInputsFromSources } from "./app-runtime-inputs.js";

export function buildAppRuntimeConfigFromGroups({
  stateBindings = {},
  actionBindings = {},
  homeBindings = {},
  workflowBindings = {},
  chatBindings = {},
  aiCoreBindings = {}
} = {}) {
  return buildAppRuntimeRefsFromState(
    buildAppRuntimeRefGroups({
      stateBindings,
      actionBindings,
      homeBindings,
      workflowBindings,
      chatBindings,
      aiCoreBindings
    })
  );
}

export function launchAppRuntimeFromGroups(groupBindings = {}) {
  return launchAppRuntimeFromRuntimeRefs(
    buildAppRuntimeConfigFromGroups(groupBindings)
  );
}

export function bootstrapAppRuntimeFromInputSources(sources) {
  const appRuntimeInputs = buildAppRuntimeInputsFromSources(sources);
  return bootstrapAppRuntimeFromInputs(appRuntimeInputs);
}

export function bootstrapAppRuntimeFromDependencyGroups(dependencyGroups = {}) {
  const appRuntimeInputSources = buildAppRuntimeInputSources(dependencyGroups);
  return bootstrapAppRuntimeFromInputSources(appRuntimeInputSources);
}

export const bootstrapAppRuntimeFromDependencies = bootstrapAppRuntimeFromDependencyGroups;
