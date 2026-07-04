import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { env } from "../config/env.js";
import { prepare, transaction } from "../db/sqlite.js";
import { createHttpError, normalizeText } from "../lib/input-validation.js";
import { getAssetCollection } from "./asset-collection.service.js";
import { getProject } from "./project.service.js";
import {
  normalizeStoredUploadPublicPath,
  resolveStoredFilePath,
  saveStoredBuffer,
  storedFileExists
} from "./storage.service.js";
import { ensureUserWorkspace, ensureUserWorkspaceWithDb } from "./workspace.service.js";

const ASSET_TYPES = new Set(["image", "model3d", "video", "document", "other"]);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream"
]);

function normalizeUploadPublicPath(value = "") {
  return normalizeStoredUploadPublicPath(value);
}

function normalizeAssetType(type, mimeType = "") {
  const clean = String(type || "").trim().toLowerCase();
  if (ASSET_TYPES.has(clean)) return clean;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("model") || mimeType.includes("gltf")) return "model3d";
  if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
  return "other";
}

function assertAllowedUpload(mimeType = "", sizeBytes = 0, { maxBytes = env.maxUploadBytes } = {}) {
  const limit = Number(maxBytes || env.maxUploadBytes);
  if (sizeBytes > limit) {
    throw createHttpError("Upload is too large", 413);
  }
  if (mimeType && !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw createHttpError("Unsupported upload type", 415);
  }
}

function normalizeSource(source) {
  const clean = String(source || "").trim().toLowerCase();
  return clean || "upload";
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return Boolean(fallback);
}

function userIdFromPrincipal(principal) {
  return typeof principal === "string" ? principal : principal?.userId;
}

function ensureProjectAccess(userId, projectId) {
  const cleanProjectId = normalizeText(projectId);
  if (!cleanProjectId) return "";
  return getProject(userId, cleanProjectId) ? cleanProjectId : "";
}

function ensureCollectionAccess(userId, collectionId) {
  const cleanCollectionId = normalizeText(collectionId);
  if (!cleanCollectionId) return "";
  return getAssetCollection(userId, cleanCollectionId) ? cleanCollectionId : "";
}

function publicAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id || "",
    collectionId: row.collection_id || "",
    collectionName: row.collection_name || row.collection || "",
    type: row.type || "other",
    source: row.source || "upload",
    title: row.title || "",
    collection: row.collection || "",
    filePath: row.file_path || "",
    url: row.url || "",
    thumbnailUrl: row.thumbnail_url || row.url || "",
    mimeType: row.mime_type || "",
    sizeBytes: Number(row.size_bytes || 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    duration: row.duration == null ? null : Number(row.duration),
    prompt: row.prompt || "",
    modelName: row.model_name || "",
    libraryVisible: row.library_visible == null ? true : Number(row.library_visible) === 1,
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null
  };
}

function assetSelect() {
  return `
    a.id,
    a.user_id,
    COALESCE((
      SELECT pa.project_id
      FROM project_assets pa
      WHERE pa.asset_id = a.id
        AND pa.workspace_id = a.workspace_id
      ORDER BY pa.created_at DESC
      LIMIT 1
    ), '') AS project_id,
    a.collection_id,
    c.name AS collection_name,
    a.type,
    a.source,
    a.title,
    a.collection,
    f.file_path,
    f.url,
    f.thumbnail_url,
    f.mime_type,
    f.size_bytes,
    f.width,
    f.height,
    f.duration,
    a.prompt,
    a.model_name,
    a.library_visible,
    a.created_at,
    a.updated_at,
    a.deleted_at
  `;
}

export function listAssets(principal, {
  projectId = "",
  collection = "",
  collectionId = "",
  includeHidden = false
} = {}) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  const projectFilter = normalizeText(projectId);
  const collectionFilter = normalizeText(collection);
  const collectionIdFilter = normalizeText(collectionId);
  const hiddenFilter = normalizeBoolean(includeHidden, false) ? "" : "AND a.library_visible = 1";
  return prepare(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_files f
      ON f.id = a.file_id
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.workspace_id = a.workspace_id
      AND c.deleted_at IS NULL
    WHERE a.workspace_id = ?
      AND a.user_id = ?
      AND a.deleted_at IS NULL
      ${hiddenFilter}
      ${projectFilter ? "AND EXISTS (SELECT 1 FROM project_assets pa_filter WHERE pa_filter.asset_id = a.id AND pa_filter.workspace_id = a.workspace_id AND pa_filter.project_id = ?)" : ""}
      ${collectionIdFilter ? "AND a.collection_id = ?" : ""}
      ${collectionFilter ? "AND a.collection = ?" : ""}
    ORDER BY a.updated_at DESC, a.created_at DESC;
  `).all(
    ...[
      scope.workspaceId,
      userId,
      projectFilter || null,
      collectionIdFilter || null,
      collectionFilter || null
    ].filter((value, index) => index < 2 || value !== null)
  ).map(publicAsset);
}

export function getAsset(principal, id) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  return publicAsset(prepare(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_files f
      ON f.id = a.file_id
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.workspace_id = a.workspace_id
      AND c.deleted_at IS NULL
    WHERE a.id = ?
      AND a.workspace_id = ?
      AND a.user_id = ?
      AND a.deleted_at IS NULL
    LIMIT 1;
  `).get(id, scope.workspaceId, userId));
}

export function getAssetByUploadUrl(principal, uploadUrl = "") {
  const userId = userIdFromPrincipal(principal);
  const publicPath = normalizeUploadPublicPath(uploadUrl);
  if (!publicPath) return null;
  const filePath = publicPath.slice(1);
  const scope = ensureUserWorkspace(userId);
  return publicAsset(prepare(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_files f
      ON f.id = a.file_id
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.workspace_id = a.workspace_id
      AND c.deleted_at IS NULL
    WHERE a.workspace_id = ?
      AND a.user_id = ?
      AND (
        f.url = ?
        OR f.thumbnail_url = ?
        OR f.file_path = ?
      )
    LIMIT 1;
  `).get(scope.workspaceId, userId, publicPath, publicPath, filePath));
}

export function resolveUploadAssetPath(asset = {}) {
  const filePath = normalizeText(asset?.filePath);
  return resolveStoredFilePath(filePath);
}

export function resolveExistingUploadAssetPath(asset = {}) {
  const filePath = normalizeText(asset?.filePath);
  return storedFileExists(filePath)
    ? resolveStoredFilePath(filePath)
    : "";
}

export function createUploadedAsset(principal, { file, fields = {} } = {}) {
  const userId = userIdFromPrincipal(principal);
  if (!file?.buffer?.length) {
    throw createHttpError("File is required", 400);
  }
  const assetType = fields.type || normalizeAssetType("", file.mimeType);
  const maxBytes = assetType === "model3d" ? env.maxModelUploadBytes : env.maxUploadBytes;
  assertAllowedUpload(file.mimeType, file.buffer.length, { maxBytes });
  const id = randomUUID();
  const originalName = normalizeText(file.filename) || `asset-${id}`;
  const safeExt = getSafeExtension(originalName, file.mimeType);
  const fileName = `${Date.now()}-${id}${safeExt}`;
  const stored = saveStoredBuffer(fileName, file.buffer);
  const dimensions = readImageDimensions(file.buffer, file.mimeType);
  return insertAsset(userId, {
    id,
    projectId: fields.projectId,
    collectionId: fields.collectionId,
    type: assetType,
    source: fields.source || "upload",
    title: fields.title || originalName,
    collection: fields.collection,
    filePath: stored.filePath,
    url: stored.url,
    thumbnailUrl: stored.url,
    mimeType: file.mimeType,
    sizeBytes: file.buffer.length,
    width: fields.width ?? dimensions.width,
    height: fields.height ?? dimensions.height,
    duration: fields.duration,
    prompt: fields.prompt,
    modelName: fields.modelName,
    libraryVisible: true
  });
}

export function createGeneratedAsset(principal, input = {}) {
  const userId = userIdFromPrincipal(principal);
  const id = randomUUID();
  let url = normalizeText(input.url || input.imageUrl);
  let filePath = "";
  let mimeType = normalizeText(input.mimeType) || "image/png";
  let sizeBytes = Number(input.sizeBytes || 0) || 0;
  let dimensions = { width: normalizeNumber(input.width), height: normalizeNumber(input.height) };

  const dataUrl = normalizeText(input.dataUrl || input.imageDataUrl);
  if (dataUrl.startsWith("data:")) {
    const saved = saveDataUrlToUpload(id, dataUrl);
    url = saved.url;
    filePath = saved.filePath;
    mimeType = saved.mimeType;
    sizeBytes = saved.sizeBytes;
    dimensions = readImageDimensions(saved.buffer, mimeType);
  }

  if (!url) {
    throw createHttpError("Generated asset URL is required", 400);
  }

  return insertAsset(userId, {
    id,
    projectId: input.projectId,
    collectionId: input.collectionId,
    type: input.type || "image",
    source: input.source || "generated",
    title: input.title || "Generated image",
    collection: input.collection,
    filePath: filePath || normalizeText(input.filePath),
    url,
    thumbnailUrl: filePath ? url : (input.thumbnailUrl || url),
    mimeType,
    sizeBytes,
    width: input.width ?? dimensions.width,
    height: input.height ?? dimensions.height,
    duration: input.duration,
    prompt: input.prompt,
    modelName: input.modelName,
    libraryVisible: input.libraryVisible === undefined ? false : input.libraryVisible
  });
}

export function createGeneratedAssetFromBuffer(principal, {
  buffer,
  mimeType = "application/octet-stream",
  title = "Generated asset",
  type = "",
  source = "generated",
  prompt = "",
  modelName = "",
  width = null,
  height = null,
  duration = null,
  libraryVisible = false,
  projectId = "",
  collectionId = ""
} = {}) {
  const userId = userIdFromPrincipal(principal);
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw createHttpError("Generated asset buffer is required", 400);
  }
  const assetType = type || normalizeAssetType("", mimeType);
  const maxBytes = assetType === "model3d" ? env.maxModelUploadBytes : env.maxUploadBytes;
  assertAllowedUpload(mimeType, buffer.length, { maxBytes });
  const id = randomUUID();
  const fileName = `${Date.now()}-${id}${getExtensionFromMime(mimeType)}`;
  const stored = saveStoredBuffer(fileName, buffer);
  const dimensions = mimeType.startsWith("image/")
    ? readImageDimensions(buffer, mimeType)
    : { width: null, height: null };
  return insertAsset(userId, {
    id,
    projectId,
    collectionId,
    type: assetType,
    source,
    title,
    filePath: stored.filePath,
    url: stored.url,
    thumbnailUrl: stored.url,
    mimeType,
    sizeBytes: buffer.length,
    width: width ?? dimensions.width,
    height: height ?? dimensions.height,
    duration,
    prompt,
    modelName,
    libraryVisible
  });
}

export function updateAsset(principal, id, input = {}) {
  const userId = userIdFromPrincipal(principal);
  const existing = getAsset(userId, id);
  if (!existing) return null;
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const projectId = input.projectId === undefined
      ? undefined
      : ensureProjectAccessWithDb(db, userId, scope.workspaceId, input.projectId);
    const collectionId = input.collectionId === undefined
      ? existing.collectionId
      : ensureCollectionAccessWithDb(db, userId, scope.workspaceId, input.collectionId);
    const title = input.title === undefined ? existing.title : normalizeText(input.title);
    const collection = input.collection === undefined ? existing.collection : normalizeText(input.collection);
    const prompt = input.prompt === undefined ? existing.prompt : normalizeText(input.prompt);
    const modelName = input.modelName === undefined ? existing.modelName : normalizeText(input.modelName);
    const libraryVisible = input.libraryVisible === undefined
      ? existing.libraryVisible
      : normalizeBoolean(input.libraryVisible, existing.libraryVisible);
    const now = Date.now();

    db.prepare(`
      UPDATE assets
      SET collection_id = ?,
          title = ?,
          collection = ?,
          prompt = ?,
          model_name = ?,
          library_visible = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
        AND deleted_at IS NULL;
    `).run(
      collectionId || null,
      title || existing.title || "Untitled asset",
      collection,
      prompt,
      modelName,
      libraryVisible ? 1 : 0,
      now,
      id,
      scope.workspaceId,
      userId
    );

    if (input.projectId !== undefined) {
      db.prepare(`
        DELETE FROM project_assets
        WHERE asset_id = ?
          AND workspace_id = ?;
      `).run(id, scope.workspaceId);
      if (projectId) insertProjectAssetLink(db, scope.workspaceId, projectId, id, now);
    }
    return getAsset(userId, id);
  });
}

export function softDeleteAsset(principal, id) {
  const userId = userIdFromPrincipal(principal);
  const existing = getAsset(userId, id);
  if (!existing) return null;
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const now = Date.now();
    db.prepare(`
      UPDATE assets
      SET deleted_at = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
        AND deleted_at IS NULL;
    `).run(now, now, id, scope.workspaceId, userId);
    return { ...existing, deletedAt: now, updatedAt: now };
  });
}

export function addAssetToProject(principal, id, { projectId } = {}) {
  const userId = userIdFromPrincipal(principal);
  const existing = getAsset(userId, id);
  if (!existing) return null;
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const allowedProjectId = ensureProjectAccessWithDb(db, userId, scope.workspaceId, projectId);
    if (!allowedProjectId) {
      throw createHttpError("Project not found", 404);
    }
    insertProjectAssetLink(db, scope.workspaceId, allowedProjectId, id, Date.now());
    return getAsset(userId, id);
  });
}

export function moveAssetToCollection(principal, id, { collectionId } = {}) {
  const userId = userIdFromPrincipal(principal);
  const existing = getAsset(userId, id);
  if (!existing) return null;
  const allowedCollectionId = ensureCollectionAccess(userId, collectionId);
  if (collectionId && !allowedCollectionId) {
    throw createHttpError("Collection not found", 404);
  }
  return updateAsset(userId, id, { collectionId: allowedCollectionId, libraryVisible: true });
}

export function listAssetsForCollection(principal, collectionId) {
  const userId = userIdFromPrincipal(principal);
  const scope = ensureUserWorkspace(userId);
  const allowedCollectionId = ensureCollectionAccess(userId, collectionId);
  if (!allowedCollectionId) return null;
  return prepare(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_files f
      ON f.id = a.file_id
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.workspace_id = a.workspace_id
      AND c.deleted_at IS NULL
    WHERE a.workspace_id = ?
      AND a.user_id = ?
      AND a.collection_id = ?
      AND a.deleted_at IS NULL
      AND a.library_visible = 1
    ORDER BY a.updated_at DESC, a.created_at DESC;
  `).all(scope.workspaceId, userId, allowedCollectionId).map(publicAsset);
}

function insertAsset(userId, input = {}) {
  return transaction((db) => {
    const scope = ensureUserWorkspaceWithDb(db, userId);
    const now = Date.now();
    const projectId = ensureProjectAccessWithDb(db, userId, scope.workspaceId, input.projectId);
    const collectionId = ensureCollectionAccessWithDb(db, userId, scope.workspaceId, input.collectionId);
    const asset = {
      id: normalizeText(input.id) || randomUUID(),
      userId,
      workspaceId: scope.workspaceId,
      projectId,
      collectionId,
      type: normalizeAssetType(input.type, input.mimeType),
      source: normalizeSource(input.source),
      title: normalizeText(input.title) || "Untitled asset",
      collection: normalizeText(input.collection),
      filePath: normalizeText(input.filePath),
      url: normalizeText(input.url),
      thumbnailUrl: normalizeText(input.thumbnailUrl || input.url),
      mimeType: normalizeText(input.mimeType),
      sizeBytes: Number(input.sizeBytes || 0) || 0,
      width: normalizeNumber(input.width),
      height: normalizeNumber(input.height),
      duration: normalizeNumber(input.duration),
      prompt: normalizeText(input.prompt),
      modelName: normalizeText(input.modelName),
      libraryVisible: normalizeBoolean(input.libraryVisible, true),
      createdAt: now,
      updatedAt: now
    };

    const fileId = shouldCreateAssetFile(asset) ? randomUUID() : null;
    if (fileId) {
      db.prepare(`
        INSERT INTO asset_files (
          id, workspace_id, storage_provider, storage_key, file_path, url,
          thumbnail_url, mime_type, size_bytes, width, height, duration, created_at
        )
        VALUES (?, ?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(
        fileId,
        asset.workspaceId,
        asset.filePath || asset.url,
        asset.filePath,
        asset.url,
        asset.thumbnailUrl,
        asset.mimeType,
        asset.sizeBytes,
        asset.width,
        asset.height,
        asset.duration,
        asset.createdAt
      );
    }

    db.prepare(`
      INSERT INTO assets (
        id, workspace_id, user_id, file_id, collection_id, type, source,
        title, collection, prompt, model_name, library_visible,
        created_at, updated_at, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
    `).run(
      asset.id,
      asset.workspaceId,
      asset.userId,
      fileId,
      asset.collectionId || null,
      asset.type,
      asset.source,
      asset.title,
      asset.collection,
      asset.prompt,
      asset.modelName,
      asset.libraryVisible ? 1 : 0,
      asset.createdAt,
      asset.updatedAt
    );

    if (asset.projectId) {
      insertProjectAssetLink(db, asset.workspaceId, asset.projectId, asset.id, now);
    }

    return getAsset(userId, asset.id);
  });
}

function ensureProjectAccessWithDb(db, userId, workspaceId, projectId) {
  const cleanProjectId = normalizeText(projectId);
  if (!cleanProjectId) return "";
  const project = db.prepare(`
    SELECT id
    FROM projects
    WHERE id = ?
      AND workspace_id = ?
      AND owner_user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(cleanProjectId, workspaceId, userId);
  return project ? cleanProjectId : "";
}

function ensureCollectionAccessWithDb(db, userId, workspaceId, collectionId) {
  const cleanCollectionId = normalizeText(collectionId);
  if (!cleanCollectionId) return "";
  const collection = db.prepare(`
    SELECT id
    FROM asset_collections
    WHERE id = ?
      AND workspace_id = ?
      AND user_id = ?
      AND deleted_at IS NULL
    LIMIT 1;
  `).get(cleanCollectionId, workspaceId, userId);
  return collection ? cleanCollectionId : "";
}

function insertProjectAssetLink(db, workspaceId, projectId, assetId, createdAt = Date.now()) {
  db.prepare(`
    INSERT OR IGNORE INTO project_assets (
      project_id, asset_id, workspace_id, created_at
    )
    VALUES (?, ?, ?, ?);
  `).run(projectId, assetId, workspaceId, createdAt);
}

function shouldCreateAssetFile(asset) {
  return Boolean(asset.filePath || asset.url || asset.thumbnailUrl || asset.mimeType || asset.sizeBytes);
}

function saveDataUrlToUpload(id, dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    throw createHttpError("Invalid data URL", 400);
  }
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const body = match[3] || "";
  const buffer = isBase64 ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body));
  assertAllowedUpload(mimeType, buffer.length);
  const fileName = `${Date.now()}-${id}${getExtensionFromMime(mimeType)}`;
  const stored = saveStoredBuffer(fileName, buffer);
  return {
    buffer,
    mimeType,
    filePath: stored.filePath,
    url: stored.url,
    sizeBytes: buffer.length
  };
}

function getSafeExtension(filename, mimeType = "") {
  const ext = extname(filename).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
  return getExtensionFromMime(mimeType);
}

function getExtensionFromMime(mimeType = "") {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "model/gltf-binary") return ".glb";
  if (mimeType === "model/gltf+json") return ".gltf";
  if (mimeType === "application/pdf") return ".pdf";
  return ".bin";
}

function readImageDimensions(buffer, mimeType = "") {
  if (!Buffer.isBuffer(buffer)) return { width: null, height: null };
  if (mimeType === "image/png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mimeType === "image/jpeg") return readJpegDimensions(buffer);
  if (mimeType === "image/gif" && buffer.length >= 10) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  return { width: null, height: null };
}

function readJpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }
  return { width: null, height: null };
}
