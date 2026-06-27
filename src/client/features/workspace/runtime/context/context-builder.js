import { createRuntimeStateAccessors } from "./runtime-state-accessors.js";
import { createRuntimeActionsContext } from "../actions-context.js";
import { createRuntimeBindingsContext } from "../bindings-context.js";
import { createRuntimeUIContext } from "../ui-context.js?v=20260627-library-bulk-select-1";
import { createRuntimeCoreContext } from "./core-context.js";
import { createRuntimeCoreStateContext } from "./core-state-context.js";

export function createAppRuntimeContext({
  coreBase,
  coreState,
  stateAccessors,
  ui,
  bindings,
  actions,
  defaultPan
}) {
  return {
    ...createRuntimeCoreContext({
      ...coreBase,
      defaultPan,
      ...createRuntimeCoreStateContext(coreState)
    }),
    ...createRuntimeStateAccessors(stateAccessors),
    ...createRuntimeUIContext({
      ...ui,
      ...createRuntimeBindingsContext(bindings)
    }),
    ...createRuntimeActionsContext(actions)
  };
}

export function buildRuntimeContext({
  defaultPan,
  coreBase,
  coreState,
  stateAccessors,
  ui,
  bindings,
  actions
}) {
  return createAppRuntimeContext({
    defaultPan,
    coreBase,
    coreState,
    stateAccessors,
    ui,
    bindings,
    actions
  });
}
