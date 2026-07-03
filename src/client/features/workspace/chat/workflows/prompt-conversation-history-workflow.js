import {
  closeConversationHistoryPopover,
  clearConversationChatLog,
  ensureConversationHistoryPopover,
  positionConversationHistoryPopover
} from "./prompt-conversation-dom-utils.js";
import {
  fetchConversationMessages,
  listProjectConversations,
  requestConversationRestore
} from "./prompt-conversation-api-utils.js";
import {
  getConversationRestoreEntries,
  renderConversationHistoryListHtml,
  renderConversationHistoryMessageHtml
} from "./prompt-conversation-format-utils.js";
import {
  getCachedConversationId,
  hasRestoredConversation,
  markConversationNeedsRestore,
  markConversationRestored,
  rememberConversationId
} from "./prompt-conversation-state-utils.js";

export async function restoreProjectConversation({
  projectId,
  conversationId = "",
  addChat,
  addChatImage,
  force = false,
  ensureConversation,
  restoredConversationProjects
} = {}) {
  const cleanProjectId = String(projectId || "").trim();
  if (!cleanProjectId || (!force && hasRestoredConversation(restoredConversationProjects, cleanProjectId))) return;
  const conversation = conversationId
    ? { id: String(conversationId || "").trim(), projectId: cleanProjectId }
    : await ensureConversation(cleanProjectId);
  if (!conversation.id) return;
  const messages = await fetchConversationMessages(conversation.id);
  markConversationRestored(restoredConversationProjects, cleanProjectId);
  getConversationRestoreEntries(messages).forEach((entry) => {
    if (entry.type === "image") {
      addChatImage(entry.role, entry.url, entry.caption);
      return;
    }
    if (entry.type === "message") addChat(entry.role, entry.text);
  });
}

export function bindConversationControls({
  getProjectId,
  addChat,
  addChatImage,
  ensureConversation,
  conversationIdsByProject,
  restoredConversationProjects,
  abortCurrentConversation = () => {},
  root = globalThis.document,
  logger = console
} = {}) {
  const newButton = root?.querySelector?.("#newConversation");
  const historyButton = root?.querySelector?.("#conversationHistory");

  newButton?.addEventListener?.("click", async () => {
    const projectId = getProjectId?.();
    if (!projectId) return;
    closeConversationHistoryPopover(root);
    abortCurrentConversation();
    try {
      const conversation = await ensureConversation(projectId, { reset: true });
      rememberConversationId(conversationIdsByProject, projectId, conversation.id);
      markConversationNeedsRestore(restoredConversationProjects, projectId);
      clearConversationChatLog(root);
    } catch (error) {
      logger?.warn?.("[conversation] Failed to create a new conversation", error);
    }
  });

  historyButton?.addEventListener?.("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const projectId = getProjectId?.();
    if (!projectId) {
      showConversationHistoryMessage(historyButton, "暂无当前项目", { root });
      return;
    }
    await toggleConversationHistoryPopover({
      button: historyButton,
      projectId,
      addChat,
      addChatImage,
      ensureConversation,
      conversationIdsByProject,
      restoredConversationProjects,
      root
    });
  });
}

export function showConversationHistoryMessage(button, message, { root = globalThis.document } = {}) {
  const popover = ensureConversationHistoryPopover({ root });
  popover.hidden = false;
  positionConversationHistoryPopover(button, popover);
  popover.innerHTML = renderConversationHistoryMessageHtml(message);
}

export async function toggleConversationHistoryPopover({
  button,
  projectId,
  addChat,
  addChatImage,
  ensureConversation,
  conversationIdsByProject,
  restoredConversationProjects,
  root = globalThis.document
} = {}) {
  const popover = ensureConversationHistoryPopover({ root });
  if (!popover.hidden) {
    closeConversationHistoryPopover(root);
    return;
  }
  popover.hidden = false;
  positionConversationHistoryPopover(button, popover);
  popover.innerHTML = renderConversationHistoryMessageHtml("正在加载...");
  try {
    const conversations = await listProjectConversations(projectId);
    renderConversationHistoryPopover(popover, {
      projectId,
      conversations,
      addChat,
      addChatImage,
      ensureConversation,
      conversationIdsByProject,
      restoredConversationProjects,
      root
    });
    positionConversationHistoryPopover(button, popover);
  } catch (error) {
    popover.innerHTML = renderConversationHistoryMessageHtml(error.message || "加载失败");
  }
}

export function renderConversationHistoryPopover(popover, {
  projectId,
  conversations,
  addChat,
  addChatImage,
  ensureConversation,
  conversationIdsByProject,
  restoredConversationProjects,
  root = globalThis.document
} = {}) {
  const cleanProjectId = String(projectId || "").trim();
  const currentId = getCachedConversationId(conversationIdsByProject, cleanProjectId);
  if (!conversations.length) {
    popover.innerHTML = renderConversationHistoryMessageHtml("暂无历史对话");
    return;
  }
  popover.innerHTML = renderConversationHistoryListHtml(conversations, currentId);
  popover.querySelectorAll("[data-conversation-id]").forEach((item) => {
    item.addEventListener("click", async () => {
      const conversationId = item.dataset.conversationId || "";
      if (!conversationId) return;
      await restoreConversationFromHistory({
        projectId: cleanProjectId,
        conversationId,
        addChat,
        addChatImage,
        ensureConversation,
        conversationIdsByProject,
        restoredConversationProjects
      });
      closeConversationHistoryPopover(root);
    });
  });
}

export async function restoreConversationFromHistory({
  projectId,
  conversationId,
  addChat,
  addChatImage,
  ensureConversation,
  conversationIdsByProject,
  restoredConversationProjects
} = {}) {
  const conversation = await requestConversationRestore(conversationId);
  rememberConversationId(conversationIdsByProject, projectId, conversation.id);
  markConversationNeedsRestore(restoredConversationProjects, projectId);
  clearConversationChatLog();
  await restoreProjectConversation({
    projectId,
    conversationId: conversation.id,
    addChat,
    addChatImage,
    force: true,
    ensureConversation,
    restoredConversationProjects
  });
}
