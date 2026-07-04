import {
  buildPromptSubmitBeforeDebugPayload,
  buildPromptSubmitConsoleDebugPayload,
  clearComposerAttachments,
  copyReferenceFiles,
  getChatPreviewDomSummaries,
  inferSubmitTriggerSource,
  resolvePromptSubmitAttachmentState,
  restoreComposerAttachmentsForPromptFailure,
  restoreComposerAttachmentsOnFailure
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

const composerFiles = [blob];
const pendingFiles = [new Blob(["home"], { type: "image/jpeg" })];
const composerSubmitState = resolvePromptSubmitAttachmentState({
  form: {
    __pendingHomeGenerationFiles: pendingFiles,
    __pendingHomeGenerationModel: " gpt-image "
  },
  chatImageFiles: composerFiles,
  domPreviewAttachments: [{ id: "dom" }]
});
assert(composerSubmitState.pendingHomeFiles === pendingFiles, "Submit state should preserve pending home file references");
assert(composerSubmitState.pendingHomeModel === "gpt-image", "Submit state should trim pending home model");
assert(composerSubmitState.currentFiles === composerFiles, "Submit state should preserve composer file references");
assert(composerSubmitState.referenceFiles === composerFiles, "Submit state should prefer composer files over pending home files");
assert(composerSubmitState.selectedSource === "composer", "Submit state should classify composer attachments first");

const pendingHomeSubmitState = resolvePromptSubmitAttachmentState({
  form: {
    __pendingHomeGenerationFiles: pendingFiles
  },
  chatImageFiles: null,
  domPreviewAttachments: [{ id: "dom" }]
});
assert(pendingHomeSubmitState.currentFiles.length === 0, "Submit state should tolerate non-array composer files");
assert(pendingHomeSubmitState.referenceFiles === pendingFiles, "Submit state should fall back to pending home files");
assert(pendingHomeSubmitState.selectedSource === "pending-home", "Submit state should classify pending home attachments second");

assert(
  resolvePromptSubmitAttachmentState({ domPreviewAttachments: [{ id: "dom" }] }).selectedSource === "dom-preview",
  "Submit state should classify DOM preview attachments when no file arrays exist"
);
assert(
  resolvePromptSubmitAttachmentState().selectedSource === "none",
  "Submit state should classify empty attachment state"
);

const submitConsoleDebugPayload = buildPromptSubmitConsoleDebugPayload({
  triggerSource: "quick-action",
  currentFiles: composerFiles,
  pendingHomeFiles: pendingFiles,
  domPreviewAttachments: [{ name: "dom" }]
});
assert(submitConsoleDebugPayload.source === "quick-action", "Submit console debug payload should expose the trigger source");
assert(submitConsoleDebugPayload.composerAttachmentCount === 1, "Submit console debug payload should count composer files");
assert(submitConsoleDebugPayload.pendingHomeAttachmentCount === 1, "Submit console debug payload should count pending home files");
assert(submitConsoleDebugPayload.domPreviewAttachmentCount === 1, "Submit console debug payload should count DOM previews");
assert(submitConsoleDebugPayload.composerAttachments.count === 1, "Submit console debug payload should summarize composer files");
assert(submitConsoleDebugPayload.pendingHomeAttachments.count === 1, "Submit console debug payload should summarize pending home files");
assert(submitConsoleDebugPayload.domPreviewAttachments[0].name === "dom", "Submit console debug payload should preserve DOM previews");

const submitBeforeDebugPayload = buildPromptSubmitBeforeDebugPayload({
  triggerSource: "send-button",
  currentFiles: composerFiles,
  pendingHomeFiles: pendingFiles,
  domPreviewAttachments: [{ name: "dom" }],
  selectedSource: "composer"
});
assert(submitBeforeDebugPayload.triggerSource === "send-button", "Submit before debug payload should expose the trigger source");
assert(submitBeforeDebugPayload.selectedSource === "composer", "Submit before debug payload should expose the selected source");
assert(submitBeforeDebugPayload.composerAttachmentCount === 1, "Submit before debug payload should count composer files");
assert(submitBeforeDebugPayload.pendingHomeAttachmentCount === 1, "Submit before debug payload should count pending home files");
assert(submitBeforeDebugPayload.domPreviewAttachmentCount === 1, "Submit before debug payload should count DOM previews");
assert(submitBeforeDebugPayload.composerAttachments.count === 1, "Submit before debug payload should summarize composer files");
assert(submitBeforeDebugPayload.domPreviewAttachments[0].name === "dom", "Submit before debug payload should preserve DOM previews");

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

const restoredCalls = [];
const restoredFiles = [blob];
restoreComposerAttachmentsOnFailure({
  files: restoredFiles,
  setChatImageFiles(files) {
    restoredCalls.push(["set", files]);
  },
  renderChatImagePreview() {
    restoredCalls.push(["render"]);
  },
  onRestored(files) {
    restoredCalls.push(["restored", files]);
  }
});
assert(restoredCalls.length === 3, "Restoring composer attachments should update files, render preview, and notify");
assert(restoredCalls[0][0] === "set" && restoredCalls[0][1] !== restoredFiles, "Restoring composer attachments should set a copied file list");
assert(restoredCalls[0][1][0] === blob, "Restoring composer attachments should keep original file entries");
assert(restoredCalls[1][0] === "render", "Restoring composer attachments should render preview");
assert(restoredCalls[2][0] === "restored" && restoredCalls[2][1] === restoredFiles, "Restoring composer attachments should notify with original files");
restoreComposerAttachmentsOnFailure({
  files: [],
  setChatImageFiles() {
    restoredCalls.push(["empty-set"]);
  },
  renderChatImagePreview() {
    restoredCalls.push(["empty-render"]);
  }
});
assert(!restoredCalls.some(([name]) => name.startsWith("empty-")), "Restoring composer attachments should ignore empty files");

const promptFailureCalls = [];
const promptFailureRestored = restoreComposerAttachmentsForPromptFailure({
  files: restoredFiles,
  previewNodes: [],
  setChatImageFiles(files) {
    promptFailureCalls.push(["set", files]);
  },
  renderChatImagePreview() {
    promptFailureCalls.push(["render"]);
  },
  logAgentDebug(record, label, data) {
    promptFailureCalls.push(["log", record, label, data]);
  },
  agentDebug: { runId: "run-1" }
});
assert(promptFailureRestored === true, "Prompt failure restoration should report restored attachments");
assert(promptFailureCalls[0][0] === "set" && promptFailureCalls[0][1] !== restoredFiles, "Prompt failure restoration should set a copied file list");
assert(promptFailureCalls[1][0] === "render", "Prompt failure restoration should render restored previews");
assert(promptFailureCalls[2][0] === "log", "Prompt failure restoration should log restored attachments");
assert(promptFailureCalls[2][1].runId === "run-1", "Prompt failure restoration should log with the debug record");
assert(promptFailureCalls[2][2] === "attachments.restored", "Prompt failure restoration should preserve the debug label");
assert(promptFailureCalls[2][3].count === 1, "Prompt failure restoration should log summarized file counts");
assert(promptFailureCalls[2][3].files[0].type === "image/png", "Prompt failure restoration should log summarized files");

const skippedPromptFailureCalls = [];
const promptFailureSkipped = restoreComposerAttachmentsForPromptFailure({
  files: restoredFiles,
  previewNodes: [{}],
  setChatImageFiles(files) {
    skippedPromptFailureCalls.push(["set", files]);
  },
  renderChatImagePreview() {
    skippedPromptFailureCalls.push(["render"]);
  }
});
assert(promptFailureSkipped === false, "Prompt failure restoration should skip when preview nodes exist");
assert(skippedPromptFailureCalls.length === 0, "Prompt failure restoration should not mutate attachments when preview nodes exist");
assert(
  restoreComposerAttachmentsForPromptFailure({
    files: [],
    previewNodes: [],
    setChatImageFiles() {
      skippedPromptFailureCalls.push(["empty-set"]);
    },
    renderChatImagePreview() {
      skippedPromptFailureCalls.push(["empty-render"]);
    }
  }) === false,
  "Prompt failure restoration should skip empty files"
);
assert(!skippedPromptFailureCalls.some(([name]) => name.startsWith("empty-")), "Prompt failure restoration should not mutate empty file lists");

const domSummaries = getChatPreviewDomSummaries(makePreviewRoot([
  makePreviewButton({
    attachmentId: "att-1",
    attachmentName: "reference.png",
    attachmentType: "image/png",
    attachmentSize: "123",
    imageSrc: "data:image/png;base64,abcd",
    imageAlt: "fallback.png"
  }),
  makePreviewButton({
    imageSrc: "blob:http://localhost/one"
  })
]));
assert(domSummaries.length === 2, "DOM preview summaries should include preview buttons");
assert(domSummaries[0].attachmentId === "att-1", "DOM preview summary should preserve attachment id");
assert(domSummaries[0].name === "reference.png", "DOM preview summary should prefer attachment name");
assert(domSummaries[0].type === "image/png", "DOM preview summary should preserve attachment type");
assert(domSummaries[0].mime === "image/png", "DOM preview summary should preserve attachment mime");
assert(domSummaries[0].size === 123, "DOM preview summary should parse attachment size");
assert(domSummaries[0].hasDataUrl === true, "DOM preview summary should detect data URLs");
assert(domSummaries[0].dataUrl === "data:image/png;base64, length=4", "DOM preview summary should summarize data URLs");
assert(domSummaries[1].name === "Reference 2", "DOM preview summary should fall back to indexed name");
assert(domSummaries[1].hasBlob === true, "DOM preview summary should detect blob URLs");
assert(domSummaries[1].size === 0, "DOM preview summary should default empty size to zero");
assert(getChatPreviewDomSummaries({ querySelectorAll: () => [] }).length === 0, "DOM preview summary should handle empty root");

console.log("Prompt input utility checks passed.");

function makeClassList(names = []) {
  return {
    contains(name) {
      return names.includes(name);
    }
  };
}

function makePreviewRoot(buttons = []) {
  return {
    querySelectorAll(selector) {
      return selector === ".chat-image-preview button" ? buttons : [];
    }
  };
}

function makePreviewButton({
  attachmentId = "",
  attachmentName = "",
  attachmentType = "",
  attachmentSize = "",
  imageSrc = "",
  imageAlt = ""
} = {}) {
  return {
    dataset: {
      attachmentId,
      attachmentName,
      attachmentType,
      attachmentSize
    },
    querySelector(selector) {
      if (selector !== "img") return null;
      return {
        src: imageSrc,
        alt: imageAlt
      };
    }
  };
}
