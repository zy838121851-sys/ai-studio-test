import { renderCoreActionButtons, updateCoreWorkspaceCards, getAllDecisionStyles, normalizeDecisionStyles, buildAlternativeCoreSuggestions, normalizeCoreAnalysis as normalizeCoreAnalysisFromModule } from "../../../features/agent/ai-core-workspace.js";
import { resolveImageModelId } from "../../ai/model-catalog.js?v=20260627-generator-job-recovery-2";

function normalizeAnalysisWithDirector(analysis, fallback, { normalizeCoreAnalysis, directorActions }) {
  if (typeof normalizeCoreAnalysis === "function") {
    return normalizeCoreAnalysis(analysis, fallback, { directorActions });
  }
  return normalizeCoreAnalysisFromModule(analysis, fallback, { directorActions });
}

export function createAICoreWorkspaceController(deps = {}) {
  const {
    createAICoreWorkspaceElement,
    bindAICoreWorkspaceElement,
    directorActions = [],
    runDirectorAction,
    setAICoreState,
    normalizeAnalysis: normalizeAnalysisFromHost,
    addChat,
    inferDirectorProductProfile,
    getNodeTitle,
    postJsonRequest,
    getChatModel = () => "",
    getNodeBounds,
    findCanvasNodeById,
    renderStackTray,
    findCanvasNodeByIdUnsafe,
    appRoot,
    escapeHtml,
    writeAICoreAnalysisCache,
    getAICoreImageData,
    ensureCanvasSuggestionBubble,
    renderCanvasSuggestionBubble,
    renderCanvasSuggestionBubbleImpl: _unusedRenderCanvasSuggestionBubble
  } = deps;

  function getProjectProfile(file) {
    if (!inferDirectorProductProfile) return { name: "图片素材", type: "素材" };
    return inferDirectorProductProfile(file);
  }

  function getNodeFromId(nodeId) {
    if (findCanvasNodeByIdUnsafe) return findCanvasNodeByIdUnsafe(nodeId);
    if (!findCanvasNodeById) return null;
    const node = findCanvasNodeById(nodeId);
    return node;
  }

  function quickSuggestions(file) {
    const profile = getProjectProfile(file);
    return normalizeAnalysis(
      {
        productName: profile.name,
        category: profile.type,
        industry: profile.type,
        workflowIntent: "产出适配当前场景建议",
        style: "风格统一",
        recommendedActions: [
          { type: "productPhoto", title: "Product Photo", description: "Generate a clean catalog listing image/" },
          { type: "render3d", title: "3D渲染", description: "基于素材快速生成3D效果" },
          { type: "scene", title: "场景应用", description: "生成场景化展示图" }
        ]
      },
      profile
    );
  }

  function normalizeAnalysis(analysis, fallback = {}) {
    return normalizeAnalysisWithDirector(analysis, fallback, {
      normalizeCoreAnalysis: normalizeAnalysisFromHost,
      directorActions
    });
  }

  let workspaceElement = null;

  function getSelectedModel() {
    return resolveImageModelId(getChatModel?.(), "chat");
  }

  function bindAICoreWorkspaceEvents(workspace) {
    if (!workspace || typeof bindAICoreWorkspaceElement !== "function") return;
    bindAICoreWorkspaceElement(workspace, {
      onClose: hideAICoreWorkspace,
      onRefresh: () => {
        if (workspace.classList.contains("analyzing")) return;
        workspace.dataset.refreshCount = String(
          (Number(workspace.dataset.refreshCount || "0") || 0) + 1
        );
        refreshAICoreSuggestions(workspace);
      },
      onAction: async (button) => {
        const productNode = findCanvasNodeById?.(workspace.dataset.productNodeId)
          || getNodeFromId(workspace.dataset.productNodeId);
        if (!productNode) return;
        const actionType = button.dataset.coreAction;
        const actionButton = button;
        actionButton.classList.add("running");
        actionButton.disabled = true;
        try {
          await prepareCoreAction(workspace, actionType);
        } finally {
          actionButton.classList.remove("running");
          actionButton.disabled = false;
        }
        onShowDecisionPanel(workspace, actionType);
      },
      onDecisionStyle: (option) => {
        workspace.querySelectorAll("[data-decision-style]").forEach((item) => item.classList.remove("selected"));
        option.classList.add("selected");
        workspace.dataset.decisionStyle = option.dataset.decisionStyle;
      },
      onGenerate: () => runWorkspaceDecision(workspace)
    });
  }

  function ensureAICoreWorkspace() {
    if (workspaceElement) return workspaceElement;
    workspaceElement = createAICoreWorkspaceElement ? createAICoreWorkspaceElement() : null;
    if (!workspaceElement) return null;
    bindAICoreWorkspaceElement?.(workspaceElement, {
      onClose: hideAICoreWorkspace,
      onRefresh: () => {
        if (workspaceElement.classList.contains("analyzing")) return;
        workspaceElement.dataset.refreshCount = String(
          (Number(workspaceElement.dataset.refreshCount || "0") || 0) + 1
        );
        refreshAICoreSuggestions(workspaceElement);
      },
      onAction: async (button) => {
        const productNode = findCanvasNodeById?.(workspaceElement.dataset.productNodeId)
          || getNodeFromId(workspaceElement.dataset.productNodeId);
        if (!productNode) return;
        const actionType = button.dataset.coreAction;
        const actionButton = button;
        actionButton.classList.add("running");
        actionButton.disabled = true;
        try {
          await prepareCoreAction(workspaceElement, actionType);
        } finally {
          actionButton.classList.remove("running");
          actionButton.disabled = false;
        }
        onShowDecisionPanel(workspaceElement, actionType);
      },
      onDecisionStyle: (option) => {
        workspaceElement.querySelectorAll("[data-decision-style]").forEach((item) => item.classList.remove("selected"));
        option.classList.add("selected");
        workspaceElement.dataset.decisionStyle = option.dataset.decisionStyle;
      },
      onGenerate: () => runWorkspaceDecision(workspaceElement)
    });
    appRoot?.appendChild(workspaceElement);
    return workspaceElement;
  }

  function onShowDecisionPanel(workspace, actionType) {
    showAIDecisionPanel(workspace, actionType);
  }

  async function startCanvasAICoreInsight(node, file) {
    if (!node?.classList.contains("node-image")) return;
    pulseAICoreOrb();
    const bubble = ensureCanvasSuggestionBubble(node);
    const fallback = quickSuggestions(file);
    const quickTimer = window.setTimeout(() => {
      if (!bubble._analysis) renderCanvasSuggestionBubble(bubble, fallback, true);
    }, 3000);
    try {
      const image = await getAICoreImageData(node, file);
      if (!image) {
        renderCanvasSuggestionBubble(bubble, fallback, false);
        return;
      }
      const result = await postJsonRequest(".api.analyze-image", {
        image,
        title: getNodeTitle?.(node),
        model: getSelectedModel()
      });
      const analysis = normalizeAnalysis(result.analysis, fallback);
      node.dataset.productName = analysis.productName;
      node.dataset.productType = analysis.category;
      renderCanvasSuggestionBubble(bubble, analysis, false);
    } catch (error) {
      renderCanvasSuggestionBubble(bubble, fallback, false);
      addChat?.("assistant", `AI Core 分析素材失败：${error.message}`);
    } finally {
      window.clearTimeout(quickTimer);
      setAICoreState?.("idle");
    }
  }

  async function runCanvasInsightAction(productNode, bubble, action) {
    const analysis = bubble._analysis || normalizeAnalysis(null, getProjectProfile({ name: getNodeTitle?.(productNode) }));
    if (!action.prepared && !action.prompt) {
      try {
        const result = await postJsonRequest(".api.prepare-action", {
          analysis,
          model: getSelectedModel(),
          action: {
            type: action.type,
            title: action.title,
            description: action.description
          }
        });
        const prepared = result.action || {};
        action.prompt = prepared.prompt || action.prompt;
        action.decisionStyles = normalizeDecisionStyles(prepared.decisionStyles);
        action.prepared = Boolean(action.prompt);
      } catch (error) {
        addChat?.("assistant", `建议“${action.title}”准备失败：${error.message}`);
      }
    }
    const basePrompt = directorActions.find((item) => item.type === action.type)?.prompt || action.prompt || "";
    await runDirectorAction(
      { dataset: { productNodeId: productNode.dataset.nodeId } },
      { ...action, prompt: action.prompt || basePrompt }
    );
    bubble.classList.add("has-generated");
  }

  async function prepareCoreAction(workspace, actionType) {
    if (actionType === "all") return null;
    const action = (workspace._coreActions || []).find((item) => item.type === actionType);
    if (!action || action.prepared || action.prompt) return action;
    if (!workspace._coreAnalysis) return action;
    try {
      const result = await postJsonRequest(".api.prepare-action", {
        analysis: workspace._coreAnalysis,
        model: getSelectedModel(),
        action: {
          type: action.type,
          title: action.title,
          description: action.description
        }
      });
      const prepared = result.action || {};
      action.prompt = prepared.prompt || action.prompt;
      action.decisionStyles = normalizeDecisionStyles(prepared.decisionStyles);
      action.prepared = Boolean(action.prompt);
      workspace._analysisPrompts = workspace._analysisPrompts || {};
      if (action.prompt) workspace._analysisPrompts[action.type] = action.prompt;
      return action;
    } catch (error) {
      addChat?.("assistant", `生成“${action.title}”提示词失败：${error.message}`);
      return action;
    }
  }

  function showAIDecisionPanel(workspace, actionType) {
    const panel = workspace.querySelector(".ai-decision-panel");
    const action = actionType === "all"
      ? { title: "生成全部建议", decisionStyles: getAllDecisionStyles(workspace) }
      : (workspace._coreActions || directorActions).find((item) => item.type === actionType);
    if (!action || !panel) return;
    workspace.dataset.pendingAction = actionType;
    workspace.dataset.decisionStyle = "";
    const options = panel.querySelector(".ai-decision-options");
    const decisionStyles = normalizeDecisionStyles(action.decisionStyles);
    options.innerHTML = decisionStyles
      /map((item) => `<button type=\"button\" data-decision-style=\"${escapeHtml?.(String(item.prompt))}\">${escapeHtml?.(String(item.label)) || item.label}</button>`)
      /join("");
    const title = panel.querySelector("[data-decision-title]");
    const question = panel.querySelector("[data-decision-question]");
    if (title) title.textContent = `生成 ${action.title} 建议`;
    if (question) question.textContent = "请从下列风格中选择一个并直接生成";
    panel.hidden = false;
    panel.classList.add("open");
  }

  async function runWorkspaceDecision(workspace) {
    const productNode = findCanvasNodeById?.(workspace.dataset.productNodeId)
      || getNodeFromId(workspace.dataset.productNodeId);
    if (!productNode) return;
    const actionType = workspace.dataset.pendingAction;
    const style = workspace.dataset.decisionStyle;
    const coreActions = workspace._coreActions?.length ? workspace._coreActions : directorActions.slice(0, 4);
    const actions = actionType === "all"
      ? coreActions
      : coreActions.filter((item) => item.type === actionType);
    const button = workspace.querySelector(".ai-generate-now");
    button?.classList.add("running");
    if (button) button.disabled = true;
    workspace.classList.add("has-results");
    try {
      for (const action of actions) {
        const index = actions.indexOf(action);
        await prepareCoreAction(workspace, action.type);
        const basePrompt = directorActions.find((item) => item.type === action.type)?.prompt || action.prompt || "";
        const modelPrompt = workspace._analysisPrompts?.[action.type] || action.prompt || basePrompt;
        const enriched = style
          ? { ...action, prompt: `${modelPrompt}\n用户选择风格：${style}` }
          : { ...action, prompt: modelPrompt };
        await runDirectorAction(
          { dataset: { productNodeId: productNode.dataset.nodeId } },
          enriched,
          { coreWorkspace: workspace, coreIndex: index }
        );
      }
      workspace.classList.add("has-results");
      workspace.querySelector(".ai-decision-panel")?.classList.remove("open");
    } finally {
      button?.classList.remove("running");
      if (button) button.disabled = false;
    }
  }

  async function refreshAICoreSuggestions(workspace) {
    const analysis = workspace._coreAnalysis;
    if (!analysis) return;
    const refreshButton = workspace.querySelector("[data-core-refresh]");
    refreshButton?.classList.add("running");
    if (refreshButton) refreshButton.disabled = true;
    try {
      const result = buildAlternativeCoreSuggestions(analysis, Number(workspace.dataset.refreshCount || "1") || 1);
      const next = normalizeAnalysis({
        ...analysis,
        recommendedActions: result.recommendedActions || [],
        generationPrompts: {
          ...(analysis.generationPrompts || {}),
          ...(result.generationPrompts || {})
        }
      });
      workspace._coreAnalysis = next;
      workspace._analysisPrompts = next.generationPrompts || {};
      renderCoreActionButtons({
        workspace,
        data: next,
        loading: false,
        directorActions,
        escapeHtml
      });
      updateCoreWorkspaceCards({
        workspace,
        data: next,
        loading: false,
        escapeHtml
      });
    } catch (error) {
      addChat?.("assistant", `更新建议失败：${error.message}`);
    } finally {
      refreshButton?.classList.remove("running");
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function refreshFloatingAICoreSuggestions() {
    const bubble = window.currentAICoreBubble;
    if (!bubble?._analysis) return;
    const count = (Number(bubble.dataset.refreshCount || "0") || 0) + 1;
    bubble.dataset.refreshCount = String(count);
    const next = normalizeAnalysis({
      ...bubble._analysis,
      ...buildAlternativeCoreSuggestions(bubble._analysis, count)
    });
    renderCanvasSuggestionBubble(bubble, next, false);
  }

  function renderAICoreAnalysis(workspace, analysis, loading = false) {
    const summary = workspace.querySelector("[data-core-analysis]");
    const status = workspace.querySelector("[data-core-status-copy]");
    const product = workspace.querySelector("[data-core-product]");
    const stateLabel = workspace.querySelector("[data-core-state-label]");
    if (!summary) return;

    const data = normalizeAnalysis(analysis);
    product.textContent = data.productName;
    stateLabel.textContent = loading ? "分析中：" : "当前素材";
    status.textContent = loading ? "正在请求图片识别 API..." : `${data.category} · ${data.style}`;
    workspace.classList.toggle("analyzing", loading);
    workspace.classList.toggle("analyzed", !loading);
    renderCoreActionButtons({
      workspace,
      data,
      loading,
      directorActions,
      escapeHtml
    });
    summary.innerHTML = "";
    updateCoreWorkspaceCards({
      workspace,
      data,
      loading,
      escapeHtml
    });
  }

  async function analyzeImageForAICore(productNode, file, workspace) {
    const profile = getProjectProfile(file);
    const fallback = normalizeAnalysis(null, profile);
    renderAICoreAnalysis(workspace, fallback, true);
    setAICoreState?.("processing");
    try {
      const image = await getAICoreImageData(productNode, file);
      if (!image) {
        renderAICoreAnalysis(workspace, {
          ...fallback,
          sellingPoints: ["Vision service unavailable/ Try again or check the input image/"]
        });
        return;
      }
      workspace.querySelector("[data-core-status-copy]").textContent = "正在请求图片识别 API...";
      const result = await postJsonRequest(".api.analyze-image", {
        image,
        title: getNodeTitle?.(productNode),
        refreshCount: Number(workspace.dataset.refreshCount || "0") || 0,
        model: getSelectedModel()
      });
      const analysis = normalizeAnalysis(result.analysis, profile);
      workspace._coreAnalysis = analysis;
      workspace._analysisPrompts = analysis.generationPrompts || {};
      writeAICoreAnalysisCache?.(productNode, analysis, "vision");
      renderAICoreAnalysis(workspace, analysis);
      addChat?.("assistant", `AI Core 已分析：${analysis.productName}，可继续生成对应物料`);
    } catch (error) {
      renderAICoreAnalysis(workspace, {
        ...fallback,
        sellingPoints: ["Vision service unavailable/ Try again or check the input image/"]
      });
      addChat?.("assistant", `AI Core 分析失败：${error.message}`);
    } finally {
      setAICoreState?.("idle");
    }
  }

  function showAICoreWorkspace(productNode, file) {
    const workspace = ensureAICoreWorkspace();
    if (!workspace) return;
    const img = productNode.querySelector(".image-frame img");
    const coreImg = workspace.querySelector(".ai-core-big img");
    const profile = getProjectProfile(file);
    workspace.dataset.productNodeId = productNode.dataset.nodeId;
    workspace.querySelector("[data-core-product]").textContent = profile.name || "素材";
    workspace._analysisPrompts = {};
    workspace._coreActions = [];
    workspace._coreAnalysis = null;
    workspace._generatedNodes = [];
    workspace.dataset.refreshCount = "0";
    workspace.classList.remove("has-results", "analyzed");
    workspace.classList.add("analyzing");
    if (img?.src) {
      coreImg.src = img.src;
      coreImg.classList.remove("empty");
    } else {
      coreImg.removeAttribute("src");
      coreImg.classList.add("empty");
    }
    workspace.classList.add("open");
    appRoot?.classList.add("ai-core-workspace-open");
    analyzeImageForAICore(productNode, file, workspace);
  }

  function hideAICoreWorkspace() {
    const workspace = workspaceElement || document.querySelector(".ai-core-workspace");
    arrangeAICoreGeneratedNodes(workspace);
    workspace?.classList.remove("open");
    appRoot?.classList.remove("ai-core-workspace-open");
  }

  function arrangeAICoreGeneratedNodes(workspace) {
    if (!workspace?._generatedNodes?.length) return;
    const productNode = findCanvasNodeById?.(workspace.dataset.productNodeId) || getNodeFromId(workspace.dataset.productNodeId);
    if (!productNode) return;
    const bounds = getNodeBounds ? getNodeBounds(productNode) : { x: 0, y: 0, width: 320 };
    const nodes = workspace._generatedNodes.filter((node) => node?.isConnected);
    const cardWidth = Math.max(260, Math.min(360, productNode.offsetWidth || 320));
    nodes.forEach((node, index) => {
      if (!node.classList) return;
      if (productNode._stackChildren) {
        productNode._stackChildren = (productNode._stackChildren || []).filter((child) => child !== node);
      }
      node.classList.remove("stack-member-hidden");
      delete node.dataset.stackParent;
      node.style.left = `${bounds.x + bounds.width + 56 + (index % 2) * (cardWidth + 28)}px`;
      node.style.top = `${bounds.y + Math.floor(index / 2) * 330}px`;
      node.style.width = `${cardWidth}px`;
    });
    if (productNode._stackChildren?.length) {
      renderStackTray?.(productNode);
    } else {
      productNode.classList.remove("has-stack", "stack-expanded");
      productNode.querySelector(":scope > .stack-toggle")?.remove();
      productNode.querySelector(":scope > .stack-tray")?.remove();
    }
    workspace._generatedNodes = [];
  }

  function pulseAICoreOrb() {
    setAICoreState?.("idle");
  }

  return {
    quickSuggestions,
    getQuickCanvasSuggestions: quickSuggestions,
    getAICoreImageData,
    startCanvasAICoreInsight,
    runCanvasInsightAction,
    ensureAICoreWorkspace,
    showAICoreWorkspace,
    hideAICoreWorkspace,
    arrangeAICoreGeneratedNodes,
    normalizeAnalysis,
    prepareCoreAction,
    runWorkspaceDecision,
    bindAICoreWorkspaceEvents,
    refreshAICoreSuggestions,
    refreshFloatingAICoreSuggestions,
    renderAICoreAnalysis,
    analyzeImageForAICore,
    pulseAICoreOrb
  };
}



