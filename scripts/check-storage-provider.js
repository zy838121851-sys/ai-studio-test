import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createLocalStorageProvider } from "../src/server/providers/storage/local-storage.provider.js";
import {
  deleteStoredFile,
  getDefaultStorageProvider,
  getStoredPublicUrl,
  normalizeStoredUploadPublicPath,
  resetDefaultStorageProvider,
  resolveStoredFilePath,
  setDefaultStorageProvider,
  storedFileExists
} from "../src/server/services/storage.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(callback, message) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-storage-provider-"));
const uploadDir = join(tempRoot, "uploads");
const outsideFile = resolve(tempRoot, "escape.txt");

try {
  const defaultProvider = getDefaultStorageProvider();
  assert(defaultProvider?.saveBuffer, "Storage service should expose a default provider with saveBuffer");
  assert(defaultProvider?.publicUrlFor, "Storage service should expose a default provider with publicUrlFor");
  assert(defaultProvider?.resolveStoredPath, "Storage service should expose a default provider with resolveStoredPath");
  assert(defaultProvider?.storedPathExists, "Storage service should expose a default provider with storedPathExists");
  assert(defaultProvider?.deleteStoredPath, "Storage service should expose a default provider with deleteStoredPath");

  const storage = createLocalStorageProvider({
    uploadDir,
    publicBasePath: "assets"
  });

  const stored = storage.saveBuffer("sample.txt", Buffer.from("storage-provider-check"));
  assert(stored.absolutePath === join(uploadDir, "sample.txt"), "Saved file should stay in upload directory");
  assert(stored.filePath.endsWith("sample.txt"), "Stored filePath should include the saved file name");
  assert(!stored.filePath.includes("\\"), "Stored filePath should use URL-safe separators");
  assert(stored.url === "/assets/sample.txt", "Stored URL should use normalized public base path");
  assert(storage.publicUrlFor("sample.txt") === "/assets/sample.txt", "Provider public URLs should use normalized file names");
  assert(existsSync(stored.absolutePath), "Saved file should exist on disk");
  assert(readFileSync(stored.absolutePath, "utf8") === "storage-provider-check", "Saved file content should match");

  const resolvedStoredPath = storage.resolveStoredPath(stored.filePath);
  assert(resolvedStoredPath === stored.absolutePath, "Stored filePath should resolve back to its absolute path");
  assert(storage.storedPathExists(stored.filePath), "Existing stored filePath should report as present");

  assert(storage.resolveStoredPath("") === "", "Blank stored paths should not resolve");
  assert(storage.resolveStoredPath("package.json") === "", "Paths outside upload root should not resolve");
  assert(storage.resolveStoredPath(`../${basename(outsideFile)}`) === "", "Traversal paths should not resolve");
  assert(!storage.storedPathExists("package.json"), "Paths outside upload root should not report as present");
  assert(resolveStoredFilePath("package.json") === "", "Storage service should reject paths outside upload root");
  assert(!storedFileExists("package.json"), "Storage service should not report outside paths as present");
  assert(
    normalizeStoredUploadPublicPath("/uploads/sample.txt?cache=1#view") === "/uploads/sample.txt",
    "Storage service should normalize upload public paths"
  );
  assert(
    normalizeStoredUploadPublicPath("sample.txt") === "/uploads/sample.txt",
    "Storage service should normalize bare upload file names"
  );
  assert(
    normalizeStoredUploadPublicPath("/assets/sample.txt", { publicBasePath: "assets" }) === "/assets/sample.txt",
    "Storage service should support a custom public base path"
  );
  assert(
    normalizeStoredUploadPublicPath("/uploads/nested/sample.txt") === "",
    "Storage service should reject nested upload public paths until subdirectory storage is explicit"
  );
  assert(
    normalizeStoredUploadPublicPath("/static/sample.txt") === "",
    "Storage service should reject paths outside the configured public base path"
  );

  assertThrows(
    () => storage.saveBuffer("../escape.txt", Buffer.from("bad")),
    "Traversal file names should be rejected"
  );
  assertThrows(
    () => storage.saveBuffer("nested/file.txt", Buffer.from("bad")),
    "Nested file names should be rejected until subdirectory storage is explicit"
  );
  assert(!existsSync(outsideFile), "Rejected traversal writes should not create files outside upload root");

  const removable = storage.saveBuffer("remove.txt", Buffer.from("remove-me"));
  assert(storage.deleteStoredPath(removable.filePath), "Storage providers should delete existing stored files");
  assert(!existsSync(removable.absolutePath), "Deleted stored files should be removed from disk");
  assert(!storage.deleteStoredPath(removable.filePath), "Deleting a missing stored file should be idempotent");
  assert(!storage.deleteStoredPath("package.json"), "Storage providers should reject deletion outside the upload root");

  const injectedCalls = [];
  const injectedProvider = {
    publicUrlFor: (fileName) => `/cdn/${fileName}`,
    saveBuffer: (fileName) => ({ fileName }),
    resolveStoredPath: (filePath) => `resolved:${filePath}`,
    storedPathExists: (filePath) => filePath === "present.txt",
    deleteStoredPath: (filePath) => {
      injectedCalls.push(filePath);
      return true;
    }
  };
  setDefaultStorageProvider(injectedProvider);
  assert(getDefaultStorageProvider() === injectedProvider, "Storage services should support provider replacement");
  assert(getStoredPublicUrl("asset.png") === "/cdn/asset.png", "Storage services should route public URLs through the provider");
  assert(resolveStoredFilePath("asset.png") === "resolved:asset.png", "Storage services should route path resolution through the provider");
  assert(storedFileExists("present.txt"), "Storage services should route existence checks through the provider");
  assert(deleteStoredFile("asset.png"), "Storage services should route deletion through the provider");
  assert(injectedCalls[0] === "asset.png", "Storage services should preserve deletion paths");
  resetDefaultStorageProvider();
  assert(getDefaultStorageProvider() === defaultProvider, "Storage services should restore the local provider");

  assertThrows(
    () => setDefaultStorageProvider({ saveBuffer() {} }),
    "Storage services should reject incomplete providers"
  );

  console.log("Storage provider checks passed.");
} finally {
  resetDefaultStorageProvider();
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
