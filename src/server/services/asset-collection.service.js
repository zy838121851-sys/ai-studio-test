import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../db/sqlite.js";
import { ensureUserWorkspace, ensureUserWorkspaceWithDb } from "./workspace.service.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function publicCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || "",
    assetCount: Number(row.asset_count || 0),
    coverUrl: row.cover_url || "",
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null
  };
}

function collectionSelect() {
  return `
    c.id,
    c.user_id,
    c.name,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(a.id) AS asset_count,
    COALESCE((
      SELECT NULLIF(COALESCE(f.thumbnail_url, f.url, ''), '')
      FROM assets cover
      LEFT JOIN asset_files f
        ON f.id = cover.file_id
      WHERE cover.workspace_id = c.workspace_id
        AND cover.collection_id = c.id
        AND cover.deleted_at IS NULL
        AND cover.library_visible = 1
      ORDER BY cover.updated_at DESC, cover.created_at DESC
      LIMIT 1
    ), '') AS cover_url
  `;
}

export function listAssetCollections(userId) {
  const scope = ensureUserWorkspace(userId);
  return prepare(`
    SELECT ${collectionSelect()}
    FROM asset_collections c
    LEFT JOIN assets a
      ON a.collection_id = c.id
      AND a.workspace_id = c.workspace_id
      AND a.deleted_at IS NULL
      AND a.library_visible = 1
    WHERE c.workspace_id = ?
      AND c.user_id = ?
      AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.created_at ASC, c.updated_at ASC;
  `).all(scope.workspaceId, userId).map(publicCollection);
}

export function getAssetCollection(userId, id) {
  const scope = ensureUserWorkspace(userId);
  return publicCollection(prepare(`
    SELECT ${collectionSelect()}
    FROM asset_collections c
    LEFT JOIN assets a
      ON a.collection_id = c.id
      AND a.workspace_id = c.workspace_id
      AND a.deleted_at IS NULL
      AND a.library_visible = 1
    WHERE c.id = ?
      AND c.workspace_id = ?
      AND c.user_id = ?
      AND c.deleted_at IS NULL
    GROUP BY c.id
    LIMIT 1;
  `).get(id, scope.workspaceId, userId));
}

export function createAssetCollection(userId, input = {}) {
  const name = normalizeText(input.name);
  if (!name) {
    const error = new Error("Collection name is required");
    error.status = 400;
    throw error;
  }
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const now = Date.now();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO asset_collections (
        id, workspace_id, user_id, name, created_at, updated_at, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL);
    `).run(id, scope.workspaceId, userId, name, now, now);
    return getAssetCollection(userId, id);
  });
}

export function updateAssetCollection(userId, id, input = {}) {
  const name = normalizeText(input.name);
  if (!name) {
    const error = new Error("Collection name is required");
    error.status = 400;
    throw error;
  }
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const existing = getAssetCollection(userId, id);
    if (!existing) return null;
    const now = Date.now();
    db.prepare(`
      UPDATE asset_collections
      SET name = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
        AND deleted_at IS NULL;
    `).run(name, now, id, scope.workspaceId, userId);
    return getAssetCollection(userId, id);
  });
}

export function deleteAssetCollection(userId, id) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const existing = getAssetCollection(userId, id);
    if (!existing) return null;
    const now = Date.now();
    db.prepare(`
      UPDATE assets
      SET collection_id = NULL,
          collection = '',
          updated_at = ?
      WHERE workspace_id = ?
        AND user_id = ?
        AND collection_id = ?
        AND deleted_at IS NULL;
    `).run(now, scope.workspaceId, userId, id);

    db.prepare(`
      UPDATE asset_collections
      SET deleted_at = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
        AND deleted_at IS NULL;
    `).run(now, now, id, scope.workspaceId, userId);
    return { ...existing, deletedAt: now, updatedAt: now, assetCount: 0 };
  });
}
