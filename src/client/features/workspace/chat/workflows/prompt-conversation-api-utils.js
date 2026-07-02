export async function requestConversation(projectId, { reset = false } = {}) {
  const cleanProjectId = String(projectId || "").trim();
  if (!cleanProjectId) throw new Error("Missing active project");
  const response = await fetch("/api/conversations", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: cleanProjectId, reset })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || `Conversation request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const conversation = payload.conversation;
  if (!conversation?.id) throw new Error("Conversation response did not include an id");
  return conversation;
}

export async function fetchConversationMessages(conversationId) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation restore failed: ${response.status}`);
  return Array.isArray(payload.messages) ? payload.messages : [];
}

export async function listProjectConversations(projectId) {
  const response = await fetch(`/api/conversations?projectId=${encodeURIComponent(projectId)}`, {
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation history failed: ${response.status}`);
  return Array.isArray(payload.conversations) ? payload.conversations : [];
}

export async function requestConversationRestore(conversationId) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/restore`, {
    method: "POST",
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation restore failed: ${response.status}`);
  const conversation = payload.conversation;
  if (!conversation?.id) throw new Error("Conversation restore did not include an id");
  return conversation;
}
