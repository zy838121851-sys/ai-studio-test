let imageGeneratorWorkflowModulePromise = null;

function loadImageGeneratorWorkflowModule() {
  if (!imageGeneratorWorkflowModulePromise) {
    imageGeneratorWorkflowModulePromise = import("./image-generator-workflow.js?v=20260627-library-bulk-select-1");
  }
  return imageGeneratorWorkflowModulePromise;
}

export function createImageGeneratorWorkflow(options = {}) {
  const {
    elements = {}
  } = options;
  const canvasWorld = elements.canvasWorld || globalThis.document?.querySelector?.("#canvasWorld") || null;
  const ownerDocument = canvasWorld?.ownerDocument || globalThis.document || null;
  let workflowPromise = null;

  function getWorkflow() {
    if (!workflowPromise) {
      workflowPromise = loadImageGeneratorWorkflowModule()
        .then(({ createImageGeneratorWorkflow: createWorkflow }) => createWorkflow(options));
    }
    return workflowPromise;
  }

  function getActiveGeneratorNode() {
    return ownerDocument?.activeElement?.closest?.(".node-image-generator")
      || ownerDocument?.querySelector?.(".node-image-generator.selected[data-active-selection='true']")
      || ownerDocument?.querySelector?.(".node-image-generator.selected")
      || null;
  }

  function loadForGeneratorNode(node, { openPopover = false, focusPrompt = false } = {}) {
    if (!node?.matches?.(".node-image-generator")) return;
    getWorkflow().then((workflow) => {
      if (openPopover) {
        workflow.showGeneratorPopover?.(node);
        if (focusPrompt) {
          globalThis.requestAnimationFrame?.(() => {
            ownerDocument
              ?.querySelector?.("#imageGeneratorPopover [data-image-generator-prompt]")
              ?.focus?.({ preventScroll: true });
          });
        }
      } else {
        workflow.positionGeneratorPopover?.();
      }
    }).catch((error) => {
      console.warn("[image-generator] Failed to load workflow", error);
    });
  }

  ownerDocument?.addEventListener?.("canvas:image-generator-selected", (event) => {
    if (workflowPromise) return;
    const node = event.detail?.node;
    loadForGeneratorNode(node, {
      openPopover: Boolean(event.detail?.openPopover),
      focusPrompt: Boolean(event.detail?.focusPrompt)
    });
  });

  ownerDocument?.addEventListener?.("canvas:image-generator-reference-files", (event) => {
    if (workflowPromise) return;
    const node = getActiveGeneratorNode();
    if (!node) return;
    getWorkflow().then((workflow) => (
      workflow.addReferenceFilesToGenerator?.(node, event.detail?.files || [])
    )).catch((error) => {
      console.warn("[image-generator] Failed to load reference workflow", error);
    });
  });

  ownerDocument?.addEventListener?.("canvas:image-generator-add-image-node", (event) => {
    if (workflowPromise) return;
    if (event.detail?.__imageGeneratorWorkflowReplayed) return;
    getWorkflow().then(() => {
      ownerDocument?.dispatchEvent?.(new CustomEvent("canvas:image-generator-add-image-node", {
        detail: {
          ...event.detail,
          __imageGeneratorWorkflowReplayed: true
        }
      }));
    }).catch((error) => {
      console.warn("[image-generator] Failed to load image reference workflow", error);
    });
  });

  canvasWorld?.addEventListener?.("dragover", (event) => {
    if (workflowPromise) return;
    const node = event.target?.closest?.(".node-image-generator");
    if (node) loadForGeneratorNode(node);
  }, true);

  canvasWorld?.addEventListener?.("dblclick", (event) => {
    if (workflowPromise) return;
    const node = event.target?.closest?.(".node-image-generator");
    if (node) loadForGeneratorNode(node, { openPopover: true });
  }, true);

  globalThis.window?.addEventListener?.("focus", () => {
    if (workflowPromise) return;
    if (!ownerDocument?.querySelector?.(".node-loading-image[data-generator-job-id]")) return;
    getWorkflow().catch((error) => {
      console.warn("[image-generator] Failed to load pending preview workflow", error);
    });
  });

  ownerDocument?.addEventListener?.("visibilitychange", () => {
    if (workflowPromise) return;
    if (ownerDocument.visibilityState !== "visible") return;
    if (!ownerDocument.querySelector?.(".node-loading-image[data-generator-job-id]")) return;
    getWorkflow().catch((error) => {
      console.warn("[image-generator] Failed to load pending preview workflow", error);
    });
  });

  return {
    addReferenceFilesToGenerator: (...args) => getWorkflow()
      .then((workflow) => workflow.addReferenceFilesToGenerator?.(...args)),
    hideGeneratorPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.hideGeneratorPopover?.(...args)),
    positionGeneratorPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.positionGeneratorPopover?.(...args)),
    showGeneratorPopover: (...args) => getWorkflow()
      .then((workflow) => workflow.showGeneratorPopover?.(...args))
  };
}
