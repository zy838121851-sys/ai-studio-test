import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  encodeStorageKey,
  normalizeStorageKey,
  type PutStorageObject,
  type StorageObjectMetadata,
  type StorageProvider
} from "./storage-provider.js";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  constructor(private readonly rootDirectory: string) {}

  normalizeKey(key: string): string {
    return normalizeStorageKey(key);
  }

  async put(object: PutStorageObject): Promise<StorageObjectMetadata> {
    const key = this.normalizeKey(object.key);
    const filePath = this.resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, object.body, { flag: "wx" });

    return {
      key,
      byteSize: object.body.byteLength,
      contentType: object.contentType,
      lastModifiedAt: new Date()
    };
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(this.normalizeKey(key)));
  }

  async stat(key: string): Promise<StorageObjectMetadata> {
    const normalizedKey = this.normalizeKey(key);
    const fileStat = await stat(this.resolvePath(normalizedKey));

    return {
      key: normalizedKey,
      byteSize: fileStat.size,
      contentType: undefined,
      lastModifiedAt: fileStat.mtime
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.stat(key);
      return true;
    } catch (error) {
      if (isFileNotFound(error)) {
        return false;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolvePath(this.normalizeKey(key)), { force: true });
  }

  async createReadUrl(key: string): Promise<string> {
    return `/api/v1/uploads/content/${encodeStorageKey(key)}`;
  }

  async createUploadUrl(): Promise<string> {
    return "/api/v1/uploads";
  }

  async checkHealth(): Promise<void> {
    await mkdir(this.rootDirectory, { recursive: true });
    await stat(this.rootDirectory);
  }

  private resolvePath(key: string): string {
    const resolved = path.resolve(this.rootDirectory, ...key.split("/"));
    const relative = path.relative(this.rootDirectory, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Storage key escapes the configured root.");
    }

    return resolved;
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
