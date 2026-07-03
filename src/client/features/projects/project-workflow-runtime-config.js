import { createProjectWorkflowServices } from "./project-workflow-services.js";
import { createProjectWorkflowState } from "./project-workflow-state.js";
import { createProjectWorkflowUi } from "./project-workflow-ui.js";

export function createProjectWorkflowRuntimeConfig({
  state = {},
  elements = {},
  remoteProjectsEnabled = false,
  services = {},
  projectRuntime = null,
  ui = {},
  chat = {},
  createWorkflowState = createProjectWorkflowState,
  createWorkflowServices = createProjectWorkflowServices,
  createWorkflowUi = createProjectWorkflowUi
} = {}) {
  return {
    state: createWorkflowState({ state, elements, remoteProjectsEnabled }),
    services: createWorkflowServices({ remoteProjectsEnabled, services }),
    projectRuntime,
    elements,
    ui: createWorkflowUi({ ui }),
    chat
  };
}
