let modelViewerWorkflowPromise = null;

function loadModelViewerWorkflow() {
  if (!modelViewerWorkflowPromise) {
    modelViewerWorkflowPromise = import("./model-viewer-workflow.js");
  }
  return modelViewerWorkflowPromise;
}

export function createModelViewerWorkflow(options = {}) {
  let workflowPromise = null;

  async function getWorkflow() {
    if (!workflowPromise) {
      workflowPromise = loadModelViewerWorkflow()
        .then(({ createModelViewerWorkflow: createWorkflow }) => createWorkflow(options));
    }
    return workflowPromise;
  }

  return {
    async initModelViewer(...args) {
      const workflow = await getWorkflow();
      return workflow.initModelViewer(...args);
    }
  };
}
