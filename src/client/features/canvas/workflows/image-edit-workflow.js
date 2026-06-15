export function createImageEditWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    canvasWorld,
    createImageTextPanel,
    imageEditPopover,
    editImageThumb,
    imageEditPrompt
  } = elements;

  const {
    getImageTextEdits = () => [],
    renderImageTextInputs: renderImageTextInputList = () => "",
    positionImageTextPanelElement,
    readImageSourceAsDataUrl = async () => "",
    getZoom = () => 1,
    postJsonRequest = async () => ({}),
    runImageEditCommand = () => Promise.resolve(),
    buildImageTextEditPrompt = (items = []) => "",
    hideCanvasContextMenu = () => {},
    hideAddNodeMenu = () => {},
    selectNode = () => {},
    positionImageEditPopoverElement,
    buildOutputDefaults = {}
  } = services;

  const state = {
    editingImageNode: null,
    textEditingImageNode: null,
    imageEditDrafts: new WeakMap(),
    imageEditPromptBound: false
  };

  function getImageEditDraft(node) {
    if (!node) return "";
    return state.imageEditDrafts.get(node) || "";
  }

  function saveImageEditDraft(node = state.editingImageNode) {
    if (!node || !imageEditPrompt) return;
    const value = imageEditPrompt.value || "";
    if (value) {
      state.imageEditDrafts.set(node, value);
    } else {
      state.imageEditDrafts.delete(node);
    }
  }

  function clearImageEditDraft(node = state.editingImageNode) {
    if (!node) return;
    state.imageEditDrafts.delete(node);
  }

  function bindImageEditDraftInput() {
    if (state.imageEditPromptBound || !imageEditPrompt) return;
    imageEditPrompt.addEventListener("input", () => {
      saveImageEditDraft();
    });
    state.imageEditPromptBound = true;
  }

  function hideImageEditPopover({ preserveDraft = true } = {}) {
    if (preserveDraft) saveImageEditDraft();
    imageEditPopover?.classList.remove("open");
    state.editingImageNode = null;
  }

  function ensureImageTextPanel() {
    let panel = document.querySelector("#imageTextPanel");
    if (panel) return panel;
    if (typeof createImageTextPanel !== "function") return null;
    panel = createImageTextPanel({
      onRefresh: async () => {
        const node = state.textEditingImageNode;
        if (node) {
          await showImageTextEditor(node);
        }
      },
      onClose: () => {
        hideImageTextPanel();
      },
      onApply: async () => {
        await applyImageTextEdits();
      }
    });
    canvasWorld?.appendChild(panel);
    return panel;
  }

  function hideImageTextPanel() {
    document.querySelector("#imageTextPanel")?.classList.remove("open", "loading");
    state.textEditingImageNode = null;
  }

  function positionImageTextPanel() {
    const panel = document.querySelector("#imageTextPanel");
    if (!panel) return;
    if (typeof positionImageTextPanelElement === "function") {
      positionImageTextPanelElement({ panel, node: state.textEditingImageNode });
    }
  }

  function renderImageTextInputs(panel, texts = []) {
    renderImageTextInputList(panel, texts);
  }

  async function showImageTextEditor(node) {
    const img = node?.querySelector(".image-frame img");
    if (!img?.src) return;
    hideImageEditPopover();
    hideCanvasContextMenu();
    hideAddNodeMenu();
    selectNode(node);
    state.textEditingImageNode = node;
    const panel = ensureImageTextPanel();
    if (!panel) return;
    panel.classList.add("open", "loading");
    panel.querySelector("[data-text-edit-status]").textContent = "Reading text from image, please wait...";
    panel.querySelector("[data-text-edit-list]").innerHTML = "";
    positionImageTextPanel();
    try {
      const image = await readImageSourceAsDataUrl(img.src);
      const result = await postJsonRequest("/api/extract-image-text", { image });
      renderImageTextInputs(panel, result.texts || result.analysis?.texts || []);
    } catch (error) {
      panel.querySelector("[data-text-edit-status]").textContent = "Text extraction failed: " + error.message;
      renderImageTextInputs(panel, []);
    } finally {
      panel.classList.remove("loading");
    }
  }

  async function applyImageTextEdits() {
    const panel = document.querySelector("#imageTextPanel");
    const sourceNode = state.textEditingImageNode;
    if (!panel || !sourceNode) return;
    const edits = getImageTextEdits(panel);
    if (!edits.length) {
      panel.querySelector("[data-text-edit-status]").textContent = "Please edit text content first before saving.";
      return;
    }
    const prompt = buildImageTextEditPrompt(edits);
    panel.classList.add("loading");
    panel.querySelector("[data-text-edit-status]").textContent = "AI text edit is running...";
    await runImageEditCommand(sourceNode, prompt, "AI Text Editing");
    hideImageTextPanel();
  }

  function showImageEditPopover(node, presetPrompt = "") {
    const img = node?.querySelector(".image-frame img");
    if (!img) return;
    if (state.editingImageNode && state.editingImageNode !== node) {
      saveImageEditDraft();
    }
    bindImageEditDraftInput();
    state.editingImageNode = node;
    if (editImageThumb) editImageThumb.src = img.src;
    const promptValue = presetPrompt || getImageEditDraft(node);
    if (imageEditPrompt) imageEditPrompt.value = promptValue;
    if (imageEditPopover && canvasWorld && imageEditPopover.parentElement !== canvasWorld) {
      canvasWorld.appendChild(imageEditPopover);
    }
    positionImageEditPopover();
    imageEditPopover?.classList.add("open");
    imageEditPrompt?.focus();
    if (promptValue && imageEditPrompt?.setSelectionRange) imageEditPrompt.setSelectionRange(promptValue.length, promptValue.length);
  }

  function positionImageEditPopover() {
    if (!positionImageEditPopoverElement || !imageEditPopover) return;
    positionImageEditPopoverElement({
      node: state.editingImageNode,
      popover: imageEditPopover,
      zoom: getZoom(),
      ...buildOutputDefaults
    });
  }

  function handleImageEditSubmit() {
    if (!imageEditPrompt) return;
    const sourceNode = state.editingImageNode;
    if (!sourceNode) return;
    saveImageEditDraft(sourceNode);
    return Promise.resolve(runImageEditCommand(sourceNode, imageEditPrompt.value, "AI Image Editing"))
      .then((result) => {
        const results = Array.isArray(result) ? result : [result];
        const hasError = results.some((item) => item?.error);
        if (!hasError) clearImageEditDraft(sourceNode);
        return result;
      });
  }

  function handleImageEditCancel() {
    clearImageEditDraft();
    if (imageEditPrompt) imageEditPrompt.value = "";
    hideImageEditPopover({ preserveDraft: false });
  }

  function isEditingImageNode(node) {
    return state.editingImageNode === node;
  }

  function isImageEditPopoverOpen() {
    return Boolean(imageEditPopover?.classList?.contains("open"));
  }

  function isTextEditingImageNode(node) {
    return state.textEditingImageNode === node;
  }

  function isImageTextPanelOpen() {
    return Boolean(document.querySelector("#imageTextPanel")?.classList?.contains("open"));
  }

  return {
    state,
    hideImageEditPopover,
    ensureImageTextPanel,
    hideImageTextPanel,
    positionImageTextPanel,
    renderImageTextInputs,
    showImageTextEditor,
    applyImageTextEdits,
    showImageEditPopover,
    positionImageEditPopover,
    handleImageEditSubmit,
    handleImageEditCancel,
    isEditingImageNode,
    isImageEditPopoverOpen,
    isTextEditingImageNode,
    isImageTextPanelOpen
  };
}
