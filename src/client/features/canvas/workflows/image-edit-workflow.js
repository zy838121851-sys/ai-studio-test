export function createImageEditWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    canvasWorld,
    createImageTextPanel,
    imageEditPopover,
    editImageThumb,
    editAddRef,
    imageEditPrompt
  } = elements;

  const {
    getImageTextEdits = () => [],
    renderImageTextInputs: renderImageTextInputList = () => "",
    positionImageTextPanelElement,
    readImageSourceAsDataUrl = async () => "",
    getZoom = () => 1,
    getSelectedNodes = () => new Set(),
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
    imageEditReferenceNodes: [],
    imageEditDrafts: new WeakMap(),
    imageEditPromptBound: false,
    imageEditReferenceBound: false
  };

  function getImageNodeSrc(node) {
    return node?.querySelector?.(".image-frame img")?.src || "";
  }

  function isReferenceImageNode(node) {
    return Boolean(node?.isConnected && node.classList?.contains("node-image") && getImageNodeSrc(node));
  }

  function getSelectedImageNodes() {
    const selected = typeof getSelectedNodes === "function" ? Array.from(getSelectedNodes() || []) : [];
    const nodes = selected.length
      ? selected
      : Array.from(canvasWorld?.querySelectorAll?.(".node-card.selected") || []);
    return nodes.filter(isReferenceImageNode);
  }

  function normalizeReferenceNodes(nodes = []) {
    const seen = new Set();
    const next = [];
    nodes.forEach((node) => {
      const src = getImageNodeSrc(node);
      if (!src || seen.has(src) || next.length >= 3) return;
      seen.add(src);
      next.push(node);
    });
    return next;
  }

  function renderImageEditReferences() {
    if (!imageEditPopover) return;
    imageEditPopover.querySelectorAll(".edit-reference-thumb").forEach((item) => item.remove());
    const refs = normalizeReferenceNodes(state.imageEditReferenceNodes);
    state.imageEditReferenceNodes = refs;
    if (editImageThumb) {
      editImageThumb.src = getImageNodeSrc(refs[0]) || "";
      editImageThumb.title = refs.length > 1 ? `\u56fe1\uff0c\u5df2\u5f15\u7528 ${refs.length} \u5f20\u53c2\u8003\u56fe` : "\u56fe1\uff0c\u5f53\u524d\u56fe\u7247";
    }
    refs.slice(1).forEach((node, index) => {
      const thumb = document.createElement("img");
      thumb.className = "edit-reference-thumb";
      thumb.src = getImageNodeSrc(node);
      thumb.alt = `\u53c2\u8003\u56fe ${index + 2}`;
      thumb.title = `\u56fe${index + 2}\uff0c\u70b9\u51fb\u79fb\u9664\u53c2\u8003\u56fe`;
      thumb.addEventListener("click", () => {
        state.imageEditReferenceNodes = normalizeReferenceNodes([
          state.imageEditReferenceNodes[0],
          ...state.imageEditReferenceNodes.slice(1).filter((item) => item !== node)
        ]);
        renderImageEditReferences();
      });
      editAddRef?.before(thumb);
    });
    if (editAddRef) {
      editAddRef.disabled = refs.length >= 3;
      editAddRef.title = refs.length >= 3 ? "\u6700\u591a\u5f15\u7528 3 \u5f20\u53c2\u8003\u56fe" : "\u4ece\u5f53\u524d\u9009\u4e2d\u56fe\u7247\u6dfb\u52a0\u53c2\u8003";
      editAddRef.setAttribute("aria-label", editAddRef.title);
    }
  }

  function addSelectedReferences() {
    const current = state.imageEditReferenceNodes.length
      ? state.imageEditReferenceNodes
      : [state.editingImageNode].filter(Boolean);
    const selected = getSelectedImageNodes();
    state.imageEditReferenceNodes = normalizeReferenceNodes([
      current[0],
      ...current.slice(1),
      ...selected.filter((node) => node !== current[0])
    ]);
    renderImageEditReferences();
  }

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
    if (!state.imageEditPromptBound && imageEditPrompt) {
      imageEditPrompt.addEventListener("input", () => {
        saveImageEditDraft();
      });
      state.imageEditPromptBound = true;
    }
    if (!state.imageEditReferenceBound && editAddRef) {
      editAddRef.addEventListener("click", addSelectedReferences);
      state.imageEditReferenceBound = true;
    }
  }

  function hideImageEditPopover({ preserveDraft = true } = {}) {
    if (preserveDraft) saveImageEditDraft();
    imageEditPopover?.classList.remove("open");
    state.editingImageNode = null;
    state.imageEditReferenceNodes = [];
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
    panel.querySelector("[data-text-edit-status]").textContent = "\u6b63\u5728\u8bc6\u522b\u56fe\u7247\u6587\u5b57...";
    panel.querySelector("[data-text-edit-list]").innerHTML = "";
    positionImageTextPanel();
    try {
      const image = await readImageSourceAsDataUrl(img.src);
      const result = await postJsonRequest("/api/extract-image-text", { image });
      renderImageTextInputs(panel, result.texts || result.analysis?.texts || []);
    } catch (error) {
      panel.querySelector("[data-text-edit-status]").textContent = "\u6587\u5b57\u8bc6\u522b\u5931\u8d25\uff1a" + error.message;
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
      panel.querySelector("[data-text-edit-status]").textContent = "\u8bf7\u5148\u4fee\u6539\u6216\u8f93\u5165\u6587\u5b57\u5185\u5bb9\u3002";
      return;
    }
    const prompt = buildImageTextEditPrompt(edits);
    panel.classList.add("loading");
    panel.querySelector("[data-text-edit-status]").textContent = "\u6b63\u5728\u751f\u6210\u6587\u5b57\u4fee\u6539\u7ed3\u679c...";
    await runImageEditCommand(sourceNode, prompt, "\u4fee\u6539\u6587\u5b57", {
      actionType: "text_edit",
      count: 1
    });
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
    state.imageEditReferenceNodes = normalizeReferenceNodes([node, ...getSelectedImageNodes().filter((item) => item !== node)]);
    renderImageEditReferences();
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
    return Promise.resolve(runImageEditCommand(sourceNode, imageEditPrompt.value, "AI Image Editing", {
      referenceNodes: state.imageEditReferenceNodes.slice()
    }))
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
