import {
  buildDeferredImageEditResult,
  toClientAsset,
  toClientBilling,
  toClientJob
} from "../../lib/ai-response-dto.js";
import {
  getInitialAIJobStatus,
  isFixedQwenImageEditAction
} from "../../lib/ai-route-helpers.js";
import {
  expandImage,
  generateFixedQwenImageEdit,
  generateImage,
  superResolutionImage
} from "../ai.service.js";
import {
  completeAIJob,
  createAIJob,
  refreshAIJob,
  scheduleAIJobRefresh
} from "../ai-job.service.js";
import { getAsset } from "../asset.service.js";
import { billFixedTask } from "../credits/billing.service.js";
import {
  DEFAULT_IMAGE_MODEL,
  getModelConfig,
  isApimartModel
} from "../model-catalog.service.js";

export async function createImageEdit({
  userId = "",
  body = {}
} = {}) {
  const requestedModel = String(body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
  const modelConfig = getModelConfig(requestedModel);
  if (!modelConfig) {
    throw new Error(`Unsupported image model: ${requestedModel}`);
  }
  const {
    model = requestedModel,
    prompt,
    image,
    images,
    size,
    actionType,
    upscaleFactor,
    expand
  } = body;
  if (!prompt) throw new Error("Missing prompt");
  const referenceImages = Array.isArray(images) && images.length ? images : [image].filter(Boolean);
  if (!referenceImages.length) throw new Error("Missing image");
  if (actionType === "expand_image") {
    return createExpandedImageEdit({
      model,
      prompt,
      referenceImages,
      expand
    });
  }
  if (actionType === "upscale") {
    return createUpscaledImageEdit({
      model,
      prompt,
      referenceImages,
      upscaleFactor
    });
  }
  if (isFixedQwenImageEditAction(actionType)) {
    return createFixedQwenImageEdit({
      userId,
      prompt,
      referenceImages,
      size,
      actionType
    });
  }
  return createModelImageEdit({
    userId,
    model,
    prompt,
    referenceImages,
    size
  });
}

export async function createExpandedImageEdit({
  model = "",
  prompt = "",
  referenceImages = [],
  expand
} = {}) {
  const requestedProviderId = getModelConfig(model)?.providerId;
  const result = await expandImage({ image: referenceImages[0], prompt, expand, model });
  const apimartResult = result.provider === "apimart";
  return {
    body: {
      message: result.imageUrl ? "Image expanded" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel || model,
      resolvedModel: result.resolvedModel || result.model,
      provider: apimartResult ? undefined : (result.provider || requestedProviderId),
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: apimartResult ? [] : (result.providerCalls || []),
      referenceCount: result.referenceCount,
      taskId: result.taskId
    }
  };
}

export async function createUpscaledImageEdit({
  model = "",
  prompt = "",
  referenceImages = [],
  upscaleFactor
} = {}) {
  const requestedProviderId = getModelConfig(model)?.providerId;
  const result = await superResolutionImage({ image: referenceImages[0], prompt, upscaleFactor, model });
  const apimartResult = result.provider === "apimart";
  return {
    body: {
      message: result.imageUrl ? "Image upscaled" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel || model,
      resolvedModel: result.resolvedModel || result.model,
      provider: apimartResult ? undefined : (result.provider || requestedProviderId),
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: apimartResult ? [] : (result.providerCalls || []),
      referenceCount: result.referenceCount,
      taskId: result.taskId,
      upscaleFactor: result.upscaleFactor
    }
  };
}

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

export async function createModelImageEdit({
  userId = "",
  model = "",
  prompt = "",
  referenceImages = [],
  size
} = {}) {
  const result = await billFixedTask({
    userId,
    provider: getModelConfig(model)?.providerId,
    model,
    task: "image_editing",
    count: 1,
    reason: "image_editing",
    callProvider: async ({ reservation, requestId }) => {
      const editResult = await generateImage({
        model,
        prompt,
        images: referenceImages,
        size,
        requestId
      });
      const remoteTaskId = editResult.remoteTaskId || editResult.taskId;
      if (!remoteTaskId) return editResult;
      const modelConfig = getModelConfig(model);
      const job = createAIJob({
        id: requestId,
        userId,
        provider: modelConfig?.providerId || editResult.provider || "",
        vendor: modelConfig?.vendor || "",
        modelId: model,
        providerModel: editResult.providerModel || editResult.resolvedModel || editResult.model || modelConfig?.providerModel || model,
        remoteTaskId,
        type: "image",
        status: getInitialAIJobStatus(editResult),
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
        return buildDeferredImageEditResult(editResult, completed || job, firstAsset, reservation);
      }
      scheduleAIJobRefresh(userId, job.id);
      if (editResult.status === "succeeded") {
        const completed = await refreshAIJob(userId, job.id);
        const firstAsset = completed?.outputAssetIds?.[0]
          ? getAsset(userId, completed.outputAssetIds[0])
          : null;
        return buildDeferredImageEditResult(editResult, completed || job, firstAsset, reservation);
      }
      return buildDeferredImageEditResult(editResult, job, null, reservation);
    }
  });
  return {
    body: {
      message: result.imageUrl ? "Image updated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      imageUrls: result.imageUrls || [],
      outputs: result.outputs || [],
      model: result.model,
      requestedModel: result.requestedModel,
      resolvedModel: result.resolvedModel || result.model,
      provider: isApimartModel(model) ? undefined : (result.provider || getModelConfig(model)?.providerId),
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: isApimartModel(model) ? [] : (result.providerCalls || []),
      referenceCount: result.referenceCount,
      job: result.job,
      jobId: result.jobId,
      remoteTaskId: result.remoteTaskId || result.taskId || "",
      status: result.status || result.job?.status || "",
      outputCount: result.outputCount || 0,
      asset: result.asset,
      billing: toClientBilling(result.billing)
    }
  };
}
