import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../db/sqlite.js";
import { ensureUserWorkspace, ensureUserWorkspaceWithDb } from "./workspace.service.js";

const MAX_TEXT_LENGTH = 12000;
const MAX_JSON_LENGTH = 240000;

function now() {
  return Date.now();
}

function normalizeText(value = "", maxLength = MAX_TEXT_LENGTH) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function stringifyJson(value, fallback, maxLength = MAX_JSON_LENGTH) {
  let text = "";
  try {
    text = JSON.stringify(value ?? fallback);
  } catch {
    text = JSON.stringify(fallback);
  }
  if (text.length <= maxLength) return text;
  return JSON.stringify({
    truncated: true,
    value: String(text).slice(0, maxLength)
  });
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function toPublicConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.title || "Project chat",
    summary: row.summary || "",
    archived: Boolean(row.deleted_at),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0)
  };
}

function toPublicMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    projectId: row.project_id,
    role: row.role,
    status: row.status || "done",
    content: parseJson(row.content_json, {}),
    attachments: parseJson(row.attachments_json, []),
    toolCalls: parseJson(row.tool_calls_json, []),
    thinkingSteps: parseJson(row.thinking_steps_json, []),
    decisionSummary: row.decision_summary || "",
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    completedAt: row.completed_at ? Number(row.completed_at) : null
  };
}

function userIdFromPrincipal(principal) {
  return typeof principal === "string" ? principal : principal?.userId;
}

export function getConversationProject(principal, projectId) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  return prepare(`
    SELECT
      id,
      owner_user_id AS user_id,
      title,
      prompt,
      thumbnail_url AS thumbnail,
      item_count,
      updated_at,
      deleted_at
    FROM projects
    WHERE id = ?
      AND workspace_id = ?
      AND owner_user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(projectId, scope.workspaceId, userId) || null;
}

export function getOrCreateProjectConversation(principal, projectId, input = {}) {
  const userId = userIdFromPrincipal(principal);
  const cleanProjectId = normalizeText(projectId, 120);
  if (!cleanProjectId) {
    const error = new Error("Missing projectId");
    error.status = 400;
    throw error;
  }

  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const project = getConversationProjectWithDb(db, userId, scope.workspaceId, cleanProjectId);
    if (!project) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    const existing = db.prepare(`
      SELECT *
      FROM chat_conversations
      WHERE workspace_id = ?
        AND user_id = ?
        AND project_id = ?
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    `).get(scope.workspaceId, userId, cleanProjectId);
    if (existing) return toPublicConversation(existing);

    const createdAt = now();
    const id = randomUUID();
    const title = normalizeText(input.title || project.title || "Project chat", 120);
    db.prepare(`
      INSERT INTO chat_conversations (
        id, workspace_id, user_id, project_id, title, summary, created_at, updated_at, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, '', ?, ?, NULL);
    `).run(id, scope.workspaceId, userId, cleanProjectId, title, createdAt, createdAt);

    return toPublicConversation(db.prepare(`
      SELECT *
      FROM chat_conversations
      WHERE id = ?
      LIMIT 1;
    `).get(id));
  });
}

export function archiveProjectConversation(principal, projectId) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  const timestamp = now();
  prepare(`
    UPDATE chat_conversations
    SET deleted_at = ?,
        updated_at = ?
    WHERE workspace_id = ?
      AND user_id = ?
      AND project_id = ?
      AND deleted_at IS NULL;
  `).run(timestamp, timestamp, scope.workspaceId, userId, projectId);
}

export function listProjectConversations(principal, projectId, { limit = 40 } = {}) {
  const userId = userIdFromPrincipal(principal);
  const cleanProjectId = normalizeText(projectId, 120);
  if (!cleanProjectId) {
    const error = new Error("Missing projectId");
    error.status = 400;
    throw error;
  }
  const scope = ensureUserWorkspace(userId);
  const project = getConversationProject(userId, cleanProjectId);
  if (!project) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
  const safeLimit = Math.max(1, Math.min(Number(limit) || 40, 80));
  return prepare(`
    SELECT *
    FROM chat_conversations
    WHERE workspace_id = ?
      AND user_id = ?
      AND project_id = ?
    ORDER BY updated_at DESC
    LIMIT ?;
  `).all(scope.workspaceId, userId, cleanProjectId, safeLimit).map(toPublicConversation);
}

export function getConversationForUser(principal, conversationId) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  return toPublicConversation(prepare(`
    SELECT *
    FROM chat_conversations
    WHERE id = ?
      AND workspace_id = ?
      AND user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(conversationId, scope.workspaceId, userId));
}

export function restoreProjectConversation(principal, conversationId) {
  const userId = userIdFromPrincipal(principal);
  const cleanConversationId = normalizeText(conversationId, 120);
  if (!cleanConversationId) {
    const error = new Error("Missing conversationId");
    error.status = 400;
    throw error;
  }

  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const selected = db.prepare(`
      SELECT *
      FROM chat_conversations
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
      LIMIT 1;
    `).get(cleanConversationId, scope.workspaceId, userId);
    if (!selected) {
      const error = new Error("Conversation not found");
      error.status = 404;
      throw error;
    }
    const project = getConversationProjectWithDb(db, userId, scope.workspaceId, selected.project_id);
    if (!project) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    const timestamp = now();
    if (selected.deleted_at === null || selected.deleted_at === undefined) {
      db.prepare(`
        UPDATE chat_conversations
        SET updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND user_id = ?;
      `).run(timestamp, selected.id, scope.workspaceId, userId);
      return toPublicConversation(db.prepare(`
        SELECT *
        FROM chat_conversations
        WHERE id = ?
        LIMIT 1;
      `).get(selected.id));
    }

    let archiveTimestamp = timestamp;
    while (db.prepare(`
      SELECT 1
      FROM chat_conversations
      WHERE workspace_id = ?
        AND user_id = ?
        AND project_id = ?
        AND deleted_at = ?
      LIMIT 1;
    `).get(scope.workspaceId, userId, selected.project_id, archiveTimestamp)) {
      archiveTimestamp += 1;
    }

    db.prepare(`
      UPDATE chat_conversations
      SET deleted_at = ?,
          updated_at = ?
      WHERE workspace_id = ?
        AND user_id = ?
        AND project_id = ?
        AND deleted_at IS NULL;
    `).run(archiveTimestamp, archiveTimestamp, scope.workspaceId, userId, selected.project_id);

    db.prepare(`
      UPDATE chat_conversations
      SET deleted_at = NULL,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?;
    `).run(timestamp, selected.id, scope.workspaceId, userId);

    return toPublicConversation(db.prepare(`
      SELECT *
      FROM chat_conversations
      WHERE id = ?
      LIMIT 1;
    `).get(selected.id));
  });
}

export function listConversationMessages(principal, conversationId, { limit = 120 } = {}) {
  const userId = userIdFromPrincipal(principal);
  const conversation = getConversationForUser(userId, conversationId);
  if (!conversation) return null;
  const safeLimit = Math.max(1, Math.min(Number(limit) || 120, 200));
  return prepare(`
    SELECT *
    FROM chat_messages
    WHERE conversation_id = ?
      AND user_id = ?
    ORDER BY created_at ASC
    LIMIT ?;
  `).all(conversationId, userId, safeLimit).map(toPublicMessage);
}

export function listRecentConversationMessages(userId, conversationId, { limit = 12 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 40));
  const rows = prepare(`
    SELECT *
    FROM chat_messages
    WHERE conversation_id = ?
      AND user_id = ?
      AND status = 'done'
    ORDER BY created_at DESC
    LIMIT ?;
  `).all(conversationId, userId, safeLimit);
  return rows.reverse().map(toPublicMessage);
}

export function appendConversationMessage({
  conversationId,
  userId,
  projectId,
  role,
  status = "done",
  content = {},
  attachments = [],
  toolCalls = [],
  thinkingSteps = [],
  decisionSummary = "",
  id = randomUUID()
} = {}) {
  const timestamp = now();
  const cleanRole = normalizeText(role, 40);
  if (!["user", "assistant", "system", "tool"].includes(cleanRole)) {
    const error = new Error("Invalid message role");
    error.status = 400;
    throw error;
  }

  return transaction((db) => {
    const conversation = db.prepare(`
      SELECT *
      FROM chat_conversations
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
      LIMIT 1;
    `).get(conversationId, userId);
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.status = 404;
      throw error;
    }

    db.prepare(`
      INSERT INTO chat_messages (
        id, conversation_id, workspace_id, user_id, project_id, role, status,
        content_json, attachments_json, tool_calls_json, thinking_steps_json,
        decision_summary, created_at, updated_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      id,
      conversationId,
      conversation.workspace_id,
      userId,
      projectId || conversation.project_id,
      cleanRole,
      normalizeText(status, 40) || "done",
      stringifyJson(content, {}),
      stringifyJson(attachments, []),
      stringifyJson(toolCalls, []),
      stringifyJson(thinkingSteps, []),
      normalizeText(decisionSummary, 2000),
      timestamp,
      timestamp,
      status === "done" ? timestamp : null
    );
    db.prepare(`
      UPDATE chat_conversations
      SET updated_at = ?
      WHERE id = ?
        AND user_id = ?;
    `).run(timestamp, conversationId, userId);
    return toPublicMessage(db.prepare(`
      SELECT *
      FROM chat_messages
      WHERE id = ?
      LIMIT 1;
    `).get(id));
  });
}

export function completeConversationMessage(userId, messageId, patch = {}) {
  const timestamp = now();
  return transaction((db) => {
    const existing = db.prepare(`
      SELECT *
      FROM chat_messages
      WHERE id = ?
        AND user_id = ?
      LIMIT 1;
    `).get(messageId, userId);
    if (!existing) return null;
    db.prepare(`
      UPDATE chat_messages
      SET status = ?,
          content_json = ?,
          attachments_json = ?,
          tool_calls_json = ?,
          thinking_steps_json = ?,
          decision_summary = ?,
          updated_at = ?,
          completed_at = ?
      WHERE id = ?
        AND user_id = ?;
    `).run(
      normalizeText(patch.status || "done", 40),
      stringifyJson(patch.content ?? parseJson(existing.content_json, {}), {}),
      stringifyJson(patch.attachments ?? parseJson(existing.attachments_json, []), []),
      stringifyJson(patch.toolCalls ?? parseJson(existing.tool_calls_json, []), []),
      stringifyJson(patch.thinkingSteps ?? parseJson(existing.thinking_steps_json, []), []),
      normalizeText(patch.decisionSummary ?? existing.decision_summary, 2000),
      timestamp,
      timestamp,
      messageId,
      userId
    );
    db.prepare(`
      UPDATE chat_conversations
      SET updated_at = ?
      WHERE id = ?
        AND user_id = ?;
    `).run(timestamp, existing.conversation_id, userId);
    return toPublicMessage(db.prepare(`
      SELECT *
      FROM chat_messages
      WHERE id = ?
      LIMIT 1;
    `).get(messageId));
  });
}

export function updateConversationSummary(userId, conversationId, summary = "") {
  const timestamp = now();
  prepare(`
    UPDATE chat_conversations
    SET summary = ?,
        updated_at = ?
    WHERE id = ?
      AND user_id = ?
      AND deleted_at IS NULL;
  `).run(normalizeText(summary, 4000), timestamp, conversationId, userId);
  return getConversationForUser(userId, conversationId);
}

function getConversationProjectWithDb(db, userId, workspaceId, projectId) {
  return db.prepare(`
    SELECT
      id,
      owner_user_id AS user_id,
      title,
      prompt,
      thumbnail_url AS thumbnail,
      item_count,
      updated_at,
      deleted_at
    FROM projects
    WHERE id = ?
      AND workspace_id = ?
      AND owner_user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(projectId, workspaceId, userId) || null;
}
