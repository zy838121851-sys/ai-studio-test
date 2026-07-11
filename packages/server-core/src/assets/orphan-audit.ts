import type { RewriteDatabase } from "../database/client.js";
import { aiJobs, assets, projects, uploads } from "../database/schema.js";
import type { StorageProvider } from "../storage/storage-provider.js";

export interface OrphanAuditReport {
  referencedUploadIds: string[];
  unreferencedUploadIds: string[];
  missingStorageKeys: string[];
  deletionAllowed: false;
}

export async function auditOrphanMedia(
  database: RewriteDatabase,
  storage: StorageProvider
): Promise<OrphanAuditReport> {
  const [uploadRows, assetRows, projectRows, jobRows] = await Promise.all([
    database.select({ id: uploads.id, storageKey: uploads.storageKey }).from(uploads),
    database.select({ uploadId: assets.uploadId }).from(assets),
    database.select({ thumbnailStorageKey: projects.thumbnailStorageKey, canvasDocument: projects.canvasDocument }).from(projects),
    database.select({ input: aiJobs.input, output: aiJobs.output }).from(aiJobs)
  ]);
  const referencedIds = new Set(assetRows.map((row) => row.uploadId));
  const referencedKeys = new Set<string>();
  for (const project of projectRows) {
    if (project.thumbnailStorageKey) referencedKeys.add(project.thumbnailStorageKey);
    collectUploadIds(project.canvasDocument, referencedIds);
  }
  for (const job of jobRows) {
    collectUploadIds(job.input, referencedIds);
    collectUploadIds(job.output, referencedIds);
  }
  const referenced = uploadRows.filter((upload) => referencedIds.has(upload.id) || referencedKeys.has(upload.storageKey));
  const missingStorageKeys = (await Promise.all(uploadRows.map(async (upload) => (await storage.exists(upload.storageKey)) ? null : upload.storageKey))).filter((key): key is string => Boolean(key));
  return {
    referencedUploadIds: referenced.map((upload) => upload.id).sort(),
    unreferencedUploadIds: uploadRows.filter((upload) => !referenced.includes(upload)).map((upload) => upload.id).sort(),
    missingStorageKeys: missingStorageKeys.sort(),
    deletionAllowed: false
  };
}

function collectUploadIds(value: unknown, target: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach((item) => collectUploadIds(item, target)); return; }
  const record = value as Record<string, unknown>;
  const sourceUrl = record.sourceUrl;
  if (typeof sourceUrl === "string") {
    const match = /^\/api\/v1\/uploads\/([^/]+)\/content$/.exec(sourceUrl);
    if (match?.[1]) target.add(match[1]);
  }
  if (typeof record.uploadId === "string") target.add(record.uploadId);
  Object.values(record).forEach((item) => collectUploadIds(item, target));
}
