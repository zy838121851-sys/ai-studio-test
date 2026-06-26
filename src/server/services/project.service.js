import { randomUUID } from "node:crypto";
import { execute, query, queryOne, sqlValue } from "../db/sqlite.js";

function normalizeTitle(title) {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  return clean || "Fresh Ideas";
}

function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeProjectThumbnail(value) {
  const clean = normalizeText(value);
  if (!clean) return "";
  const match = clean.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/[^?#]+)(?:[?#].*)?$/i);
  if (match) return match[1];
  return clean;
}

function normalizeItemCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function ensureProjectId(id) {
  const clean = String(id || "").trim();
  return clean || randomUUID();
}

function publicProject(row, { includeSnapshot = false } = {}) {
  if (!row) return null;
  const project = {
    id: row.id,
    userId: row.user_id,
    title: row.title || "Fresh Ideas",
    prompt: row.prompt || "",
    thumbnail: normalizeProjectThumbnail(row.thumbnail),
    itemCount: Number(row.item_count || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    lastOpenedAt: row.last_opened_at ? Number(row.last_opened_at) : null,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null
  };
  if (includeSnapshot) {
    project.canvasSnapshotJson = row.canvas_snapshot_json || "";
  }
  return project;
}

function projectSelect(includeSnapshot = false) {
  return `
    id,
    user_id,
    title,
    prompt,
    thumbnail,
    item_count,
    ${includeSnapshot ? "canvas_snapshot_json," : ""}
    created_at,
    updated_at,
    last_opened_at,
    deleted_at
  `;
}

export function listProjects(userId) {
  return query(`
    SELECT ${projectSelect(false)}
    FROM projects
    WHERE user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL
    ORDER BY COALESCE(last_opened_at, updated_at) DESC, updated_at DESC;
  `).map((row) => publicProject(row));
}

export function getProject(userId, id, { touchLastOpened = false } = {}) {
  const now = Date.now();
  if (touchLastOpened) {
    execute(`
      UPDATE projects
      SET last_opened_at = ${now}
      WHERE id = ${sqlValue(id)}
        AND user_id = ${sqlValue(userId)}
        AND deleted_at IS NULL;
    `);
  }

  return publicProject(queryOne(`
    SELECT ${projectSelect(true)}
    FROM projects
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL
    LIMIT 1;
  `), { includeSnapshot: true });
}

export function createProject(userId, input = {}) {
  const now = Date.now();
  const project = {
    id: ensureProjectId(input.id),
    userId,
    title: normalizeTitle(input.title),
    prompt: normalizeText(input.prompt),
    thumbnail: normalizeProjectThumbnail(input.thumbnail),
    itemCount: normalizeItemCount(input.itemCount),
    canvasSnapshotJson: normalizeText(input.canvasSnapshotJson),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  };

  execute(`
    INSERT INTO projects (
      id,
      user_id,
      title,
      prompt,
      thumbnail,
      item_count,
      canvas_snapshot_json,
      created_at,
      updated_at,
      last_opened_at,
      deleted_at
    )
    VALUES (
      ${sqlValue(project.id)},
      ${sqlValue(project.userId)},
      ${sqlValue(project.title)},
      ${sqlValue(project.prompt)},
      ${sqlValue(project.thumbnail)},
      ${project.itemCount},
      ${sqlValue(project.canvasSnapshotJson)},
      ${project.createdAt},
      ${project.updatedAt},
      ${project.lastOpenedAt},
      NULL
    );
  `);

  return project;
}

export function updateProject(userId, id, input = {}) {
  const existing = getProject(userId, id);
  if (!existing) return null;

  const next = {
    title: input.title === undefined ? existing.title : normalizeTitle(input.title),
    prompt: input.prompt === undefined ? existing.prompt : normalizeText(input.prompt),
    thumbnail: input.thumbnail === undefined ? existing.thumbnail : normalizeProjectThumbnail(input.thumbnail),
    itemCount: input.itemCount === undefined ? existing.itemCount : normalizeItemCount(input.itemCount),
    canvasSnapshotJson: input.canvasSnapshotJson === undefined
      ? existing.canvasSnapshotJson
      : normalizeText(input.canvasSnapshotJson),
    updatedAt: Date.now()
  };

  execute(`
    UPDATE projects
    SET title = ${sqlValue(next.title)},
        prompt = ${sqlValue(next.prompt)},
        thumbnail = ${sqlValue(next.thumbnail)},
        item_count = ${next.itemCount},
        canvas_snapshot_json = ${sqlValue(next.canvasSnapshotJson)},
        updated_at = ${next.updatedAt}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);

  return getProject(userId, id);
}

export function saveProjectCanvas(userId, id, input = {}) {
  const existing = getProject(userId, id);
  if (!existing) return null;

  const now = Date.now();
  const title = input.title === undefined ? existing.title : normalizeTitle(input.title);
  const thumbnail = input.thumbnail === undefined ? existing.thumbnail : normalizeProjectThumbnail(input.thumbnail);
  const prompt = input.prompt === undefined ? existing.prompt : normalizeText(input.prompt);
  const itemCount = input.itemCount === undefined ? existing.itemCount : normalizeItemCount(input.itemCount);
  const canvasSnapshotJson = normalizeText(input.canvasSnapshotJson);

  execute(`
    UPDATE projects
    SET title = ${sqlValue(title)},
        prompt = ${sqlValue(prompt)},
        thumbnail = ${sqlValue(thumbnail)},
        item_count = ${itemCount},
        canvas_snapshot_json = ${sqlValue(canvasSnapshotJson)},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);

  return getProject(userId, id);
}

export function softDeleteProject(userId, id) {
  const existing = getProject(userId, id);
  if (!existing) return null;
  const now = Date.now();
  execute(`
    UPDATE projects
    SET deleted_at = ${now},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);
  return { ...existing, deletedAt: now, updatedAt: now };
}
