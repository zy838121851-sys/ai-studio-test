import Database from "better-sqlite3";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditUploadIntegrity,
  extractUploadReferences
} from "../src/server/services/upload-integrity.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = join(tmpdir(), `ai-studio-upload-integrity-${process.pid}-${Date.now()}`);
const sourceDatabasePath = join(tempRoot, "ai-studio.sqlite");
const uploadDir = join(tempRoot, "uploads");

try {
  mkdirSync(uploadDir, { recursive: true });
  const database = new Database(sourceDatabasePath);
  try {
    database.exec("CREATE TABLE evidence (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);");
    const insert = database.prepare("INSERT INTO evidence (payload) VALUES (?);");
    insert.run(JSON.stringify({ url: "/uploads/kept.png" }));
    insert.run(JSON.stringify({ url: "http://localhost:3000/uploads/legacy.png" }));
    insert.run("uploads/path-only.png");
    insert.run(JSON.stringify({ url: "/uploads/missing.png" }));
    insert.run(JSON.stringify({ url: "https://cdn.example.test/uploads/external.png" }));
    insert.run(JSON.stringify({ url: "/uploads/../escape.png" }));
  } finally {
    database.close();
  }

  for (const fileName of ["kept.png", "legacy.png", "path-only.png", "orphan.png"]) {
    writeFileSync(join(uploadDir, fileName), fileName);
  }

  const report = auditUploadIntegrity({
    sourceDatabasePath,
    uploadDir,
    appBaseUrl: "https://ai-studio.example.test"
  });
  assert(report.referencedFiles.join(",") === "kept.png,legacy.png,missing.png,path-only.png", "Audit should collect local persisted upload references");
  assert(report.orphanFiles.join(",") === "orphan.png", "Audit should identify unreferenced disk files");
  assert(report.missingFiles.join(",") === "missing.png", "Audit should identify referenced files missing from disk");
  assert(report.unsafeReferences.some((value) => value.includes("../escape.png")), "Audit should report unsafe traversal references");
  assert(!report.referencedFiles.includes("external.png"), "Audit should ignore external CDN upload paths");
  assert(report.referenceSources["kept.png"].includes("evidence.payload"), "Audit should report reference sources");

  const escapedJson = extractUploadReferences("{\"url\":\"\\/uploads\\/escaped.png\"}");
  assert(escapedJson.references[0] === "escaped.png", "Reference extraction should support escaped JSON slashes");

  console.log("Upload integrity checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
