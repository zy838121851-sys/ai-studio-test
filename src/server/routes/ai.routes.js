import { Router } from "express";
import {
  analyzeImage,
  extractImageText,
  expandImage,
  generateImage,
  generateSuggestions,
  prepareAction,
  superResolutionImage
} from "../services/ai.service.js";
import { env } from "../config/env.js";
import { logError } from "../lib/logger.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { assertPublicHttpUrl } from "../security/network.js";
import {
  DEFAULT_IMAGE_MODEL,
  getModelConfig,
  listImageModels
} from "../services/model-catalog.service.js";

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

  router.post("/chat", aiLimiter, asyncHandler(async (req, res) => {
    const requestedModel = String(req.body?.model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
    const modelConfig = getModelConfig(requestedModel);
    if (!modelConfig) {
      throw new Error(`Unsupported image model: ${requestedModel}`);
    }
    const result = await generateImage({
      ...req.body,
      model: requestedModel
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
      provider: result.provider || modelConfig.providerId,
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: result.providerCalls || [],
      referenceCount: result.referenceCount
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
      res.json({
        message: result.imageUrl ? "Image expanded" : "Model returned without an image URL",
        imageUrl: result.imageUrl,
        model: result.model,
        requestedModel: result.requestedModel || model,
        resolvedModel: result.resolvedModel || result.model,
        provider: result.provider || requestedProviderId,
        providerModel: result.providerModel || result.resolvedModel || result.model,
        providerCalls: result.providerCalls || [],
        referenceCount: result.referenceCount,
        taskId: result.taskId
      });
      return;
    }
    if (actionType === "upscale") {
      const result = await superResolutionImage({ image: referenceImages[0], prompt, upscaleFactor, model });
      res.json({
        message: result.imageUrl ? "Image upscaled" : "Model returned without an image URL",
        imageUrl: result.imageUrl,
        model: result.model,
        requestedModel: result.requestedModel || model,
        resolvedModel: result.resolvedModel || result.model,
        provider: result.provider || requestedProviderId,
        providerModel: result.providerModel || result.resolvedModel || result.model,
        providerCalls: result.providerCalls || [],
        referenceCount: result.referenceCount,
        taskId: result.taskId,
        upscaleFactor: result.upscaleFactor
      });
      return;
    }
    const result = await generateImage({ model, prompt, images: referenceImages, size });
    res.json({
      message: result.imageUrl ? "Image updated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel,
      resolvedModel: result.resolvedModel || result.model,
      provider: result.provider || getModelConfig(model)?.providerId,
      providerModel: result.providerModel || result.resolvedModel || result.model,
      providerCalls: result.providerCalls || [],
      referenceCount: result.referenceCount
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
    const result = await analyzeImage(req.body);
    res.json({
      message: "Image analyzed",
      model: env.dashscopeVisionModel,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || env.dashscopeVisionModel,
      providerCalls: result.providerCalls || [],
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
  if (env.nodeEnv !== "development") return;
  console.info("[ai-route]", {
    requestedModel,
    provider,
    providerModel,
    referenceCount: Number(referenceCount || 0)
  });
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
