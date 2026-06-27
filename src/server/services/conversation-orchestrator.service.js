import {
  analyzeImage,
  generateSuggestions
} from "./ai.service.js";
import {
  appendConversationMessage,
  completeConversationMessage,
  getConversationForUser,
  listRecentConversationMessages,
  updateConversationSummary
} from "./conversation.service.js";

const THINKING_STEPS = [
  { key: "context", label: "读取上下文" },
  { key: "references", label: "分析引用" },
  { key: "intent", label: "判断意图" },
  { key: "tool", label: "执行工具" },
  { key: "final", label: "整理结果" }
];

const GENERATE_RE = /(生成|画|绘制|做一张|做个|出图|主图|海报|banner|poster|render|image|generate|create|design)/i;
const EDIT_RE = /(修改|改成|调整|替换|去掉|扩图|放大|upscale|edit|change|remove|replace)/i;
const QUESTION_RE = /(怎么|如何|为什么|是否|可以吗|分析|解释|建议|what|why|how|\?|\？)/i;

function normalizeText(value = "", maxLength = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function compactJson(value, maxLength = 9000) {
  const text = JSON.stringify(value || {});
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

function parseJsonValue(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] || text).trim();
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  const candidates = [
    source,
    objectStart !== -1 && objectEnd > objectStart ? source.slice(objectStart, objectEnd + 1) : ""
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next fragment.
    }
  }
  return null;
}

function classifyIntent({ text = "", mode = "auto", attachments = [], canvasContext = {} } = {}) {
  const clean = normalizeText(text);
  const explicitMode = String(mode || "auto").toLowerCase();
  if (explicitMode === "generate") return "generate_image";
  if (explicitMode === "chat") return "answer";
  if (explicitMode === "edit") return "edit_image";

  const hasReferences = attachments.length > 0
    || Boolean(canvasContext?.selected?.length)
    || Boolean(canvasContext?.target);
  const wantsGeneration = GENERATE_RE.test(clean);
  const wantsEdit = EDIT_RE.test(clean) && hasReferences;
  const asksQuestion = QUESTION_RE.test(clean);

  if (wantsEdit) return "edit_image";
  if (wantsGeneration && (!asksQuestion || /生成|出图|主图|海报|poster|generate|create/i.test(clean))) {
    return "generate_image";
  }
  if (!clean && hasReferences) return "analyze_image";
  return "answer";
}

function summarizeDecision({ intent, text, attachments = [], canvasContext = {} } = {}) {
  const nodeCount = Array.isArray(canvasContext?.nodes) ? canvasContext.nodes.length : 0;
  const selectedCount = Array.isArray(canvasContext?.selected) ? canvasContext.selected.length : 0;
  if (intent === "generate_image") {
    return `我会结合当前项目上下文${selectedCount ? `、${selectedCount} 个选中素材` : ""}${attachments.length ? `和 ${attachments.length} 张参考图` : ""}，先整理需求，再进入图片生成。`;
  }
  if (intent === "edit_image") {
    return `我会优先使用当前选中或引用的图片作为编辑对象，并把你的修改要求整理成可执行的图像任务。`;
  }
  if (intent === "analyze_image") {
    return `我会先读取引用图片和画布信息，提炼内容、风格和适合作为后续生成参考的要点。`;
  }
  return `我会根据当前项目对话历史${nodeCount ? `和画布上的 ${nodeCount} 个素材` : ""}直接回答，不触发图片生成。`;
}

function buildAnswerPrompt({ conversation, recentMessages, text, canvasContext, attachments, imageAnalysis = null } = {}) {
  return [
    "You are the conversational design assistant inside AI Studio.",
    "Answer in Chinese unless the user clearly asks otherwise.",
    "Use the current project context and recent conversation. Be concise, practical, and specific.",
    "Do not claim that you generated an image unless a generation tool actually ran.",
    "",
    `Conversation summary: ${conversation?.summary || "(none)"}`,
    `Recent messages: ${compactJson(recentMessages.map((message) => ({
      role: message.role,
      text: message.content?.text || "",
      decisionSummary: message.decisionSummary || ""
    })), 6000)}`,
    `Canvas context: ${compactJson(canvasContext, 7000)}`,
    attachments.length ? `Attachments: ${compactJson(attachments.map((item) => ({
      type: item.type || "image",
      name: item.name || "",
      source: item.source || ""
    })), 2000)}` : "",
    imageAnalysis ? `Image analysis: ${compactJson(imageAnalysis, 5000)}` : "",
    "",
    `User request: ${text || "(no text)"}`
  ].filter(Boolean).join("\n");
}

function getFirstImageAttachment(attachments = []) {
  return attachments.find((item) => String(item?.type || "image").startsWith("image") && item.dataUrl)
    || attachments.find((item) => item.dataUrl)
    || null;
}

function appendThinkingStatus(steps, key, status, detail = "") {
  const next = steps.map((step) => step.key === key ? { ...step, status, detail } : step);
  return next;
}

export async function runConversationTurn({
  userId,
  conversationId,
  text = "",
  model = "",
  mode = "auto",
  attachments = [],
  canvasContext = {},
  emit = () => {}
} = {}) {
  const conversation = getConversationForUser(userId, conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }
  const cleanText = normalizeText(text);
  const cleanAttachments = Array.isArray(attachments) ? attachments.slice(0, 8) : [];
  const cleanCanvasContext = canvasContext && typeof canvasContext === "object" ? canvasContext : {};
  if (!cleanText && !cleanAttachments.length && !Object.keys(cleanCanvasContext).length) {
    const error = new Error("Missing text or context");
    error.status = 400;
    throw error;
  }

  const userMessage = appendConversationMessage({
    conversationId,
    userId,
    projectId: conversation.projectId,
    role: "user",
    content: { text: cleanText },
    attachments: cleanAttachments.map((item) => ({
      type: item.type || "image",
      name: item.name || "",
      source: item.source || "upload"
    }))
  });
  const assistantMessage = appendConversationMessage({
    conversationId,
    userId,
    projectId: conversation.projectId,
    role: "assistant",
    status: "running",
    content: { text: "" },
    thinkingSteps: THINKING_STEPS
  });

  emit({
    type: "run.started",
    conversation,
    userMessage,
    assistantMessage
  });

  let thinkingSteps = THINKING_STEPS.map((step, index) => ({
    ...step,
    status: index === 0 ? "active" : "pending",
    detail: ""
  }));
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const recentMessages = listRecentConversationMessages(userId, conversationId, { limit: 12 });
  thinkingSteps = appendThinkingStatus(thinkingSteps, "context", "done", "已读取当前项目会话和画布摘要");
  thinkingSteps = appendThinkingStatus(thinkingSteps, "references", cleanAttachments.length ? "active" : "done", cleanAttachments.length ? "正在检查引用素材" : "没有新的上传引用");
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const intent = classifyIntent({
    text: cleanText,
    mode,
    attachments: cleanAttachments,
    canvasContext: cleanCanvasContext
  });
  let imageAnalysis = null;
  const firstImage = getFirstImageAttachment(cleanAttachments);
  if ((intent === "analyze_image" || intent === "answer") && firstImage?.dataUrl) {
    emit({ type: "tool.call", messageId: assistantMessage.id, toolCall: { name: "analyze_image", status: "running" } });
    try {
      const result = await analyzeImage({
        image: firstImage.dataUrl,
        title: firstImage.name || "Reference image"
      });
      imageAnalysis = result.analysis || result.text || null;
      emit({
        type: "tool.result",
        messageId: assistantMessage.id,
        toolCall: { name: "analyze_image", status: "done" },
        result: { analysis: imageAnalysis, providerCalls: result.providerCalls || [] }
      });
    } catch (error) {
      emit({
        type: "tool.result",
        messageId: assistantMessage.id,
        toolCall: { name: "analyze_image", status: "failed" },
        error: error.message
      });
    }
  }

  thinkingSteps = appendThinkingStatus(thinkingSteps, "references", "done", imageAnalysis ? "已分析引用图片" : "已整理引用信息");
  thinkingSteps = appendThinkingStatus(thinkingSteps, "intent", "done", intent);
  thinkingSteps = appendThinkingStatus(thinkingSteps, "tool", intent === "answer" ? "done" : "active", "");
  const decisionSummary = summarizeDecision({
    intent,
    text: cleanText,
    attachments: cleanAttachments,
    canvasContext: cleanCanvasContext
  });
  emit({ type: "thinking.summary", messageId: assistantMessage.id, summary: decisionSummary });
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const toolCalls = [];
  let assistantText = "";

  if (intent === "generate_image" || intent === "edit_image") {
    const toolName = intent === "edit_image" ? "edit_image" : "generate_image";
    const prompt = cleanText || "根据当前引用素材生成一张高质量视觉图";
    const toolCall = {
      name: toolName,
      status: "ready",
      arguments: {
        prompt,
        model,
        mode: intent,
        referenceCount: cleanAttachments.length
      }
    };
    toolCalls.push(toolCall);
    emit({ type: "tool.call", messageId: assistantMessage.id, toolCall });
    assistantText = intent === "edit_image"
      ? "我已整理好编辑任务，接下来会基于当前引用图片生成修改结果。"
      : "我已整理好生成任务，接下来会根据你的需求生成图片。";
    emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
  } else {
    const prompt = buildAnswerPrompt({
      conversation,
      recentMessages,
      text: cleanText,
      canvasContext: cleanCanvasContext,
      attachments: cleanAttachments,
      imageAnalysis
    });
    const result = await generateSuggestions({ prompt });
    const parsed = parseJsonValue(result.text);
    assistantText = normalizeText(parsed?.answer || parsed?.text || result.text || "我已经看完当前上下文。");
    emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
    if (result.providerCalls?.length) {
      toolCalls.push({
        name: "generate_text",
        status: "done",
        providerCalls: result.providerCalls
      });
    }
  }

  thinkingSteps = appendThinkingStatus(thinkingSteps, "tool", "done", toolCalls[0]?.name || "text_answer");
  thinkingSteps = appendThinkingStatus(thinkingSteps, "final", "done", "已完成");
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const completed = completeConversationMessage(userId, assistantMessage.id, {
    status: "done",
    content: {
      text: assistantText,
      intent
    },
    attachments: [],
    toolCalls,
    thinkingSteps,
    decisionSummary
  });

  if (recentMessages.length >= 18) {
    updateConversationSummary(userId, conversationId, buildRollingSummary(conversation.summary, recentMessages));
  }

  emit({
    type: "message.done",
    conversationId,
    message: completed,
    intent,
    toolCalls
  });
  return completed;
}

function buildRollingSummary(existing = "", messages = []) {
  const source = messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content?.text || message.decisionSummary || ""}`)
    .filter(Boolean)
    .join(" / ");
  return normalizeText([existing, source].filter(Boolean).join(" | "), 4000);
}
