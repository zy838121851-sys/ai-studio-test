import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import type { UploadAssetDto } from "@ai-studio/contracts";
import { and, eq } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { uploads } from "../database/schema.js";
import type { StorageProvider } from "../storage/storage-provider.js";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);

export interface StoreUploadInput {
  originalName: string;
  contentType: string;
  body: Buffer;
}

export interface UploadContent {
  body: Buffer;
  contentType: string;
  originalName: string;
}

export class UploadService {
  constructor(
    private readonly database: RewriteDatabase,
    private readonly storage: StorageProvider
  ) {}

  async store(context: AuthContext, input: StoreUploadInput): Promise<UploadAssetDto> {
    const extension = ALLOWED_CONTENT_TYPES.get(input.contentType);
    if (!extension) {
      throw new ApplicationError("UNSUPPORTED_UPLOAD_TYPE", 400, "仅支持 JPG、PNG、WebP 和 GIF 图片");
    }
    if (input.body.byteLength < 1 || input.body.byteLength > MAX_UPLOAD_BYTES) {
      throw new ApplicationError("UPLOAD_SIZE_INVALID", 400, "图片大小必须在 20MB 以内");
    }

    const now = new Date();
    const storageKey = [
      context.workspaceId,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      `${randomUUID()}${extension}`
    ].join("/");
    const checksumSha256 = createHash("sha256").update(input.body).digest("hex");
    await this.storage.put({
      key: storageKey,
      body: input.body,
      contentType: input.contentType
    });

    try {
      const [upload] = await this.database
        .insert(uploads)
        .values({
          workspaceId: context.workspaceId,
          storageProvider: this.storage.name,
          storageKey,
          originalName: normalizeOriginalName(input.originalName),
          contentType: input.contentType,
          byteSize: input.body.byteLength,
          checksumSha256
        })
        .returning();
      if (!upload) {
        throw new ApplicationError("UPLOAD_REGISTER_FAILED", 500, "上传记录创建失败");
      }

      return toUploadDto(upload);
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  async get(context: AuthContext, uploadId: string): Promise<UploadAssetDto> {
    const upload = await this.getRow(context, uploadId);
    return toUploadDto(upload);
  }

  async getContent(context: AuthContext, uploadId: string): Promise<UploadContent> {
    const upload = await this.getRow(context, uploadId);
    return {
      body: await this.storage.get(upload.storageKey),
      contentType: upload.contentType,
      originalName: upload.originalName
    };
  }

  async getDownload(context: AuthContext, uploadId: string): Promise<UploadContent> {
    return this.getContent(context, uploadId);
  }

  private async getRow(context: AuthContext, uploadId: string): Promise<typeof uploads.$inferSelect> {
    const [upload] = await this.database
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, uploadId), eq(uploads.workspaceId, context.workspaceId)))
      .limit(1);
    if (!upload) {
      throw new ApplicationError("UPLOAD_NOT_FOUND", 404, "上传文件不存在");
    }
    return upload;
  }
}

function normalizeOriginalName(originalName: string): string {
  return (path.basename(originalName).trim() || "image").slice(0, 255);
}

function toUploadDto(upload: typeof uploads.$inferSelect): UploadAssetDto {
  return {
    id: upload.id,
    originalName: upload.originalName,
    contentType: upload.contentType,
    byteSize: upload.byteSize,
    url: `/api/v1/uploads/${upload.id}/content`,
    createdAt: upload.createdAt.toISOString()
  };
}
