import {
  applyHomeFileState,
  renderHomeFilePreview as renderHomeFilePreviewList,
  syncHomeModelPicker as syncHomeModelPickerView
} from "../components/home-composer.js";
import {
  DEFAULT_IMAGE_MODEL,
  resolveImageModelId
} from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";

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

  let selectedHomeFiles = [];

  function getSelectedHomeFiles() {
    const stateFiles = typeof getHomeImageFiles === "function" ? getHomeImageFiles() : [];
    return selectedHomeFiles.length ? selectedHomeFiles : Array.from(stateFiles || []);
  }

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
      files: getSelectedHomeFiles(),
      escapeHtml,
      onRemove: (index) => {
        const nextFiles = getSelectedHomeFiles().slice();
        nextFiles.splice(index, 1);
        setHomeFiles(nextFiles);
        homePromptInput?.focus();
      }
    });
  }

  function setHomeFiles(files) {
    const nextFiles = getImageFilesFromList(files || []).slice(0, 3);
    selectedHomeFiles = nextFiles;
    setHomeImageFiles(nextFiles);
    applyHomeFileState({
      form: homePromptForm,
      uploadButton: homeUploadButton,
      count: nextFiles.length
    });
    renderHomeFilePreview();
  }

  function addHomeFiles(files) {
    const incomingFiles = getImageFilesFromList(files || []);
    if (!incomingFiles.length) return;
    setHomeFiles([...getSelectedHomeFiles(), ...incomingFiles]);
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
    homeModelSelect.dataset.modelUserSelected = "true";
    homeModelSelect.dataset.selectedModelId = homeModelSelect.value;
    homeModelSelect.dispatchEvent(new Event("change", { bubbles: true }));
    syncHomeModelPicker();
    homeModelPicker?.classList.remove("open");
    homeModelButton?.setAttribute("aria-expanded", "false");
    homePromptInput?.focus();
  }

  function getSelectedHomeModel() {
    if (!homeModelSelect) return DEFAULT_IMAGE_MODEL;
    const selectedModel = homeModelSelect.dataset.selectedModelId || homeModelSelect.value;
    const model = resolveImageModelId(selectedModel, "home");
    if (homeModelSelect.value !== model) {
      homeModelSelect.value = model;
      homeModelSelect.dataset.selectedModelId = model;
      syncHomeModelPicker();
    }
    return model;
  }

  async function submitHomePrompt(event) {
    event?.preventDefault?.();
    const prompt = homePromptInput?.value.trim() || "";
    const files = getSelectedHomeFiles().slice();
    if (!prompt && !files.length) return;

    const model = getSelectedHomeModel();
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
      addHomeFiles(homeFileInput.files);
      homeFileInput.value = "";
      homePromptInput?.focus();
    });
    homeModelButton?.addEventListener("click", toggleModelPicker);
    homeModelMenu?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-model-value]");
      if (!button) return;
      chooseModel(button);
    });
    homeModelMenu?.addEventListener("wheel", (event) => {
      event.stopPropagation();
    }, { passive: true });
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
