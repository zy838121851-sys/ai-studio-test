import OSS from "ali-oss";

import type { OssStorageConfig } from "../config/rewrite-config.js";
import {
  normalizeStorageKey,
  type PutStorageObject,
  type StorageObjectMetadata,
  type StorageProvider
} from "./storage-provider.js";

export class OssStorageProvider implements StorageProvider {
  readonly name = "oss" as const;
  private readonly client: OSS;

  constructor(private readonly config: OssStorageConfig) {
    this.client = new OSS({
      region: config.region,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
      secure: true
    });
  }

  normalizeKey(key: string): string {
    return normalizeStorageKey(key);
  }

  async put(object: PutStorageObject): Promise<StorageObjectMetadata> {
    const key = this.normalizeKey(object.key);
    await this.client.put(key, object.body, {
      headers: { "Content-Type": object.contentType }
    });

    return {
      key,
      byteSize: object.body.byteLength,
      contentType: object.contentType,
      lastModifiedAt: new Date()
    };
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.get(this.normalizeKey(key));
    return Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content);
  }

  async stat(key: string): Promise<StorageObjectMetadata> {
    const normalizedKey = this.normalizeKey(key);
    const result = await this.client.head(normalizedKey);
    const headers = result.res.headers as Record<string, string | undefined>;

    return {
      key: normalizedKey,
      byteSize: Number(headers["content-length"] ?? 0),
      contentType: headers["content-type"],
      lastModifiedAt: headers["last-modified"] ? new Date(headers["last-modified"]) : undefined
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.stat(key);
      return true;
    } catch (error) {
      if (isOssNotFound(error)) {
        return false;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(this.normalizeKey(key));
  }

  async createReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return this.client.signatureUrl(this.normalizeKey(key), { expires: expiresInSeconds });
  }

  async createUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300
  ): Promise<string> {
    return this.client.signatureUrl(this.normalizeKey(key), {
      method: "PUT",
      expires: expiresInSeconds,
      "Content-Type": contentType
    });
  }

  async checkHealth(): Promise<void> {
    await this.client.getBucketInfo(this.config.bucket);
  }
}

function isOssNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (("status" in error && (error as { status?: number }).status === 404) ||
      ("code" in error && (error as { code?: string }).code === "NoSuchKey"))
  );
}
