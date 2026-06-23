import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { env } from "../config/env.js";
import { execute, query, queryOne, sqlValue } from "../db/sqlite.js";
import { getAssetCollection } from "./asset-collection.service.js";
import { getProject } from "./project.service.js";

const UPLOAD_DIR = env.uploadDir;
const UPLOAD_ROOT = resolve(UPLOAD_DIR);
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

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUploadPublicPath(value = "") {
  const pathname = String(value || "").split("?")[0].split("#")[0];
  const clean = pathname.startsWith("/") ? pathname : `/uploads/${pathname}`;
  if (!clean.startsWith("/uploads/")) return "";
  const filename = clean.slice("/uploads/".length);
  if (!filename || filename !== basename(filename)) return "";
  return `/uploads/${filename}`;
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

function assertAllowedUpload(mimeType = "", sizeBytes = 0) {
  if (sizeBytes > env.maxUploadBytes) {
    const error = new Error("Upload is too large");
    error.status = 413;
    throw error;
  }
  if (mimeType && !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    const error = new Error("Unsupported upload type");
    error.status = 415;
    throw error;
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
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null
  };
}

function assetSelect() {
  return `
    a.id,
    a.user_id,
    a.project_id,
    a.collection_id,
    c.name AS collection_name,
    a.type,
    a.source,
    a.title,
    a.collection,
    a.file_path,
    a.url,
    a.thumbnail_url,
    a.mime_type,
    a.size_bytes,
    a.width,
    a.height,
    a.duration,
    a.prompt,
    a.model_name,
    a.created_at,
    a.updated_at,
    a.deleted_at
  `;
}

export function listAssets(userId, { projectId = "", collection = "", collectionId = "" } = {}) {
  const projectFilter = normalizeText(projectId);
  const collectionFilter = normalizeText(collection);
  const collectionIdFilter = normalizeText(collectionId);
  return query(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.user_id = a.user_id
      AND c.deleted_at IS NULL
    WHERE a.user_id = ${sqlValue(userId)}
      AND a.deleted_at IS NULL
      ${projectFilter ? `AND a.project_id = ${sqlValue(projectFilter)}` : ""}
      ${collectionIdFilter ? `AND a.collection_id = ${sqlValue(collectionIdFilter)}` : ""}
      ${collectionFilter ? `AND a.collection = ${sqlValue(collectionFilter)}` : ""}
    ORDER BY a.updated_at DESC, a.created_at DESC;
  `).map(publicAsset);
}

export function getAsset(userId, id) {
  return publicAsset(queryOne(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.user_id = a.user_id
      AND c.deleted_at IS NULL
    WHERE a.id = ${sqlValue(id)}
      AND a.user_id = ${sqlValue(userId)}
      AND a.deleted_at IS NULL
    LIMIT 1;
  `));
}

export function getAssetByUploadUrl(userId, uploadUrl = "") {
  const publicPath = normalizeUploadPublicPath(uploadUrl);
  if (!publicPath) return null;
  const filePath = publicPath.slice(1);
  // Upload files remain readable to the owning user even after a library soft-delete,
  // because saved project snapshots may still reference the file URL.
  return publicAsset(queryOne(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.user_id = a.user_id
      AND c.deleted_at IS NULL
    WHERE a.user_id = ${sqlValue(userId)}
      AND (
        a.url = ${sqlValue(publicPath)}
        OR a.thumbnail_url = ${sqlValue(publicPath)}
        OR a.file_path = ${sqlValue(filePath)}
      )
    LIMIT 1;
  `));
}

export function resolveUploadAssetPath(asset = {}) {
  const filePath = normalizeText(asset?.filePath);
  if (!filePath) return "";
  const absolutePath = resolve(process.cwd(), filePath);
  const uploadRootWithSeparator = UPLOAD_ROOT.endsWith("\\") || UPLOAD_ROOT.endsWith("/")
    ? UPLOAD_ROOT
    : `${UPLOAD_ROOT}${process.platform === "win32" ? "\\" : "/"}`;
  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(uploadRootWithSeparator)) return "";
  return absolutePath;
}

export function createUploadedAsset(userId, { file, fields = {} } = {}) {
  if (!file?.buffer?.length) {
    const error = new Error("File is required");
    error.status = 400;
    throw error;
  }
  assertAllowedUpload(file.mimeType, file.buffer.length);
  ensureUploadDir();
  const id = randomUUID();
  const originalName = normalizeText(file.filename) || `asset-${id}`;
  const safeExt = getSafeExtension(originalName, file.mimeType);
  const fileName = `${Date.now()}-${id}${safeExt}`;
  const absolutePath = join(UPLOAD_DIR, fileName);
  writeFileSync(absolutePath, file.buffer);

  const publicPath = `/uploads/${fileName}`;
  const dimensions = readImageDimensions(file.buffer, file.mimeType);
  return insertAsset(userId, {
    id,
    projectId: fields.projectId,
    collectionId: fields.collectionId,
    type: fields.type || normalizeAssetType("", file.mimeType),
    source: fields.source || "upload",
    title: fields.title || originalName,
    collection: fields.collection,
    filePath: relative(process.cwd(), absolutePath).replaceAll("\\", "/"),
    url: publicPath,
    thumbnailUrl: publicPath,
    mimeType: file.mimeType,
    sizeBytes: file.buffer.length,
    width: fields.width ?? dimensions.width,
    height: fields.height ?? dimensions.height,
    duration: fields.duration,
    prompt: fields.prompt,
    modelName: fields.modelName
  });
}

export function createGeneratedAsset(userId, input = {}) {
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
    const error = new Error("Generated asset URL is required");
    error.status = 400;
    throw error;
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
    modelName: input.modelName
  });
}

export function updateAsset(userId, id, input = {}) {
  const existing = getAsset(userId, id);
  if (!existing) return null;
  const now = Date.now();
  const projectId = input.projectId === undefined
    ? existing.projectId
    : ensureProjectAccess(userId, input.projectId);
  const collectionId = input.collectionId === undefined
    ? existing.collectionId
    : ensureCollectionAccess(userId, input.collectionId);
  const title = input.title === undefined ? existing.title : normalizeText(input.title);
  const collection = input.collection === undefined ? existing.collection : normalizeText(input.collection);
  const prompt = input.prompt === undefined ? existing.prompt : normalizeText(input.prompt);
  const modelName = input.modelName === undefined ? existing.modelName : normalizeText(input.modelName);

  execute(`
    UPDATE assets
    SET project_id = ${projectId ? sqlValue(projectId) : "NULL"},
        collection_id = ${collectionId ? sqlValue(collectionId) : "NULL"},
        title = ${sqlValue(title || existing.title || "Untitled asset")},
        collection = ${sqlValue(collection)},
        prompt = ${sqlValue(prompt)},
        model_name = ${sqlValue(modelName)},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);

  return getAsset(userId, id);
}

export function softDeleteAsset(userId, id) {
  const existing = getAsset(userId, id);
  if (!existing) return null;
  const now = Date.now();
  execute(`
    UPDATE assets
    SET deleted_at = ${now},
        updated_at = ${now}
    WHERE id = ${sqlValue(id)}
      AND user_id = ${sqlValue(userId)}
      AND deleted_at IS NULL;
  `);
  return { ...existing, deletedAt: now, updatedAt: now };
}

export function addAssetToProject(userId, id, { projectId } = {}) {
  const existing = getAsset(userId, id);
  if (!existing) return null;
  const allowedProjectId = ensureProjectAccess(userId, projectId);
  if (!allowedProjectId) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
  return updateAsset(userId, id, { projectId: allowedProjectId });
}

export function moveAssetToCollection(userId, id, { collectionId } = {}) {
  const existing = getAsset(userId, id);
  if (!existing) return null;
  const allowedCollectionId = ensureCollectionAccess(userId, collectionId);
  if (collectionId && !allowedCollectionId) {
    const error = new Error("Collection not found");
    error.status = 404;
    throw error;
  }
  return updateAsset(userId, id, { collectionId: allowedCollectionId });
}

export function listAssetsForCollection(userId, collectionId) {
  const allowedCollectionId = ensureCollectionAccess(userId, collectionId);
  if (!allowedCollectionId) return null;
  return query(`
    SELECT ${assetSelect()}
    FROM assets a
    LEFT JOIN asset_collections c
      ON c.id = a.collection_id
      AND c.user_id = a.user_id
      AND c.deleted_at IS NULL
    WHERE a.user_id = ${sqlValue(userId)}
      AND a.collection_id = ${sqlValue(allowedCollectionId)}
      AND a.deleted_at IS NULL
    ORDER BY a.updated_at DESC, a.created_at DESC;
  `).map(publicAsset);
}

function insertAsset(userId, input = {}) {
  const now = Date.now();
  const projectId = ensureProjectAccess(userId, input.projectId);
  const collectionId = ensureCollectionAccess(userId, input.collectionId);
  const asset = {
    id: normalizeText(input.id) || randomUUID(),
    userId,
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
    createdAt: now,
    updatedAt: now
  };

  execute(`
    INSERT INTO assets (
      id,
      user_id,
      project_id,
      collection_id,
      type,
      source,
      title,
      collection,
      file_path,
      url,
      thumbnail_url,
      mime_type,
      size_bytes,
      width,
      height,
      duration,
      prompt,
      model_name,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (
      ${sqlValue(asset.id)},
      ${sqlValue(asset.userId)},
      ${asset.projectId ? sqlValue(asset.projectId) : "NULL"},
      ${asset.collectionId ? sqlValue(asset.collectionId) : "NULL"},
      ${sqlValue(asset.type)},
      ${sqlValue(asset.source)},
      ${sqlValue(asset.title)},
      ${sqlValue(asset.collection)},
      ${sqlValue(asset.filePath)},
      ${sqlValue(asset.url)},
      ${sqlValue(asset.thumbnailUrl)},
      ${sqlValue(asset.mimeType)},
      ${asset.sizeBytes},
      ${asset.width == null ? "NULL" : asset.width},
      ${asset.height == null ? "NULL" : asset.height},
      ${asset.duration == null ? "NULL" : asset.duration},
      ${sqlValue(asset.prompt)},
      ${sqlValue(asset.modelName)},
      ${asset.createdAt},
      ${asset.updatedAt},
      NULL
    );
  `);

  return getAsset(userId, asset.id);
}

function saveDataUrlToUpload(id, dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    const error = new Error("Invalid data URL");
    error.status = 400;
    throw error;
  }
  ensureUploadDir();
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const body = match[3] || "";
  const buffer = isBase64 ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body));
  assertAllowedUpload(mimeType, buffer.length);
  const fileName = `${Date.now()}-${id}${getExtensionFromMime(mimeType)}`;
  const absolutePath = join(UPLOAD_DIR, fileName);
  writeFileSync(absolutePath, buffer);
  return {
    buffer,
    mimeType,
    filePath: relative(process.cwd(), absolutePath).replaceAll("\\", "/"),
    url: `/uploads/${fileName}`,
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
