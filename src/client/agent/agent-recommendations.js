export function getIndustryActionPreset(analysis = {}) {
  const haystack = [
    analysis.productName,
    analysis.category,
    analysis.industry,
    analysis.workflowIntent,
    analysis.style,
    ...(analysis.materials || []),
    ...(analysis.sellingPoints || [])
  ].join(" ");

  if (/服装|女装|连衣裙|裙|鞋|包|帽|穿搭|面料|蕾丝|针织|汉服|Lolita/i.test(haystack)) {
    return [
      { type: "scene", title: "场景图", description: "生成适合上身、户外或生活方式的使用场景" },
      { type: "productPhoto", title: "实拍图", description: "转成真实商品摄影质感" },
      { type: "detail", title: "细节图", description: "突出面料、纹理、工艺和版型细节" },
      { type: "poster", title: "海报图", description: "整理成可投放的品牌视觉" },
      { type: "script", title: "视频脚本", description: "生成短视频穿搭分镜" }
    ];
  }

  if (/潮玩|公仔|手办|玩具|IP|角色|娃娃|盲盒|插画|卡通|毛绒|模型/i.test(haystack)) {
    return [
      { type: "render3d", title: "3D渲染", description: "转成立体产品表现，适合开发和展示" },
      { type: "productPhoto", title: "实拍图", description: "生成真实棚拍质感" },
      { type: "plush", title: "毛绒稿", description: "转成毛绒玩具设计方向" },
      { type: "model", title: "模型设定", description: "补齐三视图和结构参考" },
      { type: "packaging", title: "盲盒包装", description: "生成适合潮玩销售的包装" }
    ];
  }

  if (/美妆|香水|护肤|口红|粉底|面霜|精华|个护/i.test(haystack)) {
    return [
      { type: "productPhoto", title: "产品摄影", description: "生成干净高级的商业主图" },
      { type: "closeup", title: "质地特写", description: "展示膏体、液体或包装细节" },
      { type: "detail", title: "功效图", description: "组织成分、功效和使用理由" },
      { type: "packaging", title: "礼盒包装", description: "延展成节日礼盒视觉" },
      { type: "poster", title: "社媒图", description: "生成适合投放的社媒主视觉" }
    ];
  }

  if (/食品|饮料|餐|咖啡|茶|酒|甜品|零食|包装食品/i.test(haystack)) {
    return [
      { type: "productPhoto", title: "食欲图", description: "强化真实质感和食欲表现" },
      { type: "packaging", title: "包装设计", description: "延展货架可识别包装方案" },
      { type: "scene", title: "货架陈列", description: "放入销售场景查看陈列效果" },
      { type: "poster", title: "菜单海报", description: "生成门店或外卖宣传视觉" },
      { type: "script", title: "短视频", description: "拆成适合传播的镜头脚本" }
    ];
  }

  if (/3C|电器|小家电|工具|插座|耳机|音箱|相机|手机|电脑|设备/i.test(haystack)) {
    return [
      { type: "detail", title: "功能拆解", description: "提炼结构和功能卖点" },
      { type: "scene", title: "使用场景", description: "放入真实环境说明用途" },
      { type: "closeup", title: "结构特写", description: "突出接口、按键和材质细节" },
      { type: "poster", title: "参数图", description: "整理核心参数和购买理由" },
      { type: "script", title: "演示分镜", description: "生成可拍摄的功能演示脚本" }
    ];
  }

  return [
    { type: "productPhoto", title: "实拍图", description: "生成真实产品展示图" },
    { type: "scene", title: "场景图", description: "放入适合行业的使用环境" },
    { type: "closeup", title: "细节图", description: "突出材质、结构和识别点" },
    { type: "poster", title: "宣传图", description: "整理成适合投放的主视觉" },
    { type: "detail", title: "详情页", description: "组织卖点和购买理由" }
  ];
}

export function isWeakAction(action = {}) {
  const title = String(action.title || "");
  const desc = String(action.description || "");
  return !title
    || title.length > 8
    || /优化|提升|高级|创意|风格|美化|主图优化|电商转化/.test(title)
    || /优化|高级|电商转化|不明确/.test(desc);
}

export function improveRecommendedActions(analysis = {}) {
  const preset = getIndustryActionPreset(analysis);
  const actions = Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [];
  const strong = actions
    .filter((action) => action?.type && action?.title && !isWeakAction(action))
    .map((action) => ({
      type: action.type,
      title: String(action.title).slice(0, 6),
      description: action.description || preset.find((item) => item.type === action.type)?.description || "基于当前素材生成工作流物料"
    }));
  const merged = [...strong];
  preset.forEach((action) => {
    if (!merged.some((item) => item.type === action.type || item.title === action.title)) merged.push(action);
  });
  return merged.slice(0, 5);
}

export function compactAnalysisForAgent(analysis) {
  if (!analysis) return null;
  return {
    productName: analysis.productName || "",
    category: analysis.category || "",
    industry: analysis.industry || "",
    workflowIntent: analysis.workflowIntent || "",
    materials: Array.isArray(analysis.materials) ? analysis.materials.slice(0, 4) : [],
    colors: Array.isArray(analysis.colors) ? analysis.colors.slice(0, 4) : [],
    style: analysis.style || "",
    sellingPoints: Array.isArray(analysis.sellingPoints) ? analysis.sellingPoints.slice(0, 4) : [],
    targetAudience: analysis.targetAudience || "",
    recommendedActions: improveRecommendedActions(analysis)
  };
}

export function normalizeAgentSuggestion({ canvasState, suggestion = {}, pickCachedAction }) {
  const target = canvasState?.target || {};
  if (target.analysisStatus === "loading") {
    return {
      text: "先等识别完成",
      actionLabel: "稍等",
      actionType: "explore",
      mockResult: "图片识别完成后再推荐更准确的物料。"
    };
  }
  const isUploadedLike = target.sourceMode === "uploaded" || (target.kind === "image" && !target.generationPrompt);
  if (isUploadedLike && target.analysis?.recommendedActions?.length) {
    const action = pickCachedAction?.(canvasState, suggestion);
    if (action) {
      return {
        text: `${action.title}？`,
        actionLabel: action.title,
        actionType: action.type,
        mockResult: action.description || `基于当前素材生成${action.title}。`
      };
    }
  }
  return {
    text: String(suggestion.text || "试试下一步？").slice(0, 18),
    actionLabel: String(suggestion.actionLabel || "生成").slice(0, 6),
    actionType: suggestion.actionType || "explore",
    mockResult: suggestion.mockResult || suggestion.text || "AI Core 已根据当前素材生成一个结果草稿。"
  };
}
