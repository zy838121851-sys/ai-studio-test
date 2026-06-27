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
import { logError, logInfo } from "../lib/logger.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { assertPublicHttpUrl } from "../security/network.js";
import { billFixedTask } from "../services/credits/billing.service.js";
import {
  releaseReservedCredits,
  reserveCredits
} from "../services/credits/credit.service.js";
import { quoteFixedCredits } from "../services/credits/pricing.service.js";
import {
  completeAIJob,
  createAIJob,
  refreshAIJob,
  scheduleAIJobRefresh
} from "../services/ai-job.service.js";
import { getAsset } from "../services/asset.service.js";
import {
  DEFAULT_IMAGE_MODEL,
  getModelConfig,
  isApimartModel,
  listImageModels
} from "../services/model-catalog.service.js";
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

  router.post("/ai/generate", aiLimiter, asyncHandler(async (req, res) => {
    const modelId = String(req.body?.modelId || req.body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      const error = new Error(`Unsupported model: ${modelId}`);
      error.status = 400;
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
    const quote = quoteFixedCredits({
      provider: modelConfig.providerId,
      model: modelConfig.id,
      task,
      count: 1
    });
    const reservation = reserveCredits({
      userId: req.auth.user.id,
      amount: quote.totalCredits,
      provider: modelConfig.providerId,
      model: modelConfig.id,
      task,
      billingType: "fixed",
      reason: task,
      requestId
    });

    try {
      const images = normalizeImages(req.body?.images);
      const videoOptions = type === "video"
        ? validateVideoOptions(modelConfig, req.body?.videoOptions || {})
        : {};
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
      const job = createAIJob({
        id: requestId,
        userId: req.auth.user.id,
        provider: modelConfig.providerId,
        vendor: modelConfig.vendor || "",
        modelId: modelConfig.id,
        providerModel: modelConfig.providerModel || modelConfig.id,
        remoteTaskId: result.remoteTaskId || result.taskId || requestId,
        type,
        status: getInitialAIJobStatus(result),
        progress: result.imageUrl ? 90 : 5,
        prompt,
        inputAssetIds: req.body?.inputAssetIds || [],
        creditsReserved: reservation.amountCredits
      });
      if (result.imageUrl) {
        const completed = await completeAIJob(req.auth.user.id, job.id, {
          outputs: [{ url: result.imageUrl, mimeType: type === "video" ? "video/mp4" : "image/png" }]
        });
        if (completed?.status !== "succeeded") {
          res.status(500).json({
            message: completed?.errorMessage || "Generated output could not be saved locally",
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
          imageUrl: firstAsset?.url || "",
          asset: toClientAsset(firstAsset),
          model: modelConfig.id,
          requestedModel: modelConfig.id,
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
          model: modelConfig.id
        });
        return;
      }
      res.json({
        message: "Generation job created",
        job: toClientJob(job),
        jobId: job.id,
        model: modelConfig.id,
        billing: {
          creditsReserved: reservation.amountCredits,
          creditsCharged: 0,
          status: "reserved"
        }
      });
    } catch (error) {
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
      throw error;
    }
  }));

  router.get("/ai/jobs/:jobId", jobPollLimiter, asyncHandler(async (req, res) => {
    const job = await refreshAIJob(req.auth.user.id, req.params.jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    const assets = getJobOutputAssets(req.auth.user.id, job);
    const firstAsset = assets[0] || null;
    res.json({
      job: toClientJob(job),
      jobId: job.id,
      remoteTaskId: job.remoteTaskId || "",
      status: job.status,
      progress: job.progress,
      updatedAt: job.updatedAt,
      outputCount: assets.length,
      outputs: assets.map(toClientAsset),
      imageUrls: assets.filter((asset) => asset.type === "image").map((asset) => asset.url),
      videoUrls: assets.filter((asset) => asset.type === "video").map((asset) => asset.url),
      imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
      videoUrl: firstAsset?.type === "video" ? firstAsset.url : "",
      error: job.errorMessage || ""
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
      res.status(upstream.status).json({ message: "Unable to fetch image" });
      return;
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.toLowerCase().startsWith("image/")) {
      res.status(415).json({ message: "URL did not return an image" });
      return;
    }
    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength && contentLength > env.maxProxyImageBytes) {
      res.status(413).json({ message: "Image is too large" });
      return;
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > env.maxProxyImageBytes) {
      res.status(413).json({ message: "Image is too large" });
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  }));

  return router;
}

function isFixedQwenImageEditAction(actionType = "") {
  return new Set(["remove_background", "text_edit"]).has(String(actionType || "").trim());
}

function assertResolvedProviderMatchesModel({ modelConfig, result } = {}) {
  if (modelConfig?.providerId !== "volcengine") return;
  const provider = String(result?.provider || "").trim();
  const providerModel = String(result?.providerModel || result?.resolvedModel || result?.model || "").trim();
  const calls = Array.isArray(result?.providerCalls) ? result.providerCalls : [];
  const hasOnlyVolcengineCalls = calls.length > 0 && calls.every((call) => call?.provider === "volcengine");
  if (provider === "volcengine" && hasOnlyVolcengineCalls && !/^qwen-/i.test(providerModel)) return;
  const callSummary = calls
    .map((call) => `${call?.provider || "(none)"}/${call?.model || "(none)"}`)
    .join(", ") || "(no provider calls)";
  const error = new Error(`Doubao model ${modelConfig.id} resolved to an unexpected provider/model: ${provider || "(none)"} / ${providerModel || "(none)"}; calls: ${callSummary}`);
  error.status = 500;
  throw error;
}

function logAIProviderRoute({ requestedModel, provider, providerModel, referenceCount } = {}) {
  logAIModelRoute({
    route: "/api/chat",
    requestedModel,
    providerModel,
    provider,
    type: "image",
    referenceCount
  });
}

function logAIModelRoute({
  route = "",
  requestedModel = "",
  provider = "apimart",
  providerModel = "",
  remoteTaskId = "",
  type = "image",
  referenceCount = 0
} = {}) {
  if (env.nodeEnv !== "development") return;
  logInfo("AI model route", {
    route,
    requestedModel,
    provider,
    providerModel,
    remoteTaskId,
    type,
    referenceCount: Number(referenceCount || 0)
  });
}

function normalizeImages(images) {
  return Array.isArray(images) ? images.filter(Boolean) : [];
}

function validateVideoOptions(modelConfig = {}, input = {}) {
  const allowed = modelConfig.allowedOptions || {};
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!(key in allowed)) {
      const error = new Error(`Unsupported video option: ${key}`);
      error.status = 400;
      throw error;
    }
    const allowedValues = allowed[key] || [];
    if (allowedValues.length && !allowedValues.includes(value)) {
      const error = new Error(`Unsupported ${key} for ${modelConfig.label || modelConfig.id}`);
      error.status = 400;
      throw error;
    }
    output[key] = value;
  }
  return output;
}

function getInitialAIJobStatus(result = {}) {
  if (result.imageUrl) return "running";
  const status = String(result.status || "").trim().toLowerCase();
  if (status === "succeeded") return "running";
  return status || "queued";
}

function sanitizeGenerationResult(result = {}, modelConfig = {}) {
  return {
    message: result.imageUrl ? "Image generated" : "Model returned without an image URL",
    imageUrl: result.imageUrl,
    model: result.requestedModel || modelConfig.id || result.model,
    requestedModel: result.requestedModel || modelConfig.id || result.model,
    resolvedModel: result.resolvedModel || result.model,
    referenceCount: result.referenceCount,
    billing: toClientBilling(result.billing)
  };
}

function buildDeferredImageEditResult(result = {}, job = {}, firstAsset = null, reservation = {}) {
  const imageAssets = firstAsset?.type === "image" ? [firstAsset] : [];
  return {
    ...result,
    imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
    imageUrls: imageAssets.map((asset) => asset.url),
    outputs: imageAssets.map(toClientAsset),
    asset: toClientAsset(firstAsset),
    job: toClientJob(job),
    jobId: job?.id || "",
    remoteTaskId: job?.remoteTaskId || result.remoteTaskId || result.taskId || "",
    status: job?.status || result.status || "",
    outputCount: imageAssets.length,
    deferCharge: true,
    billing: {
      creditsReserved: reservation.amountCredits || job?.creditsReserved || 0,
      creditsCharged: job?.creditsCharged || 0,
      status: job?.status === "succeeded" ? "charged" : (job?.status || "reserved")
    }
  };
}

function toClientJob(job = {}) {
  if (!job) return null;
  return {
    id: job.id,
    modelId: job.modelId,
    vendor: job.vendor,
    type: job.type,
    status: job.status,
    progress: job.progress,
    promptPreview: job.promptPreview,
    inputAssetIds: job.inputAssetIds || [],
    outputAssetIds: job.outputAssetIds || [],
    outputCount: Array.isArray(job.outputAssetIds) ? job.outputAssetIds.length : 0,
    remoteTaskId: job.remoteTaskId || "",
    errorCode: job.errorCode || "",
    errorMessage: job.errorMessage || "",
    creditsReserved: job.creditsReserved || 0,
    creditsCharged: job.creditsCharged || 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt
  };
}

function getJobOutputAssets(userId, job = {}) {
  return Array.from(job.outputAssetIds || [])
    .map((assetId) => getAsset(userId, assetId))
    .filter(Boolean);
}

function toClientAsset(asset = {}) {
  if (!asset) return null;
  return {
    assetId: asset.id,
    url: asset.url,
    mimeType: asset.mimeType,
    type: asset.type,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    modelId: asset.modelName,
    prompt: asset.prompt,
    createdAt: asset.createdAt
  };
}

function toClientBilling(billing = null) {
  if (!billing) return undefined;
  return {
    requestId: billing.requestId,
    task: billing.task,
    billingType: billing.billingType,
    creditsReserved: billing.creditsReserved || 0,
    creditsCharged: billing.creditsCharged || 0,
    unitCredits: billing.unitCredits,
    count: billing.count,
    status: billing.status
  };
}

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      logError("AI request failed", error, {
        method: req.method,
        path: req.path
      });
      res.status(error.status || 500).json({ message: error.message });
    }
  };
}
