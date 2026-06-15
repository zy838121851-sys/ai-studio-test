const DEFAULT_DECISION_STYLES = [
  { label: "质感优先", prompt: "质感优先，保留主体结构，强化材质、光影和高级感" },
  { label: "转化优先", prompt: "电商转化优先，画面信息清晰，突出卖点与购买理由" },
  { label: "尽量保真", prompt: "尽量保留原始产品外观、颜色和比例，只优化场景和表达" }
];

const ALLOWED_CORE_ACTION_TYPES = new Set([
  "scene",
  "poster",
  "detail",
  "closeup",
  "copy",
  "script",
  "render3d",
  "productPhoto",
  "plush",
  "model",
  "packaging",
  "characterSheet",
  "mockup"
]);

export function normalizeDecisionStyles(styles) {
  const list = Array.isArray(styles) ? styles : [];
  const normalized = list
    .map((item) => {
      if (typeof item === "string") return { label: item.slice(0, 6), prompt: item };
      return {
        label: item?.label || item?.title || "",
        prompt: item?.prompt || item?.description || item?.label || item?.title || ""
      };
    })
    .filter((item) => item.label && item.prompt)
    .slice(0, 3);
  return normalized.length ? normalized : DEFAULT_DECISION_STYLES;
}

export function getAllDecisionStyles(workspace) {
  const actions = workspace?._coreActions || [];
  const styles = actions.flatMap((action) => action.decisionStyles || []).slice(0, 3);
  return styles.length ? styles : undefined;
}

export function normalizeAnalysis(analysis, fallback = {}, { directorActions = [] } = {}) {
  const recommendedActions = Array.isArray(analysis?.recommendedActions)
    ? analysis.recommendedActions
      .filter((action) => ALLOWED_CORE_ACTION_TYPES.has(action?.type))
      .slice(0, 5)
      .map((action) => ({
        type: action.type,
        title: action.title || directorActions.find((item) => item.type === action.type)?.title || "生成素材",
        description: action.description || action.prompt || "基于图片识别结果生成素材",
        prompt: action.prompt || analysis?.generationPrompts?.[action.type] || "",
        decisionStyles: normalizeDecisionStyles(action.decisionStyles),
        prepared: Boolean(action.prompt || analysis?.generationPrompts?.[action.type])
      }))
    : [];

  return {
    productName: analysis?.productName || fallback.name || "产品",
    category: analysis?.category || fallback.type || "商品素材",
    industry: analysis?.industry || analysis?.category || fallback.type || "未知行业",
    workflowIntent: analysis?.workflowIntent || "生成可用物料",
    materials: Array.isArray(analysis?.materials) ? analysis.materials : [],
    colors: Array.isArray(analysis?.colors) ? analysis.colors : [],
    style: analysis?.style || "待分析",
    sellingPoints: Array.isArray(analysis?.sellingPoints) ? analysis.sellingPoints : [],
    targetAudience: analysis?.targetAudience || "",
    sceneIdeas: Array.isArray(analysis?.sceneIdeas) ? analysis.sceneIdeas : [],
    posterIdeas: Array.isArray(analysis?.posterIdeas) ? analysis.posterIdeas : [],
    detailPageIdeas: Array.isArray(analysis?.detailPageIdeas) ? analysis.detailPageIdeas : [],
    videoIdeas: Array.isArray(analysis?.videoIdeas) ? analysis.videoIdeas : [],
    generationPrompts: analysis?.generationPrompts || {},
    recommendedActions
  };
}

export const normalizeCoreAnalysis = normalizeAnalysis;

export function getFallbackCoreActions(data) {
  const fallback = [
    { type: "scene", title: "场景图", description: data.sceneIdeas[0] || "根据图片主体生成适配场景", prompt: data.generationPrompts.scene },
    { type: "poster", title: "宣传海报", description: data.posterIdeas[0] || "提炼卖点生成宣传海报", prompt: data.generationPrompts.poster },
    { type: "detail", title: "产品详情页", description: data.detailPageIdeas[0] || "组织详情模块与卖点", prompt: data.generationPrompts.detail },
    { type: "script", title: "视频脚本", description: data.videoIdeas[0] || "生成短视频分镜和文案", prompt: data.generationPrompts.video }
  ];
  return fallback.filter((action) => action.description || action.prompt).slice(0, 4);
}

export function buildCoreActions(data, directorActions = []) {
  const actions = data.recommendedActions.length ? data.recommendedActions : getFallbackCoreActions(data);
  return actions.map((action) => {
    const base = directorActions.find((item) => item.type === action.type)
      || directorActions.find((item) => item.type === "poster")
      || {};
    return {
      ...base,
      type: action.type,
      title: action.title,
      prompt: action.prompt || data.generationPrompts[action.type] || "",
      decisionStyles: normalizeDecisionStyles(action.decisionStyles),
      description: action.description,
      prepared: Boolean(action.prepared || action.prompt || data.generationPrompts[action.type]),
      kind: base.kind
    };
  });
}

export function renderCoreActionButtons({ workspace, data, loading = false, directorActions = [], escapeHtml }) {
  const wrap = workspace?.querySelector(".ai-panel-actions");
  if (!wrap) return;
  if (loading) {
    wrap.innerHTML = `
      <button type="button" disabled>
        <span>AI 思考中</span>
        <small>正在理解图片类型，并推测最适合生成的素材。</small>
      </button>
    `;
    return;
  }

  const actions = data.recommendedActions.length ? data.recommendedActions : getFallbackCoreActions(data);
  workspace._coreActions = buildCoreActions(data, directorActions);
  wrap.innerHTML = `
    ${actions.map((action) => `
      <button type="button" data-core-action="${action.type}">
        <span>${escapeHtml(action.title)}</span>
        <small>${escapeHtml(action.description || "基于识别结果生成")}</small>
      </button>
    `).join("")}
    <button type="button" data-core-action="all">
      <span>一键生成全部</span>
      <small>按 AI 推理出的方向生成完整素材包</small>
    </button>
  `;
}

export function updateCoreWorkspaceCards({ workspace, data, loading = false, escapeHtml }) {
  const progress = workspace?.querySelector(".ai-progress");
  if (progress) {
    progress.querySelector("span").textContent = loading ? "视觉模型正在识别商品..." : "图片识别完成";
    progress.querySelector("strong").textContent = loading ? "分析中" : "100%";
    progress.querySelector("i").style.setProperty("--ai-progress", loading ? "62%" : "100%");
  }

  const actionCopy = {
    scene: data.sceneIdeas[0] || "基于商品生成真实使用场景",
    poster: data.posterIdeas[0] || "提炼卖点生成宣传海报",
    detail: data.detailPageIdeas[0] || "组织详情页模块与卖点",
    all: "按识别结果一次生成完整素材包"
  };
  Object.entries(actionCopy).forEach(([type, copy]) => {
    const button = workspace?.querySelector(`[data-core-action="${type}"] small`);
    if (button) button.textContent = copy;
  });

  const previewData = [
    {
      selector: ".preview-scene",
      title: loading ? "场景图 · 待生成" : "场景图 · 推荐方向",
      value: data.sceneIdeas[0] || "识别完成后生成适配商品的场景图。"
    },
    {
      selector: ".preview-poster",
      title: "宣传海报",
      value: data.posterIdeas[0] || "提取商品卖点，生成适合投放的营销海报。"
    },
    {
      selector: ".preview-detail",
      title: "产品详情页",
      value: data.detailPageIdeas[0] || "生成产品主视觉、材质说明、细节展示和购买理由。"
    }
  ];

  previewData.forEach((item) => {
    const card = workspace?.querySelector(item.selector);
    if (!card) return;
    card.querySelector("strong").textContent = item.title;
    card.querySelector("div").innerHTML = `
      <span>${escapeHtml(data.category || "商品")}</span>
      <p>${escapeHtml(item.value)}</p>
    `;
  });

  const thinking = workspace?.querySelector(".ai-thinking-card");
  if (thinking) {
    thinking.innerHTML = `
      <strong>${loading ? "AI 思考中" : "AI 已完成分析"}</strong>
      <span class="${loading ? "active" : "done"}">● 识别商品属性</span>
      <span class="${loading ? "active" : "done"}">● 分析风格与卖点</span>
      <span class="${loading ? "" : "done"}">● 生成素材方案</span>
      <span>${loading ? "○ 等待用户选择生成方向" : "○ 等待你选择生成方向"}</span>
    `;
  }
}

export function buildAlternativeCoreSuggestions(analysis, refreshCount = 1) {
  const product = analysis.productName || "当前产品";
  const category = analysis.category || "商品";
  const style = analysis.style || "商业质感";
  const scene = analysis.sceneIdeas?.[refreshCount % Math.max(1, analysis.sceneIdeas.length)] || `${category}的真实使用场景`;
  const poster = analysis.posterIdeas?.[refreshCount % Math.max(1, analysis.posterIdeas.length)] || `${product}的营销主视觉`;
  const detail = analysis.detailPageIdeas?.[refreshCount % Math.max(1, analysis.detailPageIdeas.length)] || `${product}的细节说明`;
  const video = analysis.videoIdeas?.[refreshCount % Math.max(1, analysis.videoIdeas.length)] || `${product}的短视频分镜`;
  const groups = [
    [
      { type: "scene", title: "生活场景", description: scene, prompt: `基于${product}生成生活化使用场景，风格：${style}，画面真实自然。` },
      { type: "closeup", title: "细节特写", description: detail, prompt: `生成${product}的局部特写图，突出材质、结构和核心卖点。` },
      { type: "poster", title: "社媒封面", description: poster, prompt: `生成适合社媒传播的${product}封面主视觉，标题空间清晰。` },
      { type: "script", title: "短片分镜", description: video, prompt: `生成${product}的短视频分镜脚本，包含镜头节奏和字幕卖点。` }
    ],
    [
      { type: "poster", title: "转化海报", description: poster, prompt: `生成${product}的电商转化海报，卖点醒目，购买理由明确。` },
      { type: "detail", title: "卖点长图", description: detail, prompt: `生成${product}的详情页长图方案，包含结构拆解、材质说明和使用理由。` },
      { type: "scene", title: "氛围布景", description: scene, prompt: `为${product}生成高质感氛围布景，保持主体准确，强化光影层次。` },
      { type: "copy", title: "标题文案", description: `提炼${category}的标题、卖点和广告短句`, prompt: `为${product}生成一组商品标题、核心卖点和广告短句。` }
    ],
    [
      { type: "closeup", title: "功能拆解", description: detail, prompt: `围绕${product}生成结构或功能拆解图，标注关键优势。` },
      { type: "scene", title: "对比场景", description: scene, prompt: `生成${product}使用前后或场景对比图，突出价值变化。` },
      { type: "poster", title: "品牌主图", description: poster, prompt: `生成${product}品牌级主图，构图克制，高级商业摄影质感。` },
      { type: "detail", title: "购买理由", description: `组织${product}的购买理由与信任信息`, prompt: `生成${product}购买理由详情页模块，突出可信度和转化。` }
    ]
  ];
  const actions = groups[refreshCount % groups.length].map((action) => ({
    ...action,
    decisionStyles: [
      { label: "保真", prompt: `保持${product}外观和比例准确，只优化表达。` },
      { label: "氛围", prompt: `强化${style}氛围和光影质感。` },
      { label: "卖点", prompt: `优先突出${category}的功能卖点和转化信息。` }
    ]
  }));
  return {
    recommendedActions: actions,
    generationPrompts: Object.fromEntries(actions.map((action) => [action.type, action.prompt]))
  };
}
