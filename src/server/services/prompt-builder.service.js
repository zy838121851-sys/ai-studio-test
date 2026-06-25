export function buildAnalyzeImagePrompt({ title = "Current asset", refreshCount = 0 } = {}) {
  return `
You are an image understanding model. Return JSON only. Do not output Markdown.
The input is a canvas asset named "${title}". It has been refreshed ${Number(refreshCount) || 0} times.
Return these fields:
{
  "category": "asset type, such as icon/character/product/scene/clothing/package/other",
  "industry": "possible industry, such as designer toy/e-commerce/design/game/advertising",
  "style": "visual style, such as modern/realistic/cartoon/low-poly/pixel",
  "emotion": "expressed emotion, or empty",
  "materials": ["suggested follow-up materials, such as 2D render, 3D asset, product photo, plush texture"],
  "nextActions": [
    { "type": "render3d", "label": "3D render", "description": "Generate a 3D view" },
    { "type": "productPhoto", "label": "Product photo", "description": "Generate a product photography style asset" },
    { "type": "editText", "label": "Copy expansion", "description": "Generate related copy or titles" }
  ],
  "targetAudience": "possible target audience"
}
`;
}

export function buildExtractImageTextPrompt() {
  return `
You are an OCR analysis model. Extract all readable text from the image.
Return JSON only. Do not output Markdown.
The response must use this shape:
{
  "texts": [
    { "text": "recognized text", "role": "title/button/label/body/other", "x": 0, "y": 0, "width": 0, "height": 0 }
  ]
}
If there is no clear readable text, return {"texts": []}.
Coordinates can be approximate; use 0 when unknown.
`;
}

export function buildPrepareActionPrompt({ analysis, action } = {}) {
  return `
You are an action strategy model. Based on the current asset analysis and user goal, return one executable prompt as JSON.
Analysis:
${JSON.stringify(analysis || {}, null, 2)}

Action:
${JSON.stringify(action || {}, null, 2)}

Return:
{
  "prompt": "prompt for the next generation or edit step",
  "decisionStyles": [
    { "label": "Default", "prompt": "a more stable implementation" },
    { "label": "Explore", "prompt": "a more creative implementation" },
    { "label": "High fidelity", "prompt": "an implementation closer to the source image style" }
  ]
}
`;
}

export function buildExpandImagePlanPrompt({ prompt = "", expand = {} } = {}) {
  return `
You are an expert image outpainting planner. Return JSON only. Do not output Markdown.
Look at the input image and infer what should naturally exist just outside its current frame.
Your plan will be sent directly to an image expansion model, so it must be concrete, visual, and actionable.

Expansion request:
${String(prompt || "").trim() || "No extra user request was provided."}

Requested expansion scale:
${JSON.stringify(expand || {}, null, 2)}

Return:
{
  "sceneSummary": "one concise sentence describing the original image, subject, setting, style, lighting, camera angle, and color palette",
  "continuityRules": [
    "rules for preserving the original subject and image identity"
  ],
  "outsideAreaPlan": {
    "left": "2-4 concrete visual details to generate on the left expansion area, or empty string if left_scale is 1",
    "right": "2-4 concrete visual details to generate on the right expansion area, or empty string if right_scale is 1",
    "top": "2-4 concrete visual details to generate on the top expansion area, or empty string if top_scale is 1",
    "bottom": "2-4 concrete visual details to generate on the bottom expansion area, or empty string if bottom_scale is 1"
  },
  "negative": [
    "things that would break continuity or change the original image"
  ],
  "outpaintPrompt": "a polished English prompt for the image expansion model. It must actively describe the surrounding content to add, while preserving the original image unchanged."
}

Rules:
- Preserve the original image content exactly.
- For newly exposed areas, actively infer plausible surrounding environment, background, surface, props, atmosphere, lighting continuation, and composition balance.
- Add contextually likely details when useful. Do not leave new areas empty unless the source image is intentionally minimal.
- If the image is a product, character, UI, illustration, logo, food, fashion, architecture, or scene, choose expansion details that fit that category instead of generic filler.
- Match the original lens/camera angle, linework, rendering medium, material texture, shadows, depth of field, and color temperature.
- The outpaintPrompt must mention the most important side-specific additions and should not merely say "continue the same scene".
- Do not invent a different subject, different style, different camera angle, or unrelated objects.
`;
}

export function buildCanvasAgentPrompt({ canvasState } = {}) {
  return `
You are an unobtrusive AI assistant. Do not chat. Return only the next actionable suggestion.
Canvas state:
${JSON.stringify(canvasState || {}, null, 2)}

Return JSON only. Do not output Markdown:
{
  "text": "suggestion copy, 4-8 Chinese characters when possible",
  "actionType": "generate_variant | explore | render3d | productPhoto | packaging | poster | detail | script | closeup",
  "mockResult": "description of the result that can be generated if the user triggers the action"
}
`;
}

export function buildExtractPromptPrompt(input = {}) {
  return `Extract a prompt suitable for image generation from the following information. Return JSON only:\n${JSON.stringify(input, null, 2)}`;
}
