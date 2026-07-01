import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { env } from "../../config/env.js";

export function createLocalStorageProvider({
  uploadDir = env.uploadDir,
  publicBasePath = "/uploads"
} = {}) {
  const uploadRoot = resolve(uploadDir);
  const publicPrefix = publicBasePath.startsWith("/") ? publicBasePath : `/${publicBasePath}`;

  function ensureReady() {
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  }

  function publicUrlFor(fileName) {
    return `${publicPrefix}/${fileName}`;
  }

  function saveBuffer(fileName, buffer) {
    ensureReady();
    const absolutePath = join(uploadDir, fileName);
    writeFileSync(absolutePath, buffer);
    return {
      absolutePath,
      filePath: relative(process.cwd(), absolutePath).replaceAll("\\", "/"),
      url: publicUrlFor(fileName)
    };
  }

  function resolveStoredPath(filePath = "") {
    if (!filePath) return "";
    const absolutePath = resolve(process.cwd(), filePath);
    const uploadRootWithSeparator = uploadRoot.endsWith("\\") || uploadRoot.endsWith("/")
      ? uploadRoot
      : `${uploadRoot}${process.platform === "win32" ? "\\" : "/"}`;
    if (absolutePath !== uploadRoot && !absolutePath.startsWith(uploadRootWithSeparator)) return "";
    return absolutePath;
  }

  return {
    ensureReady,
    saveBuffer,
    resolveStoredPath
  };
}

export const localStorageProvider = createLocalStorageProvider();
