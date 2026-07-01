import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../../db/sqlite.js";
import { createHttpError } from "../../lib/input-validation.js";

export const CREDIT_VALUE_CNY = 0.05;
export const DEFAULT_MARKUP_MULTIPLIER = 2;
export const DEFAULT_MIN_CREDITS = 1;
export const MODEL_PRICE_NOT_CONFIGURED_MESSAGE = "该模型未配置价格";

const DEFAULT_PRICING = [
  ...fixedFallbacks("qwen", {
    image_generation: 12,
    image_editing: 16,
    vision_analysis: 4,
    OCR: 4,
    prompt_optimize: 2,
    chat: 2
  }),
  ...fixedFallbacks("volcengine", {
    image_generation: 16,
    image_editing: 16,
    vision_analysis: 4,
    OCR: 4,
    prompt_optimize: 2,
    chat: 2
  }),
  ...fixedFallbacks("apimart", {
    image_generation: 8,
    image_editing: 8,
    video_generation: 20
  }),
  ...fixedFallbacks("tripo", {
    tripo_text_to_3d_standard: 30,
    tripo_image_to_3d_standard: 45
  }),
  ...fixedModels("qwen", "image_generation", {
    "qwen-image-2.0": 12,
    "qwen-image-plus": 12,
    "qwen-image": 12,
    "qwen-image-2.0-pro": 30,
    "qwen-image-max": 30,
    "wan2.6-image": 12,
    "wan2.7-image": 12,
    "wan2.7-image-pro": 30,
    "wanx2.1-t2i-plus": 12,
    "wanx2.1-t2i-turbo": 8,
    "wan2.2-t2i-plus": 12,
    "wan2.2-t2i-flash": 8
  }),
  ...fixedModels("qwen", "image_editing", {
    "qwen-image-edit-plus": 12,
    "qwen-image-edit": 16,
    "qwen-image-edit-max": 30
  }),
  ...fixedModels("volcengine", "image_generation", {
    "doubao-seedream-4.0": 12,
    "doubao-seedream-4-0-250828": 12,
    "doubao-seedream-5.0-lite": 12,
    "doubao-seedream-5-0-lite-260128": 12,
    "doubao-seedream-4.5": 16,
    "doubao-seedream-4-5-251128": 16,
    "doubao-seedream-5.0": 16
  }),
  ...fixedModels("volcengine", "image_editing", {
    "doubao-seedream-4.0": 12,
    "doubao-seedream-4-0-250828": 12,
    "doubao-seedream-5.0-lite": 12,
    "doubao-seedream-5-0-lite-260128": 12,
    "doubao-seedream-4.5": 16,
    "doubao-seedream-4-5-251128": 16,
    "doubao-seedream-5.0": 16
  }),
  ...fixedModels("apimart", "image_generation", {
    "qwen-image-2.0-pro": 30,
    "wan2.7-image-pro": 30,
    "qwen-image-edit-plus": 12,
    "qwen-image": 4,
    "seedream": 4,
    "seedream-5-lite": 12,
    "seedream-4-5": 16,
    "nano-banana": 6,
    "nano-banana-2": 8,
    "nano-banana-pro": 10,
    "gpt-image": 8,
    "gpt-image-2": 8,
    "midjourney": 8
  }),
  ...fixedModels("apimart", "image_editing", {
    "qwen-image-edit-plus": 12,
    "qwen-image": 4,
    "seedream": 4,
    "seedream-5-lite": 12,
    "seedream-4-5": 16,
    "nano-banana": 6,
    "nano-banana-2": 8,
    "nano-banana-pro": 10,
    "gpt-image": 8,
    "gpt-image-2": 8,
    "midjourney": 8
  }),
  ...fixedModels("apimart", "video_generation", {
    "seedance": 18,
    "seedance-2": 18,
    "seedance-1-5-pro": 18,
    "kling": 22,
    "kling-v3": 22,
    "kling-v3-omni": 22
  }),
  ...fixedModels("tripo", "tripo_text_to_3d_standard", {
    "tripo-v31": 30,
    "tripo-turbo": 30
  }),
  ...fixedModels("tripo", "tripo_image_to_3d_standard", {
    "tripo-v31": 45,
    "tripo-p1": 45,
    "tripo-turbo": 45
  })
];

export function seedDefaultPricing() {
  transaction((db) => {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO model_pricing (
        id, provider, model, task, billing_type, fixed_credits,
        input_price_per_million_tokens, output_price_per_million_tokens,
        cached_input_price_per_million_tokens, min_credits_per_request,
        markup_multiplier, fallback_fixed_credits, enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(provider, model, task) DO UPDATE SET
        billing_type = excluded.billing_type,
        fixed_credits = excluded.fixed_credits,
        input_price_per_million_tokens = excluded.input_price_per_million_tokens,
        output_price_per_million_tokens = excluded.output_price_per_million_tokens,
        cached_input_price_per_million_tokens = excluded.cached_input_price_per_million_tokens,
        min_credits_per_request = excluded.min_credits_per_request,
        markup_multiplier = excluded.markup_multiplier,
        fallback_fixed_credits = excluded.fallback_fixed_credits,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at;
    `);
    for (const price of DEFAULT_PRICING) {
      stmt.run(
        randomUUID(),
        price.provider,
        price.model,
        price.task,
        price.billingType,
        integerOrNull(price.fixedCredits),
        numberOrNull(price.inputPrice),
        numberOrNull(price.outputPrice),
        toPositiveInteger(price.minCredits || DEFAULT_MIN_CREDITS),
        Number(price.markupMultiplier || DEFAULT_MARKUP_MULTIPLIER),
        integerOrNull(price.fallbackFixedCredits),
        now,
        now
      );
    }
  });
}

export function resolvePricing({ provider, model, task } = {}) {
  const cleanProvider = String(provider || "").trim();
  const cleanModel = String(model || "").trim();
  const cleanTask = String(task || "").trim();
  const row = prepare(`
    SELECT *
    FROM model_pricing
    WHERE provider = ?
      AND task = ?
      AND model IN (?, '*')
    ORDER BY CASE WHEN model = ? THEN 0 ELSE 1 END
    LIMIT 1;
  `).get(cleanProvider, cleanTask, cleanModel, cleanModel);

  if (!row) {
    const fallback = findDefaultPricing({ provider: cleanProvider, model: cleanModel, task: cleanTask });
    if (fallback) return normalizeDefaultPricing(fallback);
    throwPriceNotConfigured();
  }
  if (Number(row.enabled) !== 1) {
    throwPriceNotConfigured();
  }
  return normalizePricing(row);
}

export function fixedCreditsForPricing(pricing) {
  const credits = toPositiveInteger(pricing?.fixedCredits || 0);
  if (credits <= 0) throwPriceNotConfigured();
  return credits;
}

export function normalizeTaskCount({ task, count } = {}) {
  const cleanTask = String(task || "").trim();
  if (cleanTask === "image_editing") return 1;
  const raw = String(count ?? "1").trim();
  if (!/^\d+$/.test(raw)) throwInvalidCount();
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 10) throwInvalidCount();
  return value;
}

export function quoteFixedCredits({ provider, model, task, count = 1 } = {}) {
  const pricing = resolvePricing({ provider, model, task });
  if (pricing.billingType !== "fixed") throwPriceNotConfigured();
  const unitCredits = fixedCreditsForPricing(pricing);
  const normalizedCount = normalizeBillableCount({ provider, model, task, count });
  const totalCredits = unitCredits * normalizedCount;
  if (totalCredits <= 0) throwPriceNotConfigured();
  return {
    provider: pricing.provider,
    model,
    pricedModel: pricing.model,
    task,
    billingType: "fixed",
    unitCredits,
    totalCredits,
    count: normalizedCount,
    exact: true,
    label: `消耗 ${totalCredits} 积分`
  };
}

function normalizeBillableCount({ provider, model, task, count } = {}) {
  const cleanProvider = String(provider || "").trim().toLowerCase();
  const cleanModel = String(model || "").trim().toLowerCase();
  const cleanTask = String(task || "").trim();
  if (cleanProvider === "apimart" && cleanModel === "midjourney" && cleanTask === "image_generation") {
    return 1;
  }
  return normalizeTaskCount({ task, count });
}

export function estimateTokenCredits({ pricing, inputText = "", imageCount = 0, maxOutputTokens = 4096 } = {}) {
  const inputTokens = estimateInputTokens(inputText, imageCount);
  const usage = {
    inputTokens,
    outputTokens: toPositiveInteger(maxOutputTokens || 4096),
    totalTokens: inputTokens + toPositiveInteger(maxOutputTokens || 4096)
  };
  const estimate = calculateTokenCredits({ pricing, usage });
  return Math.max(
    estimate.credits,
    toPositiveInteger(pricing?.fallbackFixedCredits || 0),
    toPositiveInteger(pricing?.minCreditsPerRequest || DEFAULT_MIN_CREDITS)
  );
}

export function calculateTokenCredits({ pricing, usage } = {}) {
  const normalized = normalizeUsage(usage);
  if (!normalized.hasUsage) {
    return {
      credits: Math.max(
        toPositiveInteger(pricing?.fallbackFixedCredits || 0),
        toPositiveInteger(pricing?.minCreditsPerRequest || DEFAULT_MIN_CREDITS),
        DEFAULT_MIN_CREDITS
      ),
      usage: normalized,
      reason: "usage_missing"
    };
  }
  const inputCost = normalized.inputTokens / 1_000_000 * Number(pricing.inputPricePerMillionTokens || 0);
  const outputCost = normalized.outputTokens / 1_000_000 * Number(pricing.outputPricePerMillionTokens || 0);
  const rawCredits = (inputCost + outputCost) / CREDIT_VALUE_CNY * Number(pricing.markupMultiplier || DEFAULT_MARKUP_MULTIPLIER);
  return {
    credits: Math.max(
      Math.ceil(rawCredits),
      toPositiveInteger(pricing?.minCreditsPerRequest || DEFAULT_MIN_CREDITS),
      DEFAULT_MIN_CREDITS
    ),
    usage: normalized,
    reason: ""
  };
}

export function normalizeUsage(usage = {}) {
  const inputTokens = toNonNegativeInteger(
    usage.input_tokens ?? usage.inputTokens ?? usage.prompt_tokens ?? usage.promptTokens
  );
  const outputTokens = toNonNegativeInteger(
    usage.output_tokens ?? usage.outputTokens ?? usage.completion_tokens ?? usage.completionTokens
  );
  const totalTokens = toNonNegativeInteger(
    usage.total_tokens ?? usage.totalTokens ?? (inputTokens + outputTokens)
  );
  const hasUsage = inputTokens > 0 || outputTokens > 0 || totalTokens > 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    hasUsage
  };
}

function normalizePricing(row) {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    task: row.task,
    billingType: row.billing_type,
    fixedCredits: toNonNegativeInteger(row.fixed_credits),
    inputPricePerMillionTokens: Number(row.input_price_per_million_tokens || 0),
    outputPricePerMillionTokens: Number(row.output_price_per_million_tokens || 0),
    cachedInputPricePerMillionTokens: Number(row.cached_input_price_per_million_tokens || 0),
    minCreditsPerRequest: toPositiveInteger(row.min_credits_per_request || DEFAULT_MIN_CREDITS),
    markupMultiplier: Number(row.markup_multiplier || DEFAULT_MARKUP_MULTIPLIER),
    fallbackFixedCredits: toNonNegativeInteger(row.fallback_fixed_credits),
    enabled: Number(row.enabled) === 1
  };
}

function estimateInputTokens(inputText = "", imageCount = 0) {
  const textTokens = Math.ceil(String(inputText || "").length / 4);
  const imageTokens = toNonNegativeInteger(imageCount) * 3000;
  return Math.max(1, textTokens + imageTokens);
}

function toPositiveInteger(value) {
  return Math.max(1, Math.ceil(Number(value || 0)));
}

function toNonNegativeInteger(value) {
  return Math.max(0, Math.ceil(Number(value || 0)));
}

function integerOrNull(value) {
  return value === null || value === undefined ? null : Math.ceil(Number(value));
}

function numberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function fixedFallbacks(provider, pricesByTask) {
  return Object.entries(pricesByTask).map(([task, fixedCredits]) => ({
    provider,
    model: "*",
    task,
    billingType: "fixed",
    fixedCredits
  }));
}

function fixedModels(provider, task, pricesByModel) {
  return Object.entries(pricesByModel).map(([model, fixedCredits]) => ({
    provider,
    model,
    task,
    billingType: "fixed",
    fixedCredits
  }));
}

function findDefaultPricing({ provider, model, task } = {}) {
  return DEFAULT_PRICING.find((price) => (
    price.provider === provider
    && price.task === task
    && price.model === model
  )) || DEFAULT_PRICING.find((price) => (
    price.provider === provider
    && price.task === task
    && price.model === "*"
  ));
}

function normalizeDefaultPricing(price = {}) {
  return {
    id: `default:${price.provider}:${price.model}:${price.task}`,
    provider: price.provider,
    model: price.model,
    task: price.task,
    billingType: price.billingType,
    fixedCredits: toNonNegativeInteger(price.fixedCredits),
    inputPricePerMillionTokens: Number(price.inputPrice || 0),
    outputPricePerMillionTokens: Number(price.outputPrice || 0),
    cachedInputPricePerMillionTokens: 0,
    minCreditsPerRequest: toPositiveInteger(price.minCredits || DEFAULT_MIN_CREDITS),
    markupMultiplier: Number(price.markupMultiplier || DEFAULT_MARKUP_MULTIPLIER),
    fallbackFixedCredits: toNonNegativeInteger(price.fallbackFixedCredits),
    enabled: true
  };
}

function throwPriceNotConfigured() {
  const error = createHttpError(MODEL_PRICE_NOT_CONFIGURED_MESSAGE, 402);
  error.code = "MODEL_PRICE_NOT_CONFIGURED";
  throw error;
}

function throwInvalidCount() {
  const error = createHttpError("count must be an integer between 1 and 10", 400);
  error.code = "INVALID_CREDIT_COUNT";
  throw error;
}
