import { localStorageProvider } from "../providers/storage/local-storage.provider.js";

export function saveStoredBuffer(fileName, buffer) {
  return localStorageProvider.saveBuffer(fileName, buffer);
}

export function resolveStoredFilePath(filePath = "") {
  return localStorageProvider.resolveStoredPath(filePath);
}

export function storedFileExists(filePath = "") {
  return localStorageProvider.storedPathExists(filePath);
}
