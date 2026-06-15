import {
  applyHomeFileState,
  renderHomeFilePreview as renderHomeFilePreviewList,
  syncHomeModelPicker as syncHomeModelPickerView
} from "../components/home-composer.js";

export function createHomeWorkflow({
  elements = {},
  state = {},
  services = {},
  actions = {}
} = {}) {
  const {
    homePromptForm,
    homePromptInput,
    homeUploadButton,
    homeFileInput,
    homeFilePreview,
    homeModelPicker,
    homeModelButton,
    homeModelSelect,
    homeModelMenu
  } = elements;

  const {
    getHomeImageFiles,
    setHomeImageFiles
  } = state;

  const {
    getImageFilesFromList = (files) => Array.from(files || []),
    escapeHtml = (value) => String(value)
  } = services;

  const {
    recordCanvasEvent = () => {},
    generateHomeProject = async () => {}
  } = actions;

  function syncHomeModelPicker() {
    syncHomeModelPickerView({
      select: homeModelSelect,
      button: homeModelButton,
      menu: homeModelMenu
    });
  }

  function renderHomeFilePreview() {
    renderHomeFilePreviewList({
      container: homeFilePreview,
      files: getHomeImageFiles(),
      escapeHtml,
      onRemove: (index) => {
        const nextFiles = getHomeImageFiles().slice();
        nextFiles.splice(index, 1);
        setHomeFiles(nextFiles);
        homePromptInput?.focus();
      }
    });
  }

  function setHomeFiles(files) {
    const nextFiles = getImageFilesFromList(files || []);
    setHomeImageFiles(nextFiles);
    applyHomeFileState({
      form: homePromptForm,
      uploadButton: homeUploadButton,
      count: nextFiles.length
    });
    renderHomeFilePreview();
  }

  function openHomeFilePicker() {
    if (!homeFileInput) return;
    if (typeof homeFileInput.showPicker === "function") {
      try {
        homeFileInput.showPicker();
        return;
      } catch {
        // Browser may reject showPicker without a direct user gesture.
      }
    }
    homeFileInput.click();
  }

  function toggleModelPicker(event) {
    event?.preventDefault?.();
    if (!homeModelPicker) return;
    const open = !homeModelPicker.classList.contains("open");
    homeModelPicker.classList.toggle("open", open);
    homeModelButton?.setAttribute("aria-expanded", String(open));
  }

  function chooseModel(button) {
    if (!button || !homeModelSelect) return;
    homeModelSelect.value = button.dataset.modelValue;
    syncHomeModelPicker();
    homeModelPicker?.classList.remove("open");
    homeModelButton?.setAttribute("aria-expanded", "false");
    homePromptInput?.focus();
  }

  async function submitHomePrompt(event) {
    event?.preventDefault?.();
    const prompt = homePromptInput?.value.trim() || "";
    const files = getHomeImageFiles().slice();
    if (!prompt && !files.length) return;

    const model = homeModelSelect?.value;
    recordCanvasEvent("prompt_submitted", {
      source: "home",
      hasPrompt: Boolean(prompt),
      imageCount: files.length,
      model
    });

    if (homePromptInput) homePromptInput.value = "";
    setHomeFiles([]);
    await generateHomeProject(prompt, model, files);
  }

  function bindHomeControls() {
    homeUploadButton?.addEventListener("click", openHomeFilePicker);
    homeFileInput?.addEventListener("change", () => {
      setHomeFiles(homeFileInput.files);
      homeFileInput.value = "";
      homePromptInput?.focus();
    });
    homeModelButton?.addEventListener("click", toggleModelPicker);
    homeModelMenu?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-model-value]");
      if (!button) return;
      chooseModel(button);
    });
    homePromptForm?.addEventListener("submit", submitHomePrompt);
  }

  return {
    syncHomeModelPicker,
    renderHomeFilePreview,
    setHomeFiles,
    openHomeFilePicker,
    toggleModelPicker,
    chooseModel,
    submitHomePrompt,
    bindHomeControls
  };
}
