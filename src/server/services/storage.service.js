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
