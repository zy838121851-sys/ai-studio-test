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

export async function callQwenImage({ model, prompt, images = [], size } = {}) {
  const parameters = {
    n: 1,
    prompt_extend: true,
    watermark: false,
    negative_prompt: "low quality, blurry, distorted, wrong text, over-sharpened, dirty image"
  };
  if (size) parameters.size = size;

  const data = await callQwen({
    model,
    content: [
      ...images.slice(0, 3).map((image) => ({ image })),
      { text: prompt || "Generate a high quality creative image" }
    ],
    parameters
  });

  return {
    imageUrl: pickImageUrl(data),
    raw: data
  };
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
