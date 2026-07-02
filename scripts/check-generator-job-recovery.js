import { readFileSync } from "node:fs";
import {
  getGeneratorPreviewDescription,
  getGeneratorPreviewNodeWidth,
  getRecoveredGeneratorPreviewUrl,
  markGeneratorPreviewFailed,
  updateGeneratorPreviewStatus
} from "../src/client/features/canvas/workflows/image-generator-preview-job-utils.js";
import {
  getGeneratedImagePlacement,
  getGeneratorReplacementPlacement
} from "../src/client/features/canvas/workflows/image-generator-placement-utils.js";
import {
  applyGeneratedImageNodeResult,
  applyGeneratedImageNodeSize,
  getGeneratorResultTitle
} from "../src/client/features/canvas/workflows/image-generator-result-utils.js";

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
assert(
  generatorWorkflow.includes("onJobCreated")
    && generatorWorkflow.includes("tagGeneratorPreviewJobs")
    && generatorWorkflow.includes("getRecoveredGeneratorPreviewUrl")
    && generatorWorkflow.includes("getGeneratorPreviewDescription")
    && generatorWorkflow.includes("getGeneratorPreviewNodeWidth as getPreviewNodeWidth")
    && generatorWorkflow.includes("getGeneratedImagePlacement")
    && generatorWorkflow.includes("getGeneratorReplacementPlacement")
    && generatorWorkflow.includes("markGeneratorPreviewFailed")
    && generatorWorkflow.includes("updateGeneratorPreviewStatus as updatePreviewStatus")
    && generatorWorkflow.includes("applyGeneratedImageNodeResult")
    && generatorWorkflow.includes("applyGeneratedImageNodeSize")
    && generatorWorkflow.includes("getGeneratorResultTitle")
    && generatorPreviewJobUtils.includes("applyGeneratorPreviewJobMetadata"),
  "generator must tag preview nodes with job ids when async jobs are created"
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
  generatorJobPollingUtils.includes("Waiting for saved image URL"),
  "generator polling must retry succeeded jobs that do not yet expose an image URL"
);
assert(
  generatorWorkflow.includes("logGeneratorJobPoll") &&
  generatorWorkflow.includes("[generator] job poll"),
  "generator polling must emit local diagnostic logs"
);
assert(
  generatorJobPollingUtils.includes("getMissingGeneratorResultError(lastPayload, expectedType)") &&
  generatorResultUtils.includes("return new Error(getMissingGeneratorResultMessage(result, expectedType));"),
  "generator polling must fail clearly when a terminal job has no image URL"
);

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
assert(getGeneratorResultTitle(0, 1) === "Image Generator Result.png", "single image generator result title should stay stable");
assert(getGeneratorResultTitle(1, 3) === "Image Generator Result 2.png", "multi image generator result title should include one-based index");
assert(getGeneratorResultTitle(0, 4) === "Image Generator Result 1.png", "generator replacement title should preserve first numbered result");
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

const appInit = read("src/client/core/app-init.js");
assert(
  appInit.includes("[runtime] AI Studio client") &&
  appInit.includes("library-bulk-select-20260627"),
  "client startup must log runtime origin and build id"
);

console.log("Generator job recovery checks passed.");
