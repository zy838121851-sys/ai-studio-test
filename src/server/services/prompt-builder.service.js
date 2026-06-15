export function buildAnalyzeImagePrompt({ title = "当前素材", refreshCount = 0 } = {}) {
  return `
你是图片理解模型，需要返回 JSON，不要输出 Markdown。
输入是画布中的素材：${title}，最近是第 ${Number(refreshCount) || 0} 次刷新。
请快速给出素材属性，并返回以下字段：
{
  "category": "素材类型，如图标/角色/产品/场景/服装/包装/其他",
  "industry": "可能行业，如潮玩/电商/设计/游戏/广告等",
  "style": "视觉风格（现代/写实/卡通/低多边形/像素等）",
  "emotion": "表达情绪（可选）",
  "materials": ["后续建议物料，如 2D渲染, 3D素材, 实拍照, 毛绒贴图 等"],
  "nextActions": [
    { "type": "render3d", "label": "3D 渲染", "description": "生成 3D 视角" },
    { "type": "productPhoto", "label": "拍摄风格图", "description": "生成产品摄影风格素材" },
    { "type": "editText", "label": "文案扩写", "description": "生成同主题文案/标题" }
  ],
  "targetAudience": "可能目标用户"
}
`;
}

export function buildExtractImageTextPrompt() {
  return `
你是 OCR 解析模型。
请从图片提取可读文字，按 JSON 返回：
{
  "texts": [
    { "text": "识别出的文字", "role": "标题/按钮/标签/说明/其他", "x": 0, "y": 0, "width": 0, "height": 0 }
  ]
}
若无明显文字，返回空数组。不要输出 Markdown。`;
}

export function buildPrepareActionPrompt({ analysis, action } = {}) {
  return `
你是动作策略模型。根据当前素材分析和用户目标，返回一段可执行提示词 JSON。
分析:
${JSON.stringify(analysis || {}, null, 2)}

动作:
${JSON.stringify(action || {}, null, 2)}

请返回:
{
  "prompt": "用于下一步生成/编辑的提示词",
  "decisionStyles": [
    { "label": "默认", "prompt": "更稳健的实现方式" },
    { "label": "探索", "prompt": "更有创意的实现方式" },
    { "label": "高还原", "prompt": "更接近原图风格的实现方式" }
  ]
}
`;
}

export function buildCanvasAgentPrompt({ canvasState } = {}) {
  return `
你是隐藏式 AI 助理，不要聊天，仅返回下一条可执行建议。
输入：画布状态如下
${JSON.stringify(canvasState || {}, null, 2)}

仅返回 JSON，不要 Markdown：
{
  "text": "建议文案（4-8个字）",
  "actionType": "generate_variant | explore | render3d | productPhoto | packaging | poster | detail | script | closeup",
  "mockResult": "若用户触发按钮后可直接生成的模拟结果说明"
}
`;
}

export function buildExtractPromptPrompt(input = {}) {
  return `基于下列信息抽取适合该图像生成的 prompt（只返回 JSON）：\n${JSON.stringify(input, null, 2)}`;
}
