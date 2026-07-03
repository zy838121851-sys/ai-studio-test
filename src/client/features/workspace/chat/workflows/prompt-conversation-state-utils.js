export function getCachedConversationId(conversationIdsByProject, projectId = "") {
  return conversationIdsByProject?.get?.(projectId) || "";
}

export function rememberConversationId(conversationIdsByProject, projectId = "", conversationId = "") {
  if (!projectId || !conversationId || !conversationIdsByProject?.set) return false;
  conversationIdsByProject.set(projectId, conversationId);
  return true;
}

export function forgetConversationId(conversationIdsByProject, projectId = "") {
  if (!projectId || !conversationIdsByProject?.delete) return false;
  return conversationIdsByProject.delete(projectId);
}

export function hasRestoredConversation(restoredConversationProjects, projectId = "") {
  return Boolean(projectId && restoredConversationProjects?.has?.(projectId));
}

export function markConversationRestored(restoredConversationProjects, projectId = "") {
  if (!projectId || !restoredConversationProjects?.add) return false;
  restoredConversationProjects.add(projectId);
  return true;
}

export function markConversationNeedsRestore(restoredConversationProjects, projectId = "") {
  if (!projectId || !restoredConversationProjects?.delete) return false;
  return restoredConversationProjects.delete(projectId);
}
