const APIMART_STANDARD_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const APIMART_STANDARD_RATIO_SET = new Set(APIMART_STANDARD_RATIOS);
const APIMART_STANDARD_PIXEL_SIZES = new Set(["512x512", "1024x1024", "1024x1536", "1536x1024"]);

export function normalizeImageGenerationSize({
  providerId = "",
  modelId = "",
  providerModel = "",
  size = "",
  defaultSize = ""
} = {}) {
  if (String(providerId || "").trim().toLowerCase() === "apimart") {
    return normalizeApimartImageSize({ modelId, providerModel, size, defaultSize });
  }
  const requestedSize = String(size || "").trim();
  const normalizedSize = requestedSize || String(defaultSize || "").trim();
  return buildSizeNormalization({
    providerId,
    modelId,
    providerModel,
    requestedSize,
    normalizedSize,
    providerSize: normalizedSize,
    providerResolution: "",
    reason: requestedSize ? "passthrough" : "default"
  });
}

export function normalizeApimartImageSize({
  modelId = "",
  providerModel = "",
  size = "",
  defaultSize = "1024*1024"
} = {}) {
  const requestedSize = String(size || "").trim();
  const sourceSize = requestedSize || String(defaultSize || "").trim() || "auto";
  const midjourney = isMidjourneyModel(modelId) || isMidjourneyModel(providerModel);
  const resolution = parseResolutionToken(sourceSize);
  if (resolution) {
    return midjourney
      ? apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: "1:1", providerSize: "1:1", providerResolution: "", reason: "midjourney_resolution_ratio" })
      : apimartAutoResult({ modelId, providerModel, requestedSize, normalizedSize: resolution, providerResolution: resolution, reason: "resolution_token" });
  }

  if (/^auto$/i.test(sourceSize)) {
    return midjourney
      ? apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: "1:1", providerSize: "1:1", providerResolution: "", reason: "midjourney_auto_ratio" })
      : apimartAutoResult({ modelId, providerModel, requestedSize, normalizedSize: "auto", providerResolution: "1K", reason: "auto" });
  }

  const dimensions = parseDimensions(sourceSize);
  if (dimensions) {
    const { width, height } = dimensions;
    if (midjourney) {
      const ratio = nearestStandardRatio(width, height);
      return apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: ratio, providerSize: ratio, providerResolution: "", reason: "midjourney_dimension_ratio" });
    }
    const standardPixelSize = normalizeStandardPixelSize(width, height);
    if (standardPixelSize) {
      return buildSizeNormalization({
        providerId: "apimart",
        modelId,
        providerModel,
        requestedSize,
        normalizedSize: standardPixelSize,
        providerSize: standardPixelSize,
        providerResolution: longEdgeToResolution(Math.max(width, height)),
        reason: "standard_pixel_size"
      });
    }
    const providerResolution = longEdgeToResolution(Math.max(width, height));
    return apimartAutoResult({
      modelId,
      providerModel,
      requestedSize,
      normalizedSize: providerResolution,
      providerResolution,
      reason: "nonstandard_dimensions"
    });
  }

  const ratio = parseRatio(sourceSize);
  if (ratio) {
    if (APIMART_STANDARD_RATIO_SET.has(ratio)) {
      return apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: ratio, providerSize: ratio, providerResolution: midjourney ? "" : "1K", reason: "standard_ratio" });
    }
    if (midjourney) {
      const [width, height] = ratio.split(":").map((part) => Number.parseInt(part, 10));
      const nearest = nearestStandardRatio(width, height);
      return apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: nearest, providerSize: nearest, providerResolution: "", reason: "midjourney_nonstandard_ratio" });
    }
    return apimartAutoResult({ modelId, providerModel, requestedSize, normalizedSize: "auto", providerResolution: "1K", reason: "nonstandard_ratio" });
  }

  return midjourney
    ? apimartRatioResult({ modelId, providerModel, requestedSize, normalizedSize: "1:1", providerSize: "1:1", providerResolution: "", reason: "invalid_midjourney_default" })
    : apimartAutoResult({ modelId, providerModel, requestedSize, normalizedSize: "auto", providerResolution: "1K", reason: "invalid_size" });
}

function apimartAutoResult({
  modelId,
  providerModel,
  requestedSize,
  normalizedSize,
  providerResolution,
  reason
} = {}) {
  return buildSizeNormalization({
    providerId: "apimart",
    modelId,
    providerModel,
    requestedSize,
    normalizedSize,
    providerSize: "auto",
    providerResolution,
    reason
  });
}

function apimartRatioResult({
  modelId,
  providerModel,
  requestedSize,
  normalizedSize,
  providerSize,
  providerResolution,
  reason
} = {}) {
  return buildSizeNormalization({
    providerId: "apimart",
    modelId,
    providerModel,
    requestedSize,
    normalizedSize,
    providerSize,
    providerResolution,
    reason
  });
}

function buildSizeNormalization({
  providerId = "",
  modelId = "",
  providerModel = "",
  requestedSize = "",
  normalizedSize = "",
  providerSize = "",
  providerResolution = "",
  reason = ""
} = {}) {
  const cleanRequested = String(requestedSize || "").trim();
  const cleanNormalized = String(normalizedSize || "").trim();
  const cleanProviderSize = String(providerSize || "").trim();
  const cleanProviderResolution = String(providerResolution || "").trim();
  return {
    requestedSize: cleanRequested,
    normalizedSize: cleanNormalized,
    providerSize: cleanProviderSize,
    providerResolution: cleanProviderResolution,
    changed: Boolean(cleanRequested && cleanRequested !== cleanNormalized),
    reason,
    providerId: String(providerId || "").trim(),
    modelId: String(modelId || "").trim(),
    providerModel: String(providerModel || "").trim()
  };
}

function parseResolutionToken(value = "") {
  const clean = String(value || "").trim();
  return /^(0\.5K|[1-4]K)$/i.test(clean) ? clean.toUpperCase() : "";
}

function parseDimensions(value = "") {
  const match = String(value || "").trim().match(/^(\d+)\s*[*xX×]\s*(\d+)$/);
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function parseRatio(value = "") {
  const match = String(value || "").trim().match(/^(\d+)\s*:\s*(\d+)$/);
  if (!match) return "";
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "";
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function normalizeStandardPixelSize(width, height) {
  const clean = `${Math.round(width)}x${Math.round(height)}`;
  return APIMART_STANDARD_PIXEL_SIZES.has(clean) ? clean : "";
}

function nearestStandardRatio(width, height) {
  const target = Number(width || 1) / Math.max(1, Number(height || 1));
  let best = APIMART_STANDARD_RATIOS[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const ratio of APIMART_STANDARD_RATIOS) {
    const [ratioWidth, ratioHeight] = ratio.split(":").map((part) => Number.parseInt(part, 10));
    const delta = Math.abs(target - ratioWidth / ratioHeight);
    if (delta < bestDelta) {
      best = ratio;
      bestDelta = delta;
    }
  }
  return best;
}

function longEdgeToResolution(longEdge) {
  if (longEdge >= 4096) return "4K";
  if (longEdge >= 3072) return "3K";
  if (longEdge >= 1536) return "2K";
  if (longEdge <= 768) return "0.5K";
  return "1K";
}

function greatestCommonDivisor(a, b) {
  let x = Math.abs(Math.round(a || 0));
  let y = Math.abs(Math.round(b || 0));
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function isMidjourneyModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
}
