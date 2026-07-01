import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createLocalStorageProvider } from "../src/server/providers/storage/local-storage.provider.js";

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
  const storage = createLocalStorageProvider({
    uploadDir,
    publicBasePath: "assets"
  });

  const stored = storage.saveBuffer("sample.txt", Buffer.from("storage-provider-check"));
  assert(stored.absolutePath === join(uploadDir, "sample.txt"), "Saved file should stay in upload directory");
  assert(stored.filePath.endsWith("sample.txt"), "Stored filePath should include the saved file name");
  assert(!stored.filePath.includes("\\"), "Stored filePath should use URL-safe separators");
  assert(stored.url === "/assets/sample.txt", "Stored URL should use normalized public base path");
  assert(existsSync(stored.absolutePath), "Saved file should exist on disk");
  assert(readFileSync(stored.absolutePath, "utf8") === "storage-provider-check", "Saved file content should match");

  const resolvedStoredPath = storage.resolveStoredPath(stored.filePath);
  assert(resolvedStoredPath === stored.absolutePath, "Stored filePath should resolve back to its absolute path");
  assert(storage.storedPathExists(stored.filePath), "Existing stored filePath should report as present");

  assert(storage.resolveStoredPath("") === "", "Blank stored paths should not resolve");
  assert(storage.resolveStoredPath("package.json") === "", "Paths outside upload root should not resolve");
  assert(storage.resolveStoredPath(`../${basename(outsideFile)}`) === "", "Traversal paths should not resolve");
  assert(!storage.storedPathExists("package.json"), "Paths outside upload root should not report as present");

  assertThrows(
    () => storage.saveBuffer("../escape.txt", Buffer.from("bad")),
    "Traversal file names should be rejected"
  );
  assertThrows(
    () => storage.saveBuffer("nested/file.txt", Buffer.from("bad")),
    "Nested file names should be rejected until subdirectory storage is explicit"
  );
  assert(!existsSync(outsideFile), "Rejected traversal writes should not create files outside upload root");

  console.log("Storage provider checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
