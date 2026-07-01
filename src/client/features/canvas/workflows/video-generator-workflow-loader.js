let videoGeneratorWorkflowModulePromise = null;

function loadVideoGeneratorWorkflowModule() {
  if (!videoGeneratorWorkflowModulePromise) {
    videoGeneratorWorkflowModulePromise = import("./video-generator-workflow.js");
  }
  return videoGeneratorWorkflowModulePromise;
}

export function createVideoGeneratorWorkflow(options = {}) {
  const {
    elements = {}
  } = options;
  const canvasWorld = elements.canvasWorld || globalThis.document?.querySelector?.("#canvasWorld") || null;
  const ownerDocument = canvasWorld?.ownerDocument || globalThis.document || null;
  let workflowPromise = null;

  function getWorkflow() {
    if (!workflowPromise) {
      workflowPromise = loadVideoGeneratorWorkflowModule()
        .then(({ createVideoGeneratorWorkflow: createWorkflow }) => createWorkflow(options));
    }
    return workflowPromise;
  }

  ownerDocument?.addEventListener?.("canvas:selection-changed", (event) => {
    if (workflowPromise) return;
    const node = event.detail?.activeNode || null;
    if (!node?.matches?.(".node-video")) return;
    getWorkflow().then((workflow) => {
      workflow.showVideoGeneratorPopover?.(node);
    }).catch((error) => {
      console.warn("[video-generator] Failed to load workflow", error);
    });
  });

  return {
    hideVideoGeneratorPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.hideVideoGeneratorPopover?.(...args)),
    showVideoGeneratorPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.showVideoGeneratorPopover?.(...args)),
    positionVideoPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.positionVideoPopover?.(...args))
  };
}
