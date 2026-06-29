import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../db/sqlite.js";
import { countSnapshotNodes, sanitizeCanvasSnapshotJson } from "./snapshot-safety.service.js";
import { ensureUserWorkspace, ensureUserWorkspaceWithDb } from "./workspace.service.js";

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
    userId: row.owner_user_id || row.user_id,
    title: row.title || "Fresh Ideas",
    prompt: row.prompt || "",
    thumbnail: normalizeProjectThumbnail(row.thumbnail_url || row.thumbnail),
    itemCount: Number(row.item_count || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    lastOpenedAt: row.last_opened_at ? Number(row.last_opened_at) : null,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null
  };
  if (includeSnapshot) {
    project.canvasSnapshotJson = row.snapshot_json || "";
  }
  return project;
}

function projectSelect(includeSnapshot = false) {
  return `
    p.id,
    p.owner_user_id,
    p.title,
    p.prompt,
    p.thumbnail_url,
    p.item_count,
    ${includeSnapshot ? "s.snapshot_json," : ""}
    p.created_at,
    p.updated_at,
    p.last_opened_at,
    p.deleted_at
  `;
}

export function listProjects(userId) {
  const scope = ensureUserWorkspace(userId);
  return prepare(`
    SELECT ${projectSelect(false)}
    FROM projects p
    WHERE p.workspace_id = ?
      AND p.owner_user_id = ?
      AND p.deleted_at IS NULL
    ORDER BY COALESCE(p.last_opened_at, p.updated_at) DESC, p.updated_at DESC;
  `).all(scope.workspaceId, userId).map((row) => publicProject(row));
}

export function getProject(userId, id, { touchLastOpened = false } = {}) {
  const scope = ensureUserWorkspace(userId);
  const now = Date.now();
  if (touchLastOpened) {
    prepare(`
      UPDATE projects
      SET last_opened_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND owner_user_id = ?
        AND deleted_at IS NULL;
    `).run(now, id, scope.workspaceId, userId);
  }
  return publicProject(readProject(userId, id, scope.workspaceId), { includeSnapshot: true });
}

export function createProject(userId, input = {}) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const now = Date.now();
    const project = {
      id: ensureProjectId(input.id),
      userId,
      workspaceId: scope.workspaceId,
      title: normalizeTitle(input.title),
      prompt: normalizeText(input.prompt),
      thumbnail: normalizeProjectThumbnail(input.thumbnail),
      itemCount: normalizeItemCount(input.itemCount),
      canvasSnapshotJson: input.canvasSnapshotJson === undefined
        ? ""
        : sanitizeCanvasSnapshotJson(input.canvasSnapshotJson),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    };

    db.prepare(`
      INSERT INTO projects (
        id, workspace_id, owner_user_id, title, prompt, thumbnail_url,
        item_count, current_snapshot_id, created_at, updated_at,
        last_opened_at, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL);
    `).run(
      project.id,
      project.workspaceId,
      project.userId,
      project.title,
      project.prompt,
      project.thumbnail,
      project.itemCount,
      project.createdAt,
      project.updatedAt,
      project.lastOpenedAt
    );

    if (project.canvasSnapshotJson) {
      const snapshotId = insertProjectSnapshot(db, {
        projectId: project.id,
        workspaceId: project.workspaceId,
        userId,
        snapshotJson: project.canvasSnapshotJson,
        createdAt: now
      });
      db.prepare("UPDATE projects SET current_snapshot_id = ? WHERE id = ?;").run(snapshotId, project.id);
    }

    return publicProject(readProjectWithDb(db, userId, project.id, project.workspaceId), { includeSnapshot: true });
  });
}

export function updateProject(userId, id, input = {}) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const existing = publicProject(readProjectWithDb(db, userId, id, scope.workspaceId), { includeSnapshot: true });
    if (!existing) return null;

    const now = Date.now();
    const next = {
      title: input.title === undefined ? existing.title : normalizeTitle(input.title),
      prompt: input.prompt === undefined ? existing.prompt : normalizeText(input.prompt),
      thumbnail: input.thumbnail === undefined ? existing.thumbnail : normalizeProjectThumbnail(input.thumbnail),
      itemCount: input.itemCount === undefined ? existing.itemCount : normalizeItemCount(input.itemCount)
    };

    let snapshotId = undefined;
    if (input.canvasSnapshotJson !== undefined) {
      const snapshotJson = sanitizeCanvasSnapshotJson(input.canvasSnapshotJson);
      snapshotId = snapshotJson
        ? insertProjectSnapshot(db, {
          projectId: id,
          workspaceId: scope.workspaceId,
          userId,
          snapshotJson,
          createdAt: now
        })
        : null;
    }

    db.prepare(`
      UPDATE projects
      SET title = ?,
          prompt = ?,
          thumbnail_url = ?,
          item_count = ?,
          current_snapshot_id = COALESCE(?, current_snapshot_id),
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND owner_user_id = ?
        AND deleted_at IS NULL;
    `).run(
      next.title,
      next.prompt,
      next.thumbnail,
      next.itemCount,
      snapshotId === undefined ? null : snapshotId,
      now,
      id,
      scope.workspaceId,
      userId
    );
    if (snapshotId === null) {
      db.prepare(`
        UPDATE projects
        SET current_snapshot_id = NULL
        WHERE id = ?
          AND workspace_id = ?
          AND owner_user_id = ?;
      `).run(id, scope.workspaceId, userId);
    }

    return publicProject(readProjectWithDb(db, userId, id, scope.workspaceId), { includeSnapshot: true });
  });
}

export function saveProjectCanvas(userId, id, input = {}) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const existing = publicProject(readProjectWithDb(db, userId, id, scope.workspaceId), { includeSnapshot: true });
    if (!existing) return null;

    const now = Date.now();
    const title = input.title === undefined ? existing.title : normalizeTitle(input.title);
    const thumbnail = input.thumbnail === undefined ? existing.thumbnail : normalizeProjectThumbnail(input.thumbnail);
    const prompt = input.prompt === undefined ? existing.prompt : normalizeText(input.prompt);
    const itemCount = input.itemCount === undefined ? existing.itemCount : normalizeItemCount(input.itemCount);
    const canvasSnapshotJson = sanitizeCanvasSnapshotJson(input.canvasSnapshotJson);
    const snapshotId = canvasSnapshotJson
      ? insertProjectSnapshot(db, {
        projectId: id,
        workspaceId: scope.workspaceId,
        userId,
        snapshotJson: canvasSnapshotJson,
        createdAt: now
      })
      : null;

    db.prepare(`
      UPDATE projects
      SET title = ?,
          prompt = ?,
          thumbnail_url = ?,
          item_count = ?,
          current_snapshot_id = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND owner_user_id = ?
        AND deleted_at IS NULL;
    `).run(title, prompt, thumbnail, itemCount, snapshotId, now, id, scope.workspaceId, userId);

    return publicProject(readProjectWithDb(db, userId, id, scope.workspaceId), { includeSnapshot: true });
  });
}

export function softDeleteProject(userId, id) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const existing = publicProject(readProjectWithDb(db, userId, id, scope.workspaceId), { includeSnapshot: true });
    if (!existing) return null;
    const now = Date.now();
    db.prepare(`
      UPDATE projects
      SET deleted_at = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND owner_user_id = ?
        AND deleted_at IS NULL;
    `).run(now, now, id, scope.workspaceId, userId);
    return { ...existing, deletedAt: now, updatedAt: now };
  });
}

function readProject(userId, id, workspaceId) {
  return prepare(readProjectSql()).get(id, workspaceId, userId);
}

function readProjectWithDb(db, userId, id, workspaceId) {
  return db.prepare(readProjectSql()).get(id, workspaceId, userId);
}

function readProjectSql() {
  return `
    SELECT ${projectSelect(true)}
    FROM projects p
    LEFT JOIN project_snapshots s
      ON s.id = p.current_snapshot_id
    WHERE p.id = ?
      AND p.workspace_id = ?
      AND p.owner_user_id = ?
      AND p.deleted_at IS NULL
    LIMIT 1;
  `;
}

function insertProjectSnapshot(db, { projectId, workspaceId, userId, snapshotJson, createdAt }) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO project_snapshots (
      id, project_id, workspace_id, schema_version, snapshot_json,
      node_count, created_by_user_id, created_at
    )
    VALUES (?, ?, ?, 1, ?, ?, ?, ?);
  `).run(
    id,
    projectId,
    workspaceId,
    snapshotJson,
    countSnapshotNodes(snapshotJson),
    userId,
    createdAt || Date.now()
  );
  return id;
}
