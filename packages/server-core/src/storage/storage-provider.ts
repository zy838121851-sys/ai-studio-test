export interface StorageObjectMetadata {
  key: string;
  byteSize: number;
  contentType: string | undefined;
  lastModifiedAt: Date | undefined;
}

export interface PutStorageObject {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  readonly name: "local" | "oss";
  put(object: PutStorageObject): Promise<StorageObjectMetadata>;
  stat(key: string): Promise<StorageObjectMetadata>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  createReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  createUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  normalizeKey(key: string): string;
  checkHealth(): Promise<void>;
}

export function normalizeStorageKey(key: string): string {
  const normalized = key.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (!normalized || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Storage key is invalid.");
  }

  return segments.join("/");
}

export function encodeStorageKey(key: string): string {
  return normalizeStorageKey(key)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
