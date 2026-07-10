import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { env } from "../../config/env.js";
import { createHttpError } from "../../lib/input-validation.js";

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
    return `${publicPrefix}/${normalizeFileName(fileName)}`;
  }

  function normalizeFileName(fileName = "") {
    const cleanFileName = String(fileName || "").trim();
    if (!cleanFileName || cleanFileName !== basename(cleanFileName)) {
      throw createHttpError("Invalid storage file name", 400);
    }
    return cleanFileName;
  }

  function saveBuffer(fileName, buffer) {
    const cleanFileName = normalizeFileName(fileName);
    ensureReady();
    const absolutePath = join(uploadDir, cleanFileName);
    writeFileSync(absolutePath, buffer);
    return {
      absolutePath,
      filePath: relative(process.cwd(), absolutePath).replaceAll("\\", "/"),
      url: publicUrlFor(cleanFileName)
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

  function storedPathExists(filePath = "") {
    const absolutePath = resolveStoredPath(filePath);
    return Boolean(absolutePath && existsSync(absolutePath));
  }

  function deleteStoredPath(filePath = "") {
    const absolutePath = resolveStoredPath(filePath);
    if (!absolutePath || absolutePath === uploadRoot || !existsSync(absolutePath)) return false;
    unlinkSync(absolutePath);
    return true;
  }

  return {
    ensureReady,
    publicUrlFor,
    saveBuffer,
    resolveStoredPath,
    storedPathExists,
    deleteStoredPath
  };
}

export const localStorageProvider = createLocalStorageProvider();
