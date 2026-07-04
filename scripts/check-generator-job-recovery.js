import { readFileSync } from "node:fs";
import {
  buildRecoveredGeneratorPreviewItems,
  getGeneratorPreviewDescription,
  getGeneratorPreviewNodeWidth,
  getGeneratorProgressStatusText,
  getRecoveredGeneratorPreviewReplacementMeta,
  getRecoveredGeneratorPreviewUrl,
  markGeneratorPreviewFailed,
  updateGeneratorPreviewStatus
} from "../src/client/features/canvas/workflows/image-generator-preview-job-utils.js";
import {
  getGeneratedImagePlacement,
  getGeneratorReplacementPlacement
} from "../src/client/features/canvas/workflows/image-generator-placement-utils.js";
import {
  closeGeneratorCustomSelects,
  createGeneratorCustomSelect,
  getGeneratorCountSelectState,
  renderGeneratorSelectOptions,
  toggleGeneratorCustomSelect
} from "../src/client/features/canvas/workflows/image-generator-select-utils.js";
import {
  resolveGeneratorOutputSize,
  syncGeneratorFrameToRatio
} from "../src/client/features/canvas/workflows/image-generator-sizing-utils.js";
import {
  applyGeneratedImageNodeResult,
  applyGeneratedImageNodeSize,
  applyPersistedGeneratedImageNodeResult,
  buildGeneratedImageNodeOptions,
  getRequiredGeneratorResultUrl,
  getRequiredGeneratorResultUrls,
  getGeneratorResultTitle,
  shouldUseImmediateGeneratorResult
} from "../src/client/features/canvas/workflows/image-generator-result-utils.js";
import {
  buildInitialGeneratorJobPayload,
  delayGeneratorJobPoll,
  getGeneratorJobRequestError,
  getGeneratorJobStatusPath,
  getMissingGeneratorUrlRetryState,
  getTerminalGeneratorJobPollDecision,
  mergeGeneratorJobPayload
} from "../src/client/features/canvas/workflows/image-generator-job-polling-utils.js";
import {
  readGeneratorReferenceFromImageNode,
  readGeneratorReferenceFiles
} from "../src/client/features/canvas/workflows/image-generator-reference-utils.js";
import {
  getGeneratorBatchCount,
  getGeneratorControls,
  isMidjourneyGeneratorModel,
  resolveGeneratorModelValue
} from "../src/client/features/canvas/workflows/image-generator-control-state-utils.js";
import {
  applyGeneratorResult,
  hasGeneratorDropData,
  removeGeneratorReference,
  renderGeneratorReferences,
  resetGeneratorInput,
  setGeneratorBusy,
  setGeneratorReferences,
  updateGeneratorStatus
} from "../src/client/features/canvas/workflows/image-generator-dom-state-utils.js";
import {
  buildGeneratorJobPollLog,
  buildSubmittedGeneratorModelLog,
  isLocalGeneratorDebugHost,
  logGeneratorJobPoll,
  logSubmittedGeneratorModel
} from "../src/client/features/canvas/workflows/image-generator-debug-log-utils.js";
import {
  applyGeneratorCreatedNodeMetadata,
  buildGeneratorRunContext,
  registerGeneratorCreatedNode
} from "../src/client/features/canvas/workflows/image-generator-run-context-utils.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const generatorWorkflow = read("src/client/features/canvas/workflows/image-generator-workflow.js");
const generatorResultUtils = read("src/client/features/canvas/workflows/image-generator-result-utils.js");
const generatorJobPollingUtils = read("src/client/features/canvas/workflows/image-generator-job-polling-utils.js");
const generatorPreviewJobUtils = read("src/client/features/canvas/workflows/image-generator-preview-job-utils.js");
const generatorDomStateUtils = read("src/client/features/canvas/workflows/image-generator-dom-state-utils.js");
const generatorControlStateUtils = read("src/client/features/canvas/workflows/image-generator-control-state-utils.js");
const generatorSelectUtils = read("src/client/features/canvas/workflows/image-generator-select-utils.js");
const generatorDebugLogUtils = read("src/client/features/canvas/workflows/image-generator-debug-log-utils.js");
const generatorRunContextUtils = read("src/client/features/canvas/workflows/image-generator-run-context-utils.js");
assert(
  generatorWorkflow.includes("onJobCreated")
    && generatorWorkflow.includes("tagGeneratorPreviewJobs")
    && generatorWorkflow.includes("getRecoveredGeneratorPreviewReplacementMeta")
    && generatorPreviewJobUtils.includes("getRecoveredGeneratorPreviewUrl")
    && generatorWorkflow.includes("getGeneratorPreviewDescription")
    && generatorWorkflow.includes("getGeneratorPreviewNodeWidth as getPreviewNodeWidth")
    && generatorWorkflow.includes("getGeneratedImagePlacement")
    && generatorWorkflow.includes("getGeneratorReplacementPlacement")
    && generatorWorkflow.includes("buildRecoveredGeneratorPreviewItems")
    && generatorControlStateUtils.includes("export function getGeneratorBatchCount")
    && generatorWorkflow.includes("readGeneratorReferenceFromImageNode")
    && generatorWorkflow.includes("readGeneratorReferenceFiles")
    && generatorWorkflow.includes("markGeneratorPreviewFailed")
    && generatorWorkflow.includes("updateGeneratorPreviewStatus as updatePreviewStatus")
    && generatorWorkflow.includes("buildGeneratedImageNodeOptions")
    && generatorWorkflow.includes("applyGeneratedImageNodeResult")
    && generatorWorkflow.includes("applyPersistedGeneratedImageNodeResult")
    && generatorWorkflow.includes("applyGeneratedImageNodeSize")
    && generatorWorkflow.includes("getGeneratorResultTitle")
    && generatorWorkflow.includes("image-generator-dom-state-utils.js")
    && generatorWorkflow.includes("resolveGeneratorOutputSize")
    && generatorWorkflow.includes("resolveGeneratorModelValue")
    && generatorWorkflow.includes("syncGeneratorFrameStateToRatio")
    && generatorWorkflow.includes("buildGeneratorRunContext")
    && generatorWorkflow.includes("registerGeneratorCreatedNode")
    && generatorRunContextUtils.includes("export function buildGeneratorRunContext")
    && generatorRunContextUtils.includes("export function applyGeneratorCreatedNodeMetadata")
    && generatorRunContextUtils.includes("export function registerGeneratorCreatedNode")
    && generatorPreviewJobUtils.includes("applyGeneratorPreviewJobMetadata"),
  "generator must tag preview nodes with job ids when async jobs are created"
);
assert(
  !generatorWorkflow.includes("getPrimaryResultImageUrl")
    && !generatorWorkflow.includes("applyGeneratorResult(node, displayUrl || imageUrl")
    && !/await runGeneratorBatch\(node,\s*\{\s*prompt,\s*references\s*\}\);\s*return;/s.test(generatorWorkflow),
  "generator submit path must not keep unreachable pre-batch generation code after runGeneratorBatch"
);
assert(
  generatorWorkflow.includes("resumePendingGeneratorPreviews") &&
  generatorWorkflow.includes("visibilitychange") &&
  generatorWorkflow.includes("focus") &&
  generatorPreviewJobUtils.includes("getPendingGeneratorPreviewGroups"),
  "generator must resume pending preview jobs on focus and visibility restore"
);
assert(
  generatorWorkflow.includes("missingUrlRetries") &&
  generatorJobPollingUtils.includes("Waiting for saved image URL") &&
  generatorJobPollingUtils.includes("export function buildInitialGeneratorJobPayload") &&
  generatorJobPollingUtils.includes("export function delayGeneratorJobPoll") &&
  generatorJobPollingUtils.includes("export function getGeneratorJobRequestError") &&
  generatorJobPollingUtils.includes("export function getGeneratorJobStatusPath") &&
  generatorJobPollingUtils.includes("export function getMissingGeneratorUrlRetryState") &&
  generatorJobPollingUtils.includes("export function getTerminalGeneratorJobPollDecision") &&
  generatorJobPollingUtils.includes("export function mergeGeneratorJobPayload"),
  "generator polling must retry succeeded jobs that do not yet expose an image URL"
);
const generatorDelayPromise = delayGeneratorJobPoll(0);
assert(typeof generatorDelayPromise?.then === "function", "generator polling delay helper should return a promise");
await generatorDelayPromise;
assert(
  getGeneratorJobRequestError({ failureMessage: "failure" }, 500).message === "failure",
  "generator polling request errors should prefer failure messages"
);
assert(
  getGeneratorJobRequestError({ errorMessage: "error" }, 500).message === "error",
  "generator polling request errors should fall back to error messages"
);
assert(
  getGeneratorJobRequestError({ message: "message" }, 500).message === "message",
  "generator polling request errors should fall back to response messages"
);
assert(
  getGeneratorJobRequestError({}, 503).message === "Job request failed: 503",
  "generator polling request errors should preserve status fallbacks"
);
assert(
  getGeneratorJobStatusPath("job-1") === "/api/ai/jobs/job-1",
  "generator polling status paths should preserve simple job ids"
);
assert(
  getGeneratorJobStatusPath("job id/1") === "/api/ai/jobs/job%20id%2F1",
  "generator polling status paths should encode unsafe job id characters"
);
assert(
  JSON.stringify(buildInitialGeneratorJobPayload("job-1", { jobId: "fallback-job", status: "queued" }))
    === JSON.stringify({ jobId: "fallback-job", status: "queued" }),
  "generator initial job payloads should preserve fallback override order"
);
assert(
  JSON.stringify(mergeGeneratorJobPayload({ jobId: "job-1", status: "queued" }, { status: "running", progress: 20 }))
    === JSON.stringify({ jobId: "job-1", status: "running", progress: 20 }),
  "generator polling payload merges should let server payloads override fallback values"
);
assert(
  JSON.stringify(getMissingGeneratorUrlRetryState({
    terminalResult: { retryMissingUrl: true },
    missingUrlAttempts: 0,
    missingUrlRetries: 4
  })) === JSON.stringify({ nextAttempts: 1, shouldRetry: true }),
  "generator polling retry helper should retry missing URLs within the limit"
);
assert(
  JSON.stringify(getMissingGeneratorUrlRetryState({
    terminalResult: { retryMissingUrl: true },
    missingUrlAttempts: 4,
    missingUrlRetries: 4
  })) === JSON.stringify({ nextAttempts: 5, shouldRetry: false }),
  "generator polling retry helper should stop after the missing URL retry limit"
);
assert(
  JSON.stringify(getMissingGeneratorUrlRetryState({
    terminalResult: { retryMissingUrl: false },
    missingUrlAttempts: 2,
    missingUrlRetries: 4
  })) === JSON.stringify({ nextAttempts: 2, shouldRetry: false }),
  "generator polling retry helper should not increment non-missing-URL terminal results"
);
const terminalSuccessDecision = getTerminalGeneratorJobPollDecision({
  lastPayload: { status: "succeeded", imageUrl: "/uploads/image.png" },
  expectedType: "image",
  missingUrlAttempts: 1,
  missingUrlRetries: 4
});
assert(
  terminalSuccessDecision.missingUrlAttempts === 1
    && terminalSuccessDecision.shouldRetryMissingUrl === false
    && terminalSuccessDecision.error === null,
  "generator terminal polling decisions should accept completed jobs with result URLs"
);
const terminalMissingUrlDecision = getTerminalGeneratorJobPollDecision({
  lastPayload: { status: "succeeded" },
  expectedType: "image",
  missingUrlAttempts: 0,
  missingUrlRetries: 4
});
assert(
  terminalMissingUrlDecision.missingUrlAttempts === 1
    && terminalMissingUrlDecision.shouldRetryMissingUrl === true
    && terminalMissingUrlDecision.error?.message,
  "generator terminal polling decisions should retry completed jobs that are missing result URLs"
);
const terminalFailureDecision = getTerminalGeneratorJobPollDecision({
  lastPayload: { status: "failed", errorMessage: "failed" },
  expectedType: "image",
  missingUrlAttempts: 2,
  missingUrlRetries: 4
});
assert(
  terminalFailureDecision.missingUrlAttempts === 2
    && terminalFailureDecision.shouldRetryMissingUrl === false
    && terminalFailureDecision.error?.message === "failed",
  "generator terminal polling decisions should surface failed job errors without missing-URL retries"
);
assert(
  generatorWorkflow.includes("logGeneratorJobPoll") &&
  generatorDebugLogUtils.includes("[generator] job poll"),
  "generator polling must emit local diagnostic logs"
);
assert(
  generatorJobPollingUtils.includes("getMissingGeneratorResultError(lastPayload, expectedType)") &&
  generatorResultUtils.includes("return new Error(getMissingGeneratorResultMessage(result, expectedType));"),
  "generator polling must fail clearly when a terminal job has no image URL"
);
assert(
  generatorDomStateUtils.includes("export function hasGeneratorDropData")
    && generatorDomStateUtils.includes("export function updateGeneratorStatus")
    && generatorDomStateUtils.includes("export function setGeneratorBusy")
    && generatorDomStateUtils.includes("export function setGeneratorReferences")
    && generatorDomStateUtils.includes("export function renderGeneratorReferences")
    && generatorDomStateUtils.includes("export function resetGeneratorInput")
    && generatorDomStateUtils.includes("export function applyGeneratorResult"),
  "generator DOM state helpers must be extracted from the workflow module"
);
assert(
  generatorControlStateUtils.includes("export function resolveGeneratorModelValue"),
  "generator model value resolution should live in control state helpers"
);
assert(
  generatorControlStateUtils.includes("export function getGeneratorControls"),
  "generator popover control lookup should live in control state helpers"
);
assert(
  generatorControlStateUtils.includes("export function isMidjourneyGeneratorModel"),
  "generator model classification should live in control state helpers"
);
assert(
  generatorDebugLogUtils.includes("export function logGeneratorJobPoll")
    && generatorDebugLogUtils.includes("export function logSubmittedGeneratorModel"),
  "generator diagnostic logging should live in debug log helpers"
);
assert(
  generatorSelectUtils.includes("export function closeGeneratorCustomSelects")
    && generatorSelectUtils.includes("export function toggleGeneratorCustomSelect")
    && generatorSelectUtils.includes("export function renderGeneratorSelectOptions")
    && generatorSelectUtils.includes("export function getGeneratorCountSelectState")
    && generatorSelectUtils.includes("export function createGeneratorCustomSelect"),
  "generator custom select open/close helpers should live in select utilities"
);

assert(hasGeneratorDropData({ types: ["Files"] }) === true, "generator drop helper should accept file drops");
assert(hasGeneratorDropData({ types: ["text/html"] }) === true, "generator drop helper should accept HTML drops");
assert(hasGeneratorDropData({ types: ["text/uri-list"] }) === true, "generator drop helper should accept URI drops");
assert(hasGeneratorDropData({ types: ["text/plain"] }) === true, "generator drop helper should accept plain text drops");
assert(hasGeneratorDropData({ types: ["application/json"] }) === false, "generator drop helper should reject unsupported drops");
assert(hasGeneratorDropData(null) === false, "generator drop helper should reject missing dataTransfer");

const statusPopover = { dataset: {} };
const statusNodeForGenerator = { dataset: {} };
updateGeneratorStatus(statusNodeForGenerator, "Generating", {
  documentRef: createGeneratorDocument({ popover: statusPopover })
});
assert(statusNodeForGenerator.dataset.generatorStatus === "Generating", "generator status helper should update node dataset");
assert(statusPopover.dataset.generatorStatus === "Generating", "generator status helper should update popover dataset");
updateGeneratorStatus(statusNodeForGenerator, "", {
  documentRef: createGeneratorDocument({ popover: statusPopover })
});
assert(statusNodeForGenerator.dataset.generatorStatus === "", "generator status helper should clear node dataset");
assert(statusPopover.dataset.generatorStatus === "", "generator status helper should clear popover dataset");

const busyControls = createGeneratorBusyFixture();
setGeneratorBusy(busyControls.node, true, {
  documentRef: createGeneratorDocument({ popover: busyControls.popover })
});
assert(busyControls.node.dataset.generatorBusy === "true", "generator busy helper should mark node busy");
assert(busyControls.node.classes.has("generator-busy"), "generator busy helper should add busy class");
assert(busyControls.loading.hidden === false, "generator busy helper should show loading");
assert(busyControls.submit.disabled === true, "generator busy helper should disable submit");
assert(busyControls.controls.every((control) => control.disabled === true), "generator busy helper should disable generator controls");
assert(busyControls.triggers.every((trigger) => trigger.disabled === true), "generator busy helper should disable custom select triggers");
setGeneratorBusy(busyControls.node, false, {
  documentRef: createGeneratorDocument({ popover: busyControls.popover })
});
assert(busyControls.node.dataset.generatorBusy === "false", "generator busy helper should mark node idle");
assert(!busyControls.node.classes.has("generator-busy"), "generator busy helper should remove busy class");
assert(busyControls.loading.hidden === true, "generator busy helper should hide loading");
assert(busyControls.submit.disabled === false, "generator busy helper should enable submit");
assert(busyControls.controls.every((control) => control.disabled === false), "generator busy helper should enable generator controls");
assert(busyControls.triggers.every((trigger) => trigger.disabled === false), "generator busy helper should enable custom select triggers");

const referenceFixture = createGeneratorReferenceFixture();
const generatorReferences = [
  { name: "One", dataUrl: "data:one" },
  { name: "", dataUrl: "data:two" }
];
setGeneratorReferences(referenceFixture.node, generatorReferences, {
  documentRef: createGeneratorDocument({ popover: referenceFixture.popover })
});
assert(referenceFixture.node._generatorReferences === generatorReferences, "generator reference helper should store references on the node");
assert(referenceFixture.node.dataset.generatorReferenceCount === "2", "generator reference helper should persist reference count");
assert(referenceFixture.node.classes.has("has-generator-reference"), "generator reference helper should mark nodes with references");
assert(referenceFixture.popover.dataset.generatorStatus === "图生图 · 2 张参考图", "generator reference helper should sync reference status");
assert(referenceFixture.referenceList.innerHTML.includes('data-generator-reference-index="1"'), "generator reference helper should render reference buttons");
assert(referenceFixture.referenceList.innerHTML.includes('title="参考图"'), "generator reference helper should render fallback reference names");

removeGeneratorReference(referenceFixture.node, 0, {
  documentRef: createGeneratorDocument({ popover: referenceFixture.popover })
});
assert(referenceFixture.node.dataset.generatorReferenceCount === "1", "generator reference helper should remove references by index");
assert(referenceFixture.referenceList.innerHTML.includes("data:two"), "generator reference helper should rerender remaining references");

const skippedReferenceNode = {
  matches: () => false
};
renderGeneratorReferences(skippedReferenceNode, [{ name: "Skip", dataUrl: "data:skip" }], {
  documentRef: createGeneratorDocument({ popover: referenceFixture.popover })
});
assert(!referenceFixture.referenceList.innerHTML.includes("data:skip"), "generator reference helper should skip non-generator nodes");

referenceFixture.promptInput.value = "draft";
referenceFixture.node._generatorPromptDraft = "draft";
resetGeneratorInput(referenceFixture.node, {
  documentRef: createGeneratorDocument({ popover: referenceFixture.popover })
});
assert(referenceFixture.promptInput.value === "", "generator reset helper should clear prompt input");
assert(referenceFixture.node._generatorPromptDraft === "", "generator reset helper should clear prompt draft");
assert(referenceFixture.node.dataset.generatorReferenceCount === "0", "generator reset helper should clear references");
assert(referenceFixture.popover.dataset.generatorStatus === "文生图", "generator reset helper should restore text-to-image status");

const resultFixture = createGeneratorResultFixture();
applyGeneratorResult(resultFixture.node, "/uploads/generated.png", {
  prompt: "Prompt",
  model: "model-1",
  documentRef: createGeneratorDocument({ popover: resultFixture.popover })
});
assert(resultFixture.image.src === "/uploads/generated.png", "generator result helper should update image src");
assert(resultFixture.image.hidden === false, "generator result helper should show the result image");
assert(resultFixture.placeholder.hidden === true, "generator result helper should hide placeholder content");
assert(!resultFixture.classes.has("generation-failed"), "generator result helper should clear failed state");
assert(resultFixture.classes.has("has-generator-result"), "generator result helper should mark result state");
assert(resultFixture.node.dataset.objectUrl === "/uploads/generated.png", "generator result helper should persist object URL");
assert(resultFixture.node.dataset.sourceMode === "generated", "generator result helper should mark generated source mode");
assert(resultFixture.node.dataset.generationPrompt === "Prompt", "generator result helper should persist prompt");
assert(resultFixture.node.dataset.generationModel === "model-1", "generator result helper should persist model");
assert(resultFixture.popover.dataset.generatorStatus === "文生图 · 已生成", "generator result helper should sync text-to-image status");
resultFixture.node._generatorReferences = [{ dataUrl: "data:ref" }];
applyGeneratorResult(resultFixture.node, "/uploads/generated-ref.png", {
  documentRef: createGeneratorDocument({ popover: resultFixture.popover })
});
assert(resultFixture.popover.dataset.generatorStatus === "图生图 · 已生成", "generator result helper should sync image-to-image status");

assert(
  resolveGeneratorModelValue({
    documentRef: createGeneratorModelDocument({
      generatorSelect: { dataset: { selectedModelId: "generator-selected" }, value: "generator-value" },
      chatSelect: { dataset: { selectedModelId: "chat-selected" }, value: "chat-value" }
    }),
    defaultModel: "default-model"
  }) === "generator-selected",
  "generator model helper should prefer generator selected model ids"
);
assert(
  resolveGeneratorModelValue({
    documentRef: createGeneratorModelDocument({
      generatorSelect: { dataset: {}, value: "" },
      chatSelect: { dataset: {}, value: "chat-value" }
    }),
    defaultModel: "default-model"
  }) === "chat-value",
  "generator model helper should fall back to chat model values"
);
assert(
  resolveGeneratorModelValue({
    documentRef: createGeneratorModelDocument({}),
    defaultModel: "default-model"
  }) === "default-model",
  "generator model helper should use the configured default model"
);
assert(isMidjourneyGeneratorModel("midjourney") === true, "generator model helper should detect Midjourney models");
assert(isMidjourneyGeneratorModel(" MidJourney ") === true, "generator model helper should trim and normalize Midjourney models");
assert(isMidjourneyGeneratorModel("midjourney-v6") === false, "generator model helper should preserve exact Midjourney matching");
assert(isMidjourneyGeneratorModel("") === false, "generator model helper should reject missing model names");
assert(isLocalGeneratorDebugHost("localhost") === true, "generator debug helper should allow localhost logs");
assert(isLocalGeneratorDebugHost("127.0.0.1") === true, "generator debug helper should allow loopback logs");
assert(isLocalGeneratorDebugHost("example.com") === false, "generator debug helper should skip remote host logs");
assert(
  JSON.stringify(buildSubmittedGeneratorModelLog("model-1")) === JSON.stringify({
    surface: "generator",
    selectedModel: "model-1",
    payloadModel: "model-1"
  }),
  "generator debug helper should preserve submitted model payloads"
);
const jobPollLog = buildGeneratorJobPollLog({
  jobId: "job-1",
  remoteTaskId: "remote-1",
  status: "succeeded",
  progress: 80,
  imageUrl: "/uploads/image.png",
  videoUrls: ["/uploads/video.mp4"],
  outputCount: 2,
  updatedAt: "2026-07-03T00:00:00.000Z"
});
assert(jobPollLog.jobId === "job-1", "generator debug helper should preserve job ids");
assert(jobPollLog.remoteTaskId === "remote-1", "generator debug helper should preserve remote task ids");
assert(jobPollLog.status === "succeeded", "generator debug helper should preserve job statuses");
assert(jobPollLog.progress === 80, "generator debug helper should preserve progress");
assert(jobPollLog.imageUrls[0] === "/uploads/image.png", "generator debug helper should collect image URLs");
assert(jobPollLog.videoUrls[0] === "/uploads/video.mp4", "generator debug helper should collect video URLs");
assert(jobPollLog.outputCount === 2, "generator debug helper should preserve output counts");
assert(jobPollLog.updatedAt === "2026-07-03T00:00:00.000Z", "generator debug helper should preserve update timestamps");
const localDebugCalls = [];
const localLogger = {
  debug(...args) {
    localDebugCalls.push(args);
  }
};
assert(logSubmittedGeneratorModel("model-1", { hostname: "localhost", logger: localLogger }) === true, "generator debug helper should log local submitted models");
assert(logGeneratorJobPoll({ jobId: "job-2" }, { hostname: "localhost", logger: localLogger }) === true, "generator debug helper should log local job polls");
assert(localDebugCalls.length === 2, "generator debug helper should write local debug logs");
assert(logSubmittedGeneratorModel("model-1", { hostname: "example.com", logger: localLogger }) === false, "generator debug helper should skip remote submitted model logs");
assert(logGeneratorJobPoll({ jobId: "job-2" }, { hostname: "example.com", logger: localLogger }) === false, "generator debug helper should skip remote job poll logs");
assert(localDebugCalls.length === 2, "generator debug helper should not write remote debug logs");
const controlsFixture = createGeneratorControlsFixture();
const resolvedControls = getGeneratorControls(controlsFixture.popover);
assert(resolvedControls.popover === controlsFixture.popover, "generator controls helper should return the popover");
assert(resolvedControls.promptInput === controlsFixture.promptInput, "generator controls helper should find prompt input");
assert(resolvedControls.referenceInput === controlsFixture.referenceInput, "generator controls helper should find reference input");
assert(resolvedControls.referenceList === controlsFixture.referenceList, "generator controls helper should find reference list");
assert(resolvedControls.modelSelect === controlsFixture.modelSelect, "generator controls helper should find model select");
assert(resolvedControls.ratioSelect === controlsFixture.ratioSelect, "generator controls helper should find ratio select");
assert(resolvedControls.countSelect === controlsFixture.countSelect, "generator controls helper should find count select");
assert(resolvedControls.submitButton === controlsFixture.submitButton, "generator controls helper should find submit button");
assert(getGeneratorControls(null).promptInput === null, "generator controls helper should tolerate missing popovers");
const customSelectFixture = createGeneratorCustomSelectFixture();
assert(
  toggleGeneratorCustomSelect(customSelectFixture.trigger, { closeSelects: customSelectFixture.closeSelects }) === true,
  "generator custom select helper should open closed wraps"
);
assert(customSelectFixture.wrap.classes.has("open"), "generator custom select helper should add open class");
assert(customSelectFixture.closeCalls === 1, "generator custom select helper should close other selects before opening");
assert(
  toggleGeneratorCustomSelect(customSelectFixture.trigger, { closeSelects: customSelectFixture.closeSelects }) === false,
  "generator custom select helper should close open wraps"
);
assert(!customSelectFixture.wrap.classes.has("open"), "generator custom select helper should remove open class");
customSelectFixture.trigger.disabled = true;
assert(toggleGeneratorCustomSelect(customSelectFixture.trigger, { closeSelects: customSelectFixture.closeSelects }) === false, "generator custom select helper should ignore disabled triggers");
assert(toggleGeneratorCustomSelect({ disabled: false, closest: () => null }) === false, "generator custom select helper should ignore missing wraps");
const closeFixture = createGeneratorCustomSelectCloseFixture();
closeGeneratorCustomSelects(closeFixture.root);
assert(closeFixture.wraps.every((wrap) => !wrap.classes.has("open")), "generator custom select close helper should close all open wraps");
const renderedOptions = renderGeneratorSelectOptions({
  value: "unsafe\"value",
  options: [
    { value: "safe", textContent: "Safe" },
    { value: "unsafe\"value", textContent: "<Unsafe>" }
  ]
}, "ratio&kind");
assert(renderedOptions.includes('data-generator-select-option="ratio&amp;kind"'), "generator select option renderer should escape option kinds");
assert(renderedOptions.includes('data-value="unsafe&quot;value"'), "generator select option renderer should escape values");
assert(renderedOptions.includes("class=\"generator-select-option selected\""), "generator select option renderer should mark selected options");
assert(renderedOptions.includes('aria-selected="true"'), "generator select option renderer should set selected aria state");
assert(renderedOptions.includes("&lt;Unsafe&gt;"), "generator select option renderer should escape labels");
const videoCountState = getGeneratorCountSelectState({ kind: "count", modelType: "video" });
assert(videoCountState?.text === "1 video", "generator count state helper should preserve video count label");
assert(videoCountState?.value === "video-default-1", "generator count state helper should preserve video count value");
assert(videoCountState?.disabled === true, "generator count state helper should disable video count selects");
assert(videoCountState?.clearMenu === true, "generator count state helper should clear video count menus");
const midjourneyCountState = getGeneratorCountSelectState({ kind: "count", isMidjourney: true });
assert(midjourneyCountState?.text === "默认4张", "generator count state helper should preserve Midjourney count label");
assert(midjourneyCountState?.value === "midjourney-default-4", "generator count state helper should preserve Midjourney count value");
assert(midjourneyCountState?.disabled === true, "generator count state helper should disable Midjourney count selects");
assert(midjourneyCountState?.clearMenu === true, "generator count state helper should clear Midjourney count menus");
assert(getGeneratorCountSelectState({ kind: "model", modelType: "video" }) === null, "generator count state helper should ignore non-count selects");
assert(getGeneratorCountSelectState({ kind: "count", modelType: "image" }) === null, "generator count state helper should allow regular image counts");
const createdSelectFixture = createGeneratorCustomSelectFixtureForCreate("ratio");
const createdSelect = createGeneratorCustomSelect(createdSelectFixture.select, {
  documentRef: createdSelectFixture.documentRef,
  onRebuild: createdSelectFixture.onRebuild
});
assert(createdSelect.kind === "ratio", "generator custom select creator should preserve select kind");
assert(createdSelectFixture.select.dataset.generatorCustomReady === "true", "generator custom select creator should mark select ready");
assert(createdSelectFixture.select.classes.has("generator-native-select"), "generator custom select creator should mark native select class");
assert(createdSelect.wrap.className === "generator-select-wrap", "generator custom select creator should create wrapper class");
assert(createdSelect.wrap.dataset.generatorSelectKind === "ratio", "generator custom select creator should set wrapper kind");
assert(createdSelect.trigger.type === "button", "generator custom select creator should create button triggers");
assert(createdSelect.trigger.dataset.generatorSelectTrigger === "ratio", "generator custom select creator should set trigger kind");
assert(createdSelect.menu.dataset.generatorSelectMenu === "ratio", "generator custom select creator should set menu kind");
assert(createdSelect.menu.attributes.role === "listbox", "generator custom select creator should preserve listbox role");
assert(createdSelect.wrap.children[0] === createdSelect.trigger && createdSelect.wrap.children[1] === createdSelect.menu, "generator custom select creator should append trigger and menu");
assert(createdSelectFixture.select.afterNode === createdSelect.wrap, "generator custom select creator should insert wrapper after select");
createdSelectFixture.select.__generatorSelectRebuild();
assert(createdSelectFixture.rebuildCalls === 1, "generator custom select creator should wire rebuild callbacks");
assert(createGeneratorCustomSelect(null, { documentRef: createdSelectFixture.documentRef }) === null, "generator custom select creator should ignore missing selects");

const aiRoutes = read("src/server/routes/ai.routes.js");
const aiJobQueryService = read("src/server/services/ai/ai-job-query.service.js");
const generationCreationService = read("src/server/services/ai/generation-creation.service.js");
const imageEditCreationService = read("src/server/services/ai/image-edit-creation.service.js");
assert(
  aiRoutes.includes("getAIJobDetailResponse") &&
  aiJobQueryService.includes("remoteTaskId: job.remoteTaskId") &&
  aiJobQueryService.includes("updatedAt: job.updatedAt") &&
  aiJobQueryService.includes("outputCount: assets.length"),
  "job polling API must expose remoteTaskId, updatedAt, and outputCount diagnostics"
);
assert(
  generationCreationService.includes("scheduleAIJobRefresh(userId, job.id)") &&
  imageEditCreationService.includes("scheduleAIJobRefresh(userId, job.id)"),
  "async APIMart jobs must schedule a backend refresh fallback"
);

const aiJobService = read("src/server/services/ai-job.service.js");
assert(
  aiJobService.includes("export function scheduleAIJobRefresh") &&
  aiJobService.includes("runScheduledAIJobRefresh"),
  "AI job service must provide scheduled refresh fallback"
);
assert(
  aiJobService.includes('status === "save_failed" && shouldCompleteMissingOutputs(job)'),
  "save_failed must be able to replace succeeded jobs that have no saved outputs"
);

const statusNode = { textContent: "" };
updateGeneratorPreviewStatus({
  querySelector(selector) {
    return selector === ".generation-frame span" ? statusNode : null;
  }
}, "Waiting for image result...");
assert(statusNode.textContent === "Waiting for image result...", "generator preview status helper should update status text");
updateGeneratorPreviewStatus({
  querySelector() {
    return statusNode;
  }
}, "");
assert(statusNode.textContent === "Waiting for image result...", "generator preview status helper should ignore empty text");
updateGeneratorPreviewStatus(null, "ignored");

const failedTitleNode = { textContent: "" };
const failedStatusNode = { textContent: "" };
const failedClasses = new Set();
const failedPreviewNode = {
  dataset: {},
  classList: {
    add(name) {
      failedClasses.add(name);
    }
  },
  querySelector(selector) {
    if (selector === ".generation-frame strong") return failedTitleNode;
    if (selector === ".generation-frame span") return failedStatusNode;
    return null;
  }
};
markGeneratorPreviewFailed(failedPreviewNode, new Error("Custom failure"));
assert(failedPreviewNode.dataset.generatorFailed === "true", "generator preview failure helper should mark failed dataset state");
assert(failedClasses.has("generation-failed"), "generator preview failure helper should add failed class");
assert(failedTitleNode.textContent, "generator preview failure helper should update title text");
assert(failedStatusNode.textContent === "Custom failure", "generator preview failure helper should prefer explicit error messages");
markGeneratorPreviewFailed(null, new Error("ignored"));

const recoveredUrls = ["/uploads/one.png", "/uploads/two.png", "/uploads/three.png"];
assert(
  getRecoveredGeneratorPreviewUrl({ dataset: { generatorBatchIndex: "2" } }, recoveredUrls, 0) === "/uploads/two.png",
  "recovered generator preview URL should prefer stored batch index"
);
assert(
  getRecoveredGeneratorPreviewUrl({ dataset: {} }, recoveredUrls, 2) === "/uploads/three.png",
  "recovered generator preview URL should fall back to loop index"
);
assert(
  getRecoveredGeneratorPreviewUrl({ dataset: { generatorBatchIndex: "9" } }, recoveredUrls, 1) === "/uploads/two.png",
  "recovered generator preview URL should fall back to loop index when batch index is out of range"
);
assert(
  getRecoveredGeneratorPreviewUrl({ dataset: { generatorBatchIndex: "9" } }, recoveredUrls, 9) === "/uploads/one.png",
  "recovered generator preview URL should fall back to first URL when no indexed URL matches"
);
const recoveredItems = buildRecoveredGeneratorPreviewItems([
  { dataset: { generatorBatchIndex: "2" } },
  { dataset: {} }
], {
  jobId: "job-1",
  result: { status: "succeeded" },
  urls: recoveredUrls
});
assert(recoveredItems.length === 2, "recovered generator preview items should mirror preview nodes");
assert(recoveredItems[0].jobId === "job-1", "recovered generator preview items should preserve job ids");
assert(recoveredItems[0].result.status === "succeeded", "recovered generator preview items should preserve result payloads");
assert(recoveredItems[0].url === "/uploads/two.png", "recovered generator preview items should use recovered URL helper");
assert(recoveredItems[0].index === 0 && recoveredItems[1].index === 1, "recovered generator preview items should preserve loop indexes");
assert(recoveredItems[0].count === recoveredUrls.length, "recovered generator preview items should prefer URL count");
const recoveredItemsWithoutUrls = buildRecoveredGeneratorPreviewItems([{ dataset: {} }, { dataset: {} }], {
  jobId: "job-2",
  result: {}
});
assert(recoveredItemsWithoutUrls[0].count === 2, "recovered generator preview items should fall back to node count");
assert(buildRecoveredGeneratorPreviewItems(null).length === 0, "recovered generator preview items should tolerate missing node arrays");
const recoveredMeta = getRecoveredGeneratorPreviewReplacementMeta({
  dataset: {
    generatorBatchIndex: "2",
    generatorPrompt: "Recovered prompt",
    generatorAspectRatio: "4 / 3",
    generatorActionType: "image_generation",
    generatorModel: "stored-model"
  }
}, {
  result: {
    requestedModel: "returned-model"
  },
  index: 0
});
assert(recoveredMeta.batchIndex === 1, "recovered generator preview metadata should preserve stored batch index");
assert(recoveredMeta.desc === "Recovered prompt", "recovered generator preview metadata should use stored prompt as description");
assert(recoveredMeta.aspectRatio === "4 / 3", "recovered generator preview metadata should preserve aspect ratio");
assert(recoveredMeta.prompt === "Recovered prompt", "recovered generator preview metadata should preserve prompt");
assert(recoveredMeta.actionType === "image_generation", "recovered generator preview metadata should preserve action type");
assert(recoveredMeta.model === "returned-model", "recovered generator preview metadata should prefer returned models");
const fallbackRecoveredMeta = getRecoveredGeneratorPreviewReplacementMeta({ dataset: {} }, {
  result: { model: "result-model" },
  index: 2
});
assert(fallbackRecoveredMeta.batchIndex === 2, "recovered generator preview metadata should fall back to loop index");
assert(fallbackRecoveredMeta.desc === "Image generator result", "recovered generator preview metadata should keep fallback descriptions");
assert(fallbackRecoveredMeta.model === "result-model", "recovered generator preview metadata should fall back to result model");
assert(getGeneratorResultTitle(0, 1) === "Image Generator Result.png", "single image generator result title should stay stable");
assert(getGeneratorResultTitle(1, 3) === "Image Generator Result 2.png", "multi image generator result title should include one-based index");
assert(getGeneratorResultTitle(0, 4) === "Image Generator Result 1.png", "generator replacement title should preserve first numbered result");
assert(
  JSON.stringify(buildGeneratedImageNodeOptions({
    title: "Image Generator Result 2.png",
    prompt: "Prompt",
    sourceUrl: "/uploads/result.png",
    x: 12,
    y: 24
  })) === JSON.stringify({
    kind: "image",
    title: "Image Generator Result 2.png",
    desc: "Prompt",
    x: 12,
    y: 24,
    media: {
      url: "/uploads/result.png",
      name: "Image Generator Result 2.png",
      type: "image/png"
    }
  }),
  "generated image node options helper should preserve addNode payloads"
);
assert(
  buildGeneratedImageNodeOptions({ sourceUrl: "/uploads/result.png" }).desc === "Image generator result",
  "generated image node options helper should preserve fallback descriptions"
);
assert(shouldUseImmediateGeneratorResult(null) === true, "generator should keep immediate fallback behavior for missing results");
assert(shouldUseImmediateGeneratorResult({}) === true, "generator should keep immediate fallback behavior when no job id exists");
assert(shouldUseImmediateGeneratorResult({ jobId: "job-1" }) === false, "generator should poll async jobs that have no result URL yet");
assert(shouldUseImmediateGeneratorResult({ jobId: "job-1", imageUrl: "/uploads/image.png" }) === true, "generator should return immediate image results");
assert(shouldUseImmediateGeneratorResult({ jobId: "job-1", videoUrl: "/uploads/video.mp4" }) === true, "generator should return immediate video results");
assert(
  getRequiredGeneratorResultUrl({ jobId: "job-1" }, { primaryUrl: "/uploads/image.png" }) === "/uploads/image.png",
  "generator required result helper should return parsed image URLs"
);
assert(
  getRequiredGeneratorResultUrl({ jobId: "job-1" }, { primaryUrl: "/uploads/video.mp4" }, "video") === "/uploads/video.mp4",
  "generator required result helper should return parsed video URLs"
);
let missingRequiredGeneratorUrlError = null;
try {
  getRequiredGeneratorResultUrl({ jobId: "job-1", status: "succeeded" }, { primaryUrl: "" });
} catch (error) {
  missingRequiredGeneratorUrlError = error;
}
assert(
  missingRequiredGeneratorUrlError?.message === "Model returned without an image URL (jobId=job-1, status=succeeded)",
  "generator required result helper should preserve missing image URL errors"
);
let missingRequiredGeneratorVideoUrlError = null;
try {
  getRequiredGeneratorResultUrl({ jobId: "job-2", status: "succeeded" }, { primaryUrl: "" }, "video");
} catch (error) {
  missingRequiredGeneratorVideoUrlError = error;
}
assert(
  missingRequiredGeneratorVideoUrlError?.message === "Model returned without a video URL (jobId=job-2, status=succeeded)",
  "generator required result helper should preserve missing video URL errors"
);
assert(
  JSON.stringify(getRequiredGeneratorResultUrls({ urls: ["/uploads/1.png", "/uploads/2.png", "/uploads/3.png"] }, 2))
    === JSON.stringify(["/uploads/1.png", "/uploads/2.png"]),
  "generator required result URLs helper should preserve batch truncation"
);
let missingMidjourneyResultUrlsError = null;
try {
  getRequiredGeneratorResultUrls({ urls: ["/uploads/1.png"] }, 4);
} catch (error) {
  missingMidjourneyResultUrlsError = error;
}
assert(
  missingMidjourneyResultUrlsError?.message === "Midjourney returned 1/4 images",
  "generator required result URLs helper should preserve Midjourney count errors"
);
assert(
  getGeneratorProgressStatusText(0, {
    idleText: "Waiting for video result...",
    activeText: "Waiting for video result"
  }) === "Waiting for video result...",
  "generator progress status helper should preserve idle text"
);
assert(
  getGeneratorProgressStatusText(42, {
    idleText: "Waiting for video result...",
    activeText: "Waiting for video result"
  }) === "Waiting for video result (42%)",
  "generator progress status helper should format active progress text"
);
assert(
  getGeneratorProgressStatusText(120, {
    idleText: "Waiting for video result...",
    activeText: "Waiting for video result"
  }) === "Waiting for video result (99%)",
  "generator progress status helper should cap progress at 99 percent"
);
assert(
  getGeneratorProgressStatusText(0, {
    idleText: "正在等待第 2/4 张结果",
    activeText: "正在等待第 2/4 张结果"
  }) === "正在等待第 2/4 张结果",
  "generator progress status helper should preserve Midjourney idle text"
);
assert(
  getGeneratorProgressStatusText(58, {
    idleText: "正在等待第 2/4 张结果",
    activeText: "正在等待第 2/4 张结果"
  }) === "正在等待第 2/4 张结果 (58%)",
  "generator progress status helper should format Midjourney progress text"
);
assert(
  getGeneratorProgressStatusText(0, {
    idleText: "正在生成第 3/4 张",
    activeText: "正在生成第 3/4 张"
  }) === "正在生成第 3/4 张",
  "generator progress status helper should preserve multi-image idle text"
);
assert(
  getGeneratorProgressStatusText(63, {
    idleText: "正在生成第 3/4 张",
    activeText: "正在生成第 3/4 张"
  }) === "正在生成第 3/4 张 (63%)",
  "generator progress status helper should format multi-image progress text"
);
assert(
  getGeneratorProgressStatusText(0, {
    idleText: "正在恢复生成结果...",
    activeText: "正在恢复生成结果"
  }) === "正在恢复生成结果...",
  "generator progress status helper should preserve recovered-job idle text"
);
assert(
  getGeneratorProgressStatusText(77, {
    idleText: "正在恢复生成结果...",
    activeText: "正在恢复生成结果"
  }) === "正在恢复生成结果 (77%)",
  "generator progress status helper should format recovered-job progress text"
);
assert(getGeneratorPreviewDescription("", 0, 1) === "正在生成图片", "promptless generator preview description should stay stable");
assert(getGeneratorPreviewDescription("A prompt", 0, 1) === "正在根据当前提示生成结果", "prompt generator preview description should stay stable");
assert(getGeneratorPreviewDescription("A prompt", 1, 3) === "正在生成第 2/3 张", "multi preview description should include one-based progress");
assert(
  getGeneratorPreviewNodeWidth({
    offsetWidth: 320,
    querySelector: () => ({ offsetWidth: 480 })
  }) === 480,
  "generator preview width helper should prefer image frame width"
);
assert(
  getGeneratorPreviewNodeWidth({
    offsetWidth: 320,
    querySelector: () => null
  }) === 320,
  "generator preview width helper should fall back to node width"
);
assert(getGeneratorPreviewNodeWidth(null) === 560, "generator preview width helper should keep default fallback width");
assert(
  getGeneratorPreviewNodeWidth({
    offsetWidth: 120,
    querySelector: () => ({ offsetWidth: 100 })
  }) === 160,
  "generator preview width helper should preserve minimum width"
);
assert(
  getGeneratorBatchCount("video", true, 4, 4) === 1,
  "generator batch count should force video generations to a single result"
);
assert(
  getGeneratorBatchCount("image", true, 1, 4) === 4,
  "generator batch count should force Midjourney image batches to four results"
);
assert(
  getGeneratorBatchCount("image", false, 3, 4) === 3,
  "generator batch count should preserve selected image counts"
);
const generatorRunContext = buildGeneratorRunContext({
  model: "model-1",
  modelType: "image",
  prompt: "make image",
  references: [{ dataUrl: "data:image/png;base64,one" }, { dataUrl: "" }, null],
  selectedCount: 3,
  midjourneyCount: 4,
  size: "1024*768",
  dimensions: { width: 1024, height: 768 },
  sourceNodeId: "generator-1",
  detectGenerationKind: () => "image_generation"
});
assert(generatorRunContext.videoModel === false, "generator run context should preserve image model type");
assert(generatorRunContext.midjourney === false, "generator run context should classify non-Midjourney models");
assert(generatorRunContext.count === 3, "generator run context should preserve selected image count");
assert(generatorRunContext.images.length === 1, "generator run context should filter empty reference images");
assert(generatorRunContext.size === "1024*768", "generator run context should preserve output size");
assert(generatorRunContext.aspectRatio === "1024 / 768", "generator run context should derive aspect ratio from dimensions");
assert(generatorRunContext.actionType === "image_generation", "generator run context should use the injected generation kind detector");
assert(generatorRunContext.sourceNodeId === "generator-1", "generator run context should preserve source node ids");
const videoRunContext = buildGeneratorRunContext({
  model: "midjourney",
  modelType: "video",
  selectedCount: 4,
  midjourneyCount: 4,
  dimensions: { width: 0, height: 0 }
});
assert(videoRunContext.videoModel === true, "generator run context should detect video models");
assert(videoRunContext.midjourney === true, "generator run context should detect Midjourney models");
assert(videoRunContext.count === 1, "generator run context should force video batches to one result");
assert(videoRunContext.aspectRatio === "1024 / 1024", "generator run context should fall back to stable dimensions");
const createdNodeMetadataTarget = { dataset: {} };
assert(
  applyGeneratorCreatedNodeMetadata(createdNodeMetadataTarget, {
    sourceNodeId: "generator-1",
    index: 1,
    count: 3,
    trackBatch: true
  }) === createdNodeMetadataTarget,
  "generator created-node metadata helper should return the tagged node"
);
assert(
  createdNodeMetadataTarget.dataset.generatorSourceNodeId === "generator-1",
  "generator created-node metadata helper should preserve source node ids"
);
assert(
  createdNodeMetadataTarget.dataset.generatorBatchCount === "3"
    && createdNodeMetadataTarget.dataset.generatorBatchIndex === "2",
  "generator created-node metadata helper should preserve one-based batch metadata"
);
const untrackedCreatedNode = { dataset: {} };
applyGeneratorCreatedNodeMetadata(untrackedCreatedNode, { index: 0, count: 4, trackBatch: false });
assert(
  untrackedCreatedNode.dataset.generatorBatchCount === undefined
    && untrackedCreatedNode.dataset.generatorBatchIndex === undefined,
  "generator created-node metadata helper should skip batch metadata when not tracking batches"
);
assert(applyGeneratorCreatedNodeMetadata(null) === null, "generator created-node metadata helper should tolerate missing nodes");
const registeredNodes = [];
const firstRegisteredNode = { dataset: {} };
const firstRegistration = registerGeneratorCreatedNode(firstRegisteredNode, {
  createdNodes: registeredNodes,
  sourceNodeId: "generator-1",
  index: 1,
  count: 3,
  trackBatch: true
});
assert(firstRegistration.createdNode === firstRegisteredNode, "generator created-node registration should return created nodes");
assert(firstRegistration.firstSuccessfulNode === firstRegisteredNode, "generator created-node registration should keep first successful node");
assert(registeredNodes.length === 1 && registeredNodes[0] === firstRegisteredNode, "generator created-node registration should append created nodes");
assert(firstRegisteredNode.dataset.generatorBatchIndex === "2", "generator created-node registration should apply batch metadata");
const secondRegisteredNode = { dataset: {} };
const secondRegistration = registerGeneratorCreatedNode(secondRegisteredNode, {
  createdNodes: registeredNodes,
  firstSuccessfulNode: firstRegisteredNode,
  index: 2,
  count: 3,
  trackBatch: false
});
assert(secondRegistration.firstSuccessfulNode === firstRegisteredNode, "generator created-node registration should preserve existing first successful node");
assert(registeredNodes.length === 2 && registeredNodes[1] === secondRegisteredNode, "generator created-node registration should append later nodes");
const missingRegistration = registerGeneratorCreatedNode(null, {
  createdNodes: registeredNodes,
  firstSuccessfulNode: firstRegisteredNode
});
assert(missingRegistration.firstSuccessfulNode === firstRegisteredNode, "generator created-node registration should tolerate missing nodes");
assert(
  resolveGeneratorOutputSize({ dataset: { generatorRatio: "16:9" } }) === "1344*768",
  "generator output size helper should prefer node ratio"
);
assert(
  resolveGeneratorOutputSize({ dataset: {} }, [], {
    documentRef: createGeneratorRatioDocument("3:4")
  }) === "768*1024",
  "generator output size helper should read popover ratio controls"
);
assert(
  resolveGeneratorOutputSize({ dataset: {} }, [], {
    documentRef: createGeneratorRatioDocument("unknown"),
    defaultRatio: "4:3"
  }) === "1024*1024",
  "generator output size helper should preserve unknown-ratio fallback behavior"
);
const syncedGeneratorSize = createGeneratorSizeFixture();
let sizeSyncCallbackCount = 0;
const syncedDimensions = syncGeneratorFrameToRatio(syncedGeneratorSize.node, "4:3", {
  onSync: () => {
    sizeSyncCallbackCount += 1;
  }
});
assert(syncedDimensions.width === 1024 && syncedDimensions.height === 768, "generator frame sync helper should return fixed ratio dimensions");
assert(syncedGeneratorSize.stage.style.aspectRatio === "1024 / 768", "generator frame sync helper should update stage aspect ratio");
assert(syncedGeneratorSize.frame.style.aspectRatio === "1024 / 768", "generator frame sync helper should update frame aspect ratio");
assert(syncedGeneratorSize.node.dataset.generatorRatio === "4:3", "generator frame sync helper should persist ratio");
assert(syncedGeneratorSize.node.dataset.outputWidth === "1024", "generator frame sync helper should persist output width");
assert(syncedGeneratorSize.node.dataset.outputHeight === "768", "generator frame sync helper should persist output height");
assert(syncedGeneratorSize.label.textContent === "1024 × 768", "generator frame sync helper should update size label");
assert(sizeSyncCallbackCount === 1, "generator frame sync helper should notify callers after syncing");
assert(syncGeneratorFrameToRatio(null) === null, "generator frame sync helper should ignore missing nodes");
const replacementPlacement = getGeneratorReplacementPlacement({
  style: { left: "12.5px", top: "24px" },
  offsetWidth: 320,
  querySelector: () => ({ offsetWidth: 480 })
});
assert(replacementPlacement.x === 12.5, "replacement placement should preserve node x");
assert(replacementPlacement.y === 24, "replacement placement should preserve node y");
assert(replacementPlacement.width === 480, "replacement placement should prefer generator frame width");
assert(
  getGeneratorReplacementPlacement({
    style: {},
    offsetWidth: 120,
    querySelector: () => null
  }).width === 160,
  "replacement placement should preserve minimum width"
);
const placementNode = {
  style: { left: "10px", top: "20px" },
  offsetWidth: 400,
  querySelector(selector) {
    if (selector !== ".image-generator-frame") return null;
    return {
      offsetWidth: 300,
      offsetLeft: 15,
      offsetTop: 25,
      offsetParent: placementNode
    };
  }
};
const generatedPlacement = getGeneratedImagePlacement(placementNode, 2);
assert(generatedPlacement.x === 10 + 15 + 300 + 28 + 2 * (300 + 28), "generated placement should preserve horizontal spacing formula");
assert(generatedPlacement.y === 20 + 25, "generated placement should preserve frame y offset");
assert(generatedPlacement.width === 300, "generated placement should preserve frame width");
assert(
  getGeneratedImagePlacement({
    style: {},
    offsetWidth: 120,
    querySelector: () => null
  }).width === 160,
  "generated placement should preserve minimum width"
);
const sizedFrame = { style: {} };
const sizedNode = {
  style: {},
  dataset: {},
  querySelector(selector) {
    return selector === ".image-frame" ? sizedFrame : null;
  }
};
applyGeneratedImageNodeSize(sizedNode, {
  width: 320.4,
  dimensions: { width: 1024, height: 768 }
});
assert(sizedNode.style.width === "320px", "generated image size helper should round and apply width");
assert(sizedFrame.style.aspectRatio === "1024 / 768", "generated image size helper should preserve aspect ratio");
assert(sizedNode.dataset.manualSize === "true", "generated image size helper should mark manual sizing");
assert(sizedNode.dataset.imageNaturalWidth === "1024", "generated image size helper should persist natural width");
assert(sizedNode.dataset.imageNaturalHeight === "768", "generated image size helper should persist natural height");
const resultImage = {
  src: "",
  dataset: {},
  removed: [],
  removeAttribute(name) {
    this.removed.push(name);
  }
};
const resultNode = {
  dataset: {},
  querySelector(selector) {
    return selector === ".image-frame img" ? resultImage : null;
  }
};
applyGeneratedImageNodeResult(resultNode, "/uploads/result.png", {
  prompt: "Prompt",
  model: "model-1",
  dimensions: { width: 640, height: 480 },
  sourceNode: { dataset: { nodeId: "source-1" } }
});
assert(resultImage.src === "/uploads/result.png", "generated image result helper should update image src");
assert(resultImage.removed.includes("srcset"), "generated image result helper should remove stale srcset");
assert(resultImage.dataset.localSourceReady === "true", "generated image result helper should mark local source ready");
assert(resultNode.dataset.objectUrl === "/uploads/result.png", "generated image result helper should persist object URL");
assert(resultNode.dataset.sourceMode === "generated", "generated image result helper should mark generated source mode");
assert(resultNode.dataset.generationPrompt === "Prompt", "generated image result helper should persist prompt");
assert(resultNode.dataset.generationModel === "model-1", "generated image result helper should persist model");
assert(resultNode.dataset.generatorSourceNodeId === "source-1", "generated image result helper should persist source node id");
assert(resultNode.dataset.outputWidth === "640", "generated image result helper should persist output width");
assert(resultNode.dataset.outputHeight === "480", "generated image result helper should persist output height");
const persistedResultImage = {
  src: "",
  dataset: {},
  removeAttribute() {}
};
const persistedResultNode = {
  dataset: {},
  querySelector(selector) {
    return selector === ".image-frame img" ? persistedResultImage : null;
  }
};
applyPersistedGeneratedImageNodeResult(persistedResultNode, {
  displayUrl: "/uploads/display.png",
  sourceUrl: "/uploads/source.png",
  prompt: "Prompt",
  model: "model-1",
  dimensions: { width: 320, height: 240 },
  sourceNode: { dataset: { nodeId: "source-2" } }
});
assert(persistedResultImage.src === "/uploads/display.png", "persisted generated image result helper should prefer display URLs");
assert(persistedResultNode.dataset.objectUrl === "/uploads/display.png", "persisted generated image result helper should persist display URLs");
assert(persistedResultNode.dataset.generatorSourceNodeId === "source-2", "persisted generated image result helper should preserve source node ids");
const fallbackPersistedResultImage = {
  src: "",
  dataset: {},
  removeAttribute() {}
};
const fallbackPersistedResultNode = {
  dataset: {},
  querySelector(selector) {
    return selector === ".image-frame img" ? fallbackPersistedResultImage : null;
  }
};
applyPersistedGeneratedImageNodeResult(fallbackPersistedResultNode, {
  sourceUrl: "/uploads/source-only.png"
});
assert(fallbackPersistedResultImage.src === "/uploads/source-only.png", "persisted generated image result helper should fall back to source URLs");
const referenceReads = [];
const referenceFiles = [
  { name: "one.png", type: "image/png" },
  { name: "skip.txt", type: "text/plain" },
  { name: "", type: "image/jpeg" },
  { name: "three.webp", type: "image/webp" },
  { name: "four.png", type: "image/png" }
];
const fileReferences = await readGeneratorReferenceFiles(referenceFiles, {
  readFileAsDataUrl: async (file) => {
    referenceReads.push(file.name || "fallback");
    return `data:${file.name || "fallback"}`;
  },
  readImageDataUrlMetrics: async (dataUrl) => ({
    width: dataUrl.length,
    height: dataUrl.length + 1
  })
});
assert(fileReferences.length === 3, "generator reference file helper should keep at most three images");
assert(referenceReads.join(",") === "one.png,fallback,three.webp", "generator reference file helper should skip non-images before limiting");
assert(fileReferences[1].name === "reference image", "generator reference file helper should preserve fallback names");
assert(fileReferences[0].width > 0 && fileReferences[0].height === fileReferences[0].width + 1, "generator reference file helper should include image metrics");
const sourceImageNode = {
  dataset: {
    objectUrl: "/uploads/fallback.png",
    title: "Canvas image",
    imageNaturalWidth: "640",
    imageNaturalHeight: "480"
  },
  classList: {
    contains(name) {
      return name === "node-image";
    }
  },
  querySelector(selector) {
    return selector === ".image-frame img"
      ? {
          src: "/uploads/source.png",
          alt: "Source image",
          naturalWidth: 320,
          naturalHeight: 240
        }
      : null;
  }
};
const sourceReference = await readGeneratorReferenceFromImageNode(sourceImageNode, {
  readImageSourceAsDataUrl: async (src) => `data:${src}`
});
assert(sourceReference.name === "Source image", "generator source-node reference helper should prefer image alt text");
assert(sourceReference.dataUrl === "data:/uploads/source.png", "generator source-node reference helper should read source URLs as data URLs");
assert(sourceReference.width === 320 && sourceReference.height === 240, "generator source-node reference helper should prefer natural image dimensions");
const fallbackSourceReference = await readGeneratorReferenceFromImageNode({
  dataset: {
    objectUrl: "/uploads/fallback.png",
    title: "Fallback title",
    imageNaturalWidth: "1024",
    imageNaturalHeight: "768"
  },
  classList: {
    contains(name) {
      return name === "node-image";
    }
  },
  querySelector() {
    return null;
  }
});
assert(fallbackSourceReference.name === "Fallback title", "generator source-node reference helper should fall back to node titles");
assert(fallbackSourceReference.dataUrl === "/uploads/fallback.png", "generator source-node reference helper should fall back to object URLs");
assert(fallbackSourceReference.width === 1024 && fallbackSourceReference.height === 768, "generator source-node reference helper should fall back to dataset dimensions");
assert(await readGeneratorReferenceFromImageNode({ classList: { contains: () => false }, dataset: {} }) === null, "generator source-node reference helper should skip non-image nodes");

const appInit = read("src/client/core/app-init.js");
assert(
  appInit.includes("[runtime] AI Studio client") &&
  appInit.includes("library-bulk-select-20260627"),
  "client startup must log runtime origin and build id"
);

console.log("Generator job recovery checks passed.");

function createGeneratorDocument({ popover } = {}) {
  return {
    querySelector(selector) {
      return selector === "#imageGeneratorPopover" ? popover : null;
    }
  };
}

function createGeneratorRatioDocument(value = "") {
  return {
    querySelector(selector) {
      return selector === "#imageGeneratorPopover [data-generator-ratio]" ? { value } : null;
    }
  };
}

function createGeneratorModelDocument({
  generatorSelect = null,
  chatSelect = null
} = {}) {
  return {
    querySelector(selector) {
      if (selector === "#imageGeneratorPopover [data-generator-model]") return generatorSelect;
      if (selector === "#chatModelSelect") return chatSelect;
      return null;
    }
  };
}

function createGeneratorSizeFixture() {
  const stage = { style: {} };
  const frame = { style: {} };
  const label = { textContent: "" };
  const node = {
    dataset: {},
    querySelector(selector) {
      if (selector === ".image-generator-stage") return stage;
      if (selector === ".image-generator-frame") return frame;
      if (selector === ".image-generator-size") return label;
      return null;
    }
  };
  return { node, stage, frame, label };
}

function createGeneratorControlsFixture() {
  const promptInput = {};
  const referenceInput = {};
  const referenceList = {};
  const modelSelect = {};
  const ratioSelect = {};
  const countSelect = {};
  const submitButton = {};
  const controlsBySelector = new Map([
    ["[data-image-generator-prompt]", promptInput],
    ["[data-generator-reference-input]", referenceInput],
    ["[data-generator-reference-list]", referenceList],
    ["[data-generator-model]", modelSelect],
    ["[data-generator-ratio]", ratioSelect],
    ["[data-generator-count]", countSelect],
    ["[data-generator-submit]", submitButton]
  ]);
  const popover = {
    querySelector(selector) {
      return controlsBySelector.get(selector) || null;
    }
  };
  return {
    popover,
    promptInput,
    referenceInput,
    referenceList,
    modelSelect,
    ratioSelect,
    countSelect,
    submitButton
  };
}

function createGeneratorCustomSelectFixture() {
  const classes = new Set();
  let closeCalls = 0;
  const wrap = {
    classes,
    classList: createClassList(classes)
  };
  const trigger = {
    disabled: false,
    closest(selector) {
      return selector === ".generator-select-wrap" ? wrap : null;
    }
  };
  return {
    wrap,
    trigger,
    get closeCalls() {
      return closeCalls;
    },
    closeSelects() {
      closeCalls += 1;
    }
  };
}

function createGeneratorCustomSelectCloseFixture() {
  const wraps = [
    { classes: new Set(["open"]) },
    { classes: new Set(["open"]) }
  ];
  wraps.forEach((wrap) => {
    wrap.classList = createClassList(wrap.classes);
  });
  return {
    wraps,
    root: {
      querySelectorAll(selector) {
        return selector === ".generator-select-wrap.open" ? wraps : [];
      }
    }
  };
}

function createGeneratorCustomSelectFixtureForCreate(kind = "ratio") {
  let rebuildCalls = 0;
  const selectClasses = new Set();
  const select = {
    dataset: {},
    classes: selectClasses,
    classList: createClassList(selectClasses),
    after(node) {
      this.afterNode = node;
    },
    matches(selector) {
      if (selector === "[data-generator-model]") return kind === "model";
      if (selector === "[data-generator-ratio]") return kind === "ratio";
      if (selector === "[data-generator-count]") return kind === "count";
      return false;
    }
  };
  return {
    select,
    documentRef: {
      createElement(tagName) {
        return createGeneratorElement(tagName);
      }
    },
    get rebuildCalls() {
      return rebuildCalls;
    },
    onRebuild(nextSelect) {
      if (nextSelect === select) rebuildCalls += 1;
    }
  };
}

function createGeneratorElement(tagName) {
  return {
    tagName,
    dataset: {},
    attributes: {},
    children: [],
    append(...nodes) {
      this.children.push(...nodes);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function createClassList(classes) {
  return {
    add(name) {
      classes.add(name);
    },
    remove(name) {
      classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    },
    toggle(name, enabled) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    }
  };
}

function createGeneratorBusyFixture() {
  const loading = { hidden: true };
  const submit = { disabled: false };
  const modelSelect = createGeneratorSelect("model");
  const ratioSelect = createGeneratorSelect("ratio");
  const countSelect = createGeneratorSelect("count");
  const addReference = { disabled: false };
  const cancel = { disabled: false };
  const controls = [modelSelect, ratioSelect, countSelect, addReference, cancel];
  const triggers = [
    { kind: "model", disabled: false },
    { kind: "ratio", disabled: false },
    { kind: "count", disabled: false }
  ];
  const popover = {
    querySelector(selector) {
      if (selector === "[data-generator-submit]") return submit;
      const triggerMatch = String(selector || "").match(/\[data-generator-select-trigger="([^"]+)"\]/);
      if (triggerMatch) return triggers.find((trigger) => trigger.kind === triggerMatch[1]) || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-generator-model], [data-generator-ratio], [data-generator-count], [data-generator-add-reference], [data-generator-cancel]") {
        return controls;
      }
      if (selector === "[data-generator-model], [data-generator-ratio], [data-generator-count]") {
        return [modelSelect, ratioSelect, countSelect];
      }
      return [];
    }
  };
  const classes = new Set();
  const node = {
    dataset: {},
    classes,
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      }
    },
    querySelector(selector) {
      return selector === ".image-generator-loading" ? loading : null;
    }
  };
  return { node, popover, loading, submit, controls, triggers };
}

function createGeneratorReferenceFixture() {
  const promptInput = { value: "" };
  const referenceList = { innerHTML: "" };
  const popover = {
    dataset: {},
    querySelector(selector) {
      if (selector === "[data-image-generator-prompt]") return promptInput;
      if (selector === "[data-generator-reference-list]") return referenceList;
      return null;
    }
  };
  const classes = new Set();
  const node = {
    dataset: {},
    classes,
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      }
    },
    matches(selector) {
      return selector === ".node-image-generator";
    }
  };
  return { node, popover, promptInput, referenceList };
}

function createGeneratorResultFixture() {
  const image = { src: "", hidden: true };
  const placeholder = { hidden: false };
  const popover = {
    dataset: {},
    querySelector() {
      return null;
    }
  };
  const classes = new Set(["generation-failed"]);
  const node = {
    dataset: {},
    _generatorReferences: [],
    classes,
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      }
    },
    querySelector(selector) {
      if (selector === ".image-generator-result") return image;
      if (selector === "[data-generator-placeholder]") return placeholder;
      return null;
    }
  };
  return { node, image, placeholder, popover, classes };
}

function createGeneratorSelect(kind) {
  return {
    kind,
    disabled: false,
    matches(selector) {
      if (selector === "[data-generator-model]") return kind === "model";
      if (selector === "[data-generator-ratio]") return kind === "ratio";
      if (selector === "[data-generator-count]") return kind === "count";
      return false;
    }
  };
}
