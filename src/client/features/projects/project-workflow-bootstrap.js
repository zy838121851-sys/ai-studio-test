import { createProjectWorkflow } from "./workflows/project-workflow.js";

export function createProjectWorkflowRuntime({
  state,
  services,
  projectRuntime,
  elements,
  ui,
  chat
} = {}) {
  const projectWorkflow = createProjectWorkflow({
    state,
    services,
    projectRuntime,
    elements,
    ui,
    chat
  });

  const {
    getProjectDisplayTitle: getProjectDisplayTitleAlias,
    getProjectDisplayPrompt: getProjectDisplayPromptAlias,
    getProjectPreview: getProjectPreviewAlias
  } = projectWorkflow;

  return {
    projectWorkflow,
    ...projectWorkflow,
    getProjectDisplayTitle: (...args) => getProjectDisplayTitleAlias(...args),
    getProjectDisplayPrompt: (...args) => getProjectDisplayPromptAlias(...args),
    getProjectPreview: (...args) => getProjectPreviewAlias(...args)
  };
}
