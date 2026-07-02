import {
  capitalize
} from "./video-generator-option-utils.js";

export function saveVideoDraftState(node, {
  controls = {},
  optionKinds = [],
  getOptionValue = () => ""
} = {}) {
  if (!node) return;
  node._videoGeneratorPromptDraft = controls.promptInput?.value || "";
  node.dataset.videoGeneratorModel = controls.modelSelect?.value || "";
  optionKinds.forEach((kind) => {
    const value = getOptionValue(kind);
    if (value) node.dataset[`videoGenerator${capitalize(kind)}`] = value;
  });
}

export function restoreVideoDraftState(node, controls = {}) {
  if (controls.promptInput) controls.promptInput.value = node?._videoGeneratorPromptDraft || "";
  if (controls.modelSelect && node?.dataset?.videoGeneratorModel) {
    controls.modelSelect.dataset.selectedModelId = node.dataset.videoGeneratorModel;
  }
}

export function setVideoBusyState(node, popover, busy) {
  if (!node) return;
  node.dataset.videoGeneratorBusy = busy ? "true" : "false";
  popover?.querySelectorAll?.("button, select, textarea, input").forEach((control) => {
    if (control.matches("[data-video-generator-reference-input]")) return;
    control.disabled = busy;
  });
}

export function isVideoGenerationBusy(node) {
  return node?.dataset?.videoGeneratorBusy === "true";
}

export function setVideoStatusText(status, text = "") {
  if (status) status.textContent = text;
}
