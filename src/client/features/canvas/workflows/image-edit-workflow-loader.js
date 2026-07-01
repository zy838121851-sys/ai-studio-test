let imageEditWorkflowModulePromise = null;

function loadImageEditWorkflowModule() {
  if (!imageEditWorkflowModulePromise) {
    imageEditWorkflowModulePromise = import("./image-edit-workflow.js?v=20260627-library-bulk-select-1");
  }
  return imageEditWorkflowModulePromise;
}

export function createImageEditWorkflow(options = {}) {
  const imageEditPopover = options.elements?.imageEditPopover
    || globalThis.document?.querySelector?.("#imageEditPopover")
    || null;
  let workflowPromise = null;
  let editingImageNode = null;
  let textEditingImageNode = null;

  function getWorkflow() {
    if (!workflowPromise) {
      workflowPromise = loadImageEditWorkflowModule()
        .then(({ createImageEditWorkflow: createWorkflow }) => createWorkflow(options));
    }
    return workflowPromise;
  }

  function whenLoaded(action) {
    return getWorkflow().then(action);
  }

  function isImageEditPopoverOpen() {
    return Boolean(imageEditPopover?.classList?.contains("open"));
  }

  function isImageTextPanelOpen() {
    return Boolean(globalThis.document?.querySelector?.("#imageTextPanel")?.classList?.contains("open"));
  }

  function hideImageEditPopover(options = {}) {
    editingImageNode = null;
    if (workflowPromise) {
      return workflowPromise.then((workflow) => workflow.hideImageEditPopover?.(options));
    }
    imageEditPopover?.classList?.remove("open");
    imageEditPopover?.querySelectorAll?.(".compact-select.open").forEach((select) => {
      select.classList.remove("open");
      select.querySelector(".compact-select-trigger")?.setAttribute("aria-expanded", "false");
      const menu = select.querySelector(".compact-select-menu");
      if (menu) menu.hidden = true;
    });
    return undefined;
  }

  function hideImageTextPanel() {
    textEditingImageNode = null;
    if (workflowPromise) {
      return workflowPromise.then((workflow) => workflow.hideImageTextPanel?.());
    }
    globalThis.document?.querySelector?.("#imageTextPanel")?.classList?.remove("open", "loading");
    return undefined;
  }

  function positionImageEditPopover() {
    if (!workflowPromise || !isImageEditPopoverOpen()) return undefined;
    return workflowPromise.then((workflow) => workflow.positionImageEditPopover?.());
  }

  function positionImageTextPanel() {
    if (!workflowPromise || !isImageTextPanelOpen()) return undefined;
    return workflowPromise.then((workflow) => workflow.positionImageTextPanel?.());
  }

  return {
    state: {},
    hideImageEditPopover,
    ensureImageTextPanel: (...args) => whenLoaded((workflow) => workflow.ensureImageTextPanel?.(...args)),
    hideImageTextPanel,
    positionImageTextPanel,
    renderImageTextInputs: (...args) => whenLoaded((workflow) => workflow.renderImageTextInputs?.(...args)),
    showImageTextEditor: (node, ...args) => {
      textEditingImageNode = node || null;
      return whenLoaded((workflow) => workflow.showImageTextEditor?.(node, ...args));
    },
    applyImageTextEdits: (...args) => whenLoaded((workflow) => workflow.applyImageTextEdits?.(...args))
      .finally(() => {
        textEditingImageNode = null;
      }),
    showImageEditPopover: (node, ...args) => {
      editingImageNode = node || null;
      return whenLoaded((workflow) => workflow.showImageEditPopover?.(node, ...args));
    },
    positionImageEditPopover,
    handleImageEditSubmit: (...args) => whenLoaded((workflow) => workflow.handleImageEditSubmit?.(...args)),
    handleImageEditCancel: (...args) => whenLoaded((workflow) => workflow.handleImageEditCancel?.(...args))
      .finally(() => {
        editingImageNode = null;
      }),
    isEditingImageNode: (node) => {
      return Boolean(editingImageNode && editingImageNode === node && isImageEditPopoverOpen());
    },
    isImageEditPopoverOpen,
    isTextEditingImageNode: (node) => Boolean(textEditingImageNode && textEditingImageNode === node && isImageTextPanelOpen()),
    isImageTextPanelOpen
  };
}
