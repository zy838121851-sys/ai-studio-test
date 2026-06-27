import { buildAppRuntimeBootstrapGroups } from "./app-runtime-groups.js?v=20260627-library-bulk-select-1";
import { launchAppRuntimeFromGroups } from "./app-runtime-launch.js?v=20260627-library-bulk-select-1";
import { buildRuntimeBootstrapStateSetters } from "./state/runtime-state-bootstrap.js";

function hasPrebuiltBootstrapBindings(context = {}) {
  return Boolean(
    context.stateBindings ||
      context.actionBindings ||
      context.homeBindings ||
      context.workflowBindings ||
      context.chatBindings ||
      context.aiCoreBindings
  );
}

function normalizeAppRuntimeBootstrapContext(context = {}) {
  if (hasPrebuiltBootstrapBindings(context)) {
    return context;
  }
  return buildAppRuntimeBootstrapGroups(context);
}

export function buildAppRuntimeBootstrapContext(context = {}) {
  return normalizeAppRuntimeBootstrapContext(context);
}

export function launchAppRuntimeFromContext(context = {}) {
  return launchAppRuntimeFromGroups(
    normalizeAppRuntimeBootstrapContext(context)
  );
}

export function launchAppRuntimeFromState({
  stateSetters = {},
  context = {}
} = {}) {
  return launchAppRuntimeFromContext({
    ...context,
    ...buildRuntimeBootstrapStateSetters(stateSetters)
  });
}
