import { createHomeWorkflow } from "../workflows/home-workflow.js";

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
    renderHomeFilePreview: (...args) => homeWorkflow.renderHomeFilePreview?.(...args),
    setHomeFiles: (...args) => homeWorkflow.setHomeFiles?.(...args),
    openHomeFilePicker: (...args) => homeWorkflow.openHomeFilePicker?.(...args)
  };
}
