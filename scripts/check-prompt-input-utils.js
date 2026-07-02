import {
  clearComposerAttachments,
  copyReferenceFiles,
  inferSubmitTriggerSource
} from "../src/client/features/workspace/chat/workflows/prompt-input-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  inferSubmitTriggerSource({ submitter: { id: "promptSubmit", classList: makeClassList([]) } }, {}) === "send-button",
  "Prompt submit button should be classified as send-button"
);

assert(
  inferSubmitTriggerSource({ submitter: { id: "", classList: makeClassList(["send"]) } }, {}) === "send-button",
  "Send class should be classified as send-button"
);

assert(
  inferSubmitTriggerSource({ submitter: { id: "presetSkill", classList: makeClassList([]) } }, {}) === "skill-button",
  "Preset skill id should be classified as skill-button"
);

assert(
  inferSubmitTriggerSource({ submitter: { id: "", classList: makeClassList([]), closest: (selector) => selector === "#presetSkill" ? {} : null } }, {}) === "skill-button",
  "Preset skill ancestor should be classified as skill-button"
);

assert(
  inferSubmitTriggerSource({ submitter: { dataset: { prompt: "make" }, classList: makeClassList([]) } }, {}) === "quick-action",
  "Prompt dataset should be classified as quick-action"
);

assert(
  inferSubmitTriggerSource({ submitter: null }, { __pendingHomeGenerationFiles: [{}] }) === "quick-action",
  "Pending home files should be classified as quick-action"
);

assert(
  inferSubmitTriggerSource({ submitter: { id: "other", classList: makeClassList([]) } }, {}) === "other",
  "Other submitter should be classified as other"
);

assert(
  inferSubmitTriggerSource({}, {}) === "enter",
  "Missing submitter should be classified as enter"
);

const blob = new Blob(["image"], { type: "image/png" });
const copied = copyReferenceFiles([blob, { name: "not-a-blob" }, null]);
assert(copied.length === 1 && copied[0] === blob, "Reference file copy should keep only Blob instances");
assert(copyReferenceFiles(null).length === 0, "Reference file copy should handle null input");

const calls = [];
clearComposerAttachments({
  setChatImageFiles(files) {
    calls.push(["set", files]);
  },
  renderChatImagePreview() {
    calls.push(["render"]);
  }
});
assert(calls.length === 2, "Clearing composer attachments should update files and render preview");
assert(calls[0][0] === "set" && Array.isArray(calls[0][1]) && calls[0][1].length === 0, "Clearing composer attachments should set an empty file list");
assert(calls[1][0] === "render", "Clearing composer attachments should render preview");

console.log("Prompt input utility checks passed.");

function makeClassList(names = []) {
  return {
    contains(name) {
      return names.includes(name);
    }
  };
}
