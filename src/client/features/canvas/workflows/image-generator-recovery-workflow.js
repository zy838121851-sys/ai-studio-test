import { getResultImageUrls } from "./image-generator-result-utils.js";
import { waitForImageGenerationJob } from "./image-generator-job-polling-utils.js";
import { replaceRecoveredGeneratorPreview } from "./image-generator-preview-replacement-utils.js";
import {
  buildRecoveredGeneratorPreviewItems,
  getGeneratorProgressStatusText,
  getPendingGeneratorPreviewGroups,
  markGeneratorPreviewFailed,
  updateGeneratorPreviewStatus as updatePreviewStatus
} from "./image-generator-preview-job-utils.js";

export function createImageGeneratorRecoveryWorkflow({
  root = globalThis.document,
  replacePreviewWithImage = null,
  saveCurrentProjectAfterGeneration = null
} = {}) {
  return function resumePendingGeneratorPreviews() {
    const groups = getPendingGeneratorPreviewGroups(root);
    if (!groups.size) return;
    groups.forEach((nodes, jobId) => {
      nodes.forEach((node) => {
        node.dataset.generatorResuming = "true";
        updatePreviewStatus(node, "正在恢复生成结果...");
      });
      waitForImageGenerationJob(jobId, {
        attempts: 20,
        delayMs: 1500,
        fallback: { jobId },
        onProgress: (payload) => {
          nodes.forEach((node) => updatePreviewStatus(node, getGeneratorProgressStatusText(payload?.progress, {
            idleText: "正在恢复生成结果...",
            activeText: "正在恢复生成结果"
          })));
        }
      }).then((result) => {
        const urls = getResultImageUrls(result);
        buildRecoveredGeneratorPreviewItems(nodes, { jobId, result, urls }).forEach((item) => replaceRecoveredGeneratorPreview(item.previewNode, {
          jobId: item.jobId,
          result: item.result,
          url: item.url,
          index: item.index,
          count: item.count,
          replacePreviewWithImage
        }));
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
        saveCurrentProjectAfterGeneration?.();
      }).catch((error) => {
        nodes.forEach((node) => {
          delete node.dataset.generatorResuming;
          if (node.isConnected) markGeneratorPreviewFailed(node, error);
        });
      });
    });
  };
}
