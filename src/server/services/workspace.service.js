import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../db/sqlite.js";
import { createHttpError } from "../lib/input-validation.js";

export function ensureUserWorkspace(userId, { name = "" } = {}) {
  return transaction((db) => ensureUserWorkspaceWithDb(db, userId, { name }));
}

export function getUserWorkspace(userId) {
  const row = prepare(`
    SELECT
      w.id AS workspace_id,
      ba.id AS billing_account_id,
      w.owner_user_id,
      w.type,
      w.name
    FROM workspace_memberships wm
    JOIN workspaces w
      ON w.id = wm.workspace_id
      AND w.deleted_at IS NULL
    LEFT JOIN billing_accounts ba
      ON ba.workspace_id = w.id
    WHERE wm.user_id = ?
      AND wm.deleted_at IS NULL
    ORDER BY CASE WHEN w.type = 'personal' THEN 0 ELSE 1 END, wm.created_at ASC
    LIMIT 1;
  `).get(userId);
  if (!row) return null;
  return toWorkspaceScope(row);
}

export function getWorkspaceIdForUser(userId) {
  return ensureUserWorkspace(userId).workspaceId;
}

export function getBillingAccountForUser(userId) {
  return ensureUserWorkspace(userId).billingAccountId;
}

export function ensureUserWorkspaceWithDb(db, userId, { name = "" } = {}) {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) {
    throw createHttpError("User id is required", 400);
  }

  const user = db.prepare(`
    SELECT id, name
    FROM users
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(cleanUserId);
  if (!user) {
    throw createHttpError("User not found", 404);
  }

  const existing = db.prepare(`
    SELECT
      w.id AS workspace_id,
      ba.id AS billing_account_id,
      w.owner_user_id,
      w.type,
      w.name
    FROM workspace_memberships wm
    JOIN workspaces w
      ON w.id = wm.workspace_id
      AND w.deleted_at IS NULL
    LEFT JOIN billing_accounts ba
      ON ba.workspace_id = w.id
    WHERE wm.user_id = ?
      AND wm.deleted_at IS NULL
    ORDER BY CASE WHEN w.type = 'personal' THEN 0 ELSE 1 END, wm.created_at ASC
    LIMIT 1;
  `).get(cleanUserId);

  if (existing) {
    const billingAccountId = existing.billing_account_id
      || createBillingAccount(db, existing.workspace_id, existing.owner_user_id || cleanUserId);
    return toWorkspaceScope({ ...existing, billing_account_id: billingAccountId });
  }

  const now = Date.now();
  const workspaceId = randomUUID();
  const workspaceName = String(name || user.name || "Personal Workspace").trim() || "Personal Workspace";

  db.prepare(`
    INSERT INTO workspaces (
      id, owner_user_id, type, name, created_at, updated_at, deleted_at
    )
    VALUES (?, ?, 'personal', ?, ?, ?, NULL);
  `).run(workspaceId, cleanUserId, workspaceName, now, now);

  db.prepare(`
    INSERT INTO workspace_memberships (
      id, workspace_id, user_id, role, created_at, updated_at, deleted_at
    )
    VALUES (?, ?, ?, 'owner', ?, ?, NULL);
  `).run(randomUUID(), workspaceId, cleanUserId, now, now);

  const billingAccountId = createBillingAccount(db, workspaceId, cleanUserId);
  return {
    workspaceId,
    billingAccountId,
    ownerUserId: cleanUserId,
    type: "personal",
    name: workspaceName
  };
}

function createBillingAccount(db, workspaceId, ownerUserId) {
  const existing = db.prepare(`
    SELECT id
    FROM billing_accounts
    WHERE workspace_id = ?
    LIMIT 1;
  `).get(workspaceId);
  if (existing?.id) return existing.id;

  const now = Date.now();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO billing_accounts (
      id, workspace_id, owner_user_id, balance_credits, reserved_credits, created_at, updated_at
    )
    VALUES (?, ?, ?, 0, 0, ?, ?);
  `).run(id, workspaceId, ownerUserId, now, now);
  return id;
}

function toWorkspaceScope(row) {
  return {
    workspaceId: row.workspace_id,
    billingAccountId: row.billing_account_id || "",
    ownerUserId: row.owner_user_id || "",
    type: row.type || "personal",
    name: row.name || ""
  };
}
