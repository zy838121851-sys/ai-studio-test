import { getAIProvider } from "./providers/index.js";
import {
  buildAnalyzeImagePrompt,
  buildCanvasAgentPrompt,
  buildExtractImageTextPrompt,
  buildExtractPromptPrompt,
  buildPrepareActionPrompt
} from "./prompt-builder.service.js";

function parseJsonValue(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] || text).trim();
  const candidates = [source];
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) candidates.push(source.slice(objectStart, objectEnd + 1));
  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) candidates.push(source.slice(arrayStart, arrayEnd + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next possible JSON fragment.
    }
  }
  return null;
}

function normalizeExtractedTexts(value, rawText = "") {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.texts)
      ? value.texts
      : [];

  const normalized = source
    .map((item) => typeof item === "string" ? { text: item } : item)
    .map((item) => ({
      text: String(item?.text || item?.content || "").trim(),
      role: item?.role || item?.type || "other",
      x: Number(item?.x || 0) || 0,
      y: Number(item?.y || 0) || 0,
      width: Number(item?.width || item?.w || 0) || 0,
      height: Number(item?.height || item?.h || 0) || 0
    }))
    .filter((item) => item.text);

  if (normalized.length) return normalized;

  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\\d.\\s]+/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 80)
    .slice(0, 20)
    .map((text) => ({ text, role: "other", x: 0, y: 0, width: 0, height: 0 }));
}

export async function generateImage({ model = "qwen-image-2.0-pro", prompt, images = [], size } = {}) {
  return getAIProvider().generateImage({ model, prompt, images, size });
}

export async function analyzeImage({ image, title = "Current asset", refreshCount = 0 } = {}) {
  if (!image) throw new Error("Missing image");
  {
    const prompt = buildAnalyzeImagePrompt({ title, refreshCount });
    const result = await getAIProvider().analyzeImage({ image, prompt });
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      raw: result.raw
    };
  }
}

export async function extractImageText({ image } = {}) {
  if (!image) throw new Error("Missing image");
  {
    const prompt = buildExtractImageTextPrompt();
    const result = await getAIProvider().analyzeImage({ image, prompt });
    const text = result.text;
    const parsed = parseJsonValue(text);
    return {
      text,
      texts: normalizeExtractedTexts(parsed, text),
      raw: result.raw
    };
  }
}

export async function prepareAction({ analysis, action } = {}) {
  if (!analysis) throw new Error("Missing analysis");
  if (!action?.type) throw new Error("Missing action");
  {
    const prompt = buildPrepareActionPrompt({ analysis, action });
    const result = await generateSuggestions({ prompt });
    return {
      action: result.analysis,
      text: result.text
    };
  }
}

export async function generateSuggestions({ prompt, canvasState } = {}) {
  if (!prompt) {
    const result = await getAIProvider().generateText({ prompt: buildCanvasAgentPrompt({ canvasState }) });
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      raw: result.raw
    };
  }
  const textPrompt = prompt;

  const result = await getAIProvider().generateText({ prompt: textPrompt });
  const text = result.text;
  return {
    text,
    analysis: parseJsonValue(text),
    raw: result.raw
  };
}

export async function extractPrompt(input = {}) {
  return generateSuggestions({
    prompt: buildExtractPromptPrompt(input)
  });
}
