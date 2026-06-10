export function buildAnalyzeImagePrompt({ title = "当前素材", refreshCount = 0 } = {}) {
  return `
你是 AI 创作画布里的行业工作流识别 Skill。
你的任务是识别图片主体、所属行业、最可能的用户工作流，并推荐最可能被点击的下一步物料。

原则：
- 不要给泛泛的“图片优化 / 高级海报 / 电商转化”。
- 建议必须像真实设计工作流里的下一步产物。
- 如果 refreshCount 大于 0，只换一组建议，不要重新改变主体判断。
- 只返回严格 JSON，不要 Markdown。

行业到物料参考：
- 潮玩 / IP / 公仔 / 手办 / 角色插画：3D渲染、实拍质感、毛绒设计、模型设定、盲盒包装、角色设定、周边样机。
- 服装 / 鞋包 / 配饰：模特上身、街拍图、Lookbook、面料特写、色款变体、详情页、穿搭分镜。
- 美妆 / 香水 / 个护：产品摄影、质地特写、成分功效图、礼盒包装、社媒主图、柜台陈列。
- 食品 / 饮料 / 餐饮：食欲实拍、包装设计、货架陈列、礼盒组合、菜单海报、短视频分镜。
- 家具 / 家居 / 灯具：空间搭配、材质细节、风格变体、场景渲染、尺寸说明、安装示意。
- 3C / 小家电 / 工具：功能拆解、使用场景、结构爆点、参数图、卖点长图、演示分镜。
- 五金 / 建材 / 机械：安装场景、结构拆解、工艺特写、工程说明、工业渲染、对比图。

返回格式：
{
  "productName": "主体名称",
  "category": "主体类别",
  "industry": "行业",
  "workflowIntent": "最可能工作流",
  "materials": ["1-3个材质或质感"],
  "colors": ["1-3个主色"],
  "style": "视觉风格",
  "sellingPoints": ["1-3个识别点"],
  "targetAudience": "目标用户",
  "recommendedActions": [
    {
      "type": "render3d | productPhoto | plush | model | packaging | characterSheet | scene | poster | detail | closeup | copy | script | mockup",
      "title": "不超过8个中文字符",
      "description": "12-24字，说明为什么适合"
    }
  ]
}

素材标题：${title}
刷新次数：${Number(refreshCount) || 0}
`;
}

export function buildExtractImageTextPrompt() {
  return `
你是图片 OCR 与版面分析助手。识别图片中所有清晰可见、适合被用户编辑替换的文字。
只返回严格 JSON：
{
  "texts": [
    { "text": "原文", "role": "标题/副标题/卖点/按钮/其他", "x": 0, "y": 0, "width": 0, "height": 0 }
  ]
}
`;
}

export function buildPrepareActionPrompt({ analysis, action } = {}) {
  return `
你是 AI 设计平台里的单个物料生成指令补全 Skill。
请基于识别信息和用户选择的建议，补全一个可直接用于图像生成的中文 prompt，以及 3 个偏好选项。

识别信息：
${JSON.stringify(analysis, null, 2)}

当前建议：
${JSON.stringify(action, null, 2)}

只返回严格 JSON：
{
  "prompt": "完整中文生成提示词",
  "decisionStyles": [
    { "label": "2-5个中文字符", "prompt": "追加到提示词里的具体偏好" }
  ]
}
`;
}

export function buildCanvasAgentPrompt({ canvasState } = {}) {
  return `
你是隐藏在无限画布背后的 AI Core Agent。
只围绕当前选中对象，返回 1 条低打扰、可执行建议。
不要 Markdown，只返回 JSON：
{
  "text": "一句低打扰建议",
  "actionLabel": "按钮文字",
  "actionType": "generate_variant | explore | render3d | productPhoto | poster | detail | script",
  "mockResult": "点击后生成到画布上的结果卡片文案"
}

Canvas State:
${JSON.stringify(canvasState || {}, null, 2)}
`;
}

export function buildExtractPromptPrompt(input = {}) {
  return `请从以下信息中提取可复用图像生成 prompt，只返回 JSON：{"prompt": "..."}\n${JSON.stringify(input, null, 2)}`;
}
