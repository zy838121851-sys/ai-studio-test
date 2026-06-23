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
    raw: taskResult
  };
}

export async function callQwenImage({ model, prompt, images = [], size } = {}) {
  const referenceImages = Array.from(images || []).filter(Boolean).slice(0, 3);
  const resolvedModel = resolveImageModel({ model, hasReferences: referenceImages.length > 0 });
  const finalPrompt = buildImageGenerationPrompt({
    prompt,
    hasReferences: referenceImages.length > 0,
    referenceCount: referenceImages.length
  });
  const parameters = {
    n: 1,
    prompt_extend: true,
    watermark: false,
    negative_prompt: "low quality, blurry, distorted, wrong text, over-sharpened, dirty image"
  };
  if (size) parameters.size = size;

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

function buildWanExpandPrompt(prompt = "") {
  const userPrompt = String(prompt || "").trim();
  return [
    "Expand the input image outward only in the requested directions.",
    "Keep the original image content unchanged, preserving subject, lighting, texture, perspective, colors, and sharpness.",
    "Generate only plausible surrounding content that naturally continues the original scene.",
    "Do not repaint, crop, stretch, fade, or restyle the original image.",
    userPrompt ? `User request: ${userPrompt}` : ""
  ].filter(Boolean).join("\n");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveImageModel({ model = "qwen-image-2.0-pro", hasReferences = false } = {}) {
  const requested = String(model || "").trim() || "qwen-image-2.0-pro";
  if (!hasReferences || requested.includes("edit")) return requested;
  return "qwen-image-edit-plus";
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
    raw: data
  };
}
