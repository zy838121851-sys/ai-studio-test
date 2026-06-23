import { Router } from "express";
import {
  analyzeImage,
  extractImageText,
  expandImage,
  generateImage,
  generateSuggestions,
  prepareAction
} from "../services/ai.service.js";
import { env } from "../config/env.js";
import { logError } from "../lib/logger.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { assertPublicHttpUrl } from "../security/network.js";

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
  router.use(requireAuth);

  router.post("/chat", aiLimiter, asyncHandler(async (req, res) => {
    const result = await generateImage(req.body);
    res.json({
      message: result.imageUrl ? "Image generated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel,
      referenceCount: result.referenceCount
    });
  }));

  router.post("/image-edit", aiLimiter, asyncHandler(async (req, res) => {
    const { model = "qwen-image-2.0-pro", prompt, image, images, size, actionType, expand } = req.body;
    if (!prompt) throw new Error("Missing prompt");
    const referenceImages = Array.isArray(images) && images.length ? images : [image].filter(Boolean);
    if (!referenceImages.length) throw new Error("Missing image");
    if (actionType === "expand_image") {
      const result = await expandImage({ image: referenceImages[0], prompt, expand });
      res.json({
        message: result.imageUrl ? "Image expanded" : "Model returned without an image URL",
        imageUrl: result.imageUrl,
        model: result.model,
        requestedModel: result.requestedModel,
        referenceCount: result.referenceCount,
        taskId: result.taskId
      });
      return;
    }
    const result = await generateImage({ model, prompt, images: referenceImages.slice(0, 3), size });
    res.json({
      message: result.imageUrl ? "Image updated" : "Model returned without an image URL",
      imageUrl: result.imageUrl,
      model: result.model,
      requestedModel: result.requestedModel,
      referenceCount: result.referenceCount
    });
  }));

  router.post("/extract-image-text", aiLimiter, asyncHandler(async (req, res) => {
    const result = await extractImageText(req.body);
    res.json({
      message: "Image text extracted",
      model: env.dashscopeVisionModel,
      texts: result.texts,
      text: result.text
    });
  }));

  router.post("/analyze-image", aiLimiter, asyncHandler(async (req, res) => {
    const result = await analyzeImage(req.body);
    res.json({
      message: "Image analyzed",
      model: env.dashscopeVisionModel,
      analysis: result.analysis,
      text: result.text
    });
  }));

  router.post("/prepare-action", aiLimiter, asyncHandler(async (req, res) => {
    const result = await prepareAction(req.body);
    res.json({
      message: "Action prepared",
      action: result.action,
      text: result.text
    });
  }));

  router.post("/canvas-agent", aiLimiter, asyncHandler(async (req, res) => {
    if (!req.body?.canvasState) throw new Error("Missing canvasState");
    const result = await generateSuggestions({ canvasState: req.body.canvasState });
    res.json({
      message: "Canvas suggestion ready",
      suggestion: result.analysis,
      text: result.text
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
