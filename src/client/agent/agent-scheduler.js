export function scheduleAgentRun({
  enabled,
  reason,
  targetNode,
  selectedNode,
  delay,
  previousTimer,
  setState,
  run
}) {
  if (!enabled) return { timer: previousTimer, targetId: "", reason };
  const targetId = targetNode?.dataset?.nodeId || selectedNode?.dataset?.nodeId || "";
  setState?.("sensing");
  window.clearTimeout(previousTimer);
  const timer = window.setTimeout(() => run?.(reason, targetId), delay);
  return { timer, targetId, reason };
}

export async function ensureAgentNodeContext({
  node,
  reason,
  shouldUsePromptContext,
  readAnalysis,
  inferProfile,
  getTitle,
  getImageData,
  analyzeImage,
  normalizeAnalysis,
  writeCache
}) {
  if (!node || node.dataset.kind !== "image") return;
  if (reason === "suggestion_timeout") return;
  if (shouldUsePromptContext?.(node)) return;
  if (readAnalysis?.(node)) return;
  if (node._aiCoreAnalysisPromise) return node._aiCoreAnalysisPromise;

  node.dataset.aiCoreAnalysisStatus = "loading";
  const profile = inferProfile?.(node._sourceFile || { name: getTitle?.(node) }) || {};
  node._aiCoreAnalysisPromise = (async () => {
    try {
      const image = await getImageData?.(node, node._sourceFile);
      if (!image) throw new Error("当前素材无法读取图片内容");
      const result = await analyzeImage?.({
        image,
        title: getTitle?.(node),
        refreshCount: 0
      });
      writeCache?.(node, normalizeAnalysis?.(result?.analysis, profile) || result?.analysis, "vision");
    } catch (error) {
      const fallback = normalizeAnalysis?.({
        ...profile,
        productName: profile.name,
        category: profile.type,
        industry: profile.type,
        workflowIntent: "基于文件信息推荐可用物料",
        sellingPoints: ["视觉模型暂时不可用，先使用本地信息推断。"]
      }, profile);
      writeCache?.(node, fallback, "fallback");
      node.dataset.aiCoreAnalysisStatus = "fallback";
      node.dataset.aiCoreAnalysisError = error.message || "识别失败";
    } finally {
      node._aiCoreAnalysisPromise = null;
    }
  })();
  return node._aiCoreAnalysisPromise;
}
