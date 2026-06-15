export function createProjectWorkflowAccessors(projectWorkflow = {}) {
  return {
    getProjectDisplayTitle: (...args) => projectWorkflow.getProjectDisplayTitle?.(...args),
    getProjectDisplayPrompt: (...args) => projectWorkflow.getProjectDisplayPrompt?.(...args),
    getProjectPreview: (...args) => projectWorkflow.getProjectPreview?.(...args)
  };
}

export function createHomeWorkflowAccessors(homeWorkflow = {}) {
  return {
    renderHomeFilePreview: (...args) => homeWorkflow.renderHomeFilePreview?.(...args),
    setHomeFiles: (...args) => homeWorkflow.setHomeFiles?.(...args),
    openHomeFilePicker: (...args) => homeWorkflow.openHomeFilePicker?.(...args)
  };
}
