import { Router } from "express";
import {
  analyzeImage,
  extractImageText,
  expandImage,
  generateFixedQwenImageEdit,
  generateImage,
  generateSuggestions,
  generateVideo,
  prepareAction,
  superResolutionImage
} from "../services/ai.service.js";
import { env } from "../config/env.js";
import { classifyAIError, createAIAsyncHandler, toClientFailure } from "../lib/ai-error-response.js";
import {
  buildGenerationFailureLog,
  buildGenerationRequestLog,
  buildGenerationResponseLog,
  buildTripo3DRequestLog,
  buildTripo3DResponseLog,
  toClientSizeNormalization
} from "../lib/ai-job-log-payload.js";
import {
  buildDeferredImageEditResult,
  sanitizeGenerationResult,
  toClientAsset,
  toClientBilling,
  toClientJob
} from "../lib/ai-response-dto.js";
import {
  assertResolvedProviderMatchesModel,
  assertTripo3DModelConfig,
  assertTripo3DRequiredInput,
  buildTripo3DDispatchParams,
  buildTripo3DDispatchResultParams,
  buildTripo3DFailJobParams,
  buildTripo3DJobRecordParams,
  buildTripo3DReleaseReservationParams,
  buildTripo3DRemoteFailureParams,
  buildTripo3DSuccessResponse,
  getInitialAIJobStatus,
  getModelModality,
  getTripo3DJobMetadata,
  getTripo3DProviderModel,
  hasRemoteFallbackModelOutput,
  isFixedQwenImageEditAction,
  jobStatusForError,
  normalizeTripo3DJobInput,
  normalizeImages,
  validateVideoOptions
} from "../lib/ai-route-helpers.js";
import { logAIModelRoute, logAIProviderRoute } from "../lib/ai-route-logging.js";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { assertPublicHttpUrl } from "../security/network.js";
import { billFixedTask } from "../services/credits/billing.service.js";
import {
  chargeReservedCredits,
  releaseReservedCredits,
  reserveCredits
} from "../services/credits/credit.service.js";
import { quoteFixedCredits } from "../services/credits/pricing.service.js";
import {
  completeModel3DJob,
  completeAIJob,
  createAIJob,
  failModel3DJob,
  failAIJob,
  getAIJobByRemoteTaskId,
  getAIJobDetails,
  getAIJobOutputAssets,
  listAIJobs,
  markAIJobCreditsCharged,
  refreshAIJob,
  scheduleAIJobRefresh,
  updateAIJobLogData,
  updateAIJobProgress,
  updateAIJobDispatchResult
} from "../services/ai-job.service.js";
import { getAsset } from "../services/asset.service.js";
import {
  DEFAULT_3D_MODEL,
  DEFAULT_IMAGE_MODEL,
  getModelConfig,
  isApimartModel,
  listImageModels
} from "../services/model-catalog.service.js";
import {
  createImageToModelTask,
  createTextToModelTask,
  getTask as getTripoTask
} from "../services/ai/providers/tripo.service.js";
import { randomUUID } from "node:crypto";

const aiLimiter = createRateLimiter({
  namespace: "ai",
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many AI requests"
});

const imageProxyLimiter = createRateLimiter({
  namespace: "image-proxy",
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many image proxy requests"
});

const jobPollLimiter = createRateLimiter({
  namespace: "ai-job-poll",
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many job status requests"
});

const asyncHandler = createAIAsyncHandler();

export function createAIRouter() {
  const router = Router();

  router.get("/models", asyncHandler(async (req, res) => {
    const surface = String(req.query.surface || "").trim();
    res.json({
      defaultModel: DEFAULT_IMAGE_MODEL,
      models: listImageModels({ surface: surface || undefined })
    });
  }));

  router.use(requireAuth);

  router.post("/ai/3d/text-to-model", aiLimiter, asyncHandler(async (req, res) => {
    const result = await createTripo3DJob(req, normalizeTripo3DJobInput(req.body, { mode: "text" }));
    res.json(result);
  }));

  router.post("/ai/3d/image-to-model", aiLimiter, asyncHandler(async (req, res) => {
    const result = await createTripo3DJob(req, normalizeTripo3DJobInput(req.body, { mode: "image" }));
    res.json(result);
  }));

  router.get("/ai/3d/tasks/:taskId", jobPollLimiter, asyncHandler(async (req, res) => {
    const remoteTaskId = String(req.params.taskId || "").trim();
    const job = getAIJobByRemoteTaskId(req.auth.user.id, remoteTaskId);
    if (!job) {
      sendErrorResponse(res, 404, "3D task not found");
      return;
    }
    const startedAt = Number(job.createdAt || Date.now());
    const remote = await getTripoTask(remoteTaskId);
    let currentJob = job;
    const responseData = {
      provider: "tripo",
      remote,
      checkedAt: Date.now()
    };
    if (remote.status === "success") {
      const existingAssets = getAIJobOutputAssets(req.auth.user.id, job);
      const needsLocalModelSave = hasRemoteFallbackModelOutput(existingAssets);
      currentJob = await completeModel3DJob(req.auth.user.id, job.id, {
        outputs: remote.modelUrl
          ? [{
            url: remote.modelUrl,
            mimeType: "model/gltf-binary",
            allowRemoteFallback: true
          }]
          : [],
        responseData,
        durationMs: Date.now() - startedAt,
        force: needsLocalModelSave
      });
    } else if (["failed", "cancelled", "banned"].includes(remote.status)) {
      currentJob = failModel3DJob(req.auth.user.id, job.id, buildTripo3DRemoteFailureParams({
        remote,
        responseData,
        startedAt
      }));
    } else {
      updateAIJobLogData(req.auth.user.id, job.id, { responseData });
      currentJob = updateAIJobProgress(req.auth.user.id, job.id, {
        status: remote.status === "running" ? "running" : "queued",
        progress: remote.progress
      });
    }
    const assets = getAIJobOutputAssets(req.auth.user.id, currentJob);
    const localModel = assets.find((asset) => asset.type === "model3d" && asset.filePath) || null;
    const firstModel = assets.find((asset) => asset.type === "model3d") || null;
    res.json({
      ok: true,
      provider: "tripo",
      taskId: remote.taskId || remoteTaskId,
      jobId: currentJob?.id || job.id,
      status: remote.status,
      progress: remote.progress,
      modelUrl: localModel?.url || remote.modelUrl || firstModel?.url || "",
      localModelUrl: localModel?.url || "",
      renderedImageUrl: remote.renderedImageUrl || "",
      errorMessage: remote.errorMessage || currentJob?.failureMessage || "",
      job: toClientJob(currentJob),
      billing: {
        creditsReserved: currentJob?.creditsReserved || 0,
        creditsCharged: currentJob?.creditsCharged || 0,
        status: currentJob?.creditsCharged > 0 ? "charged" : (currentJob?.status || "")
      }
    });
  }));

  router.post("/ai/generate", aiLimiter, asyncHandler(async (req, res) => {
    const modelId = String(req.body?.modelId || req.body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      const error = new Error(`Unsupported model: ${modelId}`);
      error.status = 400;
      throw error;
    }
    if (getModelModality(modelConfig) === "3d") {
      const error = new Error("3D models must use /api/ai/3d/text-to-model or /api/ai/3d/image-to-model");
      error.status = 400;
      error.code = "USE_3D_GENERATION_API";
      throw error;
    }
    if (!isApimartModel(modelId)) {
      const result = await billFixedTask({
        userId: req.auth.user.id,
        provider: modelConfig.providerId,
        model: modelId,
        task: "image_generation",
        count: req.body?.count,
        reason: "image_generation",
        callProvider: () => generateImage({
          model: modelId,
          prompt: req.body?.prompt,
          images: normalizeImages(req.body?.images),
          size: req.body?.size
        })
      });
      res.json(sanitizeGenerationResult(result, modelConfig));
      return;
    }

    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt && !normalizeImages(req.body?.images).length) {
      const error = new Error("Missing prompt or reference image");
      error.status = 400;
      throw error;
    }
    const type = modelConfig.type === "video" ? "video" : "image";
    const task = type === "video" ? "video_generation" : "image_generation";
    const requestId = randomUUID();
    const images = normalizeImages(req.body?.images);
    const videoOptions = type === "video"
      ? validateVideoOptions(modelConfig, req.body?.videoOptions || {})
      : {};
    const quote = quoteFixedCredits({
      provider: modelConfig.providerId,
      model: modelConfig.id,
      task,
      count: 1
    });
    const startedAt = Date.now();
    let reservation = null;
    let job = null;

    try {
      reservation = reserveCredits({
        userId: req.auth.user.id,
        amount: quote.totalCredits,
        provider: modelConfig.providerId,
        model: modelConfig.id,
        task,
        billingType: "fixed",
        reason: task,
        requestId
      });
      job = createAIJob({
        id: requestId,
        userId: req.auth.user.id,
        provider: modelConfig.providerId,
        vendor: modelConfig.vendor || "",
        modelId: modelConfig.id,
        providerModel: modelConfig.providerModel || modelConfig.id,
        remoteTaskId: "",
        type,
        status: "queued",
        progress: 0,
        prompt,
        inputAssetIds: req.body?.inputAssetIds || [],
        creditsReserved: reservation.amountCredits,
        requestData: buildGenerationRequestLog({
          route: "/api/ai/generate",
          requestId,
          modelConfig,
          type,
          task,
          prompt,
          images,
          size: req.body?.size,
          videoOptions,
          inputAssetIds: req.body?.inputAssetIds || [],
          quote,
          reservation
        })
      });
      const result = type === "video"
        ? await generateVideo({
          model: modelConfig.id,
          prompt,
          images,
          videoOptions,
          requestId
        })
        : await generateImage({
          model: modelConfig.id,
          prompt,
          images,
          size: req.body?.size,
          requestId
        });
      logAIModelRoute({
        route: "/api/ai/generate",
        requestedModel: modelConfig.id,
        providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel,
        remoteTaskId: result.remoteTaskId || result.taskId || "",
        type,
        referenceCount: images.length
      });
      const immediateOutputUrl = type === "video"
        ? (result.videoUrl || result.imageUrl || "")
        : (result.imageUrl || "");
      const responseLog = buildGenerationResponseLog(result, {
        modelConfig,
        type,
        immediateOutputUrl
      });
      job = updateAIJobDispatchResult(req.auth.user.id, job.id, {
        remoteTaskId: result.remoteTaskId || result.taskId || "",
        providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel || modelConfig.id,
        status: getInitialAIJobStatus(result),
        progress: immediateOutputUrl ? 90 : 5,
        responseData: responseLog
      });
      if (immediateOutputUrl) {
        const completed = await completeAIJob(req.auth.user.id, job.id, {
          outputs: [{ url: immediateOutputUrl, mimeType: type === "video" ? "video/mp4" : "image/png" }],
          responseData: responseLog,
          durationMs: Date.now() - startedAt
        });
        if (completed?.status !== "succeeded") {
          const failure = toClientFailure(completed, "OUTPUT_SAVE_FAILED");
          res.status(500).json({
            message: failure.failureMessage || "Generated output could not be saved locally",
            ...failure,
            job: toClientJob(completed),
            jobId: completed?.id,
            model: modelConfig.id
          });
          return;
        }
        const firstAsset = completed?.outputAssetIds?.[0]
          ? getAsset(req.auth.user.id, completed.outputAssetIds[0])
          : null;
        res.json({
          message: type === "video" ? "Video generated" : "Image generated",
          job: toClientJob(completed),
          jobId: completed?.id,
          imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
          imageUrls: firstAsset?.type === "image" ? [firstAsset.url] : [],
          videoUrl: firstAsset?.type === "video" ? firstAsset.url : "",
          videoUrls: firstAsset?.type === "video" ? [firstAsset.url] : [],
          outputs: firstAsset ? [toClientAsset(firstAsset)] : [],
          asset: toClientAsset(firstAsset),
          model: modelConfig.id,
          requestedModel: modelConfig.id,
          providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel || modelConfig.id,
          resolvedModel: result.resolvedModel || result.providerModel || result.model || modelConfig.providerModel || modelConfig.id,
          sizeNormalization: toClientSizeNormalization(result.sizeNormalization),
          billing: {
            creditsReserved: reservation.amountCredits,
            creditsCharged: completed?.creditsCharged || 0,
            status: completed?.status === "succeeded" ? "charged" : completed?.status
          }
        });
        return;
      }
      scheduleAIJobRefresh(req.auth.user.id, job.id);
      if (result.status === "succeeded") {
        const completed = await refreshAIJob(req.auth.user.id, job.id);
        res.json({
          message: "Generation completed",
          job: toClientJob(completed),
          jobId: completed?.id,
          model: modelConfig.id,
          requestedModel: modelConfig.id,
          providerModel: completed?.providerModel || modelConfig.providerModel || modelConfig.id,
          resolvedModel: completed?.providerModel || modelConfig.providerModel || modelConfig.id,
          sizeNormalization: toClientSizeNormalization(result.sizeNormalization)
        });
        return;
      }
      res.json({
        message: "Generation job created",
        job: toClientJob(job),
        jobId: job.id,
        model: modelConfig.id,
        requestedModel: modelConfig.id,
        providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel || modelConfig.id,
        resolvedModel: result.resolvedModel || result.providerModel || result.model || modelConfig.providerModel || modelConfig.id,
        sizeNormalization: toClientSizeNormalization(result.sizeNormalization),
        billing: {
          creditsReserved: reservation.amountCredits,
          creditsCharged: 0,
          status: "reserved"
        }
      });
    } catch (error) {
      const failure = classifyAIError(error, { path: req.path });
      if (job?.id) {
        error.aiJob = failAIJob(req.auth.user.id, job.id, {
          status: jobStatusForError(error),
          errorCode: error?.code || failure.failureCode,
          errorMessage: failure.failureMessage,
          responseData: buildGenerationFailureLog(error, failure),
          durationMs: Date.now() - startedAt
        });
      } else if (reservation?.amountCredits) {
        releaseReservedCredits({
          userId: req.auth.user.id,
          amount: reservation.amountCredits,
          provider: modelConfig.providerId,
          model: modelConfig.id,
          task,
          billingType: "fixed",
          reason: error?.message || "provider_failed",
          requestId,
          status: "failed"
        });
      }
      throw error;
    }
  }));

  router.get("/ai/jobs", jobPollLimiter, asyncHandler(async (req, res) => {
    const result = listAIJobs(req.auth.user.id, {
      limit: req.query.limit,
      offset: req.query.offset,
      q: req.query.q,
      type: req.query.type,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    });
    res.json({
      ...result,
      serverTime: Date.now()
    });
  }));

  router.get("/ai/jobs/:jobId", jobPollLimiter, asyncHandler(async (req, res) => {
    const refreshed = await refreshAIJob(req.auth.user.id, req.params.jobId);
    if (!refreshed) {
      sendErrorResponse(res, 404, "Job not found");
      return;
    }
    const job = getAIJobDetails(req.auth.user.id, req.params.jobId) || refreshed;
    const assets = getAIJobOutputAssets(req.auth.user.id, job);
    const firstAsset = assets[0] || null;
    res.json({
      job: toClientJob(job),
      jobId: job.id,
      remoteTaskId: job.remoteTaskId || "",
      status: job.status,
      progress: job.progress,
      updatedAt: job.updatedAt,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      durationMs: job.durationMs,
      outputCount: assets.length,
      outputs: assets.map(toClientAsset),
      imageUrls: assets.filter((asset) => asset.type === "image").map((asset) => asset.url),
      videoUrls: assets.filter((asset) => asset.type === "video").map((asset) => asset.url),
      imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
      videoUrl: firstAsset?.type === "video" ? firstAsset.url : "",
      error: job.failureMessage || job.errorMessage || "",
      errorCode: job.errorCode || "",
      errorMessage: job.errorMessage || "",
      failureCode: job.failureCode || job.errorCode || "",
      failureMessage: job.failureMessage || job.errorMessage || "",
      requestData: job.requestData || {},
      responseData: job.responseData || {},
      billing: {
        creditsReserved: job.creditsReserved || 0,
        creditsCharged: job.creditsCharged || 0,
        status: job.status === "succeeded" ? "charged" : job.status
      }
    });
  }));

  router.post("/chat", aiLimiter, asyncHandler(async (req, res) => {
    const requestedModel = String(req.body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
    const modelConfig = getModelConfig(requestedModel);
    if (!modelConfig) {
      throw new Error(`Unsupported image model: ${requestedModel}`);
    }
    const result = await billFixedTask({
      userId: req.auth.user.id,
      provider: modelConfig.providerId,
      model: requestedModel,
      task: "image_generation",
      count: req.body?.count,
      reason: "image_generation",
      callProvider: () => generateImage({
        ...req.body,
        model: requestedModel
      })
    });
    logAIModelRoute({
      route: "/api/chat",
      requestedModel,
      providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel,
      remoteTaskId: result.remoteTaskId || result.taskId || "",
      type: "image",
      referenceCount: Array.isArray(req.body?.images) ? req.body.images.length : 0
    });
    assertResolvedProviderMatchesModel({ modelConfig, result });
    logAIProviderRoute({
      requestedModel,
      provider: result.provider || modelConfig.providerId,
      providerModel: result.providerModel || result.resolvedModel || result.model,
      referenceCount: result.referenceCount
    });
    res.json({
      message: result.imageUrl ? "Image generated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel || requestedModel,
      resolvedModel: result.resolvedModel || result.model,
      provider: isApimartModel(requestedModel) ? undefined : (result.provider || modelConfig.providerId),
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: isApimartModel(requestedModel) ? [] : (result.providerCalls || []),
      referenceCount: result.referenceCount,
      sizeNormalization: toClientSizeNormalization(result.sizeNormalization),
      billing: toClientBilling(result.billing)
    });
  }));

  router.post("/image-edit", aiLimiter, asyncHandler(async (req, res) => {
    const requestedModel = String(req.body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
    const modelConfig = getModelConfig(requestedModel);
    if (!modelConfig) {
      throw new Error(`Unsupported image model: ${requestedModel}`);
    }
    const { model = requestedModel, prompt, image, images, size, actionType, upscaleFactor, expand } = req.body;
    if (!prompt) throw new Error("Missing prompt");
    const referenceImages = Array.isArray(images) && images.length ? images : [image].filter(Boolean);
    if (!referenceImages.length) throw new Error("Missing image");
    const requestedProviderId = getModelConfig(model)?.providerId;
    if (actionType === "expand_image") {
      const result = await expandImage({ image: referenceImages[0], prompt, expand, model });
      const apimartResult = result.provider === "apimart";
      res.json({
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
      });
      return;
    }
    if (actionType === "upscale") {
      const result = await superResolutionImage({ image: referenceImages[0], prompt, upscaleFactor, model });
      const apimartResult = result.provider === "apimart";
      res.json({
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
      });
      return;
    }
    if (isFixedQwenImageEditAction(actionType)) {
      const result = await billFixedTask({
        userId: req.auth.user.id,
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
            userId: req.auth.user.id,
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
            const completed = await completeAIJob(req.auth.user.id, job.id, {
              outputs: [{ url: editResult.imageUrl, mimeType: "image/png" }]
            });
            const firstAsset = completed?.outputAssetIds?.[0]
              ? getAsset(req.auth.user.id, completed.outputAssetIds[0])
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
      res.json({
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
      });
      return;
    }
    const result = await billFixedTask({
      userId: req.auth.user.id,
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
          userId: req.auth.user.id,
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
          const completed = await completeAIJob(req.auth.user.id, job.id, {
            outputs: [{ url: editResult.imageUrl, mimeType: "image/png" }]
          });
          const firstAsset = completed?.outputAssetIds?.[0]
            ? getAsset(req.auth.user.id, completed.outputAssetIds[0])
            : null;
          return buildDeferredImageEditResult(editResult, completed || job, firstAsset, reservation);
        }
        scheduleAIJobRefresh(req.auth.user.id, job.id);
        if (editResult.status === "succeeded") {
          const completed = await refreshAIJob(req.auth.user.id, job.id);
          const firstAsset = completed?.outputAssetIds?.[0]
            ? getAsset(req.auth.user.id, completed.outputAssetIds[0])
            : null;
          return buildDeferredImageEditResult(editResult, completed || job, firstAsset, reservation);
        }
        return buildDeferredImageEditResult(editResult, job, null, reservation);
      }
    });
    res.json({
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
    });
  }));

  router.post("/extract-image-text", aiLimiter, asyncHandler(async (req, res) => {
    const result = await extractImageText(req.body);
    res.json({
      message: "Image text extracted",
      model: env.dashscopeVisionModel,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || env.dashscopeVisionModel,
      providerCalls: result.providerCalls || [],
      texts: result.texts,
      text: result.text
    });
  }));

  router.post("/analyze-image", aiLimiter, asyncHandler(async (req, res) => {
    const result = await billFixedTask({
      userId: req.auth.user.id,
      provider: "qwen",
      model: env.dashscopeVisionModel,
      task: "vision_analysis",
      count: 1,
      reason: "vision_analysis",
      callProvider: () => analyzeImage(req.body)
    });
    res.json({
      message: "Image analyzed",
      model: env.dashscopeVisionModel,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || env.dashscopeVisionModel,
      providerCalls: result.providerCalls || [],
      billing: toClientBilling(result.billing),
      analysis: result.analysis,
      text: result.text
    });
  }));

  router.post("/prepare-action", aiLimiter, asyncHandler(async (req, res) => {
    const result = await prepareAction(req.body);
    res.json({
      message: "Action prepared",
      action: result.action,
      text: result.text,
      providerCalls: result.providerCalls || []
    });
  }));

  router.post("/canvas-agent", aiLimiter, asyncHandler(async (req, res) => {
    if (!req.body?.canvasState) throw new Error("Missing canvasState");
    const result = await generateSuggestions({ canvasState: req.body.canvasState, model: req.body.model });
    res.json({
      message: "Canvas suggestion ready",
      suggestion: result.analysis,
      text: result.text,
      providerCalls: result.providerCalls || []
    });
  }));

  router.get("/image-proxy", imageProxyLimiter, asyncHandler(async (req, res) => {
    const url = String(req.query.url || "").trim();
    const safeUrl = await assertPublicHttpUrl(url);
    const upstream = await fetch(safeUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) {
      sendErrorResponse(res, upstream.status, "Unable to fetch image");
      return;
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.toLowerCase().startsWith("image/")) {
      sendErrorResponse(res, 415, "URL did not return an image");
      return;
    }
    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength && contentLength > env.maxProxyImageBytes) {
      sendErrorResponse(res, 413, "Image is too large");
      return;
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > env.maxProxyImageBytes) {
      sendErrorResponse(res, 413, "Image is too large");
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  }));

  return router;
}

async function createTripo3DJob(req, {
  mode = "text",
  prompt = "",
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = "",
  texture = true
} = {}) {
  const userId = req.auth.user.id;
  const modelId = String(req.body?.modelId || req.body?.model || DEFAULT_3D_MODEL).trim() || DEFAULT_3D_MODEL;
  const modelConfig = getModelConfig(modelId);
  assertTripo3DModelConfig({ modelId, modelConfig, mode });
  const cleanPrompt = String(prompt || "").trim();
  const cleanImageUrl = String(imageUrl || "").trim();
  const cleanImageDataUrl = String(imageDataUrl || "").trim();
  const cleanImageName = String(imageName || "").trim();
  const cleanImageMimeType = String(imageMimeType || "").trim();
  assertTripo3DRequiredInput({
    mode,
    prompt: cleanPrompt,
    imageUrl: cleanImageUrl,
    imageDataUrl: cleanImageDataUrl
  });

  const requestId = randomUUID();
  const startedAt = Date.now();
  const { task, route } = getTripo3DJobMetadata(mode);
  const providerModel = getTripo3DProviderModel(modelConfig);
  const taskApiModel = getTripo3DProviderModel(modelConfig, { fallbackToId: false });
  const quote = quoteFixedCredits({
    provider: "tripo",
    model: modelConfig.id,
    task,
    count: 1
  });
  const reservation = reserveCredits({
    userId,
    amount: quote.totalCredits,
    provider: "tripo",
    model: modelConfig.id,
    task,
    billingType: "fixed",
    reason: task,
    requestId
  });
  let job = createAIJob(buildTripo3DJobRecordParams({
    requestId,
    userId,
    modelConfig,
    providerModel,
    prompt: cleanPrompt,
    creditsReserved: reservation.amountCredits,
    requestData: buildTripo3DRequestLog({
      route,
      requestId,
      modelConfig,
      mode,
      prompt: cleanPrompt,
      imageUrl: cleanImageUrl,
      imageDataUrl: cleanImageDataUrl,
      imageName: cleanImageName,
      imageMimeType: cleanImageMimeType,
      texture,
      task,
      quote,
      reservation
    })
  }));
  let taskCreated = null;
  let chargedCredits = 0;
  try {
    taskCreated = mode === "image"
      ? await createImageToModelTask(buildTripo3DDispatchParams({
        mode,
        imageUrl: cleanImageUrl,
        imageDataUrl: cleanImageDataUrl,
        imageName: cleanImageName,
        imageMimeType: cleanImageMimeType,
        apiModel: taskApiModel,
        texture,
        defaultParams: modelConfig.defaultParams || {},
        requestId
      }))
      : await createTextToModelTask(buildTripo3DDispatchParams({
        mode,
        prompt: cleanPrompt,
        apiModel: taskApiModel,
        texture,
        defaultParams: modelConfig.defaultParams || {},
        requestId
      }));
    const charge = chargeReservedCredits({
      userId,
      reservedAmount: reservation.amountCredits,
      chargeAmount: reservation.amountCredits,
      provider: "tripo",
      model: modelConfig.id,
      task,
      billingType: "fixed",
      reason: "tripo_task_created",
      requestId,
      aiJobId: job.id
    });
    chargedCredits = charge.chargedCredits || 0;
    markAIJobCreditsCharged(userId, job.id, chargedCredits);
    job = updateAIJobDispatchResult(userId, job.id, buildTripo3DDispatchResultParams({
      taskCreated,
      providerModel,
      responseData: buildTripo3DResponseLog(taskCreated, {
        modelConfig,
        mode,
        chargedCredits,
        status: "created",
        inputType: taskCreated.inputType || ""
      })
    }));
    return buildTripo3DSuccessResponse({
      taskCreated,
      job,
      creditsReserved: reservation.amountCredits,
      creditsCharged: chargedCredits
    });
  } catch (error) {
    if (!chargedCredits && reservation?.amountCredits) {
      releaseReservedCredits(buildTripo3DReleaseReservationParams({
        userId,
        reservation,
        modelConfig,
        task,
        error,
        requestId,
        job
      }));
    }
    if (job?.id) {
      failModel3DJob(userId, job.id, buildTripo3DFailJobParams({
        error,
        taskCreated,
        startedAt,
        chargedCredits
      }));
    }
    throw error;
  }
}
