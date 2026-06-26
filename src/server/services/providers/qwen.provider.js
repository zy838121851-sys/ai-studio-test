import { env } from "../../config/env.js";

function assertApiKey() {
  if (!env.dashscopeApiKey) throw new Error("Missing DASHSCOPE_API_KEY in .env");
}

export function pickImageUrl(data) {
  const content = data?.output?.choices?.[0]?.message?.content || [];
  return content.find((item) => item.image)?.image || null;
}

export function pickText(data) {
  const content = data?.output?.choices?.[0]?.message?.content || [];
  return content.map((item) => item.text).filter(Boolean).join("\n").trim();
}

function pickWanTaskId(data) {
  return data?.output?.task_id || data?.output?.taskId || data?.task_id || data?.taskId || null;
}

function pickWanTaskStatus(data) {
  return data?.output?.task_status || data?.output?.taskStatus || data?.task_status || data?.taskStatus || "";
}

function pickWanImageUrl(data) {
  const output = data?.output || {};
  const firstResult = Array.isArray(output.results) ? output.results[0] : null;
  const firstImage = Array.isArray(output.images) ? output.images[0] : null;
  const candidates = [
    firstResult?.url,
    firstResult?.image_url,
    firstResult?.image,
    firstImage?.url,
    firstImage?.image_url,
    firstImage?.image,
    output.url,
    output.image_url,
    output.image
  ];
  return candidates.find(Boolean) || null;
}

export async function callQwen({ model, content, parameters = {} }) {
  assertApiKey();
  const response = await fetch(env.dashscopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.dashscopeApiKey}`
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: "user",
            content
          }
        ]
      },
      parameters
    })
  });

  const data = await response.json();
  if (!response.ok || data.code) {
    throw new Error(data.message || `DashScope request failed: ${response.status}`);
  }
  return data;
}

export async function callWanImageExpand({ image, prompt, expand = {} } = {}) {
  if (!image) throw new Error("Missing image");
  assertApiKey();
  const parameters = normalizeWanExpandParameters(expand);
  const response = await fetch(env.dashscopeImageEditUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.dashscopeApiKey}`,
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: "wanx2.1-imageedit",
      input: {
        function: "expand",
        prompt: buildWanExpandPrompt(prompt),
        base_image_url: image
      },
      parameters
    })
  });

  const data = await response.json();
  if (!response.ok || data.code) {
    throw new Error(data.message || `DashScope Wan image edit request failed: ${response.status}`);
  }

  const taskId = pickWanTaskId(data);
  if (!taskId) throw new Error("DashScope Wan image edit request did not return a task ID");
  const taskResult = await pollWanImageTask(taskId);
  const imageUrl = pickWanImageUrl(taskResult);
  if (!imageUrl) throw new Error("DashScope Wan image edit task succeeded without an image URL");
  return {
    imageUrl,
    model: "wanx2.1-imageedit",
    requestedModel: "wanx2.1-imageedit",
    referenceCount: 1,
    taskId,
    providerCalls: [
      {
        provider: "qwen",
        model: "wanx2.1-imageedit",
        operation: "expandImage",
        endpoint: env.dashscopeImageEditUrl
      },
      {
        provider: "qwen",
        model: "wanx2.1-imageedit",
        operation: "pollTask",
        endpoint: env.dashscopeTaskUrl
      }
    ],
    raw: taskResult
  };
}

export async function callWan27ImageExpand({ model = "wan2.7-image-pro", image, prompt } = {}) {
  if (!image) throw new Error("Missing image");
  const resolvedModel = String(model || "").trim() || "wan2.7-image-pro";
  const data = await callQwen({
    model: resolvedModel,
    content: [
      { image },
      { text: buildWan27ExpandPrompt(prompt) }
    ],
    parameters: {
      size: "2K",
      n: 1,
      watermark: false
    }
  });
  return {
    imageUrl: pickImageUrl(data),
    model: resolvedModel,
    requestedModel: model,
    referenceCount: 1,
    providerCalls: [
      {
        provider: "qwen",
        model: resolvedModel,
        operation: "expandImage",
        endpoint: env.dashscopeUrl
      }
    ],
    raw: data
  };
}

export async function callWanImageSuperResolution({ image, prompt, upscaleFactor } = {}) {
  if (!image) throw new Error("Missing image");
  assertApiKey();
  const parameters = normalizeWanSuperResolutionParameters({ upscaleFactor });
  const response = await fetch(env.dashscopeImageEditUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.dashscopeApiKey}`,
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: "wanx2.1-imageedit",
      input: {
        function: "super_resolution",
        prompt: buildWanSuperResolutionPrompt(prompt),
        base_image_url: image
      },
      parameters
    })
  });

  const data = await response.json();
  if (!response.ok || data.code) {
    throw new Error(data.message || `DashScope Wan super resolution request failed: ${response.status}`);
  }

  const taskId = pickWanTaskId(data);
  if (!taskId) throw new Error("DashScope Wan super resolution request did not return a task ID");
  const taskResult = await pollWanImageTask(taskId);
  const imageUrl = pickWanImageUrl(taskResult);
  if (!imageUrl) throw new Error("DashScope Wan super resolution task succeeded without an image URL");
  return {
    imageUrl,
    model: "wanx2.1-imageedit",
    requestedModel: "wanx2.1-imageedit",
    referenceCount: 1,
    taskId,
    upscaleFactor: parameters.upscale_factor,
    providerCalls: [
      {
        provider: "qwen",
        model: "wanx2.1-imageedit",
        operation: "superResolutionImage",
        endpoint: env.dashscopeImageEditUrl
      },
      {
        provider: "qwen",
        model: "wanx2.1-imageedit",
        operation: "pollTask",
        endpoint: env.dashscopeTaskUrl
      }
    ],
    raw: taskResult
  };
}

export async function callQwenImage({ model, prompt, images = [], size } = {}) {
  const requestedModel = String(model || "").trim() || "qwen-image-2.0-pro";
  if (/^doubao-/i.test(requestedModel)) {
    throw new Error(`Doubao model ${requestedModel} cannot be handled by Qwen provider`);
  }
  const referenceLimit = getReferenceLimit(requestedModel);
  const referenceImages = Array.from(images || []).filter(Boolean).slice(0, referenceLimit);
  const resolvedModel = resolveImageModel({ model, hasReferences: referenceImages.length > 0 });
  const finalPrompt = buildImageGenerationPrompt({
    prompt,
    hasReferences: referenceImages.length > 0,
    referenceCount: referenceImages.length
  });
  const parameters = buildDashScopeImageParameters({ model: resolvedModel, size });

  const data = await callQwen({
    model: resolvedModel,
    content: [
      ...referenceImages.map((image) => ({ image })),
      { text: finalPrompt }
    ],
    parameters
  });

  return {
    imageUrl: pickImageUrl(data),
    model: resolvedModel,
    requestedModel: model,
    referenceCount: referenceImages.length,
    providerCalls: [
      {
        provider: "qwen",
        model: resolvedModel,
        operation: "generateImage",
        endpoint: env.dashscopeUrl
      }
    ],
    raw: data
  };
}

async function pollWanImageTask(taskId) {
  const maxAttempts = 30;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await delay(2000);
    const response = await fetch(`${env.dashscopeTaskUrl}/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.dashscopeApiKey}`
      }
    });
    const data = await response.json();
    if (!response.ok || data.code) {
      throw new Error(data.message || `DashScope Wan task query failed: ${response.status}`);
    }

    const status = pickWanTaskStatus(data);
    if (status === "SUCCEEDED") return data;
    if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) {
      throw new Error(data?.output?.message || data.message || `DashScope Wan task ${status.toLowerCase()}`);
    }
  }
  throw new Error("DashScope Wan image edit task timed out");
}

function normalizeWanExpandParameters(expand = {}) {
  return {
    n: 1,
    watermark: false,
    top_scale: normalizeWanScale(expand.topScale ?? expand.top_scale),
    bottom_scale: normalizeWanScale(expand.bottomScale ?? expand.bottom_scale),
    left_scale: normalizeWanScale(expand.leftScale ?? expand.left_scale),
    right_scale: normalizeWanScale(expand.rightScale ?? expand.right_scale)
  };
}

function normalizeWanScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(2, Number(parsed.toFixed(3))));
}

function normalizeWanSuperResolutionParameters({ upscaleFactor } = {}) {
  return {
    n: 1,
    watermark: false,
    upscale_factor: normalizeWanUpscaleFactor(upscaleFactor)
  };
}

function normalizeWanUpscaleFactor(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(4, Math.round(parsed)));
}

function buildWanExpandPrompt(prompt = "") {
  const userPrompt = String(prompt || "").trim();
  return [
    "Expand the input image outward only in the requested directions.",
    "Keep the original image area unchanged, preserving subject, identity, composition, lighting, texture, perspective, colors, and sharpness.",
    "Use the expansion plan to actively complete the newly exposed area with plausible surrounding environment, background, surface details, atmosphere, and composition balance.",
    "The added area should look like it was part of the original shot or illustration, with seamless continuation across the original borders.",
    "Do not repaint, crop, stretch, fade, restyle, or change the original image content.",
    "Do not add unrelated subjects or visual elements that contradict the source image.",
    userPrompt ? `User request: ${userPrompt}` : ""
  ].filter(Boolean).join("\n");
}

function buildWan27ExpandPrompt(prompt = "") {
  const userPrompt = String(prompt || "").trim();
  return [
    "Outpaint and expand the input image.",
    "Keep the original image region unchanged. Do not repaint, stretch, crop, stylize, recolor, or alter any existing pixels, subjects, text, face, pose, texture direction, or composition inside the source image.",
    "Use the expansion plan to imagine and generate only the new area outside the original borders.",
    "The added area must continue the source image naturally with matching perspective, lighting, texture, materials, atmosphere, and visual style.",
    "Blend the boundary seamlessly so the result looks like a larger original image.",
    userPrompt ? `Expansion plan and user request: ${userPrompt}` : ""
  ].filter(Boolean).join("\n");
}

function buildWanSuperResolutionPrompt(prompt = "") {
  const userPrompt = String(prompt || "").trim();
  return [
    "Image super resolution.",
    "Preserve the original image content exactly.",
    "Improve clarity and resolution without changing composition, subject identity, colors, lighting, pose, texture direction, background, or readable text.",
    userPrompt ? `User request: ${userPrompt}` : ""
  ].filter(Boolean).join("\n");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveImageModel({ model = "qwen-image-2.0-pro", hasReferences = false } = {}) {
  const requested = String(model || "").trim() || "qwen-image-2.0-pro";
  if (!hasReferences || requested.includes("edit") || isWan27ImageModel(requested) || isZImageModel(requested) || requested.startsWith("qwen-image-2.0")) {
    return requested;
  }
  return "qwen-image-edit-plus";
}

function getReferenceLimit(model) {
  if (isWan27ImageModel(model)) return 9;
  if (model.startsWith("qwen-image-2.0")) return 10;
  return 3;
}

function buildDashScopeImageParameters({ model, size } = {}) {
  if (isWan27ImageModel(model)) {
    return {
      size: normalizeDashScopeImageSize(size, "2K"),
      n: 1,
      watermark: false
    };
  }
  if (isZImageModel(model)) {
    return {
      size: normalizeDashScopeImageSize(size, "1024*1024"),
      n: 1,
      prompt_extend: false,
      watermark: false
    };
  }
  const parameters = {
    n: 1,
    prompt_extend: true,
    watermark: false,
    negative_prompt: "low quality, blurry, distorted, wrong text, over-sharpened, dirty image"
  };
  if (size) parameters.size = normalizeDashScopeImageSize(size, size);
  return parameters;
}

function normalizeDashScopeImageSize(size, fallback) {
  const value = String(size || "").trim();
  if (!value || value === "auto") return fallback;
  if (/^[1-4]K$/i.test(value)) return value.toUpperCase();
  return value;
}

function isWan27ImageModel(model = "") {
  return String(model || "").startsWith("wan2.7-image");
}

function isZImageModel(model = "") {
  return String(model || "").startsWith("z-image-");
}

function buildImageGenerationPrompt({ prompt = "", hasReferences = false, referenceCount = 0 } = {}) {
  const userPrompt = String(prompt || "").trim() || "Generate a high quality creative image";
  if (!hasReferences) return userPrompt;
  const orderedReferences = Array.from({ length: Math.max(1, Math.min(3, referenceCount || 1)) }, (_, index) => (
    `Reference image ${index + 1}: the ${index === 0 ? "first" : index === 1 ? "second" : "third"} uploaded image in order.`
  ));
  return [
    "Use the uploaded reference image(s) as the primary visual source.",
    "The reference images are ordered exactly as uploaded or selected by the user.",
    ...orderedReferences,
    "Preserve the reference subject, identity, silhouette, key colors, pose, composition cues, and distinctive details unless the user explicitly asks to change them.",
    "When multiple references are provided, combine the relevant visual cues from all of them while keeping the first reference as the primary anchor.",
    "Apply the user's requested transformation to the reference image(s) instead of inventing an unrelated subject.",
    `User request: ${userPrompt}`
  ].join("\n");
}

export async function callQwenVision({ image, prompt } = {}) {
  if (!image) throw new Error("Missing image");
  const data = await callQwen({
    model: env.dashscopeVisionModel,
    content: [{ image }, { text: prompt }],
    parameters: { result_format: "message" }
  });
  return {
    text: pickText(data),
    providerCalls: [
      {
        provider: "qwen",
        model: env.dashscopeVisionModel,
        operation: "analyzeImage",
        endpoint: env.dashscopeUrl
      }
    ],
    raw: data
  };
}

export async function callQwenText({ prompt } = {}) {
  const data = await callQwen({
    model: env.dashscopeVisionModel,
    content: [{ text: prompt }],
    parameters: { result_format: "message" }
  });
  return {
    text: pickText(data),
    providerCalls: [
      {
        provider: "qwen",
        model: env.dashscopeVisionModel,
        operation: "generateText",
        endpoint: env.dashscopeUrl
      }
    ],
    raw: data
  };
}
