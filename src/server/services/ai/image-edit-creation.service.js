import { toClientAsset, toClientBilling, toClientJob } from "../../lib/ai-response-dto.js";
import { generateFixedQwenImageEdit } from "../ai.service.js";
import {
  completeAIJob,
  createAIJob
} from "../ai-job.service.js";
import { getAsset } from "../asset.service.js";
import { billFixedTask } from "../credits/billing.service.js";

export async function createFixedQwenImageEdit({
  userId = "",
  prompt = "",
  referenceImages = [],
  size,
  actionType = ""
} = {}) {
  const result = await billFixedTask({
    userId,
    provider: "qwen",
    model: "qwen-image-edit-plus",
    task: "image_editing",
    count: 1,
    reason: actionType || "image_editing",
    callProvider: async ({ reservation, requestId }) => {
      const editResult = await generateFixedQwenImageEdit({
        prompt,
        images: referenceImages,
        size,
        requestId
      });
      const remoteTaskId = editResult.remoteTaskId || editResult.taskId;
      if (!remoteTaskId) return editResult;
      const job = createAIJob({
        userId,
        provider: "qwen",
        vendor: "qwen",
        modelId: "qwen-image-edit-plus",
        providerModel: editResult.providerModel || editResult.resolvedModel || editResult.model || "qwen-image-edit-plus",
        remoteTaskId,
        type: "image",
        status: editResult.imageUrl ? "running" : (editResult.status || "queued"),
        progress: editResult.imageUrl ? 90 : (editResult.status === "running" ? 50 : 5),
        prompt,
        creditsReserved: reservation.amountCredits
      });
      if (editResult.imageUrl) {
        const completed = await completeAIJob(userId, job.id, {
          outputs: [{ url: editResult.imageUrl, mimeType: "image/png" }]
        });
        const firstAsset = completed?.outputAssetIds?.[0]
          ? getAsset(userId, completed.outputAssetIds[0])
          : null;
        return {
          ...editResult,
          imageUrl: firstAsset?.url || "",
          asset: toClientAsset(firstAsset),
          job: toClientJob(completed),
          jobId: completed?.id || job.id,
          deferCharge: true,
          billing: {
            creditsReserved: reservation.amountCredits,
            creditsCharged: completed?.creditsCharged || 0,
            status: completed?.status === "succeeded" ? "charged" : completed?.status
          }
        };
      }
      return {
        ...editResult,
        job: toClientJob(job),
        jobId: job.id,
        deferCharge: true
      };
    }
  });
  return {
    body: {
      message: result.imageUrl ? "Image updated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel,
      resolvedModel: result.resolvedModel || result.model,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: result.providerCalls || [],
      referenceCount: result.referenceCount,
      job: result.job,
      jobId: result.jobId,
      billing: toClientBilling(result.billing)
    }
  };
}
