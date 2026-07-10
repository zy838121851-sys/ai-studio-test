import {
  DEFAULT_3D_MODEL,
  getModelType
} from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import {
  buildGeneratedModelNodeOptions,
  buildGeneratedModelProjectPatch
} from "./prompt-result-utils.js";
import { buildImageTo3DFailureMessage } from "./prompt-error-utils.js";
import { getPublicImageUrlFromNode } from "./prompt-canvas-context-utils.js";
import {
  markPromptPreviewsFailed,
  resolvePromptViewportCenterTarget,
  updatePromptPreviewStatus
} from "./prompt-preview-utils.js";
import { waitForTripo3DTask } from "./prompt-job-utils.js";
import { isPrompt3DGeneration } from "./prompt-generation-payload-utils.js";

export function bindImageTo3DRequests({
  root = document,
  canvasViewport,
  viewportPointToWorld,
  addChat,
  updateChat,
  addGenerationPreview,
  replacePreviewWithModel,
  postJsonRequest,
  chatModelSelect,
  updateActiveProject,
  getActiveProject,
  makeProjectTitle,
  saveCurrentProjectAfterGeneration,
  notify = () => {}
} = {}) {
  if (!root || root.__aiStudioImageTo3DBound) return;
  root.__aiStudioImageTo3DBound = true;
  root.addEventListener("canvas:image-to-3d-requested", async (event) => {
    const node = event.detail?.node;
    const imageUrl = getPublicImageUrlFromNode(node);
    if (!imageUrl) {
      notify("当前图片还没有可访问地址，暂时无法图生 3D。请先上传到素材库或等待后续文件上传能力接入。");
      return;
    }
    if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithModel !== "function") {
      notify("3D 生成工作流暂不可用。");
      return;
    }
    const modelId = isPrompt3DGeneration({ modelType: getModelType(chatModelSelect?.dataset?.selectedModelId || chatModelSelect?.value) })
      ? (chatModelSelect.dataset.selectedModelId || chatModelSelect.value)
      : DEFAULT_3D_MODEL;
    let progress = null;
    let previewNode = null;
    try {
      progress = addChat("assistant", "创建 3D 任务中...");
      progress?.classList?.add("loading");
      const target = resolvePromptViewportCenterTarget({
        canvasViewport,
        viewportPointToWorld
      });
      previewNode = addGenerationPreview({
        title: "Tripo 3D Model",
        desc: "Waiting for 3D model result...",
        x: target.x,
        y: target.y,
        width: 360,
        aspectRatio: "1 / 1"
      });
      const created = await postJsonRequest("/api/ai/3d/image-to-model", {
        imageUrl,
        modelId,
        texture: true
      });
      updateChat(progress, "3D 模型生成中 0%");
      const finalResult = await waitForTripo3DTask(created.taskId, {
        onProgress: (payload) => {
          const percent = Math.max(0, Math.min(99, Math.round(Number(payload?.progress || 0))));
          updateChat(progress, `3D 模型生成中 ${percent}%`);
          updatePromptPreviewStatus(previewNode, `3D model generation ${percent}%...`);
        }
      });
      const modelUrl = finalResult.localModelUrl || finalResult.modelUrl || "";
      if (!modelUrl) throw new Error("3D 模型生成完成，但没有返回模型地址。");
      updateChat(progress, "3D 模型生成完成\n正在添加到画布...");
      const modelNode = replacePreviewWithModel(previewNode, buildGeneratedModelNodeOptions({
        url: modelUrl,
        previewWidth: previewNode?.offsetWidth,
        generationPrompt: "Image to 3D",
        sourceNode: node,
        actionType: "image_to_3d",
        model: modelId,
        desc: "Generated 3D model from your image."
      }));
      const activeProject = getActiveProject?.();
      updateActiveProject?.(buildGeneratedModelProjectPatch({
        project: activeProject,
        titlePrompt: "Image to 3D",
        storedPrompt: activeProject?.prompt || "Image to 3D",
        thumbnail: finalResult.renderedImageUrl || modelUrl,
        itemCountIncrement: 1,
        makeProjectTitle,
        fallbackTitle: "3D Project"
      }));
      await saveCurrentProjectAfterGeneration?.();
      progress?.classList?.remove("loading");
      updateChat(progress, "3D 模型生成完成");
      modelNode?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
    } catch (error) {
      markPromptPreviewsFailed(previewNode);
      const message = buildImageTo3DFailureMessage(error);
      if (progress) updateChat(progress, message);
      else notify(message);
    }
  });
}
