import { Router } from "express";
import {
  analyzeImage,
  extractImageText,
  generateImage,
  generateSuggestions,
  prepareAction
} from "../services/ai.service.js";
import { env } from "../config/env.js";

export function createAIRouter() {
  const router = Router();

  router.post("/chat", asyncHandler(async (req, res) => {
    const result = await generateImage(req.body);
    res.json({
      message: result.imageUrl ? "Image generated" : "Model returned without an image URL",
      imageUrl: result.imageUrl
    });
  }));

  router.post("/image-edit", asyncHandler(async (req, res) => {
    const { model = "qwen-image-2.0-pro", prompt, image, size } = req.body;
    if (!prompt) throw new Error("Missing prompt");
    if (!image) throw new Error("Missing image");
    const result = await generateImage({ model, prompt, images: [image], size });
    res.json({
      message: result.imageUrl ? "Image updated" : "Model returned without an image URL",
      imageUrl: result.imageUrl
    });
  }));

  router.post("/extract-image-text", asyncHandler(async (req, res) => {
    const result = await extractImageText(req.body);
    res.json({
      message: "Image text extracted",
      model: env.dashscopeVisionModel,
      texts: result.texts,
      text: result.text
    });
  }));

  router.post("/analyze-image", asyncHandler(async (req, res) => {
    const result = await analyzeImage(req.body);
    res.json({
      message: "Image analyzed",
      model: env.dashscopeVisionModel,
      analysis: result.analysis,
      text: result.text
    });
  }));

  router.post("/prepare-action", asyncHandler(async (req, res) => {
    const result = await prepareAction(req.body);
    res.json({
      message: "Action prepared",
      action: result.action,
      text: result.text
    });
  }));

  router.post("/canvas-agent", asyncHandler(async (req, res) => {
    if (!req.body?.canvasState) throw new Error("Missing canvasState");
    const result = await generateSuggestions({ canvasState: req.body.canvasState });
    res.json({
      message: "Canvas suggestion ready",
      suggestion: result.analysis,
      text: result.text
    });
  }));

  return router;
}

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}
