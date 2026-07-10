import { basename } from "node:path";
import { localStorageProvider } from "../providers/storage/local-storage.provider.js";

const STORAGE_PROVIDER_METHODS = [
  "publicUrlFor",
  "saveBuffer",
  "resolveStoredPath",
  "storedPathExists",
  "deleteStoredPath"
];
let defaultStorageProvider = localStorageProvider;

export function getDefaultStorageProvider() {
  return defaultStorageProvider;
}

export function setDefaultStorageProvider(provider) {
  for (const method of STORAGE_PROVIDER_METHODS) {
    if (typeof provider?.[method] !== "function") {
      throw new TypeError(`Storage provider must implement ${method}()`);
    }
  }
  defaultStorageProvider = provider;
  return defaultStorageProvider;
}

export function resetDefaultStorageProvider() {
  defaultStorageProvider = localStorageProvider;
  return defaultStorageProvider;
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

export function getStoredPublicUrl(fileName = "") {
  return getDefaultStorageProvider().publicUrlFor(fileName);
}

export function deleteStoredFile(filePath = "") {
  return getDefaultStorageProvider().deleteStoredPath(filePath);
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
