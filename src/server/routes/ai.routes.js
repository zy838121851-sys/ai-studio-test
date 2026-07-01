import { Router } from "express";
import { createAIAsyncHandler } from "../lib/ai-error-response.js";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestUserId } from "../lib/request-auth.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { getModelListResponse } from "../services/model-catalog.service.js";
import {
  createChatImageGeneration,
  createFixedBillingGeneration,
  createGenerationJob,
  resolveGenerationModelRequest
} from "../services/ai/generation-creation.service.js";
import {
  createCanvasAgentSuggestion,
  createImageAnalysis,
  createImageTextExtraction,
  createPreparedAction
} from "../services/ai/assistant-action.service.js";
import {
  getAIJobDetailResponse,
  listAIJobSummaries
} from "../services/ai/ai-job-query.service.js";
import {
  createImageEdit
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
    res.json(getModelListResponse({ surface: req.query.surface }));
  }));

  router.use(requireAuth);

  router.post("/ai/3d/text-to-model", aiLimiter, asyncHandler(async (req, res) => {
    const result = await createTripo3DJob({
      userId: getRequestUserId(req),
      body: req.body,
      mode: "text"
    });
    res.json(result);
  }));

  router.post("/ai/3d/image-to-model", aiLimiter, asyncHandler(async (req, res) => {
    const result = await createTripo3DJob({
      userId: getRequestUserId(req),
      body: req.body,
      mode: "image"
    });
    res.json(result);
  }));

  router.get("/ai/3d/tasks/:taskId", jobPollLimiter, asyncHandler(async (req, res) => {
    const remoteTaskId = String(req.params.taskId || "").trim();
    const result = await getTripo3DTaskStatus({
      userId: getRequestUserId(req),
      remoteTaskId
    });
    if (result.status) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }
    res.json(result.body);
  }));

  router.post("/ai/generate", aiLimiter, asyncHandler(async (req, res) => {
    const { modelId, modelConfig, apimartModel } = resolveGenerationModelRequest(req.body);
    if (!apimartModel) {
      const generation = await createFixedBillingGeneration({
        userId: getRequestUserId(req),
        body: req.body,
        modelId,
        modelConfig
      });
      res.json(generation.body);
      return;
    }

    const generation = await createGenerationJob({
      userId: getRequestUserId(req),
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
    const result = listAIJobSummaries({
      userId: getRequestUserId(req),
      query: req.query
    });
    res.json(result.body);
  }));

  router.get("/ai/jobs/:jobId", jobPollLimiter, asyncHandler(async (req, res) => {
    const result = await getAIJobDetailResponse({
      userId: getRequestUserId(req),
      jobId: req.params.jobId
    });
    if (result.status) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }
    res.json(result.body);
  }));

  router.post("/chat", aiLimiter, asyncHandler(async (req, res) => {
    const generation = await createChatImageGeneration({
      userId: getRequestUserId(req),
      body: req.body
    });
    res.json(generation.body);
  }));

  router.post("/image-edit", aiLimiter, asyncHandler(async (req, res) => {
    const edit = await createImageEdit({
      userId: getRequestUserId(req),
      body: req.body
    });
    res.json(edit.body);
  }));

  router.post("/extract-image-text", aiLimiter, asyncHandler(async (req, res) => {
    const extraction = await createImageTextExtraction({ body: req.body });
    res.json(extraction.body);
  }));

  router.post("/analyze-image", aiLimiter, asyncHandler(async (req, res) => {
    const analysis = await createImageAnalysis({
      userId: getRequestUserId(req),
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
