import { basename } from "node:path";
import { localStorageProvider } from "../providers/storage/local-storage.provider.js";

export function getDefaultStorageProvider() {
  return localStorageProvider;
}

export function saveStoredBuffer(fileName, buffer) {
  return getDefaultStorageProvider().saveBuffer(fileName, buffer);
}

export function resolveStoredFilePath(filePath = "") {
  return getDefaultStorageProvider().resolveStoredPath(filePath);
}

export function storedFileExists(filePath = "") {
  return getDefaultStorageProvider().storedPathExists(filePath);
}

export function normalizeStoredUploadPublicPath(value = "", { publicBasePath = "/uploads" } = {}) {
  const publicPrefix = publicBasePath.startsWith("/") ? publicBasePath : `/${publicBasePath}`;
  const pathname = String(value || "").split("?")[0].split("#")[0];
  const clean = pathname.startsWith("/") ? pathname : `${publicPrefix}/${pathname}`;
  if (!clean.startsWith(`${publicPrefix}/`)) return "";
  const filename = clean.slice(publicPrefix.length + 1);
  if (!filename || filename !== basename(filename)) return "";
  return `${publicPrefix}/${filename}`;
}
