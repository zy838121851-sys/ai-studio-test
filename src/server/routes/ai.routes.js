import { Router } from "express";
import { createAIAsyncHandler } from "../lib/ai-error-response.js";
import {
  toClientAsset,
  toClientJob
} from "../lib/ai-response-dto.js";
import {
  getModelModality,
  isFixedQwenImageEditAction,
  normalizeTripo3DJobInput,
  normalizeImages
} from "../lib/ai-route-helpers.js";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import {
  getAIJobDetails,
  getAIJobOutputAssets,
  listAIJobs,
  refreshAIJob
} from "../services/ai-job.service.js";
import {
  DEFAULT_IMAGE_MODEL,
  getModelConfig,
  isApimartModel,
  listImageModels
} from "../services/model-catalog.service.js";
import {
  createChatImageGeneration,
  createFixedBillingGeneration,
  createGenerationJob
} from "../services/ai/generation-creation.service.js";
import {
  createCanvasAgentSuggestion,
  createImageAnalysis,
  createImageTextExtraction,
  createPreparedAction
} from "../services/ai/assistant-action.service.js";
import {
  createExpandedImageEdit,
  createFixedQwenImageEdit,
  createModelImageEdit,
  createUpscaledImageEdit
} from "../services/ai/image-edit-creation.service.js";
import { proxyImage } from "../services/ai/image-proxy.service.js";
import {
  createTripo3DJob,
  getTripo3DTaskStatus
} from "../services/ai/tripo-3d-creation.service.js";

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
    const result = await createTripo3DJob({
      userId: req.auth.user.id,
      body: req.body,
      input: normalizeTripo3DJobInput(req.body, { mode: "text" })
    });
    res.json(result);
  }));

  router.post("/ai/3d/image-to-model", aiLimiter, asyncHandler(async (req, res) => {
    const result = await createTripo3DJob({
      userId: req.auth.user.id,
      body: req.body,
      input: normalizeTripo3DJobInput(req.body, { mode: "image" })
    });
    res.json(result);
  }));

  router.get("/ai/3d/tasks/:taskId", jobPollLimiter, asyncHandler(async (req, res) => {
    const remoteTaskId = String(req.params.taskId || "").trim();
    const result = await getTripo3DTaskStatus({
      userId: req.auth.user.id,
      remoteTaskId
    });
    if (result.status) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }
    res.json(result.body);
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
      const generation = await createFixedBillingGeneration({
        userId: req.auth.user.id,
        body: req.body,
        modelId,
        modelConfig
      });
      res.json(generation.body);
      return;
    }

    const generation = await createGenerationJob({
      userId: req.auth.user.id,
      body: req.body,
      modelConfig,
      path: req.path
    });
    if (generation.status) {
      res.status(generation.status);
    }
    res.json(generation.body);
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
    const generation = await createChatImageGeneration({
      userId: req.auth.user.id,
      body: req.body,
      requestedModel,
      modelConfig
    });
    res.json(generation.body);
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
    if (actionType === "expand_image") {
      const edit = await createExpandedImageEdit({
        model,
        prompt,
        referenceImages,
        expand
      });
      res.json(edit.body);
      return;
    }
    if (actionType === "upscale") {
      const edit = await createUpscaledImageEdit({
        model,
        prompt,
        referenceImages,
        upscaleFactor
      });
      res.json(edit.body);
      return;
    }
    if (isFixedQwenImageEditAction(actionType)) {
      const edit = await createFixedQwenImageEdit({
        userId: req.auth.user.id,
        prompt,
        referenceImages,
        size,
        actionType
      });
      res.json(edit.body);
      return;
    }
    const edit = await createModelImageEdit({
      userId: req.auth.user.id,
      model,
      prompt,
      referenceImages,
      size
    });
    res.json(edit.body);
  }));

  router.post("/extract-image-text", aiLimiter, asyncHandler(async (req, res) => {
    const extraction = await createImageTextExtraction({ body: req.body });
    res.json(extraction.body);
  }));

  router.post("/analyze-image", aiLimiter, asyncHandler(async (req, res) => {
    const analysis = await createImageAnalysis({
      userId: req.auth.user.id,
      body: req.body
    });
    res.json(analysis.body);
  }));

  router.post("/prepare-action", aiLimiter, asyncHandler(async (req, res) => {
    const action = await createPreparedAction({ body: req.body });
    res.json(action.body);
  }));

  router.post("/canvas-agent", aiLimiter, asyncHandler(async (req, res) => {
    if (!req.body?.canvasState) throw new Error("Missing canvasState");
    const suggestion = await createCanvasAgentSuggestion({ body: req.body });
    res.json(suggestion.body);
  }));

  router.get("/image-proxy", imageProxyLimiter, asyncHandler(async (req, res) => {
    const url = String(req.query.url || "").trim();
    const result = await proxyImage({ url });
    if (result.status) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", result.cacheControl);
    res.send(result.buffer);
  }));

  return router;
}
