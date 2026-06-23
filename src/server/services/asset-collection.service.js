import { randomUUID } from "node:crypto";
import { execute, query, queryOne, sqlValue } from "../db/sqlite.js";

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
      SELECT NULLIF(COALESCE(cover.thumbnail_url, cover.url, ''), '')
      FROM assets cover
      WHERE cover.user_id = c.user_id
        AND cover.collection_id = c.id
        AND cover.deleted_at IS NULL
      ORDER BY cover.updated_at DESC, cover.created_at DESC
      LIMIT 1
    ), '') AS cover_url
  `;
}

export function listAssetCollections(userId) {
  return query(`
    SELECT ${collectionSelect()}
    FROM asset_collections c
    LEFT JOIN assets a
      ON a.collection_id = c.id
      AND a.user_id = c.user_id
      AND a.deleted_at IS NULL
    WHERE c.user_id = ${sqlValue(userId)}
      AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.created_at ASC, c.updated_at ASC;
  `).map(publicCollection);
}

export function getAssetCollection(userId, id) {
  return publicCollection(queryOne(`
    SELECT ${collectionSelect()}
    FROM asset_collections c
    LEFT JOIN assets a
      ON a.collection_id = c.id
      AND a.user_id = c.user_id
      AND a.deleted_at IS NULL
    WHERE c.id = ${sqlValue(id)}
      AND c.user_id = ${sqlValue(userId)}
      AND c.deleted_at IS NULL
    GROUP BY c.id
    LIMIT 1;
  `));
}

export function createAssetCollection(userId, input = {}) {
  const name = normalizeText(input.name);
  if (!name) {
    const error = new Error("Collection name is required");
    error.status = 400;
    throw error;
  }
  const now = Date.now();
  const id = randomUUID();
  execute(`
    INSERT INTO asset_collections (
      id,
      user_id,
      name,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (
      ${sqlValue(id)},
      ${sqlValue(userId)},
      ${sqlValue(name)},
      ${now},
      ${now},
      NULL
    );
  `);
  return getAssetCollection(userId, id);
}

export function updateAssetCollection(userId, id, input = {}) {
  const existing = getAssetCollection(userId, id);
  if (!existing) return null;
  const name = normalizeText(input.name);
  if (!name) {
    const error = new Error("Collection name is required");
    error.status = 400;
    throw error;
  }
  const now = Date.now();
  execute(`
    UPDATE asset_collections
    SET name = ${sqlValue(name)},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);
  return getAssetCollection(userId, id);
}

export function deleteAssetCollection(userId, id) {
  const existing = getAssetCollection(userId, id);
  if (!existing) return null;
  const now = Date.now();
  execute(`
    UPDATE assets
    SET collection_id = NULL,
        collection = '',
        updated_at = ${now}
    WHERE user_id = ${sqlValue(userId)}
      AND collection_id = ${sqlValue(id)}
      AND deleted_at IS NULL;

    UPDATE asset_collections
    SET deleted_at = ${now},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);
  return { ...existing, deletedAt: now, updatedAt: now, assetCount: 0 };
}
