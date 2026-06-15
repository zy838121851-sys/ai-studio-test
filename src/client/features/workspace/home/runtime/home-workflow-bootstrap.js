import { createHomeWorkflow } from "../workflows/home-workflow.js";
import { createHomeWorkflowAccessors } from "../../runtime/workflow-accessors.js";

export function createHomeWorkflowRuntime({
  elements = {},
  state = {},
  services = {},
  actions = {}
} = {}) {
  const homeWorkflow = createHomeWorkflow({
    elements,
    state,
    services,
    actions
  });

  return {
    homeWorkflow,
    ...createHomeWorkflowAccessors(homeWorkflow)
  };
}
