import { env } from "../../config/env.js";
import { toClientBilling } from "../../lib/ai-response-dto.js";
import {
  analyzeImage,
  extractImageText,
  generateSuggestions,
  prepareAction
} from "../ai.service.js";
import { billFixedTask } from "../credits/billing.service.js";

export async function createImageTextExtraction({
  body = {}
} = {}) {
  const result = await extractImageText(body);
  return {
    body: {
      message: "Image text extracted",
      model: env.dashscopeVisionModel,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || env.dashscopeVisionModel,
      providerCalls: result.providerCalls || [],
      texts: result.texts,
      text: result.text
    }
  };
}

export async function createImageAnalysis({
  userId = "",
  body = {}
} = {}) {
  const result = await billFixedTask({
    userId,
    provider: "qwen",
    model: env.dashscopeVisionModel,
    task: "vision_analysis",
    count: 1,
    reason: "vision_analysis",
    callProvider: () => analyzeImage(body)
  });
  return {
    body: {
      message: "Image analyzed",
      model: env.dashscopeVisionModel,
      provider: result.provider || "qwen",
      providerModel: result.providerModel || env.dashscopeVisionModel,
      providerCalls: result.providerCalls || [],
      billing: toClientBilling(result.billing),
      analysis: result.analysis,
      text: result.text
    }
  };
}

export async function createPreparedAction({
  body = {}
} = {}) {
  const result = await prepareAction(body);
  return {
    body: {
      message: "Action prepared",
      action: result.action,
      text: result.text,
      providerCalls: result.providerCalls || []
    }
  };
}

export async function createCanvasAgentSuggestion({
  body = {}
} = {}) {
  const result = await generateSuggestions({
    canvasState: body.canvasState,
    model: body.model
  });
  return {
    body: {
      message: "Canvas suggestion ready",
      suggestion: result.analysis,
      text: result.text,
      providerCalls: result.providerCalls || []
    }
  };
}
